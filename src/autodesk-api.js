import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import os from 'os';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class AutodeskAPIClient {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.personalAccessToken = config.personalAccessToken;
    this.baseUrl = config.baseUrl;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Create a zip file from a directory
   */
  async createZipFromDirectory(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(`   Zip created: ${archive.pointer()} bytes`);
        resolve(outputPath);
      });

      archive.on('error', (err) => reject(err));
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * Upload file to a signed URL
   */
  async uploadFileToSignedUrl(filePath, uploadUrl) {
    const fileBuffer = fs.readFileSync(filePath);
    const fileStats = fs.statSync(filePath);
    
    await axios.put(uploadUrl, fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileStats.size
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
  }

  /**
   * Get OAuth 2.0 Access Token
   */
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      console.log('Using cached access token');
      return this.accessToken;
    }

    try {
      console.log('Requesting new access token...');
      const response = await axios.post(
        `${this.baseUrl}/authentication/v2/token`,
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
          scope: 'code:all data:read data:write data:create bucket:create bucket:read bucket:delete'
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      console.log('Access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      console.error('Failed to get access token:', error.response?.data || error.message);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Submit F3D file for modification
   * @param {string} filePath - Path to the F3D file
   * @param {object} modificationParams - Parameters for file modification
   */
  /**
   * Submit F3D file for modification using Design Automation
   * This method handles the complete workflow:
   * 1. Create OSS bucket
   * 2. Upload input file to OSS
   * 3. Generate signed URLs for input/output
   * 4. Submit WorkItem to Design Automation
   */
  async submitF3DFile(filePath, modificationParams = {}) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileName = path.basename(filePath);
      const timestamp = Date.now();
      const bucketKey = `drumforge-${this.clientId.substring(0, 8).toLowerCase()}`.replace(/[^a-z0-9\-_.]/g, '');
      const inputObjectKey = `input_${timestamp}_${fileName}`;
      const outputObjectKey = `output_${timestamp}_${fileName}`;
      const paramsObjectKey = `params_${timestamp}.json`;

      console.log(`\n🚀 Processing file: ${fileName}`);
      
      // Step 1: Create bucket (if doesn't exist)
      console.log('📦 Setting up storage...');
      await this.createBucket(bucketKey);

      // Step 2: Upload input file to OSS
      console.log('⬆️  Uploading input file...');
      const uploadResult = await this.uploadFileToOSS(bucketKey, inputObjectKey, filePath);

      // Step 3: Create and upload params.json file
      console.log('📝 Creating parameters file...');
      console.log('   Parameters to apply:', JSON.stringify(modificationParams, null, 2));
      const tempDir = os.tmpdir();
      const paramsFilePath = path.join(tempDir, `params_${timestamp}.json`);
      fs.writeFileSync(paramsFilePath, JSON.stringify(modificationParams, null, 2));
      console.log('   ✓ Uploading parameters file...');
      await this.uploadFileToOSS(bucketKey, paramsObjectKey, paramsFilePath);
      fs.unlinkSync(paramsFilePath); // Clean up temp file

      // Step 4: Generate signed URLs
      console.log('🔑 Generating signed URLs...');
      const inputUrl = await this.getSignedDownloadUrl(bucketKey, inputObjectKey);
      const outputUrl = await this.getSignedUploadUrl(bucketKey, outputObjectKey);
      const paramsUrl = await this.getSignedDownloadUrl(bucketKey, paramsObjectKey);

      // Step 5: Submit WorkItem
      console.log('🔧 Submitting to Design Automation...');
      const activityId = 'drumforge_app.DrumModifierActivity+current';
      const workItem = await this.submitWorkItem(activityId, inputUrl, outputUrl, paramsUrl, modificationParams);

      console.log(`✅ WorkItem submitted: ${workItem.id}`);
      
      return {
        workItemId: workItem.id,
        status: workItem.status,
        bucketKey,
        inputObjectKey,
        outputObjectKey
      };
    } catch (error) {
      console.error('Failed to submit F3D file:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Check submission status
   * @param {string} submissionId - ID of the submission
   */
  async getSubmissionStatus(submissionId) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/fusion/submissions/${submissionId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Autodesk-Personal-Access-Token': this.personalAccessToken
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get submission status:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Download modified F3D file from OSS
   * @param {string} bucketKey - OSS bucket key
   * @param {string} objectKey - Object key in the bucket
   * @param {string} outputPath - Path to save the modified file
   */
  async downloadModifiedFile(bucketKey, objectKey, outputPath) {
    try {
      return await this.downloadFileFromOSS(bucketKey, objectKey, outputPath);
    } catch (error) {
      console.error('Failed to download modified file:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Submit a WorkItem to Design Automation
   * @param {string} activityId - Activity ID to execute
   * @param {string} inputFileUrl - Signed URL for input F3D file
   * @param {string} outputFileUrl - Signed URL for output F3D file
   * @param {string} paramsFileUrl - Signed URL for params.json file
   */
  async submitWorkItem(activityId, inputFileUrl, outputFileUrl, paramsFileUrl = null, modificationParams = {}) {
    try {
      const accessToken = await this.getAccessToken();

      // Build the WorkItem payload using the correct structure
      const workItemPayload = {
        activityId: activityId,
        arguments: {
          inputFile: {
            url: inputFileUrl
          },
          outputFile: {
            url: outputFileUrl,
            verb: 'put'
          }
        }
      };

      // Add PersonalAccessToken as string value (required by Activity with verb: 'read')
      workItemPayload.arguments.PersonalAccessToken = this.personalAccessToken;

      // Add individual modification parameters
      if (modificationParams && typeof modificationParams === 'object') {
        for (const [key, value] of Object.entries(modificationParams)) {
          workItemPayload.arguments[key] = value;
        }
        console.log('Added modification parameters:', JSON.stringify(modificationParams));
      }

      // Add params file if provided (for reference/logging)
      if (paramsFileUrl) {
        workItemPayload.arguments.paramsFile = {
          url: paramsFileUrl
        };
      }

      console.log(`Submitting WorkItem for activity: ${activityId}`);
      console.log('Full Payload:', JSON.stringify(workItemPayload, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/da/us-east/v3/workitems`,
        workItemPayload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('WorkItem submitted successfully');
      return {
        id: response.data.id,
        status: response.data.status
      };
    } catch (error) {
      console.error('Failed to submit WorkItem:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get WorkItem status
   * @param {string} workItemId - ID of the WorkItem
   */
  async getWorkItemStatus(workItemId) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
      `${this.baseUrl}/da/us-east/v3/workitems/${workItemId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Autodesk-Personal-Access-Token': this.personalAccessToken
          }
        }
      );

      return {
        id: response.data.id,
        status: response.data.status,
        reportUrl: response.data.reportUrl
      };
    } catch (error) {
      console.error('Failed to get WorkItem status:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verify Design Automation is set up for this account
   */
  async verifyDesignAutomationSetup() {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/da/us-east/v3/forgeapps/me`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Autodesk-Personal-Access-Token': this.personalAccessToken
          }
        }
      );

      return {
        setupComplete: true,
        nickname: response.data.nickname
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          setupComplete: false,
          error: 'Design Automation not initialized for this account'
        };
      }
      throw error;
    }
  }

  /**
   * Create or update AppBundle
   */
  async setupAppBundle() {
    const NICKNAME = 'drumforge_app';
    const BUNDLE_NAME = 'DrumModifier';
    const bundleId = `${NICKNAME}.${BUNDLE_NAME}`;

    try {
      // First verify Design Automation is set up
      console.log('\n🔍 Verifying Design Automation account...');
      const daStatus = await this.verifyDesignAutomationSetup();
      
      if (!daStatus.setupComplete) {
        console.log('⚠️  Design Automation is not initialized for your account');
        console.log('\nTo set it up:');
        console.log('1. Go to: https://aps.autodesk.com/en/');
        console.log('2. Click "Manage your apps"');
        console.log('3. Go to Design Automation section');
        console.log('4. Create a new app and note your nickname');
        console.log('5. Set AUTODESK_DA_NICKNAME in your .env:\n');
        console.log('   AUTODESK_DA_NICKNAME=drumforge_app\n');
        throw new Error('Design Automation setup required');
      }

      console.log(`✓ Design Automation account verified (${daStatus.nickname})`);

      const accessToken = await this.getAccessToken();

      console.log(`\n📦 Setting up AppBundle: ${bundleId}`);

      // Try to create the AppBundle - if it exists we'll get a 409 Conflict
      const bundlePayload = {
        id: BUNDLE_NAME,
        engine: 'Autodesk.Fusion+Latest',
        description: 'DrumForge - Fusion 360 Drum Parameter Modifier Plugin'
      };

      try {
        const createResponse = await axios.post(
          `${this.baseUrl}/da/us-east/v3/appbundles`,
          bundlePayload,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'X-Autodesk-Personal-Access-Token': this.personalAccessToken
            }
          }
        );

        console.log(`✓ AppBundle created: ${createResponse.data.id}`);
        
        // Upload the plugin code
        if (createResponse.data.uploadParameters) {
          console.log('   Packaging plugin code...');
          const appbundlePath = path.join(__dirname, 'appbundle', 'DrumModifier');
          const zipPath = path.join(__dirname, '../output', 'DrumModifier.zip');
          
          // Ensure output directory exists
          const outputDir = path.dirname(zipPath);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          
          // Create zip file
          await this.createZipFromDirectory(appbundlePath, zipPath);
          
          // Upload to signed URL
          console.log('   Uploading plugin code...');
          const uploadUrl = createResponse.data.uploadParameters.endpointURL;
          await this.uploadFileToSignedUrl(zipPath, uploadUrl);
          
          console.log('   ✓ Plugin code uploaded');
          
          // Clean up zip file
          fs.unlinkSync(zipPath);
        }
        
        return {
          id: createResponse.data.id,
          version: createResponse.data.version,
          created: true
        };
      } catch (error) {
        // If we get 409 Conflict, the AppBundle already exists
        if (error.response?.status === 409) {
          console.log('✓ AppBundle already exists');
          return {
            id: bundleId,
            version: 1,
            created: false
          };
        }
        // Otherwise, this is a real error
        throw error;
      }
    } catch (error) {
      console.error('\n❌ Failed to set up AppBundle:');
      if (error.response?.data) {
        console.error('   ', error.response.data.developerMessage || error.response.data.message);
      } else {
        console.error('   ', error.message);
      }
      throw error;
    }
  }

  /**
   * Create or update Activity
   */
  async setupActivity() {
    const NICKNAME = 'drumforge_app';
    const BUNDLE_NAME = 'DrumModifier';
    const ACTIVITY_NAME = 'DrumModifierActivity';
    const bundleId = `${NICKNAME}.${BUNDLE_NAME}`;
    const activityId = `${NICKNAME}.${ACTIVITY_NAME}`;

    try {
      const accessToken = await this.getAccessToken();

      console.log(`\n⚙️  Setting up Activity: ${activityId}`);

      const activityPayload = {
        id: ACTIVITY_NAME,  // Unqualified - API will add nickname automatically
        engine: 'Autodesk.Fusion+Latest',
        appbundles: [`${bundleId}+Latest`],
        commandLine: [],
        parameters: {
          inputFile: {
            verb: 'get',
            description: 'Input F3D file',
            localName: 'input.f3d'
          },
          outputFile: {
            verb: 'put',
            description: 'Output F3D file',
            localName: 'output.f3d'
          },
          paramsFile: {
            verb: 'get',
            description: 'Parameters JSON file',
            localName: 'params.json',
            required: false
          },
          NumSegments: {
            verb: 'get',
            description: 'Number of segments',
            required: false
          },
          ShellThick: {
            verb: 'get',
            description: 'Shell thickness',
            required: false
          },
          ShellHeight: {
            verb: 'get',
            description: 'Shell height',
            required: false
          },
          ShellDiam: {
            verb: 'get',
            description: 'Shell diameter',
            required: false
          },
          LugTopDist: {
            verb: 'get',
            description: 'Lug top distance',
            required: false
          },
          LugSpacing: {
            verb: 'get',
            description: 'Lug spacing',
            required: false
          },
          LapSizePercent: {
            verb: 'get',
            description: 'Lap size percentage',
            required: false
          },
          LugHoleDiam: {
            verb: 'get',
            description: 'Lug hole diameter',
            required: false
          },
          PersonalAccessToken: {
            verb: 'get',
            description: 'Personal Access Token for Fusion operations',
            required: true
          }
        },
        description: 'Modifies drum parameters in Fusion 360 F3D files'
      };

      try {
        const response = await axios.post(
        `${this.baseUrl}/da/us-east/v3/activities`,
          activityPayload,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'X-Autodesk-Personal-Access-Token': this.personalAccessToken
            }
          }
        );

        console.log(`✓ Activity created: ${response.data.id}`);
        return {
          id: response.data.id,
          version: response.data.version,
          created: true
        };
      } catch (error) {
        // Log the full error for debugging
        console.log('Activity creation error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        
        // Handle conflicts - Activity already exists
        if (error.response?.status === 409 || 
            JSON.stringify(error.response?.data).includes('already exists')) {
          console.log('✓ Activity already exists');
          return {
            id: activityId,
            created: false
          };
        }
        throw error;
      }
    } catch (error) {
      console.error('\n❌ Failed to set up Activity:');
      if (error.response?.data?.developerMessage) {
        console.error('   ', error.response.data.developerMessage);
      } else {
        console.error('   ', error.message);
      }
      throw error;
    }
  }

  /**
   * Create Activity alias
   */
  async setupActivityAlias() {
    const NICKNAME = 'drumforge_app';
    const ACTIVITY_NAME = 'DrumModifierActivity';
    const activityId = `${NICKNAME}.${ACTIVITY_NAME}`;

    try {
      const accessToken = await this.getAccessToken();

      console.log(`\n🔗 Setting up Activity Alias`);

      try {
        // Use unqualified name in URL path
        const response = await axios.post(
        `${this.baseUrl}/da/us-east/v3/activities/${ACTIVITY_NAME}/aliases`,
          { id: 'current', version: 1 },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'X-Autodesk-Personal-Access-Token': this.personalAccessToken
            }
          }
        );

        console.log('✓ Alias created: +current');
        return { id: 'current', created: true };
      } catch (error) {
        // Log full error details
        console.log('Alias creation error:', {
          status: error.response?.status,
          data: error.response?.data
        });
        
        if (error.response?.status === 409) {
          console.log('✓ Alias already exists: +current');
          return { id: 'current', created: false };
        }
        throw error;
      }
    } catch (error) {
      console.error('\n❌ Failed to set up Activity alias:');
      if (error.response?.data?.developerMessage) {
        console.error('   ', error.response.data.developerMessage);
      } else {
        console.error('   ', error.message);
      }
      throw error;
    }
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus() {
    const NICKNAME = 'drumforge_app';
    const BUNDLE_NAME = 'DrumModifier';
    const ACTIVITY_NAME = 'DrumModifierActivity';
    const bundleId = `${NICKNAME}.${BUNDLE_NAME}`;
    const activityId = `${NICKNAME}.${ACTIVITY_NAME}`;

    const status = {
      appBundle: { exists: false, version: null },
      activity: { exists: false, version: null },
      alias: { exists: false }
    };

    try {
      const accessToken = await this.getAccessToken();

      // Check AppBundle
      try {
        const bundleResponse = await axios.get(
          `${this.baseUrl}/da/us-east/v3/appbundles/${bundleId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'X-Autodesk-Personal-Access-Token': this.personalAccessToken
            }
          }
        );
        status.appBundle = { exists: true, version: bundleResponse.data.version };
      } catch (error) {
        if (error.response?.status !== 404) throw error;
      }

      // Check Activity
      try {
        const activityResponse = await axios.get(
          `${this.baseUrl}/da/us-east/v3/activities/${activityId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'X-Autodesk-Personal-Access-Token': this.personalAccessToken
            }
          }
        );
        status.activity = { exists: true, version: activityResponse.data.version };
      } catch (error) {
        if (error.response?.status !== 404) throw error;
      }

      // Check Alias
      try {
        const aliasResponse = await axios.get(
          `${this.baseUrl}/da/us-east/v3/activities/${activityId}/aliases/current`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'X-Autodesk-Personal-Access-Token': this.personalAccessToken
            }
          }
        );
        status.alias = { exists: true };
      } catch (error) {
        if (error.response?.status !== 404) throw error;
      }

      return status;
    } catch (error) {
      console.error('Failed to get deployment status:', error.message);
      throw error;
    }
  }

  /**
   * OSS (Object Storage Service) Methods
   */

  /**
   * Create or get OSS bucket
   */
  async createBucket(bucketKey) {
    try {
      const accessToken = await this.getAccessToken();

      // Bucket keys must be lowercase and URL-safe
      const safeBucketKey = bucketKey.toLowerCase().replace(/[^a-z0-9\-_.]/g, '');

      try {
        // Try to create the bucket using Data Management API
        const response = await axios.post(
          `${this.baseUrl}/oss/v2/buckets`,
          {
            bucketKey: safeBucketKey,
            policyKey: 'temporary' // Files auto-delete after 24 hours
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log(`✓ Bucket created: ${safeBucketKey}`);
        return { bucketKey: safeBucketKey, created: true };
      } catch (error) {
        if (error.response?.status === 409) {
          // Bucket already exists
          console.log(`✓ Bucket exists: ${safeBucketKey}`);
          return { bucketKey: safeBucketKey, created: false };
        }
        throw error;
      }
    } catch (error) {
      console.error('Failed to create bucket:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Upload file to OSS bucket using signed URL
   */
  async uploadFileToOSS(bucketKey, objectKey, filePath) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const fileStats = fs.statSync(filePath);

      console.log(`   Uploading ${path.basename(filePath)} (${Math.round(fileStats.size / 1024)} KB)...`);

      const accessToken = await this.getAccessToken();

      // Get signed readwrite URL for simple upload (works for files < 100MB)
      const signedUrlResponse = await axios.post(
        `${this.baseUrl}/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}/signed?access=readwrite`,
        {
          minutesExpiration: 30
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const signedUrl = signedUrlResponse.data.signedUrl;

      // Upload file using the signed URL
      await axios.put(
        signedUrl,
        fileBuffer,
        {
          headers: {
            'Content-Type': 'application/octet-stream'
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      console.log(`   ✓ File uploaded: ${objectKey}`);
      
      // Get object details
      const objectResponse = await axios.get(
        `${this.baseUrl}/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}/details`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      return {
        bucketKey,
        objectKey,
        objectId: objectResponse.data.objectId,
        size: objectResponse.data.size
      };
    } catch (error) {
      console.error('Failed to upload file to OSS:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Generate signed URL for reading from OSS
   */
  async getSignedDownloadUrl(bucketKey, objectKey) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}/signed`,
        {
          minutesExpiration: 60,
          singleUse: false
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.signedUrl;
    } catch (error) {
      console.error('Failed to get signed download URL:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Generate signed URL for writing to OSS
   */
  async getSignedUploadUrl(bucketKey, objectKey) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}/signed?access=write`,
        {
          minutesExpiration: 60
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.signedUrl;
    } catch (error) {
      console.error('Failed to get signed upload URL:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Download file from OSS
   */
  async downloadFileFromOSS(bucketKey, objectKey, outputPath) {
    try {
      console.log(`   Downloading ${objectKey} from OSS...`);

      const signedUrl = await this.getSignedDownloadUrl(bucketKey, objectKey);
      const response = await axios.get(signedUrl, {
        responseType: 'arraybuffer'
      });

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, response.data);
      console.log(`   ✓ File downloaded: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('Failed to download file from OSS:', error.response?.data || error.message);
      throw error;
    }
  }
}

export default AutodeskAPIClient;

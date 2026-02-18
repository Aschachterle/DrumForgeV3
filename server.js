import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { config, validateConfig } from './src/config.js';
import AutodeskAPIClient from './src/autodesk-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Demo mode - set to true to use mock job processing instead of real Design Automation
const DEMO_MODE = process.env.DEMO_MODE === 'true';

// Setup logging to file
const LOG_FILE = path.join(__dirname, 'server.log');
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  process.stdout.write(logMessage);
  logStream.write(logMessage);
};

const logError = (message, error) => {
  const timestamp = new Date().toISOString();
  const errorDetails = error?.response?.data ? JSON.stringify(error.response.data) : error?.message || error;
  const logMessage = `[${timestamp}] ERROR: ${message} - ${errorDetails}\n`;
  process.stderr.write(logMessage);
  logStream.write(logMessage);
};

// Log server start
log('='.repeat(80));
log(`Server starting in ${DEMO_MODE ? 'DEMO' : 'PRODUCTION'} mode`);
log('='.repeat(80));

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Reference to the drum file
const drumFilePath = path.join(__dirname, 'Resources', 'ParametricDrum.f3d');

const mockJobs = new Map();
const jobMetadata = new Map(); // Store OSS bucket/object info for real jobs

// Initialize API client
let apiClient;
try {
  validateConfig();
  apiClient = new AutodeskAPIClient(config);
  log('✓ API client initialized successfully');
} catch (error) {
  logError('Configuration error', error);
}

// Routes

/**
 * GET / - Serve the frontend
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * POST /api/submit - Submit modification job to Design Automation
 */
app.post('/api/submit', async (req, res) => {
  try {
    const { parameters } = req.body;

    if (!parameters) {
      return res.status(400).json({ error: 'Parameters required' });
    }

    if (!fs.existsSync(drumFilePath)) {
      return res.status(404).json({ error: 'Drum file not found' });
    }

    if (DEMO_MODE) {
      // Mock job processing for demo/testing
      const jobId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mockJob = {
        id: jobId,
        status: 'pending',
        parameters,
        submittedAt: new Date(),
        progress: 0
      };
      mockJobs.set(jobId, mockJob);

      // Simulate processing stages
      const stages = [
        { delay: 1000, progress: 20 },
        { delay: 3000, progress: 50 },
        { delay: 5000, progress: 75 },
        { delay: 7000, progress: 100, status: 'success' }
      ];

      stages.forEach(stage => {
        setTimeout(() => {
          const job = mockJobs.get(jobId);
          if (job) {
            job.progress = stage.progress;
            job.status = stage.status || 'pending';
          }
        }, stage.delay);
      });

      return res.json({
        success: true,
        workItemId: jobId,
        status: 'pending',
        message: 'Demo job submitted (mock processing)',
        demo: true
      });
    }

    if (!apiClient) {
      return res.status(500).json({ error: 'API client not initialized' });
    }

    // Real Design Automation submission using OSS
    const result = await apiClient.submitF3DFile(drumFilePath, parameters);

    // Store job metadata for later retrieval
    jobMetadata.set(result.workItemId, {
      bucketKey: result.bucketKey,
      inputObjectKey: result.inputObjectKey,
      outputObjectKey: result.outputObjectKey,
      parameters,
      submittedAt: new Date()
    });

    res.json({
      success: true,
      workItemId: result.workItemId,
      status: result.status,
      message: 'Job submitted to Design Automation'
    });
  } catch (error) {
    logError('Error submitting job', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Job submission failed. Check server logs for details.'
    });
  }
});

/**
 * GET /api/job-status/:id - Check job status
 */
app.get('/api/job-status/:id', async (req, res) => {
  try {
    const jobId = req.params.id;

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID required' });
    }

    // Check mock jobs first (for demo mode)
    if (mockJobs.has(jobId)) {
      const job = mockJobs.get(jobId);
      return res.json({
        id: job.id,
        status: job.status,
        progress: job.progress,
        parameters: job.parameters,
        demo: true
      });
    }

    // Real Design Automation status
    if (!apiClient) {
      return res.status(500).json({ error: 'API client not initialized' });
    }

    log(`Checking status for job: ${jobId}`);
    const status = await apiClient.getWorkItemStatus(jobId);
    
    // Log WorkItem details to server.log
    log(`WorkItem ${jobId} status: ${status.status}`);
    if (status.reportUrl) {
      log(`  Report URL: ${status.reportUrl}`);
      // Fetch and log the report
      try {
        const reportResponse = await axios.get(status.reportUrl);
        log(`  Report logs: ${JSON.stringify(reportResponse.data.logs || reportResponse.data, null, 2)}`);
      } catch (err) {
        log(`  Could not fetch report: ${err.message}`);
      }
    }

    res.json({
      id: status.id,
      status: status.status,
      reportUrl: status.reportUrl
    });
  } catch (error) {
    logError('Error checking status', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        error: 'Job not found',
        details: 'This job ID does not exist or has expired.'
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to check job status',
      details: 'Check server logs for details.'
    });
  }
});

/**
 * GET /api/health - Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apiReady: !!apiClient,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/download/:id - Download processed file
 */
app.get('/api/download/:id', async (req, res) => {
  try {
    const jobId = req.params.id;

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID required' });
    }

    // Check if job exists
    const metadata = jobMetadata.get(jobId);
    if (!metadata) {
      return res.status(404).json({ error: 'Job not found or download not available' });
    }

    if (!apiClient) {
      return res.status(500).json({ error: 'API client not initialized' });
    }

    // Check if job is complete
    const status = await apiClient.getWorkItemStatus(jobId);
    if (status.status !== 'success') {
      return res.status(400).json({ 
        error: 'Job not complete', 
        status: status.status,
        details: 'Wait for job to complete before downloading'
      });
    }

    // Download file from OSS to temp location
    const outputPath = path.join(__dirname, 'output', `result_${jobId}.f3d`);
    await apiClient.downloadModifiedFile(
      metadata.bucketKey,
      metadata.outputObjectKey,
      outputPath
    );

    // Send file to client
    res.download(outputPath, 'modified_drum.f3d', (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
      // Clean up temp file
      fs.unlinkSync(outputPath);
    });
  } catch (error) {
    logError('Error downloading file', error);
    res.status(500).json({ 
      error: error.message || 'Failed to download file',
      details: 'Check server logs for details.'
    });
  }
});

/**
 * GET /api/config - Get UI configuration
 */
app.get('/api/config', (req, res) => {
  res.json({
    activity: 'drumforge_app.DrumModifierActivity+current',
    parameters: {
      NumSegments: { default: 2, type: 'number' },
      ShellThick: { default: '6 mm', type: 'text' },
      ShellHeight: { default: '6 in', type: 'text' },
      ShellDiam: { default: '12 in', type: 'text' },
      LugTopDist: { default: '2 in', type: 'text' },
      LugSpacing: { default: '2 in', type: 'text' },
      LapSizePercent: { default: 22, type: 'number' },
      LugHoleDiam: { default: '0.25 in', type: 'text' }
    }
  });
});

/**
 * SETUP ENDPOINTS - Built-in AppBundle and Activity deployment
 */

/**
 * POST /api/setup/init-da - Initialize Design Automation
 */
app.post('/api/setup/init-da', async (req, res) => {
  try {
    if (!apiClient) {
      return res.status(500).json({ error: 'API client not initialized' });
    }

    console.log('\n🏢 Initializing Design Automation...');

    const accessToken = await apiClient.getAccessToken();

    const NICKNAME = 'drumforge_app';

    try {
      const response = await axios.patch(
        `${config.baseUrl}/da/us-east/v3/forgeapps/me`,
        {
          nickname: NICKNAME,
          id: NICKNAME
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Autodesk-Personal-Access-Token': config.personalAccessToken
          }
        }
      );

      console.log('✓ Design Automation initialized');
      
      res.json({
        success: true,
        message: 'Design Automation initialized successfully',
        nickname: response.data.nickname || NICKNAME
      });
    } catch (error) {
      if (error.response?.status === 409 || error.response?.status === 400) {
        // Already exists, try to get it
        try {
          const getResponse = await axios.get(
            `${config.baseUrl}/da/us-east/v3/forgeapps/me`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Autodesk-Personal-Access-Token': config.personalAccessToken
              }
            }
          );

          res.json({
            success: true,
            message: 'Design Automation already initialized',
            nickname: getResponse.data.nickname
          });
        } catch (innerError) {
          throw error; // Re-throw original error if get also fails
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error initializing Design Automation:', error.message);
    
    let details = 'Design Automation initialization failed';
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      details = 'Authentication failed. Check your credentials.';
    } else if (error.response?.data?.developerMessage) {
      details = error.response.data.developerMessage;
    }

    res.status(500).json({
      error: error.message,
      details,
      help: 'Design Automation may need to be enabled in your Autodesk account first'
    });
  }
});

/**
 * GET /api/setup/status - Get current deployment status
 */
app.get('/api/setup/status', async (req, res) => {
  try {
    if (!apiClient) {
      return res.status(500).json({ error: 'API client not initialized' });
    }

    const status = await apiClient.getDeploymentStatus();
    
    const isReady = status.appBundle.exists && status.activity.exists && status.alias.exists;
    
    res.json({
      ready: isReady,
      status,
      message: isReady 
        ? 'All set! Ready to process jobs.'
        : 'Setup incomplete. Run setup steps to enable real file processing.'
    });
  } catch (error) {
    console.error('Error checking deployment status:', error.message);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to check deployment status'
    });
  }
});

/**
 * POST /api/setup/appbundle - Create or update AppBundle
 */
app.post('/api/setup/appbundle', async (req, res) => {
  try {
    if (!apiClient) {
      return res.status(500).json({ error: 'API client not initialized' });
    }

    console.log('🚀 Starting AppBundle setup...');
    const result = await apiClient.setupAppBundle();
    
    res.json({
      success: true,
      message: result.created ? 'AppBundle created successfully' : 'AppBundle already exists',
      result
    });
  } catch (error) {
    console.error('Error setting up AppBundle:', error.message);
    
    // Provide helpful error messages
    let details = 'AppBundle setup failed. Check server logs for details.';
    
    if (error.message.includes('Design Automation')) {
      details = error.message;
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      details = 'Authentication failed. Check your Autodesk credentials in .env';
    } else if (error.response?.data?.developerMessage) {
      details = error.response.data.developerMessage;
    }
    
    res.status(500).json({ 
      error: error.message,
      details
    });
  }
});

/**
 * POST /api/setup/activity - Create or update Activity
 */
app.post('/api/setup/activity', async (req, res) => {
  try {
    if (!apiClient) {
      return res.status(500).json({ error: 'API client not initialized' });
    }

    console.log('🚀 Starting Activity setup...');
    const result = await apiClient.setupActivity();
    
    res.json({
      success: true,
      message: result.created ? 'Activity created successfully' : 'Activity already exists',
      result
    });
  } catch (error) {
    console.error('Error setting up Activity:', error.message);
    res.status(500).json({ 
      error: error.message,
      details: 'Activity setup failed. Check server logs for details.'
    });
  }
});

/**
 * POST /api/setup/alias - Create Activity alias
 */
app.post('/api/setup/alias', async (req, res) => {
  try {
    if (!apiClient) {
      return res.status(500).json({ error: 'API client not initialized' });
    }

    console.log('🚀 Starting Activity Alias setup...');
    const result = await apiClient.setupActivityAlias();
    
    res.json({
      success: true,
      message: result.created ? 'Alias created successfully' : 'Alias already exists',
      result
    });
  } catch (error) {
    console.error('Error setting up Activity alias:', error.message);
    res.status(500).json({ 
      error: error.message,
      details: 'Alias setup failed. Check server logs for details.'
    });
  }
});

/**
 * POST /api/setup/upload-appbundle-manual - Upload AppBundle from zip file
 */
app.post('/api/setup/upload-appbundle-manual', async (req, res) => {
  try {
    if (!apiClient) {
      return res.status(500).json({ error: 'API client not initialized' });
    }

    const { zipFileName } = req.body; // e.g., "DrumModifier-v16.zip"
    const zipPath = path.join(__dirname, 'output', zipFileName || 'DrumModifier-v16.zip');
    
    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({ error: `Zip file not found: ${zipPath}` });
    }
    
    log(`📦 Uploading AppBundle from ${zipPath}...`);
    
    const accessToken = await apiClient.getAccessToken();
    const BUNDLE_NAME = 'DrumModifier';
    
    // Create new version
    const versionResponse = await axios.post(
      `https://developer.api.autodesk.com/da/us-east/v3/appbundles/${BUNDLE_NAME}/versions`,
      {
        engine: 'Autodesk.Fusion+Latest',
        description: `DrumForge - Fusion 360 Drum Modifier (${zipFileName})`
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Autodesk-Personal-Access-Token': config.personalAccessToken
        }
      }
    );
    
    log(`✓ Version ${versionResponse.data.version} created`);
    
    // Upload the zip
    const uploadParams = versionResponse.data.uploadParameters;
    const FormData = (await import('form-data')).default;
    
    const form = new FormData();
    if (uploadParams.formData) {
      Object.entries(uploadParams.formData).forEach(([key, value]) => {
        form.append(key, value);
      });
    }
    form.append('file', fs.createReadStream(zipPath));
    
    await axios.post(uploadParams.endpointURL, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    log('✓ Uploaded');
    
    // Update Latest alias
    await axios.patch(
      `https://developer.api.autodesk.com/da/us-east/v3/appbundles/${BUNDLE_NAME}/aliases/Latest`,
      { version: versionResponse.data.version },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Autodesk-Personal-Access-Token': config.personalAccessToken
        }
      }
    );
    
    log(`✓ Alias updated to version ${versionResponse.data.version}`);
    
    res.json({
      success: true,
      version: versionResponse.data.version,
      message: `AppBundle version ${versionResponse.data.version} uploaded successfully`
    });
    
  } catch (error) {
    logError('Error uploading AppBundle', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || 'AppBundle upload failed'
    });
  }
});

/**
 * POST /api/setup/deploy - Complete deployment (AppBundle + Activity + Alias)
 */
app.post('/api/setup/deploy', async (req, res) => {
  try {
    if (!apiClient) {
      return res.status(500).json({ error: 'API client not initialized' });
    }

    console.log('\n🚀 Starting complete setup process...\n');

    const results = {
      appBundle: null,
      activity: null,
      alias: null,
      success: false,
      message: ''
    };

    try {
      results.appBundle = await apiClient.setupAppBundle();
    } catch (error) {
      console.error('AppBundle error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        fullError: error.toString()
      });
      return res.status(500).json({
        error: 'AppBundle setup failed',
        details: error.response?.data?.developerMessage || error.response?.data?.message || error.message,
        fullError: error.toString(),
        results
      });
    }

    try {
      results.activity = await apiClient.setupActivity();
    } catch (error) {
      return res.status(500).json({
        error: 'Activity setup failed',
        details: error.message,
        results
      });
    }

    try {
      results.alias = await apiClient.setupActivityAlias();
    } catch (error) {
      return res.status(500).json({
        error: 'Alias setup failed',
        details: error.message,
        results
      });
    }

    results.success = true;
    results.message = '✅ Setup complete! Your application is ready to process files.';

    console.log('\n' + '='.repeat(60));
    console.log(results.message);
    console.log('='.repeat(60) + '\n');

    res.json(results);
  } catch (error) {
    console.error('Error during deployment:', error.message);
    res.status(500).json({ 
      error: error.message,
      details: 'Deployment failed. Check server logs for details.'
    });
  }
});

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
  console.error('=== Server Error ===');
  console.error('Path:', req.path);
  console.error('Method:', req.method);
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('===================');
  res.status(500).json({ 
    error: err.message,
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  log('');
  log(`✓ DrumForge Web Server running at http://localhost:${PORT}`);
  log(`Open http://localhost:${PORT} in your browser to start`);
  log('');
  log('Features:');
  log('  • Modify drum parameters');
  log('  • Submit to Autodesk for processing');
  log('  • Track job status');
  log('');

  if (DEMO_MODE) {
    log('📋 MODE: DEMO (Simulated Processing)');
    log('   Jobs will simulate processing without real file modification.');
    log('   To enable real file processing:');
    log('   1. POST http://localhost:3000/api/setup/deploy');
    log('      (Creates AppBundle, Activity, and Alias)');
    log('   2. Upload AppBundle to cloud storage');
    log('   3. npm run web (Start with real processing)');
  } else {
    log('🔧 MODE: PRODUCTION (Real File Processing)');
    log('   Jobs will be submitted to Autodesk Design Automation.');
    log('   Setup endpoints available:');
    log('   • POST /api/setup/init-da  - Initialize Design Automation');
    log('   • GET  /api/setup/status   - Check deployment status');
    log('   • POST /api/setup/deploy   - Complete setup (all 3 steps)');
    log('   • POST /api/setup/appbundle - Create AppBundle');
    log('   • POST /api/setup/activity  - Create Activity');
    log('   • POST /api/setup/alias     - Create Activity alias');
    log('   If you see "Design Automation not found":');
    log('   1. POST http://localhost:3000/api/setup/init-da');
    log('   2. Follow the guidance provided');
    log('   For demo mode: npm run demo');
  }

  log(`Drum file: ${drumFilePath}`);
  log('=' .repeat(50));
});

// Catch unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Rejection', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logError('Uncaught Exception', error);
  process.exit(1);
});
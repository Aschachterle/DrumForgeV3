import AutodeskAPI from './src/autodesk-api.js';
import { config } from './src/config.js';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const api = new AutodeskAPI(config);

(async () => {
  try {
    const token = await api.getAccessToken();
    
    const BUNDLE_NAME = 'DrumModifier';
    
    // Step 1: Create a new version of the AppBundle
    console.log('Creating AppBundle version (JavaScript)...');
    const versionPayload = {
      engine: 'Autodesk.Fusion+Latest',
      description: 'DrumForge - Fusion 360 Drum Modifier (JavaScript)'
    };
    
    const versionResponse = await axios.post(
      `https://developer.api.autodesk.com/da/us-east/v3/appbundles/${BUNDLE_NAME}/versions`,
      versionPayload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Autodesk-Personal-Access-Token': config.personalAccessToken
        }
      }
    );
    
    console.log('✓ AppBundle version', versionResponse.data.version, 'created');
    console.log('Upload parameters:', JSON.stringify(versionResponse.data.uploadParameters, null, 2));
    
    // Step 2: Package and upload the JavaScript plugin code
    console.log('\nPackaging JavaScript plugin...');
    const appbundlePath = path.join(__dirname, 'src/appbundle', 'DrumModifier.bundle');
    const zipPath = path.join(__dirname, 'output', 'DrumModifier.zip');
    
    await api.createZipFromDirectory(appbundlePath, zipPath);
    
    console.log('Uploading JavaScript plugin using form data...');
    const uploadParams = versionResponse.data.uploadParameters;
    const FormData = (await import('form-data')).default;
    const fs = (await import('fs')).default;
    
    const form = new FormData();
    
    // Add all form fields from uploadParameters.formData
    if (uploadParams.formData) {
      Object.entries(uploadParams.formData).forEach(([key, value]) => {
        form.append(key, value);
      });
    }
    
    // Add the file last
    form.append('file', fs.createReadStream(zipPath));
    
    await axios.post(uploadParams.endpointURL, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    console.log('✓ JavaScript plugin uploaded');
    
    // Step 3: Update or create the 'Latest' alias
    console.log('\nSetting up Latest alias...');
    try {
      const aliasResponse = await axios.patch(
        `https://developer.api.autodesk.com/da/us-east/v3/appbundles/${BUNDLE_NAME}/aliases/Latest`,
        { version: versionResponse.data.version },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Autodesk-Personal-Access-Token': config.personalAccessToken
          }
        }
      );
      console.log('✓ Alias updated to version', aliasResponse.data.version);
    } catch (error) {
      if (error.response?.status === 404) {
        // Alias doesn't exist, create it
        const aliasResponse = await axios.post(
          `https://developer.api.autodesk.com/da/us-east/v3/appbundles/${BUNDLE_NAME}/aliases`,
          {
            id: 'Latest',
            version: versionResponse.data.version
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'X-Autodesk-Personal-Access-Token': config.personalAccessToken
            }
          }
        );
        console.log('✓ Alias created:', aliasResponse.data.id, '-> version', aliasResponse.data.version);
      } else {
        throw error;
      }
    }
    
    console.log('\n✅ JavaScript AppBundle is now ready with plugin code!');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    process.exit(1);
  }
})();

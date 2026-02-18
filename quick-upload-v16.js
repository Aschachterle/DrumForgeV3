// Quick upload using server's API instance
import express from 'express';
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
    // Use the same API instance as the server
    const token = await api.getAccessToken();
    console.log('Got token:', token.substring(0, 20) + '...');
    
    const BUNDLE_NAME = 'DrumModifier';
    
    // Create new version
    console.log('Creating AppBundle version 16...');
    const versionResponse = await axios.post(
      `https://developer.api.autodesk.com/da/us-east/v3/appbundles/${BUNDLE_NAME}/versions`,
      {
        engine: 'Autodesk.Fusion+Latest',
        description: 'DrumForge - Fusion 360 Drum Modifier v16 (manifest in root)'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Autodesk-Personal-Access-Token': config.personalAccessToken
        }
      }
    );
    
    console.log('✓ Version', versionResponse.data.version, 'created');
    
    // Package and upload
    const appbundlePath = path.join(__dirname, 'src/appbundle', 'DrumModifier.bundle');
    const zipPath = path.join(__dirname, 'output', 'DrumModifier.zip');
    
    await api.createZipFromDirectory(appbundlePath, zipPath);
    
    console.log('Uploading...');
    const uploadParams = versionResponse.data.uploadParameters;
    const FormData = (await import('form-data')).default;
    const fs = (await import('fs')).default;
    
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
    
    console.log('✓ Uploaded');
    
    // Update alias
    await axios.patch(
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
    
    console.log('✓ Alias updated to version', versionResponse.data.version);
    console.log('\n✅ AppBundle v16 ready (manifest in bundle root)');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    process.exit(1);
  }
})();

#!/usr/bin/env node

import { config, validateConfig } from './src/config.js';
import AutodeskAPIClient from './src/autodesk-api.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NICKNAME = 'drumforge_app';
const BUNDLE_NAME = 'DrumModifier';
const ACTIVITY_NAME = 'DrumModifierActivity';

async function deployAppBundle() {
  try {
    console.log('\n🚀 DrumForge AppBundle Deployment\n');
    console.log('=' .repeat(60));

    // Validate configuration
    console.log('\n📋 Step 1: Validating Configuration');
    validateConfig();
    console.log('✓ Configuration validated');

    // Initialize API client
    const apiClient = new AutodeskAPIClient(config);
    console.log('✓ Autodesk API client initialized');

    // Get access token
    console.log('\n📡 Step 2: Authenticating with Autodesk APS');
    const token = await apiClient.getAccessToken();
    console.log('✓ Successfully authenticated');

    // Create or update AppBundle
    console.log(`\n📦 Step 3: Creating/Updating AppBundle`);
    console.log(`   Name: ${NICKNAME}.${BUNDLE_NAME}`);

    const bundleId = `${NICKNAME}.${BUNDLE_NAME}`;
    
    try {
      // Check if AppBundle exists
      const checkBundle = await axios.get(
        `${config.baseUrl}/da/us-east/v3/appbundles/${bundleId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Autodesk-Personal-Access-Token': config.personalAccessToken
          }
        }
      );

      console.log('✓ AppBundle already exists');
      console.log(`  Version: ${checkBundle.data.version}`);

      // Create a new version
      console.log('\n   Creating new version...');

      const bundlePayload = {
        description: 'DrumForge - Fusion 360 Drum Parameter Modifier Plugin'
      };

      const newVersion = await axios.post(
        `${config.baseUrl}/da/us-east/v3/appbundles/${bundleId}/versions`,
        bundlePayload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Autodesk-Personal-Access-Token': config.personalAccessToken
          }
        }
      );

      console.log(`✓ New version created: ${newVersion.data.version}`);

    } catch (error) {
      if (error.response?.status === 404) {
        // Create new AppBundle
        console.log('   AppBundle not found, creating new...');

        const bundlePayload = {
          id: BUNDLE_NAME,
          engine: 'Fusion360',
          description: 'DrumForge - Fusion 360 Drum Parameter Modifier Plugin'
        };

        const createResponse = await axios.post(
          `${config.baseUrl}/da/us-east/v3/appbundles`,
          bundlePayload,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'X-Autodesk-Personal-Access-Token': config.personalAccessToken
            }
          }
        );

        console.log(`✓ AppBundle created: ${createResponse.data.id}`);
        console.log(`  Version: ${createResponse.data.version}`);

      } else {
        throw error;
      }
    }

    // Create/Update Activity
    console.log(`\n⚙️  Step 4: Creating/Updating Activity`);
    console.log(`   Name: ${NICKNAME}.${ACTIVITY_NAME}`);

    const activityId = `${NICKNAME}.${ACTIVITY_NAME}`;

    try {
      const activityPayload = {
        id: ACTIVITY_NAME,
        engine: 'Fusion360',
        appBundles: [bundleId],
        commandLine: `$(engine.path)\\plugin.exe $(args[inputFile].path) $(args[outputFile].path)`,
        parameters: [
          { name: 'inputFile', verb: 'get', localName: 'input.f3d' },
          { name: 'NumSegments', verb: 'post', required: false },
          { name: 'ShellThick', verb: 'post', required: false },
          { name: 'ShellHeight', verb: 'post', required: false },
          { name: 'ShellDiam', verb: 'post', required: false },
          { name: 'LugTopDist', verb: 'post', required: false },
          { name: 'LugSpacing', verb: 'post', required: false },
          { name: 'LapSizePercent', verb: 'post', required: false },
          { name: 'LugHoleDiam', verb: 'post', required: false },
          { name: 'outputFile', verb: 'put', localName: 'output.f3d' }
        ],
        description: 'Modifies drum parameters in Fusion 360 F3D files'
      };

      // Try to create activity
      const activityResponse = await axios.post(
        `${config.baseUrl}/da/us-east/v3/activities`,
        activityPayload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Autodesk-Personal-Access-Token': config.personalAccessToken
          }
        }
      ).catch(err => {
        if (err.response?.status === 409) {
          return null; // Activity already exists
        }
        throw err;
      });

      if (activityResponse) {
        console.log(`✓ Activity created: ${activityResponse.data.id}`);
      } else {
        console.log('✓ Activity already exists');
      }

    } catch (error) {
      console.log(`⚠ Activity creation note: ${error.response?.data?.message || error.message}`);
    }

    // Create/Update Activity Alias
    console.log(`\n🔗 Step 5: Creating Activity Alias (+current)`);

    try {
      const aliasResponse = await axios.post(
        `${config.baseUrl}/da/us-east/v3/activities/${activityId}/aliases`,
        { id: 'current', version: 1 },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Autodesk-Personal-Access-Token': config.personalAccessToken
          }
        }
      ).catch(err => {
        if (err.response?.status === 409) {
          return null; // Alias already exists
        }
        throw err;
      });

      if (aliasResponse) {
        console.log('✓ Alias created: +current');
      } else {
        console.log('✓ Alias already exists: +current');
      }

    } catch (error) {
      console.log(`⚠ Alias creation note: ${error.response?.data?.message || error.message}`);
    }

    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('\n✅ AppBundle & Activity Deployment Complete!\n');

    console.log('Your Design Automation Setup:');
    console.log(`  Nickname:    ${NICKNAME}`);
    console.log(`  AppBundle:   ${bundleId}`);
    console.log(`  Activity:    ${activityId}+current\n`);

    console.log('⚠️  IMPORTANT: Next Steps Required');
    console.log('');
    console.log('1. Upload the AppBundle to cloud storage (Azure Blob or S3):');
    console.log(`   npm run deploy-appbundle`);
    console.log('');
    console.log('2. Once AppBundle is uploaded and versioned, your Activity');
    console.log('   will be ready to process jobs.');
    console.log('');
    console.log('3. Then start the web server:');
    console.log(`   npm run web`);
    console.log('\n' + '=' .repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    if (error.response?.data) {
      console.error('API Response:', error.response.data);
    }
    process.exit(1);
  }
}

deployAppBundle();

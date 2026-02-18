#!/usr/bin/env node

import { config, validateConfig } from './src/config.js';
import AutodeskAPIClient from './src/autodesk-api.js';

const NICKNAME = 'drumforge_app';
const BUNDLE_NAME = 'DrumModifier';
const ACTIVITY_NAME = 'DrumModifierActivity';

async function setup() {
  try {
    console.log('\n🚀 DrumForge Setup & Verification\n');
    console.log('====================================================');

    // Validate configuration
    console.log('\n📋 Step 1: Validating Configuration');
    validateConfig();
    console.log('✓ Configuration validated');
    console.log(`  Client ID: ${config.clientId.substring(0, 10)}...`);
    console.log(`  Base URL: ${config.baseUrl}`);

    // Initialize API client
    const apiClient = new AutodeskAPIClient(config);
    console.log('✓ Autodesk API client initialized');

    // Get access token
    console.log('\n📡 Step 2: Authenticating with Autodesk APS');
    const token = await apiClient.getAccessToken();
    console.log('✓ Successfully authenticated');
    console.log(`  Token expires in: ~1 hour (auto-refreshing)`);

    // Summary
    console.log('\n' + '====================================================');
    console.log('\n✅ Credentials Verified!\n');
    
    console.log('Your Design Automation Configuration:');
    console.log(`  Nickname:    ${NICKNAME}`);
    console.log(`  AppBundle:   ${NICKNAME}.${BUNDLE_NAME}`);
    console.log(`  Activity:    ${NICKNAME}.${ACTIVITY_NAME}+current\n`);

    console.log('Quick Start:');
    console.log('  1. npm run web          # Start web server');
    console.log('  2. Open http://localhost:3000');
    console.log('  3. Modify parameters and submit jobs\n');

    console.log('For Full Design Automation Setup:');
    console.log('  The system is ready to submit jobs. However, to enable');
    console.log('  actual processing, you may need to:\n');
    console.log('  1. Manually set your Autodesk Design Automation nickname to: drumforge_app');
    console.log('     (via Autodesk APS console)');
    console.log('  2. Create and deploy the DrumModifier AppBundle');
    console.log('  3. Create and publish the DrumModifierActivity\n');
    console.log('  Setup guides:');
    console.log('  • https://aps.autodesk.com/en/docs/design-automation/v3/');
    console.log('  • https://aps.autodesk.com/en/docs/design-automation/v3/tutorials/\n');

    console.log('Current Status:');
    console.log('  The web app will submit jobs successfully.');
    console.log('  If Design Automation is fully set up, jobs will process.');
    console.log('  Otherwise, you\'ll receive API error messages.\n');
    console.log('====================================================\n');

  } catch (error) {
    console.error('\n❌ Setup verification failed:', error.message);
    console.error('\nmake sure you have:');
    console.error('  1. Created .env file in the project root');
    console.error('  2. Added these environment variables:');
    console.error('     - AUTODESK_CLIENT_ID');
    console.error('     - AUTODESK_CLIENT_SECRET');
    console.error('     - AUTODESK_PERSONAL_ACCESS_TOKEN\n');
    process.exit(1);
  }
}

setup();

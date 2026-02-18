#!/usr/bin/env node

/**
 * DrumForge Setup Diagnostics
 * Checks all prerequisites and provides guidance on configuration
 */

import { config, validateConfig } from './src/config.js';
import AutodeskAPIClient from './src/autodesk-api.js';
import axios from 'axios';

async function runDiagnostics() {
  console.log('\n🔍 DrumForge Setup Diagnostics\n');
  console.log('=' .repeat(60));

  // Step 1: Verify configuration
  console.log('\n📋 Step 1: Checking Configuration');
  console.log('-' .repeat(60));

  try {
    validateConfig();
    console.log('✓ All required environment variables present');
    console.log(`  - CLIENT_ID: ${config.clientId.substring(0, 10)}...`);
    console.log(`  - CLIENT_SECRET: ${config.clientSecret.substring(0, 10)}...`);
    console.log(`  - PERSONAL_ACCESS_TOKEN: ${config.personalAccessToken.substring(0, 10)}...`);
  } catch (error) {
    console.error('❌ Configuration error:', error.message);
    console.log('\nTo fix, add to your .env file:');
    console.log('  AUTODESK_CLIENT_ID=your_client_id');
    console.log('  AUTODESK_CLIENT_SECRET=your_client_secret');
    console.log('  AUTODESK_PERSONAL_ACCESS_TOKEN=your_personal_access_token');
    process.exit(1);
  }

  // Step 2: Test authentication
  console.log('\n🔑 Step 2: Testing Authentication');
  console.log('-' .repeat(60));

  const apiClient = new AutodeskAPIClient(config);

  try {
    const token = await apiClient.getAccessToken();
    console.log('✓ Successfully obtained access token');
    console.log(`  - Token: ${token.substring(0, 20)}...`);
  } catch (error) {
    console.error('❌ Authentication failed');
    console.error('  Error:', error.message);
    console.log('\nPossible causes:');
    console.log('  1. Invalid CLIENT_ID or CLIENT_SECRET');
    console.log('  2. Network connection issue');
    console.log('  3. Autodesk API temporarily unavailable');
    process.exit(1);
  }

  // Step 3: Verify Design Automation account setup
  console.log('\n🏢 Step 3: Checking Design Automation Account');
  console.log('-' .repeat(60));

  try {
    const daStatus = await apiClient.verifyDesignAutomationSetup();
    
    if (daStatus.setupComplete) {
      console.log('✓ Design Automation account is active');
      console.log(`  - Nickname: ${daStatus.nickname}`);
    } else {
      console.log('❌ Design Automation is NOT initialized');
      console.log('\n✨ Good news! We can set this up automatically for you:\n');
      console.log('Run this command:');
      console.log('  npm run setup-nickname\n');
      console.log('This will:');
      console.log('  1. Create a Design Automation nickname in your account');
      console.log('  2. Tell you what to add to your .env file');
      console.log('  3. Get you ready to deploy!\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('⚠️  Could not verify Design Automation account');
    console.error('  Error:', error.message);
    console.log('\nYou can try setting it up automatically:');
    console.log('  npm run setup-nickname\n');
    process.exit(1);
  }

  // Step 4: Test AppBundle creation
  console.log('\n📦 Step 4: Testing AppBundle Setup');
  console.log('-' .repeat(60));

  try {
    const bundleResult = await apiClient.setupAppBundle();
    console.log(`✓ AppBundle ${bundleResult.created ? 'created' : 'verified'}`);
    console.log(`  - ID: ${bundleResult.id}`);
    console.log(`  - Version: ${bundleResult.version}`);
  } catch (error) {
    console.error('❌ AppBundle setup failed');
    console.error('  Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('  1. Verify your Design Automation account is active');
    console.log('  2. Check that your credentials are correct');
    console.log('  3. Make sure your account hasn\'t reached resource limits');
    process.exit(1);
  }

  // Step 5: Summary
  console.log('\n' + '=' .repeat(60));
  console.log('\n✅ All checks passed!\n');

  console.log('Your setup is ready. To complete the configuration:\n');

  console.log('1. START THE SERVER:');
  console.log('   npm run web\n');

  console.log('2. RUN THE SETUP (in another terminal):');
  console.log('   npm run deploy\n');

  console.log('3. PACKAGE AND UPLOAD YOUR APPBUNDLE:');
  console.log('   zip -r drumforge_appbundle.zip src/appbundle/');
  console.log('   # Upload to Azure Blob Storage or AWS S3');
  console.log('   # Then create a version in Design Automation\n');

  console.log('4. START PROCESSING FILES:');
  console.log('   npm run web');
  console.log('   # Open http://localhost:3000\n');

  console.log('For detailed instructions, see: FILE_PROCESSING_SETUP.md\n');
  console.log('=' .repeat(60) + '\n');
}

runDiagnostics().catch(error => {
  console.error('\n❌ Diagnostic failed:', error.message);
  process.exit(1);
});

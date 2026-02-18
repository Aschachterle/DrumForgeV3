#!/usr/bin/env node

/**
 * Setup script for DrumForge via API
 * This script guides the user through the deployment process using the server's API endpoints
 */

import axios from 'axios';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const API_BASE_URL = 'http://localhost:3000';
const SERVER_STARTUP_WAIT = 3000; // Wait 3 seconds for server to start

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkServerRunning() {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/health`, { timeout: 2000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

async function startServer() {
  console.log('\n📡 Checking if server is running...');
  
  let isRunning = await checkServerRunning();
  
  if (isRunning) {
    console.log('✓ Server already running at', API_BASE_URL);
    return null;
  }

  console.log('⏳ Starting server...\n');
  
  const serverProcess = spawn('npm', ['run', 'web'], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  // Wait for server to start
  await sleep(SERVER_STARTUP_WAIT);

  // Check if server started successfully
  isRunning = await checkServerRunning();
  if (!isRunning) {
    console.error('\n❌ Failed to start server. Please ensure npm is installed and try again.');
    process.exit(1);
  }

  console.log('\n✓ Server started successfully\n');
  return serverProcess;
}

async function deploySetup() {
  try {
    console.log('\n🚀 DrumForge Deployment Setup\n');
    console.log('=' .repeat(60));

    // Check if server is running
    let serverProcess = await startServer();

    // Get current status
    console.log('\n📋 Checking current deployment status...');
    try {
      const statusResponse = await axios.get(`${API_BASE_URL}/api/setup/status`);
      const status = statusResponse.data.status;

      console.log('  AppBundle: ' + (status.appBundle.exists ? '✓ exists' : '✗ missing'));
      if (status.appBundle.exists) {
        console.log(`    Version: ${status.appBundle.version}`);
      }

      console.log('  Activity:  ' + (status.activity.exists ? '✓ exists' : '✗ missing'));
      if (status.activity.exists) {
        console.log(`    Version: ${status.activity.version}`);
      }

      console.log('  Alias:     ' + (status.alias.exists ? '✓ exists' : '✗ missing'));
    } catch (error) {
      console.error('⚠️  Could not check status:', error.message);
    }

    // Run full deployment
    console.log('\n🔧 Running full deployment...\n');
    
    try {
      const deployResponse = await axios.post(`${API_BASE_URL}/api/setup/deploy`);
      
      console.log('\n' + '=' .repeat(60));
      console.log(deployResponse.data.message);
      console.log('=' .repeat(60) + '\n');

      console.log('📋 Deployment Results:');
      console.log(`  AppBundle: ${deployResponse.data.results.appBundle.created ? 'Created' : 'Already exists'}`);
      console.log(`  Activity:  ${deployResponse.data.results.activity.created ? 'Created' : 'Already exists'}`);
      console.log(`  Alias:     ${deployResponse.data.results.alias.created ? 'Created' : 'Already exists'}`);

      console.log('\n' + '=' .repeat(60));
      console.log('\n⚠️  IMPORTANT NEXT STEPS:\n');
      
      console.log('1. Upload AppBundle to Cloud Storage');
      console.log('   - You created an AppBundle, but it\'s not yet populated with code');
      console.log('   - Upload the plugin to Azure Blob Storage or AWS S3');
      console.log('   - See FILE_PROCESSING_SETUP.md for detailed instructions\n');

      console.log('2. Version the AppBundle');
      console.log('   - Create a version reference in Design Automation');
      console.log('   - See FILE_PROCESSING_SETUP.md for instructions\n');

      console.log('3. Update Activity (if needed)');
      console.log('   - Point the Activity to the versioned AppBundle');
      console.log('   - See FILE_PROCESSING_SETUP.md for instructions\n');

      console.log('4. Test with Real Files');
      console.log('   - Once AppBundle is versioned, start the server:');
      console.log('     npm run web');
      console.log('   - Submit jobs at http://localhost:3000\n');

      console.log('=' .repeat(60) + '\n');

      console.log('📚 For detailed instructions, see: FILE_PROCESSING_SETUP.md\n');

    } catch (error) {
      console.error('\n❌ Deployment failed:');
      if (error.response?.data) {
        console.error('  Error:', error.response.data.error);
        console.error('  Details:', error.response.data.details);
      } else {
        console.error('  ', error.message);
      }
      
      console.log('\n📋 Troubleshooting Steps:\n');
      console.log('1. Verify your .env file has correct credentials:');
      console.log('   cat .env | grep AUTODESK\n');
      
      console.log('2. Run the diagnostic tool to identify issues:');
      console.log('   npm run setup\n');
      
      console.log('3. Check Design Automation account:');
      console.log('   https://aps.autodesk.com/en/\n');
      
      console.log('4. If you need to set up Design Automation:');
      console.log('   a. Go to https://aps.autodesk.com/en/');
      console.log('   b. Log in with your Autodesk account');
      console.log('   c. Click "Manage your apps"');
      console.log('   d. Set up Design Automation');
      console.log('   e. Note your Design Automation nickname\n');
      
      if (serverProcess) {
        console.log('⏹️  Stopping server...');
        serverProcess.kill();
      }
      process.exit(1);
    }

    // Keep server running or stop based on user preference
    if (serverProcess) {
      console.log('\n⏹️  Server is still running in the background.');
      console.log('You can continue testing from: http://localhost:3000\n');
      console.log('Press Ctrl+C to stop the server when done.\n');
    }

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the deployment
deploySetup().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

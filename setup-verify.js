#!/usr/bin/env node

import { config, validateConfig } from './src/config.js';
import AutodeskAPIClient from './src/autodesk-api.js';

async function verifySetup() {
  try {
    console.log('\n🔍 Verifying DrumForge Design Automation Setup\n');
    
    // Validate configuration
    validateConfig();
    console.log('✓ Configuration loaded');
    console.log(`  - Nickname: drumforge_app`);
    console.log(`  - Activity: drumforge_app.DrumModifierActivity+current`);
    
    // Initialize API client
    const apiClient = new AutodeskAPIClient(config);
    
    // Get access token
    console.log('\n📡 Connecting to Autodesk APS...');
    const token = await apiClient.getAccessToken();
    console.log('✓ Access token obtained');
    
    // Check if nickname exists
    console.log('\n📋 Checking Design Automation setup...');
    
    try {
      const response = await fetch(
        `${config.baseUrl}/da/us-east/v3/forgeapps/me`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Autodesk-Personal-Access-Token': config.personalAccessToken
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('✓ Design Automation account found');
        console.log(`  - Nickname: ${data.nickname}`);
      } else {
        console.log('⚠ Design Automation nickname not set');
        console.log('  Run: npm run setup');
      }
    } catch (err) {
      console.log('⚠ Could not verify Design Automation setup');
    }
    
    console.log('\n📚 What you need to do:\n');
    console.log('1. Ensure the DrumModifier AppBundle is uploaded to cloud storage');
    console.log('2. Verify the Activity "DrumModifierActivity" is created and published');
    console.log('3. Test job submission through the web interface\n');
    
    console.log('🌐 Access the web interface:');
    console.log('   http://localhost:3000\n');
    
    console.log('💾 Current API Configuration:');
    console.log(`   Base URL: ${config.baseUrl}`);
    console.log(`   Nickname: drumforge_app`);
    console.log(`   Activity: drumforge_app.DrumModifierActivity+current\n`);
    
  } catch (error) {
    console.error('\n❌ Setup verification failed:', error.message);
    console.log('\nMake sure you have:');
    console.log('1. Created a .env file with your Autodesk credentials');
    console.log('2. Set AUTODESK_CLIENT_ID, AUTODESK_CLIENT_SECRET');
    console.log('3. Set AUTODESK_PERSONAL_ACCESS_TOKEN\n');
    process.exit(1);
  }
}

verifySetup();

#!/usr/bin/env node

/**
 * Setup Design Automation Nickname
 * Automatically creates a Design Automation nickname in your Autodesk account
 */

import { config, validateConfig } from './src/config.js';
import axios from 'axios';

async function setupDANickname() {
  try {
    console.log('\n🚀 Setting up Design Automation Nickname\n');
    console.log('=' .repeat(60));

    // Validate configuration
    console.log('\n📋 Step 1: Validating Configuration');
    validateConfig();
    console.log('✓ Configuration valid');

    // Get access token
    console.log('\n🔑 Step 2: Authenticating with Autodesk');
    
    let accessToken;
    try {
      const tokenResponse = await axios.post(
        `${config.baseUrl}/authentication/v2/token`,
        {
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: 'client_credentials',
          scope: 'data:read data:write'
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      accessToken = tokenResponse.data.access_token;
      console.log('✓ Access token obtained');
    } catch (error) {
      console.error('❌ Authentication failed');
      console.error('  Error:', error.response?.data?.error || error.message);
      process.exit(1);
    }

    // Generate a nickname (default or custom)
    const defaultNickname = 'drumforge_app';
    console.log('\n🏢 Step 3: Setting up Design Automation Nickname');
    console.log(`   Default nickname: ${defaultNickname}`);

    // Try to set the nickname
    try {
      console.log('\n   Initializing Design Automation with nickname...');
      
      const setupResponse = await axios.patch(
        `${config.baseUrl}/da/us-east/v3/forgeapps/me`,
        {
          nickname: defaultNickname,
          id: defaultNickname
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
      console.log(`  Nickname: ${setupResponse.data.nickname || defaultNickname}`);

      // Verify it was created
      console.log('\n🔍 Step 4: Verifying Setup');
      const verifyResponse = await axios.get(
        `${config.baseUrl}/da/us-east/v3/forgeapps/me`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Autodesk-Personal-Access-Token': config.personalAccessToken
          }
        }
      );

      console.log('✓ Design Automation verified');
      const actualNickname = verifyResponse.data.nickname;
      console.log(`  Confirmed nickname: ${actualNickname}`);

      // Show next steps
      console.log('\n' + '=' .repeat(60));
      console.log('\n✅ Design Automation Setup Complete!\n');

      console.log('📝 Add this to your .env file:\n');
      console.log(`   AUTODESK_DA_NICKNAME=${actualNickname}\n`);

      console.log('Next steps:\n');
      console.log('1. Add the nickname to your .env file (copy-paste above)');
      console.log('2. Verify setup: npm run setup');
      console.log('3. Deploy AppBundle: npm run deploy');
      console.log('4. Upload plugin code to cloud storage');
      console.log('5. Start server: npm run web\n');

      console.log('=' .repeat(60) + '\n');

    } catch (error) {
      if (error.response?.status === 409 || error.response?.status === 400) {
        // Nickname might already exist, try to get it
        console.log('   Nickname may already exist, retrieving...');
        
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

          const nickname = getResponse.data.nickname;
          console.log('✓ Design Automation already set up');
          console.log(`  Nickname: ${nickname}`);

          console.log('\n' + '=' .repeat(60));
          console.log('\n✅ Design Automation Already Configured!\n');

          console.log('📝 Your nickname:\n');
          console.log(`   ${nickname}\n`);

          console.log('Add this to your .env file if not already there:\n');
          console.log(`   AUTODESK_DA_NICKNAME=${nickname}\n`);

          console.log('Next steps:\n');
          console.log('1. Make sure your .env has the AUTODESK_DA_NICKNAME');
          console.log('2. Verify setup: npm run setup');
          console.log('3. Deploy AppBundle: npm run deploy\n');

          console.log('=' .repeat(60) + '\n');

        } catch (innerError) {
          console.error('❌ Could not retrieve Design Automation status');
          console.error('  Error:', innerError.response?.data?.message || innerError.message);
          process.exit(1);
        }
      } else {
        console.error('❌ Failed to set up Design Automation');
        
        if (error.response?.data?.developerMessage) {
          console.error('  Error:', error.response.data.developerMessage);
        } else if (error.response?.data?.message) {
          console.error('  Error:', error.response.data.message);
        } else {
          console.error('  Error:', error.message);
        }

        console.log('\n💡 Troubleshooting:\n');
        console.log('1. Verify your .env has correct credentials');
        console.log('2. Make sure your Autodesk account is active');
        console.log('3. Check if Design Automation is available in your region');
        console.log('4. Contact Autodesk support if the issue persists\n');

        process.exit(1);
      }
    }

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupDANickname();

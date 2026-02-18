import AutodeskAPI from './src/autodesk-api.js';
import { config } from './src/config.js';

const api = new AutodeskAPI(config);

(async () => {
  try {
    const token = await api.getAccessToken();
    const axios = (await import('axios')).default;
    
    const ACTIVITY_NAME = 'DrumModifierActivity';
    const payload = {
      engine: 'Autodesk.Fusion+Latest',
      appbundles: ['drumforge_app.DrumModifier+Latest'],
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
        // Simple string parameters - no verb needed
        NumSegments: {
          description: 'Number of segments',
          required: false
        },
        ShellThick: {
          description: 'Shell thickness',
          required: false
        },
        ShellHeight: {
          description: 'Shell height',
          required: false
        },
        ShellDiam: {
          description: 'Shell diameter',
          required: false
        },
        LugTopDist: {
          description: 'Lug top distance',
          required: false
        },
        LugSpacing: {
          description: 'Lug spacing',
          required: false
        },
        LapSizePercent: {
          description: 'Lap size percentage',
          required: false
        },
        LugHoleDiam: {
          description: 'Lug hole diameter',
          required: false
        }
      },
      description: 'Modifies drum parameters in Fusion 360 F3D files'
    };
    
    console.log('Creating Activity version 4 (simple parameters without verb)...');
    
    const response = await axios.post(
      `https://developer.api.autodesk.com/da/us-east/v3/activities/${ACTIVITY_NAME}/versions`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Autodesk-Personal-Access-Token': process.env.AUTODESK_PERSONAL_ACCESS_TOKEN
        }
      }
    );
    
    console.log('\n✓ Activity version created:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Update the 'current' alias to point to the new version
    console.log('\nUpdating alias to point to new version...');
    const aliasResponse = await axios.patch(
      `https://developer.api.autodesk.com/da/us-east/v3/activities/${ACTIVITY_NAME}/aliases/current`,
      { version: response.data.version },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Autodesk-Personal-Access-Token': process.env.AUTODESK_PERSONAL_ACCESS_TOKEN
        }
      }
    );
    
    console.log('✓ Alias updated:', aliasResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    process.exit(1);
  }
})();

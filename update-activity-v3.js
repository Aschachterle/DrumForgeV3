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
        // Remove PersonalAccessToken - it should only be in HTTP header
        NumSegments: {
          verb: 'get',
          description: 'Number of segments',
          required: false
        },
        ShellThick: {
          verb: 'get',
          description: 'Shell thickness',
          required: false
        },
        ShellHeight: {
          verb: 'get',
          description: 'Shell height',
          required: false
        },
        ShellDiam: {
          verb: 'get',
          description: 'Shell diameter',
          required: false
        },
        LugTopDist: {
          verb: 'get',
          description: 'Lug top distance',
          required: false
        },
        LugSpacing: {
          verb: 'get',
          description: 'Lug spacing',
          required: false
        },
        LapSizePercent: {
          verb: 'get',
          description: 'Lap size percentage',
          required: false
        },
        LugHoleDiam: {
          verb: 'get',
          description: 'Lug hole diameter',
          required: false
        }
      },
      description: 'Modifies drum parameters in Fusion 360 F3D files'
    };
    
    console.log('Creating Activity version 3 (without PersonalAccessToken parameter)...');
    
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

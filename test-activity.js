import AutodeskAPI from './src/autodesk-api.js';
import axios from 'axios';
import { config } from './src/config.js';

const api = new AutodeskAPI(config);

(async () => {
  try {
    const token = await api.getAccessToken();
    
    const payload = {
      id: 'DrumModifierActivity',
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
        }
      },
      description: 'Test activity'
    };
    
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const response = await axios.post(
      'https://developer.api.autodesk.com/da/us-east/v3/activities',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Autodesk-Personal-Access-Token': process.env.AUTODESK_PERSONAL_ACCESS_TOKEN
        }
      }
    );
    
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
})();

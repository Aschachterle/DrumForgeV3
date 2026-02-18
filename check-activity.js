import AutodeskAPI from './src/autodesk-api.js';
import axios from 'axios';
import { config } from './src/config.js';

const api = new AutodeskAPI(config);

(async () => {
  try {
    const token = await api.getAccessToken();
    
    const response = await axios.get(
      'https://developer.api.autodesk.com/da/us-east/v3/activities/DrumModifierActivity',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Autodesk-Personal-Access-Token': process.env.AUTODESK_PERSONAL_ACCESS_TOKEN
        }
      }
    );
    
    console.log('Activity already exists:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
})();

import AutodeskAPI from './src/autodesk-api.js';
import { config } from './src/config.js';
import axios from 'axios';

const api = new AutodeskAPI(config);

(async () => {
  try {
    const token = await api.getAccessToken();
    
    const response = await axios.get(
      'https://developer.api.autodesk.com/da/us-east/v3/engines',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      }
    );
    
    const fusionEngines = response.data.data.filter(e => e.id.includes('Fusion'));
    
    console.log('Available Fusion Engines:');
    fusionEngines.forEach(engine => {
      console.log(`  ${engine.id} (version ${engine.version})`);
    });
    
    console.log('\nCurrently using: Autodesk.Fusion+Latest');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
})();

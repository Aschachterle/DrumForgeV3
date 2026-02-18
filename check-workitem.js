import AutodeskAPI from './src/autodesk-api.js';
import { config } from './src/config.js';

const api = new AutodeskAPI(config);

(async () => {
  try {
    const workItemId = process.argv[2] || '2fe2ea743f504fb28956971870f4f521';
    const token = await api.getAccessToken();
    const axios = (await import('axios')).default;
    
    const response = await axios.get(
      `https://developer.api.autodesk.com/da/us-east/v3/workitems/${workItemId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Autodesk-Personal-Access-Token': process.env.AUTODESK_PERSONAL_ACCESS_TOKEN
        }
      }
    );
    
    console.log(JSON.stringify(response.data, null, 2));
    
    // If there's a reportUrl, fetch it
    if (response.data.reportUrl) {
      console.log('\n\n=== REPORT ===');
      const reportResponse = await axios.get(response.data.reportUrl);
      console.log(reportResponse.data);
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    process.exit(1);
  }
})();

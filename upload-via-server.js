// Upload new AppBundle version via server's auth
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createZip() {
  const appbundlePath = path.join(__dirname, 'src/appbundle', 'DrumModifier.bundle');
  const zipPath = path.join(__dirname, 'output', 'DrumModifier-v16.zip');
  
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      console.log(`✓ Zip created: ${archive.pointer()} bytes`);
      resolve(zipPath);
    });
    
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(appbundlePath, false);
    archive.finalize();
  });
}

(async () => {
  try {
    // Create the zip
    console.log('Creating zip from DrumModifier.bundle...');
    const zipPath = await createZip();
    
    // Now trigger a server operation to validate it can still auth
    console.log('\nTesting server authentication...');
    const testResponse = await axios.post('http://localhost:3000/api/submit', {
      parameters: { NumSegments: 17 }
    });
    
    console.log('✓ Server can still authenticate');
    console.log('✓ Test WorkItem:', testResponse.data.workItemId);
    console.log('\nZip file ready at:', zipPath);
    console.log('You can manually upload this as AppBundle v16');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    process.exit(1);
  }
})();

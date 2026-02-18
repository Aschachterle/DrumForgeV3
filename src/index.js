import { config, validateConfig } from './config.js';
import AutodeskAPIClient from './autodesk-api.js';

async function main() {
  try {
    // Validate configuration
    validateConfig();
    console.log('✓ Configuration validated');

    // Initialize Autodesk API client
    const apiClient = new AutodeskAPIClient(config);
    console.log('✓ Autodesk API client initialized');

    // Example usage:
    // const filePath = './path/to/your/file.f3d';
    // const modificationParams = {
    //   operation: 'example',
    //   // Add your modification parameters here
    // };

    // Submit F3D file
    // const submission = await apiClient.submitF3DFile(filePath, modificationParams);
    // console.log('Submission ID:', submission.id);

    // Check status
    // const status = await apiClient.getSubmissionStatus(submission.id);
    // console.log('Status:', status);

    // Download modified file
    // await apiClient.downloadModifiedFile(submission.id, './output/modified.f3d');

    console.log('\nApplication is ready to submit F3D files to Autodesk API');
    console.log('Update the main() function with your file path and modification parameters');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();

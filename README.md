# Autodesk F3D File Submission Application

A Node.js application for submitting Fusion 360 F3D files to Autodesk API for modification and processing.

## Features

- **OAuth 2.0 Authentication**: Secure authentication with Autodesk API
- **F3D File Submission**: Upload and submit Fusion 360 files for processing
- **Status Tracking**: Monitor submission status in real-time
- **File Download**: Retrieve processed/modified F3D files
- **Token Caching**: Automatic access token management and caching

## Prerequisites

- Node.js 16.x or higher
- npm or yarn
- Autodesk Developer Account with:
  - Client ID
  - Client Secret
  - Personal Access Token

## Installation

1. **Clone or navigate to the project directory**

```bash
cd /Users/adamschachterle/DrumForge
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

4. **Add your Autodesk credentials to `.env`**

```
AUTODESK_CLIENT_ID=your_client_id_here
AUTODESK_CLIENT_SECRET=your_client_secret_here
AUTODESK_PERSONAL_ACCESS_TOKEN=your_personal_access_token_here
```

## Project Structure

```
├── src/
│   ├── index.js                 # Main entry point
│   ├── config.js                # Configuration management
│   └── autodesk-api.js          # Autodesk API client
├── package.json                 # Project dependencies
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
└── README.md                    # This file
```

## Usage

### Basic Setup

1. **Import the API client in your code:**

```javascript
import AutodeskAPIClient from './src/autodesk-api.js';
import { config, validateConfig } from './src/config.js';

// Validate configuration
validateConfig();

// Initialize client
const apiClient = new AutodeskAPIClient(config);
```

### Submit an F3D File

```javascript
const filePath = './path/to/your/file.f3d';
const modificationParams = {
  operation: 'modify',
  // Add your specific modification parameters
};

const submission = await apiClient.submitF3DFile(filePath, modificationParams);
console.log('Submission ID:', submission.id);
```

### Check Submission Status

```javascript
const status = await apiClient.getSubmissionStatus(submissionId);
console.log('Current status:', status);
```

### Download Modified File

```javascript
await apiClient.downloadModifiedFile(submissionId, './output/modified.f3d');
```

## API Client Methods

### `getAccessToken()`
Obtains an OAuth 2.0 access token. Tokens are cached and reused until expiry.

### `submitF3DFile(filePath, modificationParams)`
- **Parameters:**
  - `filePath` (string): Path to the F3D file
  - `modificationParams` (object, optional): Modification parameters
- **Returns:** Submission response with ID and metadata

### `getSubmissionStatus(submissionId)`
- **Parameters:**
  - `submissionId` (string): ID of the submission
- **Returns:** Current submission status

### `downloadModifiedFile(submissionId, outputPath)`
- **Parameters:**
  - `submissionId` (string): ID of the submission
  - `outputPath` (string): Where to save the modified file
- **Returns:** Path to saved file

## Running the Application

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AUTODESK_CLIENT_ID` | OAuth Client ID | Yes |
| `AUTODESK_CLIENT_SECRET` | OAuth Client Secret | Yes |
| `AUTODESK_PERSONAL_ACCESS_TOKEN` | Personal Access Token | Yes |
| `AUTODESK_BASE_URL` | API Base URL | No (default: https://developer.api.autodesk.com) |
| `NODE_ENV` | Environment (development/production) | No (default: development) |
| `LOG_LEVEL` | Log level | No (default: info) |

## Error Handling

The application includes comprehensive error handling:

```javascript
try {
  const submission = await apiClient.submitF3DFile(filePath);
} catch (error) {
  console.error('Submission failed:', error.message);
  // Handle error appropriately
}
```

## Dependencies

- **axios**: HTTP client for API requests
- **dotenv**: Environment variable management
- **form-data**: Multipart form data handling for file uploads

## Getting Autodesk Credentials

1. Visit [Autodesk Developer Portal](https://developer.autodesk.com)
2. Create an application to get Client ID and Secret
3. Generate a Personal Access Token from your account settings
4. Add credentials to `.env` file

## Troubleshooting

### "Missing required environment variables"
- Ensure `.env` file exists and contains all required credentials
- Verify credentials are correct

### "Authentication failed"
- Check that Client ID and Secret are valid
- Verify Personal Access Token hasn't expired
- Ensure `AUTODESK_BASE_URL` is correct

### "File not found"
- Verify the file path is correct and file exists
- Use absolute paths for reliability

## License

MIT

## Support

For detailed help with setup issues, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

For issues with the Autodesk API, visit the [Autodesk Developer Documentation](https://developer.autodesk.com/docs).

## Quick Reference

**Getting Started:** See [GETTING_STARTED.md](GETTING_STARTED.md)

**Setting up AppBundle & Activity:** See [BUILT_IN_SETUP.md](BUILT_IN_SETUP.md)

**Complete Setup Instructions:** See [FILE_PROCESSING_SETUP.md](FILE_PROCESSING_SETUP.md)

**Troubleshooting:** See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## Available Commands

```bash
npm run setup        # Run diagnostics to verify your setup
npm run demo         # Test with simulated file processing
npm run web          # Start web server for real Autodesk processing
npm run deploy       # Deploy AppBundle and Activity to Autodesk
npm run setup-check  # Check deployment status
```

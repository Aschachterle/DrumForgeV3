# DrumForge: Autodesk F3D File Submission

Node.js app for submitting Fusion 360 F3D files to Autodesk Design Automation, with a local web UI for parameterized drum edits.

## Quick Start

```bash
npm install
cp .env.example .env
# Add Autodesk credentials to .env
npm run web
# Open http://localhost:3000
```

For full setup and AppBundle deployment, see [BUILT_IN_SETUP.md](BUILT_IN_SETUP.md).

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

## Design Automation Workflow

### Fresh setup (new AppBundle + Activity + WorkItem)

1. Create a Design Automation nickname (one-time, in Autodesk APS console).
2. Create an AppBundle: `POST /appbundles` with `{ id, engine, description }`.
3. Upload the AppBundle code using `uploadParameters` from the create response.
  - If `uploadParameters.formData` is present, upload via multipart POST.
  - Otherwise, upload via PUT to `uploadParameters.endpointURL`.
4. Create an AppBundle alias: `POST /appbundles/:id/aliases` with `{ id: "current", version }`.
5. Create an Activity: `POST /activities` with `appbundles: ["nickname.Bundle+current"]`.
6. Create an Activity alias: `POST /activities/:id/aliases` with `{ id: "current", version }`.
7. Submit a WorkItem: `POST /workitems` with `activityId: "nickname.Activity+current"` and arguments.
8. Poll WorkItem status until it completes, then download the output.

### Updating an existing AppBundle (new code)

1. Create a new AppBundle version: `POST /appbundles/:id/versions` with `{ engine }`.
2. Upload the new code using the returned `uploadParameters`.
3. Move the AppBundle alias: `PATCH /appbundles/:id/aliases/current` with `{ version: <newVersion> }`.

### Updating an existing Activity (new parameters/command line)

1. Create a new Activity version: `POST /activities/:id/versions` with the updated payload.
2. Move the Activity alias: `PATCH /activities/:id/aliases/current` with `{ version: <newVersion> }`.

### Important rules

- Use fully qualified IDs with aliases (example: `nickname.Bundle+current`).
- Do not use `$LATEST` in references; it is only for listing.
- Use aliases like `current` so WorkItems do not need to change when versions update.

### Web UI (Recommended)

1. **Follow the built-in setup guide**

See [BUILT_IN_SETUP.md](BUILT_IN_SETUP.md) to initialize Design Automation, create the AppBundle/Activity, and upload the bundle.

2. **Start the server and open the UI**

```bash
npm run web
# Open http://localhost:3000
```

3. **Submit jobs**

Use the form to set drum parameters and submit a job. Status and download links appear in the UI.

### API Client (Advanced)

If you want to drive submissions programmatically, import the client:

```javascript
import AutodeskAPIClient from './src/autodesk-api.js';
import { config, validateConfig } from './src/config.js';

validateConfig();
const apiClient = new AutodeskAPIClient(config);
```

Then use `submitF3DFile()`, `getSubmissionStatus()`, and `downloadModifiedFile()` as needed.

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

- Setup and deployment: [BUILT_IN_SETUP.md](BUILT_IN_SETUP.md)
- Common issues: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

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

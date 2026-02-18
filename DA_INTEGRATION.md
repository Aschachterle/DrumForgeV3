# DrumForge - Autodesk Design Automation Integration

## Current Status

✅ **Completed:**
- Web server running on port 3000
- Frontend UI for parameter modification
- Real Design Automation API integration
- OAuth 2.0 authentication with token caching
- Job submission and status polling infrastructure
- Error handling and logging

⚠️ **In Progress - Waiting for Autodesk Setup:**
- Activity creation/verification (`drumforge_app.DrumModifierActivity+current`)
- AppBundle upload to cloud storage
- Plugin deployment

## What's Happening

The application now submits jobs to Autodesk Design Automation in real-time. However, the Activity needs to be properly configured on the Autodesk side.

## How to Use

### 1. Start the Web Server

```bash
npm run web
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Modify Drum Parameters

- Adjust any of the 8 drum parameters:
  - NumSegments
  - ShellThick
  - ShellHeight
  - ShellDiam
  - LugTopDist
  - LugSpacing
  - LapSizePercent
  - LugHoleDiam

### 3. Submit to Design Automation

Click "Generate Modified Drum" to submit the job to Autodesk Design Automation.

The job will:
1. Be submitted with your parameters
2. Enter a queue on Autodesk's servers
3. Execute the DrumModifier plugin
4. Return the modified F3D file

### 4. Monitor Progress

The UI will poll the job status every 3 seconds and show:
- Current job status (pending, success, failed)
- Job ID for reference
- Report URL when available

## Setting Up the Activity

To enable actual processing, you need to ensure the Activity exists:

```bash
node setup-verify.js
```

This will verify your setup and guide you through any missing steps.

## Technical Details

### API Endpoints

- `GET /api/health` - Server health check
- `GET /api/config` - Get UI configuration and parameters
- `POST /api/submit` - Submit job to Design Automation
- `GET /api/job-status/:id` - Check job status

### Job Submission Format

```json
{
  "workItemId": "drumforge_...",
  "status": "pending",
  "message": "Job submitted to Design Automation"
}
```

### Job Status Response

```json
{
  "id": "drumforge_...",
  "status": "pending|success|failed",
  "reportUrl": "https://..."
}
```

## Troubleshooting

### Getting 404 Errors

This usually means the Activity doesn't exist. Run:
```bash
node setup-verify.js
```

### Files Not Processing

Ensure:
1. The Activity is published and aliased as `+current`
2. The AppBundle is deployed to cloud storage
3. Your Autodesk credentials are correct in `.env`

### Checking Logs

Monitor server output:
```bash
npm run web
```

All API calls and errors are logged to the console.

## Next Steps

1. Verify the Activity is created and published
2. Ensure the DrumModifier plugin is properly deployed
3. Test job submission through the web interface
4. Monitor completion and download results

## File Structure

```
/Users/adamschachterle/DrumForge/
├── server.js                 # Express web server
├── public/index.html         # Web UI
├── src/
│   ├── autodesk-api.js      # API client
│   ├── config.js            # Configuration
│   └── index.js             # CLI example
├── Resources/
│   └── ParametricDrum.f3d   # Input drum file
└── setup-verify.js          # Setup verification
```

## Support

For Design Automation documentation:
- https://aps.autodesk.com/en/docs/design-automation/v3/overview/
- https://aps.autodesk.com/en/docs/design-automation/v3/developers_guide/workitems/

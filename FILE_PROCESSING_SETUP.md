# DrumForge - File Processing Setup Guide

This guide explains how to set up DrumForge for actual file processing through Autodesk Design Automation.

## Current Status

- ✅ Web application created and running
- ✅ API infrastructure in place
- ✅ Python plugin code created
- ✅ AppBundle/Activity setup (now built into the app!)
- ⏳ File upload to cloud storage (required for processing)

## What's Needed for Actual File Processing

To enable real file processing, you need:

1. **Autodesk Design Automation Account** - Already set up ✓
2. **AppBundle & Activity in Design Automation** - Created automatically by the app ✓
3. **Plugin Code Upload** - Package containing your plugin code
4. **Cloud Storage** - For input/output files (Azure Blob or AWS S3)
5. **WorkItem Submission** - Submits jobs to be processed

## Quick Setup Steps

### Step 1: Deploy AppBundle & Activity (Now Built-In!)

**Option A: Using npm command**

```bash
npm run deploy
```

This will:
- Start the web server
- Create the `DrumModifier` AppBundle
- Create the `DrumModifierActivity` Activity with all parameters
- Create the `+current` alias for easy referencing
- Tell you what to do next

**Option B: Using API endpoints directly**

Start the server:
```bash
npm run web
```

In another terminal, deploy:
```bash
curl -X POST http://localhost:3000/api/setup/deploy | jq .
```

Or check status first:
```bash
curl http://localhost:3000/api/setup/status | jq .
```

### Step 2: Package & Upload AppBundle

You need to upload the plugin code to cloud storage:

```bash
# Package the AppBundle  
zip -r drumforge_appbundle.zip src/appbundle/

# Upload to Azure Blob Storage or AWS S3
# (Instructions depend on your cloud provider)
```

**Azure Blob Storage Upload:**
```bash
# Set your Azure connection details
export AZURE_STORAGE_ACCOUNT="your-account"
export AZURE_STORAGE_ACCOUNT_KEY="your-key"

# Upload the AppBundle
az storage blob upload \
  --container-name "appbundles" \
  --name "drumforge_appbundle.zip" \
  --file "drumforge_appbundle.zip"
```

**AWS S3 Upload:**
```bash
aws s3 cp drumforge_appbundle.zip \
  s3://your-bucket/drumforge-appbundle.zip
```

### Step 3: Create AppBundle Version in Design Automation

Once uploaded, create a version:

```bash
curl -X POST https://developer.api.autodesk.com/da/appbundles/drumforge_app.DrumModifier/versions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "uploadParameters": {
      "storageLocation": "https://your-storage-url/drumforge_appbundle.zip"
    }
  }'
```

### Step 4: Create Activity Version

Link the Activity to the AppBundle version:

```bash
curl -X POST https://developer.api.autodesk.com/da/activities/drumforge_app.DrumModifierActivity/versions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "commandLine": "plugin ParametricDrum.f3d output.f3d",
    "parameters": [
      {"name": "inputFile", "verb": "get", "required": true},
      {"name": "outputFile", "verb": "put", "required": true},
      {"name": "NumSegments", "verb": "post"},
      {"name": "ShellThick", "verb": "post"},
      {"name": "ShellHeight", "verb": "post"},
      {"name": "ShellDiam", "verb": "post"},
      {"name": "LugTopDist", "verb": "post"},
      {"name": "LugSpacing", "verb": "post"},
      {"name": "LapSizePercent", "verb": "post"},
      {"name": "LugHoleDiam", "verb": "post"}
    ]
  }'
```

### Step 5: Publish & Alias Activity

Make the Activity available:

```bash
curl -X POST https://developer.api.autodesk.com/da/activities/drumforge_app.DrumModifierActivity/aliases \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "current", "version": 1}'
```

## Running the Web App

### Demo Mode (No Autodesk Setup Required)

```bash
npm run demo
```

This simulates job processing for testing the UI.

### Production Mode (Real File Processing)

```bash
npm run web
```

This submits actual jobs to Autodesk Design Automation.

## How It Works

1. **User modifies parameters** in the web UI
2. **Frontend submits job** via `/api/submit` endpoint
3. **Server creates WorkItem** with your parameters
4. **Autodesk processes the file** using your plugin
5. **Results are available** via `/api/job-status/:id`

## API Endpoints

- `GET /api/health` - Server health check
- `GET /api/config` - Get parameter configuration
- `POST /api/submit` - Submit job for processing
  - Request: `{"parameters": {...}}`
  - Response: `{"workItemId": "...", "status": "pending"}`
- `GET /api/job-status/:id` - Check job status
  - Response: `{"id": "...", "status": "pending|success|failed", "progress": 0-100}`

## Environment Variables

- `DEMO_MODE=true` - Run in demo/test mode with mock processing
- `PORT=3000` - Server port (default: 3000)
- `AUTODESK_CLIENT_ID` - Autodesk API credentials
- `AUTODESK_CLIENT_SECRET` - Autodesk API credentials
- `AUTODESK_PERSONAL_ACCESS_TOKEN` - Autodesk personal access token

## Useful Commands

```bash
# View setup status
npm run setup

# Deploy AppBundle & Activity
npm run deploy

# Start web server (real processing)
npm run web

# Start web server (demo mode)
npm run demo

# Development with auto-reload
npm run dev
```

## Debugging

### Check Server Logs

```bash
npm run web
```

The terminal will show all API calls and errors.

### Test API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Get configuration
curl http://localhost:3000/api/config

# Submit test job
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d '{"parameters":{"NumSegments":3,"ShellThick":"8 mm"}}'

# Check job status
curl http://localhost:3000/api/job-status/JOB_ID
```

## Plugin Code Location

The Python plugin that processes files:
```
src/appbundle/DrumModifier/Contents/run_drum_modifier.py
```

This script:
1. Opens the input F3D file in Fusion 360
2. Modifies the user parameters
3. Saves the output F3D file

## Autodesk Design Automation Documentation

- Overview: https://aps.autodesk.com/en/docs/design-automation/v3/overview/
- Tutorials: https://aps.autodesk.com/en/docs/design-automation/v3/tutorials/
- API Reference: https://aps.autodesk.com/en/docs/design-automation/v3/reference/http/

## Next Steps

1. Run `npm run deploy` to create AppBundle & Activity
2. Upload AppBundle to cloud storage
3. Create AppBundle version in Design Automation
4. Create Activity version linking to AppBundle
5. Publish Activity with `+current` alias
6. Run `npm run web` to start processing jobs

Once these steps are complete, your web app will process actual Fusion 360 files!

# 🥁 DrumForge - Complete Setup for File Processing

## What You Have Now

✅ **Working Web Application**
- Beautiful UI for modifying drum parameters
- Real-time job status tracking
- Demo mode for testing

✅ **Autodesk API Integration**
- OAuth 2.0 authentication
- Token caching
- Ready for Design Automation

✅ **Python Plugin Code**
- Located in: `src/appbundle/DrumModifier/Contents/run_drum_modifier.py`
- Modifies drum parameters in Fusion 360
- Ready to deploy

✅ **Built-in Setup Automation**
- AppBundle and Activity creation is integrated into the app
- Use `npm run deploy` to set everything up automatically

## Setup for Real File Processing

### Check Prerequisites First

Before deploying, run the diagnostics to verify everything is configured correctly:

```bash
npm run setup
```

This will check:
- ✓ Your .env configuration
- ✓ Autodesk authentication
- ✓ Design Automation account status
- ✓ AppBundle creation capability

The diagnostics will guide you through any missing setup steps.

### Quick Start (3 Steps)

**Step 1: Start the server**
```bash
npm run web
```

**Step 2: Run automatic setup**
```bash
# In a new terminal
npm run deploy
```

This automatically creates:
- AppBundle (in your Autodesk account)
- Activity (with all parameters)
- Activity alias (+current)

**Step 3: Upload AppBundle code**

After setup.js completes, you'll need to:

1. Package the plugin:
```bash
zip -r drumforge_appbundle.zip src/appbundle/
```

2. Upload to cloud storage (Azure Blob or AWS S3)

3. Create a version in Design Automation pointing to the upload URL

See [`FILE_PROCESSING_SETUP.md`](FILE_PROCESSING_SETUP.md) for detailed instructions.

## API Endpoints (Alternative to npm run deploy)

If you prefer to call the API directly:

**Check setup status:**
```bash
curl http://localhost:3000/api/setup/status | jq .
```

**Run complete setup:**
```bash
curl -X POST http://localhost:3000/api/setup/deploy | jq .
```

**Or individual steps:**
```bash
curl -X POST http://localhost:3000/api/setup/appbundle   # Create AppBundle
curl -X POST http://localhost:3000/api/setup/activity    # Create Activity
curl -X POST http://localhost:3000/api/setup/alias       # Create alias
```

## Manual Setup (If You Prefer)

### 1. Autodesk Design Automation Setup

Create these in your Autodesk APS account dashboard:

**AppBundle:**
```
ID:           DrumModifier
Engine:       Fusion360
Description:  Modifies drum parameters in F3D files
```

**Activity:**
```
ID:           DrumModifierActivity
Engine:       Fusion360
AppBundles:   drumforge_app.DrumModifier
Description:  Processes drum F3D files with parameter modifications
```

**Activity Parameters:**
```
- inputFile (get)
- outputFile (put)
- NumSegments (post)
- ShellThick (post)
- ShellHeight (post)
- ShellDiam (post)
- LugTopDist (post)
- LugSpacing (post)
- LapSizePercent (post)
- LugHoleDiam (post)
```

**Activity Alias:**
```
Create alias: +current → version 1
```

### 2. AppBundle Upload

Upload your plugin code to cloud storage:

**Package:**
```bash
zip -r drumforge_appbundle.zip src/appbundle/
```

**Upload to:**
- Azure Blob Storage, or
- AWS S3, or
- Any publicly accessible URL

**Then create a version in Design Automation** pointing to that URL.

### 3. Start the Web Server

Once AppBundle & Activity are created:

```bash
npm run web
```

## Quick Start Options

### Option A: Demo Mode (Test UI - No Autodesk Setup)

If you just want to test the interface without setting up Design Automation:

```bash
npm run demo
```

This simulates file processing without connecting to Autodesk. Perfect for testing the workflow.

### Option B: Real Autodesk Processing (Requires Setup)

For actual file processing through Autodesk Design Automation:

**Step 1: Verify Setup**
```bash
npm run setup
```

This checks your credentials and Design Automation account. If anything is missing, it will tell you exactly what to fix.

**Step 2: Deploy to Autodesk**
```bash
npm run deploy
```

**Step 3: Upload AppBundle**
```bash
zip -r drumforge_appbundle.zip src/appbundle/
# Upload to Azure Blob Storage or AWS S3
# Then create a version in Design Automation
```

**Step 4: Start the Server**
```bash
npm run web
# Open http://localhost:3000
```

### For a 404 Error

If diagnostics shows "Design Automation is NOT initialized", you have two options:

**Option 1: Automatic Setup (Recommended)**
```bash
npm run setup-nickname
```

This attempts to automatically initialize Design Automation in your account. If it works, it will show you your nickname to add to `.env`.

**Option 2: Manual Setup** 
If the automatic script doesn't work, visit https://aps.autodesk.com/en/:
1. Log in with your Autodesk account
2. Click "Manage your apps"  
3. Enable Design Automation
4. Note your Design Automation nickname
5. Add `AUTODESK_DA_NICKNAME=your_nickname` to `.env`

Once you have Design Automation set up and have the nickname in `.env`:
1. Run diagnostics: `npm run setup`
2. Deploy: `npm run deploy`
3. Upload plugin code to cloud storage
4. Start server: `npm run web`This runs in demo mode, simulating job processing to let you test the UI.

### Option B: Production Mode (Real Autodesk Processing)

Once you've set up AppBundle & Activity on the Autodesk side:

```bash
npm run web
```

This submits real jobs to Autodesk Design Automation.

## Running Now

If you want to start immediately and test:

```bash
npm run demo
```

Then open: http://localhost:3000

You can:
- Modify all drum parameters
- Submit jobs
- Watch progress in real-time
- See the complete workflow (all in ~7 seconds)

## How It Works (Real Mode)

1. User modifies parameters in browser
2. Clicks "Generate Modified Drum"
3. Server submits WorkItem to Autodesk Design Automation with:
   - Input F3D file reference
   - All drum parameters
   - Output location
4. Autodesk processes the file using your plugin
5. Modified F3D file is saved
6. User sees status updates as job progresses

## File Processing Flow

```
Browser UI
    ↓
/api/submit (parameters)
    ↓
Autodesk Design Automation
    ↓
run_drum_modifier.py runs in Fusion 360
    ↓
Modified F3D output
    ↓
/api/job-status (progress updates)
    ↓
Browser shows "Complete!"
```

## Current Limitations

- AppBundle needs to be uploaded to cloud storage
- Activity needs to be created manually in Autodesk dashboard
- Plugin runs in Autodesk-hosted Fusion 360 (not your machine)

## What's Working Now

- ✅ Web UI for parameter modification
- ✅ API infrastructure complete
- ✅ Demo mode with realistic job simulation
- ✅ Status polling and progress tracking
- ✅ Error handling and logging
- ✅ Authentication with Autodesk

## What You Need to Do for Real Processing

1. Log into Autodesk APS Dashboard
2. Create AppBundle "DrumModifier"
3. Create Activity "DrumModifierActivity"
4. Upload AppBundle ZIP to cloud storage
5. Create AppBundle version pointing to uploaded ZIP
6. Create Activity version pointing to AppBundle
7. Create Activity alias "+current"
8. Run `npm run web`

## Commands Available

```bash
npm run demo              # Run in demo mode (no setup needed)
npm run web              # Run in production mode
npm run setup            # Verify Autodesk credentials
npm run deploy           # Attempt to create AppBundle & Activity
npm run dev              # Run with auto-reload
```

## API Endpoints

All accessible at: **http://localhost:3000**

- `GET /` - Web UI
- `GET /api/health` - Server status
- `GET /api/config` - Parameter schema
- `POST /api/submit` - Submit job
- `GET /api/job-status/:id` - Check job status

## Example Job Submission

```bash
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "NumSegments": 3,
      "ShellThick": "8 mm",
      "ShellHeight": "7 in",
      "ShellDiam": "14 in",
      "LugTopDist": "2.5 in",
      "LugSpacing": "2.5 in",
      "LapSizePercent": 25,
      "LugHoleDiam": "0.3 in"
    }
  }'
```

Response:
```json
{
  "success": true,
  "workItemId": "abc123...",
  "status": "pending",
  "message": "Job submitted to Design Automation"
}
```

## Get Job Status

```bash
curl http://localhost:3000/api/job-status/abc123...
```

Response (while processing):
```json
{
  "id": "abc123...",
  "status": "pending"
}
```

Response (when complete):
```json
{
  "id": "abc123...",
  "status": "success",
  "reportUrl": "https://..."
}
```

## To Start Using Now

```bash
npm run demo
```

Open browser to: http://localhost:3000

Test the full UI workflow with simulated processing!

## For Real Autodesk Integration

Follow the steps in: [FILE_PROCESSING_SETUP.md](FILE_PROCESSING_SETUP.md)

---

**Ready to get started?**

```bash
npm run demo
```

This gives you a complete, working example immediately while you set up the Autodesk infrastructure.

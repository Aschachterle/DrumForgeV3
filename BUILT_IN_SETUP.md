# Built-In AppBundle & Activity Setup

DrumForge now has integrated AppBundle and Activity creation built directly into the application. No more separate scripts needed!

## What's Built-In

The application automatically creates:
- **Design Automation Nickname** - Identifier for your Autodesk apps
- **AppBundle** - Contains your Fusion 360 plugin code
- **Activity** - Defines how the plugin runs with your drum parameters
- **Activity Alias (+current)** - Makes it easy to reference the latest version

## Complete Setup Flow

### Step 1: Initialize Design Automation (If Needed)

If Design Automation hasn't been enabled in your account, run:

```bash
npm run setup-nickname
```

Or use the API endpoint directly:
```bash
npm run web
# In another terminal:
curl -X POST http://localhost:3000/api/setup/init-da | jq .
```

**Note:** If this fails with "404 - resource not found", you may need to manually enable Design Automation on the Autodesk dashboard first (one-time setup).

### Step 2: Setup Methods

#### Method 1: Using npm Command (Easiest)

```bash
npm run deploy
```

This command will:
1. Start the web server if not already running
2. Create AppBundle in your Autodesk account
3. Create Activity with all drum parameters
4. Create the +current alias
5. Tell you the next steps (upload AppBundle to cloud storage)

### Method 2: Using API Endpoints Directly

**Start the server:**
```bash
npm run web
```

**In another terminal, check status:**
```bash
curl http://localhost:3000/api/setup/status | jq .
```

**Run complete setup:**
```bash
curl -X POST http://localhost:3000/api/setup/deploy | jq .
```

**Or run individual steps:**
```bash
# Step 1: Create AppBundle
curl -X POST http://localhost:3000/api/setup/appbundle | jq .

# Step 2: Create Activity
curl -X POST http://localhost:3000/api/setup/activity | jq .

# Step 3: Create Activity Alias
curl -X POST http://localhost:3000/api/setup/alias | jq .
```

## Setup Endpoints

All endpoints require the server to be running (`npm run web`)

### POST /api/setup/init-da

Initialize Design Automation in your Autodesk account. Creates a nickname if needed.

**Response:**
```json
{
  "success": true,
  "message": "Design Automation initialized successfully",
  "nickname": "drumforge_app"
}
```

**Usage:**
```bash
curl -X POST http://localhost:3000/api/setup/init-da | jq .
```

### GET /api/setup/status

Check if AppBundle, Activity, and Alias are configured.

**Response:**
```json
{
  "ready": false,
  "status": {
    "appBundle": {
      "exists": false,
      "version": null
    },
    "activity": {
      "exists": false,
      "version": null
    },
    "alias": {
      "exists": false
    }
  },
  "message": "Setup incomplete. Run setup steps to enable real file processing."
}
```

### POST /api/setup/deploy

Run complete setup (all 3 steps at once).

**Response:**
```json
{
  "success": true,
  "message": "✅ Setup complete! Your application is ready to process files.",
  "results": {
    "appBundle": {
      "id": "drumforge_app.DrumModifier",
      "version": 1,
      "created": true
    },
    "activity": {
      "id": "drumforge_app.DrumModifierActivity",
      "version": 1,
      "created": true
    },
    "alias": {
      "id": "current",
      "created": true
    }
  }
}
```

### POST /api/setup/appbundle

Create or update the AppBundle.

### POST /api/setup/activity

Create or update the Activity with all drum parameters.

### POST /api/setup/alias

Create the +current alias for the Activity.

## Configuration Created

### AppBundle Details

```
ID:           drumforge_app.DrumModifier
Engine:       Fusion360
Description:  DrumForge - Fusion 360 Drum Parameter Modifier Plugin
```

### Activity Details

```
ID:                    drumforge_app.DrumModifierActivity
Engine:                Fusion360
Referenced AppBundles: drumforge_app.DrumModifier
Description:           Modifies drum parameters in Fusion 360 F3D files
```

### Activity Parameters

The Activity is configured with all drum modification parameters:
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

## What Happens After Setup

Once the setup endpoints are run:

1. **AppBundle & Activity Created** ✓
   - Resources created in your Autodesk account
   - Ready to accept jobs

2. **You Must Upload AppBundle Code** (Next step)
  - Package the TypeScript bundle: `zip -r drumforge_appbundle.zip src/appbundle/DrumModifier.bundle`
  - Upload to Azure Blob or AWS S3
  - Create a version pointing to the upload URL

3. **Then You Can Process Files** (Final step)
   - Start server: `npm run web`
   - Open http://localhost:3000
   - Modify parameters and submit jobs
   - Autodesk will process them using your plugin

## Troubleshooting

### Setup returns 500 error

**Possible causes:**
- Invalid credentials in .env file
- No internet connection
- Autodesk API temporarily down

**Solution:**
- Verify .env has correct CLIENT_ID, CLIENT_SECRET, and PERSONAL_ACCESS_TOKEN
- Check internet connection
- Wait a moment and try again
- Run setup check: `curl http://localhost:3000/api/setup/status`

### "API client not initialized"

**Cause:**
- Configuration is invalid or missing

**Solution:**
1. Verify .env file exists in project root
2. Check all required variables are set:
   ```bash
   cat .env | grep AUTODESK
   ```
3. Run setup check:
   ```bash
   npm run setup
   ```

### AppBundle already exists error

This is not an error - it means your AppBundle is already created. You can proceed to upload the plugin code.

## Next Steps

After running the setup:

1. **Upload AppBundle to Cloud Storage**
  ```bash
  zip -r drumforge_appbundle.zip src/appbundle/DrumModifier.bundle
  # Upload to Azure Blob or AWS S3
  ```

2. **Create AppBundle Version**
   - Point to the upload URL in Autodesk Design Automation dashboard

3. **Update Activity (if needed)**
   - Ensure it references the versioned AppBundle

4. **Start Processing**
   ```bash
   npm run web
   # Open http://localhost:3000
   ```

For additional help, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

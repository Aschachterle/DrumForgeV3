<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview

Node.js application for parameterized drum shell generation using Autodesk Fusion 360 Design Automation.

## Architecture

- **server.js**: Express server with API endpoints
- **src/autodesk-api.js**: Autodesk Design Automation API client
- **src/config.js**: Configuration management
- **src/appbundle/DrumModifier.bundle/**: Fusion 360 TypeScript plugin
- **public/**: Web UI files

## Key Points

1. Authentication: OAuth 2.0 with Client ID, Client Secret, and Personal Access Token
2. AppBundle zip must contain `DrumModifier.bundle/` folder at root
3. TypeScript plugin must declare `const adsk: any;` for Fusion runtime
4. Use `+current` aliases for AppBundle and Activity references
5. AppBundle MUST use typescript

## Deployment Requirements

A working deployment requires **4 components** with correct version alignment:

1. **AppBundle** - The Fusion 360 plugin code (version N)
2. **AppBundle Alias** - Must point `+current` to AppBundle version N
3. **Activity** - Defines the workflow, references AppBundle via `+current` (version M)
4. **Activity Alias** - Must point `+current` to Activity version M

### Recommended Deployment Method

Always use the full deploy endpoint which handles version alignment automatically:

```bash
curl -X POST http://localhost:3000/api/setup/deploy
```

### Manual Deployment (if needed)

```bash
# Step 1: Create AppBundle (note version in response)
curl -X POST http://localhost:3000/api/setup/appbundle
# Response: {"result": {"version": 1, ...}}  <-- AppBundle version created here
# AppBundle alias is auto-created pointing to this version

# Step 2: Create Activity (note version in response)
curl -X POST http://localhost:3000/api/setup/activity
# Response: {"result": {"version": 28, ...}}  <-- Activity version created here

# Step 3: Update Activity alias with correct version from Step 2
curl -X POST http://localhost:3000/api/setup/alias \
  -H "Content-Type: application/json" \
  -d '{"version": 28}'  # <-- Must match version from Step 2 response
```

### Common Deployment Errors

- **"AppBundle not found"**: AppBundle alias missing or pointing to wrong version. Run full deploy.
- **"Activity not found"**: Activity alias pointing to non-existent version. Update alias with correct version.
- After code changes to `main.ts`, always redeploy with `curl -X POST http://localhost:3000/api/setup/deploy`


## Commands

```bash
npm start          # Start server on port 3000
npm run dev        # Development mode with auto-reload
```

## API Endpoints

- POST `/api/submit` - Submit drum modification job
- GET `/api/job-status/:id` - Check job status
- POST `/api/setup/deploy` - **Recommended**: Full deployment (all 4 components)
- POST `/api/setup/appbundle` - Create/update AppBundle + alias
- POST `/api/setup/activity` - Create/update Activity
- POST `/api/setup/alias` - Create/update Activity alias (requires version in body)

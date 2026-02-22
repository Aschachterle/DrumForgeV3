# DrumForge

Node.js application for parameterized drum shell generation using Autodesk Fusion 360 Design Automation.

## Quick Start

```bash
npm install
cp .env.example .env
# Add your Autodesk credentials to .env
npm start
# Open http://localhost:3000
```

## Prerequisites

- Node.js 16+
- Autodesk Developer Account with:
  - Client ID & Client Secret (from [APS Portal](https://aps.autodesk.com))
  - Personal Access Token
  - Design Automation enabled

## Environment Variables

Create a `.env` file with:

```env
AUTODESK_CLIENT_ID=your_client_id
AUTODESK_CLIENT_SECRET=your_client_secret
AUTODESK_PERSONAL_ACCESS_TOKEN=your_pat
AUTODESK_DA_NICKNAME=drumforge_app
```

## Setup

### 1. First-Time Setup

If Design Automation isn't initialized for your account:

```bash
npm run setup-nickname
```

Or manually:
1. Go to https://aps.autodesk.com
2. Navigate to Design Automation
3. Create/enable Design Automation
4. Note your nickname and add to `.env`

### 2. Deploy AppBundle & Activity

**Recommended: One-command deployment**

```bash
# Start server
npm start

# In another terminal, run full deployment (creates all 4 required components)
curl -X POST http://localhost:3000/api/setup/deploy
```

This creates:
1. **AppBundle** - The Fusion 360 plugin code (creates version N)
2. **AppBundle Alias** - Points `+current` to AppBundle version N
3. **Activity** - Defines the Design Automation workflow (creates version M)
4. **Activity Alias** - Points `+current` to Activity version M

> **Critical**: All aliases must point to valid versions. The `/api/setup/deploy` 
> endpoint handles this automatically by passing the correct version numbers 
> between steps.

**Alternative: Manual step-by-step deployment**

If you need to deploy components individually:

```bash
# All 4 steps are required for a working deployment

# Step 1: Create AppBundle
curl -X POST http://localhost:3000/api/setup/appbundle
# Response: {"result": {"id": "drumforge_app.DrumModifier", "version": 1, ...}}
#                                                              ^^^^^^^^^^^
#                                         AppBundle version is created here
# AppBundle alias (+current) is auto-created pointing to this version

# Step 2: Create Activity
curl -X POST http://localhost:3000/api/setup/activity
# Response: {"result": {"id": "drumforge_app.DrumModifierActivity", "version": 28, ...}}
#                                                                   ^^^^^^^^^^^^
#                                             Activity version is created here

# Step 3: Create Activity alias - MUST use the version from Step 2 response
curl -X POST http://localhost:3000/api/setup/alias \
  -H "Content-Type: application/json" \
  -d '{"version": 28}'  # <-- Use the exact version number from Step 2 response
```

> **Important Version Requirements**:
> - The **AppBundle alias** (`+current`) must point to an existing AppBundle version
> - The **Activity alias** (`+current`) must point to an existing Activity version
> - The **Activity** must reference the AppBundle using `+current` (handled automatically)
> - If any alias points to a non-existent version, jobs will fail with "not found" errors
>
> When in doubt, run `curl -X POST http://localhost:3000/api/setup/deploy` to recreate everything with correct version alignment.

Or use the web UI at http://localhost:3000 and click "Setup" buttons.

### 3. Submit Jobs

Use the web interface at http://localhost:3000/drum.html to:
- Adjust drum parameters (diameter, height, segments, etc.)
- Submit jobs to Design Automation
- Download modified F3D files

## Project Structure

```
├── server.js                    # Express server
├── src/
│   ├── autodesk-api.js          # Autodesk API client
│   ├── config.js                # Configuration
│   └── appbundle/
│       └── DrumModifier.bundle/ # Fusion 360 plugin (TypeScript)
├── public/                      # Web UI files
├── Resources/
│   └── ParametricDrum.f3d       # Base drum model
└── output/                      # Generated files
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/submit` | POST | Submit a drum modification job |
| `/api/job-status/:id` | GET | Check job status |
| `/api/setup/deploy` | POST | **Recommended**: Full deployment (all 4 components) |
| `/api/setup/appbundle` | POST | Create/update AppBundle + AppBundle alias |
| `/api/setup/activity` | POST | Create/update Activity |
| `/api/setup/alias` | POST | Create/update Activity alias |

## Available Commands

```bash
npm start           # Start production server
npm run dev         # Start with auto-reload
npm run demo        # Demo mode (simulated processing)
npm run setup       # Run setup diagnostics
```

## Troubleshooting

### Common Deployment Issues

**"The App drumforge_app.DrumModifier+current could not be found"**

This means the AppBundle alias is missing. Run the full deployment:
```bash
curl -X POST http://localhost:3000/api/setup/deploy
```

**"Activity version mismatch"**

The Activity alias may be pointing to an old version. Update it:
```bash
# First, check what Activity version exists
curl -X POST http://localhost:3000/api/setup/activity
# Note the version number from the response, then update the alias:
curl -X POST http://localhost:3000/api/setup/alias -H "Content-Type: application/json" -d '{"version": VERSION}'
```

**Jobs fail after code changes**

After modifying `src/appbundle/DrumModifier.bundle/Contents/main.ts`:
```bash
curl -X POST http://localhost:3000/api/setup/deploy
```

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more issues.

## License

MIT

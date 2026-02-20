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

```bash
# Start server
npm start

# In another terminal, run setup
curl -X POST http://localhost:3000/api/setup/appbundle
curl -X POST http://localhost:3000/api/setup/activity
curl -X POST http://localhost:3000/api/setup/alias
```

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
| `/api/setup/appbundle` | POST | Create/update AppBundle |
| `/api/setup/activity` | POST | Create/update Activity |
| `/api/setup/alias` | POST | Create Activity alias |

## Available Commands

```bash
npm start           # Start production server
npm run dev         # Start with auto-reload
npm run demo        # Demo mode (simulated processing)
npm run setup       # Run setup diagnostics
```

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues.

## License

MIT

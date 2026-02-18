# Troubleshooting Guide

## Common Issues and Solutions

### 404 Error: "The requested resource does not exist"

This error typically occurs when trying to set up AppBundle or Activity. It means the API endpoint is not accessible, usually due to one of these reasons:

#### Cause 1: Design Automation Not Initialized

Your Autodesk account may not have Design Automation set up.

**How to fix:**

First, try automatic setup:
```bash
npm run setup-nickname
```

This will attempt to initialize Design Automation and show you the nickname to add to `.env`.

If that doesn't work, set it up manually:

1. Go to https://aps.autodesk.com/en/
2. Log in with your Autodesk account
3. Click "Manage your apps"
4. Navigate to Design Automation section
5. Enable/Create Design Automation
6. Note the nickname that's assigned to you

Then update your `.env` file:
```
AUTODESK_DA_NICKNAME=your_nickname_here
```

Verify everything is set up:
```bash
npm run setup
```

Once verified, deploy:
```bash
npm run deploy
```

#### Cause 2: Invalid or Expired Credentials

Your Autodesk credentials may be incorrect or expired.

**How to fix:**
1. Verify your `.env` file has correct values:
   ```bash
   cat .env | grep AUTODESK
   ```

2. Check each credential:
   - **AUTODESK_CLIENT_ID**: From https://aps.autodesk.com/en/
   - **AUTODESK_CLIENT_SECRET**: From https://aps.autodesk.com/en/
   - **AUTODESK_PERSONAL_ACCESS_TOKEN**: From your Autodesk account settings

3. If any are incorrect, update them in `.env`

4. Clear any cached tokens by stopping the server and restarting

5. Try the diagnostic again:
   ```bash
   npm run setup
   ```

#### Cause 3: Authentication Failure

Your authentication may be failing without clear error messaging.

**How to fix:**
1. Run diagnostics to see detailed error:
   ```bash
   npm run setup
   ```

2. Check the specific error message

3. Verify credentials are URL-safe (no special characters that need encoding)

4. If you recently rotated credentials, make sure you're using the latest ones

#### Cause 4: Account Limitations

Your Autodesk account may have reached resource limits or other restrictions.

**How to fix:**
1. Check your Autodesk account status at https://aps.autodesk.com/en/
2. Verify you have Design Automation quotas available
3. Contact Autodesk support if you've hit limits

### Testing Your Setup

After fixing the issue, test in this order:

1. **Run diagnostics:**
   ```bash
   npm run setup
   ```
   All checks should pass ✓

2. **Check deployment status:**
   ```bash
   npm run web
   # In another terminal:
   curl http://localhost:3000/api/setup/status | jq .
   ```
   
   Look for:
   - `"ready": true` (if you're starting fresh)
   - Or all three resources should show `"exists": true` (if already set up)

3. **Deploy AppBundle and Activity:**
   ```bash
   npm run deploy
   ```
   
   Should complete successfully with ✅

### Getting Help

If you still see errors:

1. **Capture full error output:**
   ```bash
   npm run setup 2>&1 | tee setup.log
   npm run deploy 2>&1 | tee deploy.log
   ```

2. **Check server logs:**
   ```bash
   npm run web  # Shows detailed logs
   ```

3. **Review FILE_PROCESSING_SETUP.md** for complete instructions

4. **Verify all prerequisites:**
   - Autodesk account created
   - APS credentials generated
   - Personal Access Token created
   - Design Automation initialized in account
   - `.env` file with correct credentials

### Demo Mode (No Setup Required)

If you want to test the application without setting up Design Automation:

```bash
npm run demo
```

This runs in demo mode with simulated file processing. Great for testing the UI and workflow without Autodesk setup.

### Credentials Checklist

Before debugging further, verify you have all required credentials:

```
[ ] AUTODESK_CLIENT_ID - From https://aps.autodesk.com/en/
[ ] AUTODESK_CLIENT_SECRET - From https://aps.autodesk.com/en/
[ ] AUTODESK_PERSONAL_ACCESS_TOKEN - Generated in your Autodesk account
[ ] .env file exists in project root
[ ] Autodesk account has Design Automation initialized
```

Missing any of these? See [GETTING_STARTED.md](GETTING_STARTED.md) for setup instructions.

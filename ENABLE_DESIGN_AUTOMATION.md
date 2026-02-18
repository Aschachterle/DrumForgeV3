# Enable Design Automation - Manual Setup Required

## Problem

Your Autodesk account doesn't have Design Automation provisioned yet. This is a **one-time setup** that must be done in the Autodesk dashboard before we can create AppBundles and Activities.

## Solution

### Step 1: Go to Autodesk APS Portal

Open this link in your browser:
```
https://aps.autodesk.com/en/
```

### Step 2: Log In

Log in with the Autodesk account credentials that match your `AUTODESK_CLIENT_ID`.

### Step 3: Navigate to Design Automation

1. Click your profile icon (top right)
2. Click **"Manage your apps"** or go to the applications page
3. Look for **Design Automation** section
4. If you see a **"Create App"** or **"Enable"** button, click it
5. This provisions Design Automation for your account (takes a few seconds)

### Step 4: Get Your Nickname

Once Design Automation is provisioned:
- You'll see your **Design Automation nickname** assigned (e.g., `drumforge_app_xxxxx`)
- Copy this nickname

### Step 5: Update .env

Update your `.env` file with the correct nickname:
```
AUTODESK_DA_NICKNAME=your_actual_nickname_from_step_4
```

### Step 6: Test and Deploy

Once you've completed the manual setup on the dashboard:

```bash
# Verify everything is ready
npm run setup

# This should now show ✓ Design Automation account is active

# Then deploy AppBundle and Activity
npm run deploy
```

## Why This Is Needed

Design Automation on Autodesk's platform needs to be provisioned per account. This is a one-time setup in the dashboard to authorize the service. Once done, everything else is automated through our scripts.

## Still Not Working?

After enabling Design Automation in the dashboard:

**Option A:** Use the API endpoint
```bash
npm run web
# In another terminal:
curl -X POST http://localhost:3000/api/setup/init-da
```

**Option B:** Run diagnostics
```bash
npm run setup
```

This will tell you the exact status and what's needed next.

## Next Steps After Enabling

1. ✅ Enable Design Automation (dashboard - this is what we need now)
2. ⏳ Run `npm run setup` to verify
3. ⏳ Run `npm run deploy` to create AppBundle, Activity, Alias
4. ⏳ Upload plugin code to cloud storage
5. ⏳ Start processing files with `npm run web`

**You're on step 1 - enable Design Automation in the Autodesk dashboard first, then let me know!**

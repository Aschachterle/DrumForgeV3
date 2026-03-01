# Troubleshooting

## Common Issues

### 404 Error: "The requested resource does not exist"

**Cause:** Design Automation not initialized for your account.

**Fix:**
```bash
npm run setup-nickname
```

Or manually:
1. Go to https://aps.autodesk.com
2. Navigate to Design Automation section
3. Enable/Create Design Automation
4. Add the nickname to `.env`:
   ```
   AUTODESK_DA_NICKNAME=your_nickname
   ```

### "App does not contain PackageContents.xml file"

**Cause:** AppBundle zip structure is incorrect.

**Fix:** The zip must contain a `.bundle` folder at the root:
```
DrumModifier.bundle/
  PackageContents.xml
  Contents/
    main.ts
```

This is handled automatically by the current code. If you see this error, re-upload the AppBundle:
```bash
curl -X POST http://localhost:3000/api/setup/appbundle
```

### TypeScript Transpile Error: "Cannot find name 'adsk'"

**Cause:** Missing TypeScript declaration for the Fusion 360 runtime global.

**Fix:** Ensure `main.ts` starts with:
```typescript
declare const adsk: any;
```

### "The App ... could not be found"

**Cause:** AppBundle alias doesn't exist or points to wrong version.

**Fix:** Create/update the alias:
```bash
curl -X POST http://localhost:3000/api/setup/appbundle-alias \
  -H "Content-Type: application/json" \
  -d '{"version": VERSION_NUMBER}'
```

### Authentication Failed

**Cause:** Invalid or expired credentials.

**Fix:**
1. Verify `.env` has correct values:
   - `AUTODESK_CLIENT_ID`
   - `AUTODESK_CLIENT_SECRET`  
   - `AUTODESK_PERSONAL_ACCESS_TOKEN`

2. Regenerate Personal Access Token if expired (they expire after ~1 hour)

3. Restart the server to clear cached tokens

### Job Status: "failedInstructions"

**Cause:** The Fusion 360 plugin encountered an error.

**Fix:** Check the job report for details:
```bash
curl http://localhost:3000/api/job-status/YOUR_JOB_ID
```

Look at the `reportUrl` or server logs for specific error messages.

### 409 Conflict During Deploy (Expected Behavior)

**What you see:**
```
Activity creation error: { status: 409, data: "...already exists..." }
✓ Activity already exists, creating new version...
✓ New Activity version created: 39
```

**This is NOT an error!** It's expected behavior.

**Explanation:**
Autodesk Design Automation treats Activities and AppBundles as versioned resources. When you deploy:

1. **First attempt**: Code tries `POST /activities` to create new Activity
2. **409 response**: Autodesk says "this name already exists"
3. **Recovery**: Code catches this and calls `POST /activities/{id}/versions` to create a new version
4. **Success**: New version (e.g., v39) is created
5. **Alias update**: The `+current` alias is updated to point to the new version

**The flow:**
```
Try: POST /activities (create new)
     ↓
409: "Already exists"
     ↓
POST /activities/{id}/versions (create version N+1)
     ↓
200: Version created
     ↓
PATCH /aliases/current → point to new version
```

**When to worry:** Only if the deploy doesn't end with "✅ Setup complete!" or if jobs fail after deploy.

## Adding a New Parameter

See [MAINTENANCE.md](MAINTENANCE.md) for the complete guide on adding new parameters.

## Diagnostic Commands

```bash
# Check setup status
curl http://localhost:3000/api/setup/status

# View server logs
tail -100 server.log

# Verify zip structure
unzip -l output/DrumModifier.bundle.zip

# Test job submission
curl -X POST http://localhost:3000/api/submit \
  -H "Content-Type: application/json" \
  -d '{"parameters":{"ShellDiam":"14 in"}}'
```

## Getting Help

- Check server logs: `tail -f server.log`
- Autodesk API docs: https://aps.autodesk.com/developer/documentation
- Design Automation guide: https://aps.autodesk.com/en/docs/design-automation/v3

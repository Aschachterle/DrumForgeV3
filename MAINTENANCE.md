# DrumForge Maintenance Guide

This guide covers common maintenance tasks for the DrumForge application.

## Adding a New Parameter

When you add a new parameter to the Fusion 360 model, you need to update **3 files** and redeploy.

### Step 1: Add Parameter to Fusion 360 Model

1. Open `Resources/ParametricDrum.f3d` in Fusion 360
2. Go to **Modify > Change Parameters**
3. Add a new User Parameter with your desired name and default value
4. Save the file

### Step 2: Update `config/parameters.json`

Add the new parameter definition:

```json
{
  "parameters": {
    "ExistingParam": { ... },
    "NewParamName": {
      "default": 0.375,
      "type": "dimension",
      "unit": "in",
      "min": 0.125,
      "max": 0.5,
      "label": "Human readable label",
      "description": "Description shown in tooltip"
    }
  }
}
```

**Parameter types:**
- `"type": "number"` - Plain number (no units)
- `"type": "dimension"` - Value with unit suffix (in, mm, etc.)

**Optional fields for toggleable parameters:**
```json
"toggleable": true,
"disabledValue": 0.001
```

### Step 3: Update `src/appbundle/DrumModifier.bundle/Contents/main.ts`

**A) Add default value in `paramValues` object (~line 48):**

```typescript
let paramValues: any = {
    NumSegments: 4,
    ShellThick: "8mm",
    // ... existing params ...
    NewParamName: "0.375in"  // <-- Add your new param
};
```

**B) Add the parameter update code block (after other parameter updates, ~line 240):**

```typescript
// Update NewParamName
const newParam = userParams.itemByName('NewParamName');
if (newParam) {
    log("BEFORE: NewParamName = " + newParam.expression);
    try {
        newParam.expression = paramValues.NewParamName || "0.375in";
        for (let i = 0; i < 5; i++) adsk.doEvents();
        log("AFTER: NewParamName = " + newParam.expression);
    } catch (err) {
        log("ERROR setting NewParamName: " + String(err));
    }
} else {
    log("NewParamName parameter not found");
}
```

### Step 4: Redeploy to Autodesk

```bash
curl -X POST http://localhost:3000/api/setup/deploy
```

This will:
1. Package the updated `main.ts` into the AppBundle
2. Upload to Autodesk Design Automation
3. Create a new Activity version
4. Update the `+current` alias to point to the new version

### Step 5: (Optional) Update SVG Preview

If the parameter affects the preview drawing, update `src/svg-preview.js`.

### Checklist

- [ ] Add parameter to F3D model in Fusion 360 (User Parameters)
- [ ] Add to `config/parameters.json`
- [ ] Add default value in `main.ts` paramValues object
- [ ] Add parameter update code block in `main.ts`
- [ ] Run deploy: `curl -X POST http://localhost:3000/api/setup/deploy`
- [ ] Test by submitting a job

### Example: OutputHoleDiam

This parameter was added with a toggle checkbox:

**parameters.json:**
```json
"OutputHoleDiam": {
  "default": 0.375,
  "type": "dimension",
  "unit": "in",
  "min": 0.125,
  "max": 0.5,
  "label": "Output jack hole diameter",
  "description": "Diameter of the hole for the output jack. Uncheck to remove the hole.",
  "toggleable": true,
  "disabledValue": 0.001
}
```

When the checkbox is unchecked, the UI sends `0.001 in` which effectively removes the hole (Fusion suppresses features smaller than this).

---

## Understanding the Deploy Process

### What Happens During Deploy

When you run `curl -X POST http://localhost:3000/api/setup/deploy`:

1. **AppBundle Creation**
   - Zips `src/appbundle/DrumModifier.bundle/` folder
   - Uploads to Autodesk
   - Creates/updates AppBundle version
   - Sets `+current` alias to new version

2. **Activity Creation**
   - Creates new Activity version referencing AppBundle via `+current`
   - Activity defines inputs (F3D file), outputs (STL file), and parameters

3. **Alias Update**
   - Updates Activity's `+current` alias to point to new version

### 409 Conflict Errors (Expected)

You may see this during deploy:

```
Activity creation error: { status: 409, data: "...already exists..." }
✓ Activity already exists, creating new version...
✓ New Activity version created: 39
```

**This is NOT an error!** The 409 means the Activity already exists, so the code creates a new version instead. The deploy is successful if it ends with "✅ Setup complete!"

### Version Flow

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

---

## Cleanup Tasks

### Clear Old Jobs (Automatic)

Jobs older than 7 days are automatically cleaned up on server start. This removes:
- Local job metadata from `output/job-metadata.json`
- Input/output files from Autodesk OSS (cloud storage)

### Manual Cleanup

```bash
# Clear server log
echo "" > server.log

# View job count
cat output/job-metadata.json | grep -c '"submittedAt"'
```

---

## Updating the F3D Base Model

If you modify `Resources/ParametricDrum.f3d`:

1. Save the updated file in Fusion 360
2. Redeploy: `curl -X POST http://localhost:3000/api/setup/deploy`
3. The new model will be used for all subsequent jobs

---

## Common Maintenance Commands

```bash
# Full redeploy after code changes
curl -X POST http://localhost:3000/api/setup/deploy

# Check deployment status
curl http://localhost:3000/api/setup/status

# View recent logs
tail -100 server.log

# Restart server
# Kill existing: Ctrl+C or pkill -f "node server"
node server.js
```

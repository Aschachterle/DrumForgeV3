// Declare adsk as global - Fusion 360 provides this at runtime
declare const adsk: any;

// Script executes immediately at script load time (not wrapped in a function)
try {
    console.log("Starting DrumForge Modifier - immediate execution...");

    const app = adsk.core.Application.get();
    if (!app) throw new Error("Failed to get Application");

    console.log("Opening input.f3d...");
    let doc = null;

    try {
        // Try opening as document first
        doc = app.documents.open('input.f3d', false);
        console.log("Opened input.f3d as document");
    } catch (openError) {
        console.log("Open failed: " + openError.toString());
        console.log("Trying import method...");

        // Fall back to import
        const impMgr = app.importManager;
        const importOptions = impMgr.createFusionArchiveImportOptions('input.f3d');
        doc = impMgr.importToNewDocument(importOptions);

        if (!doc) throw new Error("Failed to import input.f3d");
        console.log("Imported input.f3d");
    }

    // Quick flush
    for (let i = 0; i < 5; i++) adsk.doEvents();

    const product = app.activeProduct;
    const design = product;

    // Get user parameters collection once
    const userParams = design.userParameters;

    // Read parameters from params.json
    console.log("Reading params.json...");
    let paramValues: any = {
        NumSegments: 4,
        ShellThick: "8mm",
        ShellHeight: "8in",
        ShellDiam: "14in",
        LugTopDist: "2.5in",
        LugSpacing: "2.5in",
        LapSizePercent: 25,
        LugHoleDiam: "0.3in"
    };

    try {
        const textIO = adsk.core.TextIO.cast(app.documents.textIO);
        if (textIO) {
            const paramsText = textIO.readTextFile('params.json');
            paramValues = JSON.parse(paramsText);
            console.log("Loaded parameters from JSON: " + JSON.stringify(paramValues));
        }
    } catch (err) {
        console.log("Could not read params.json, using defaults: " + err.toString());
    }

    // List all available parameters - debug step
    console.log("=== LISTING ALL USER PARAMETERS ===");
    if (userParams) {
        console.log("Total user parameters found: " + userParams.count);
        for (let i = 0; i < userParams.count; i++) {
            const param = userParams.item(i);
            console.log("  [" + i + "] Name: '" + param.name + "' = " + param.expression + " (value: " + param.value + ")");
        }
    } else {
        console.log("No user parameters collection found");
    }
    console.log("=== END PARAMETER LIST ===");

    // Modify the User Parameters
    console.log("Modifying parameters...");

    if (userParams) {
        // Update NumSegments
        const numSegParam = userParams.itemByName('NumSegments');
        if (numSegParam) {
            console.log("BEFORE: NumSegments = " + numSegParam.expression);
            try {
                numSegParam.expression = String(paramValues.NumSegments || 4);
                for (let i = 0; i < 5; i++) adsk.doEvents();
                console.log("AFTER: NumSegments = " + numSegParam.expression);
            } catch (err) {
                console.log("ERROR setting NumSegments: " + err.toString());
            }
        } else {
            console.log("NumSegments parameter not found");
        }

        // Update ShellThick
        const thickParam = userParams.itemByName('ShellThick');
        if (thickParam) {
            console.log("BEFORE: ShellThick = " + thickParam.expression);
            try {
                thickParam.expression = paramValues.ShellThick || "8mm";
                for (let i = 0; i < 5; i++) adsk.doEvents();
                console.log("AFTER: ShellThick = " + thickParam.expression);
            } catch (err) {
                console.log("ERROR setting ShellThick: " + err.toString());
            }
        } else {
            console.log("ShellThick parameter not found");
        }

        // Update ShellHeight
        const heightParam = userParams.itemByName('ShellHeight');
        if (heightParam) {
            console.log("BEFORE: ShellHeight = " + heightParam.expression);
            try {
                heightParam.expression = paramValues.ShellHeight || "8in";
                for (let i = 0; i < 5; i++) adsk.doEvents();
                console.log("AFTER: ShellHeight = " + heightParam.expression);
            } catch (err) {
                console.log("ERROR setting ShellHeight: " + err.toString());
            }
        } else {
            console.log("ShellHeight parameter not found");
        }

        // Update ShellDiam
        const diamParam = userParams.itemByName('ShellDiam');
        if (diamParam) {
            console.log("BEFORE: ShellDiam = " + diamParam.expression);
            try {
                diamParam.expression = paramValues.ShellDiam || "14in";
                for (let i = 0; i < 5; i++) adsk.doEvents();
                console.log("AFTER: ShellDiam = " + diamParam.expression);
            } catch (err) {
                console.log("ERROR setting ShellDiam: " + err.toString());
            }
        } else {
            console.log("ShellDiam parameter not found");
        }
    } else {
        console.log("No userParameters found in design");
    }

    // Force complete model regeneration
    console.log("Forcing model regeneration...");
    try {
        const timeline = design.timeline;

        if (timeline) {
            // Roll to beginning
            timeline.markerPosition = 0;
            for (let i = 0; i < 10; i++) adsk.doEvents();

            // Roll to end (regenerates everything)
            timeline.markerPosition = timeline.count;
            for (let i = 0; i < 30; i++) adsk.doEvents();

            console.log("Timeline fully regenerated");
        }

        // More processing time for complex features
        for (let i = 0; i < 20; i++) adsk.doEvents();

    } catch (regenErr) {
        console.log("Regeneration error: " + regenErr.toString());
    }

    // Export to output.f3d
    console.log("Exporting Fusion archive to output.f3d...");
    try {
        const exportMgr = design.exportManager;
        const f3dOptions = exportMgr.createFusionArchiveExportOptions('output.f3d');
        exportMgr.execute(f3dOptions);
        console.log("Export complete");
    } catch (err) {
        console.log("Fusion archive export failed: " + err.toString());
    }

    // Small flush
    for (let i = 0; i < 5; i++) adsk.doEvents();

    console.log("Script complete");
} catch (e) {
    console.error("Script failed: " + (e as any).toString());
    const stack = (e as any).stack ? (e as any).stack.toString() : "no stack";
    console.error("Stack: " + stack);
    throw e;
}

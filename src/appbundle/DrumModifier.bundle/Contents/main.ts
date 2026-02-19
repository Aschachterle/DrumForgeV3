// Declare adsk as global - Fusion 360 provides this at runtime
declare const adsk: any;

function log(message: string): void {
    if (adsk && adsk.log) {
        adsk.log(message);
    }
    console.log(message);
}

// Script executes immediately at script load time (not wrapped in a function)
try {
    log("Starting DrumForge Modifier - immediate execution...");

    const app = adsk.core.Application.get();
    if (!app) throw new Error("Failed to get Application");

    log("Opening input.f3d...");
    let doc = null;

    try {
        // Try opening as document first
        doc = app.documents.open('input.f3d', false);
        log("Opened input.f3d as document");
    } catch (openError) {
        log("Open failed: " + openError.toString());
        log("Trying import method...");

        // Fall back to import
        const impMgr = app.importManager;
        const importOptions = impMgr.createFusionArchiveImportOptions('input.f3d');
        doc = impMgr.importToNewDocument(importOptions);

        if (!doc) throw new Error("Failed to import input.f3d");
        log("Imported input.f3d");
    }

    // Quick flush
    for (let i = 0; i < 5; i++) adsk.doEvents();

    const product = app.activeProduct;
    const design = product;

    // Get user parameters collection once
    const userParams = design.userParameters;

    // Read parameters - Fusion's TaskParameters via adsk.parameters
    log("=== STARTING PARAMETER READ ===");
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

    // Method 1: Use Fusion's adsk.parameters (official way to access WorkItem TaskParameters)
    let foundParams = false;
    try {
        log("DEBUG: typeof adsk = " + typeof adsk);
        log("DEBUG: adsk keys = " + Object.keys(adsk).join(", ").substring(0, 100));
        
        if ((adsk as any).parameters) {
            const paramsString = (adsk as any).parameters;
            log("SUCCESS: adsk.parameters is available!");
            log("DEBUG: type = " + typeof paramsString);
            log("DEBUG: length = " + (paramsString as any).length);
            log("DEBUG: first 300 chars = " + paramsString.toString().substring(0, 300));
            
            // Parse if it's a stringified JSON
            try {
                const parsedParams = JSON.parse(paramsString);
                log("SUCCESS: Parsed JSON successfully");
                log("DEBUG: parsed keys = " + Object.keys(parsedParams).join(", "));
                
                // Check if it has 'parameters' nested object (our structure)
                if (parsedParams.parameters && typeof parsedParams.parameters === 'object') {
                    paramValues = { ...paramValues, ...parsedParams.parameters };
                    log("SUCCESS: Applied nested parameters object");
                    foundParams = true;
                } else if (typeof parsedParams === 'object') {
                    // If it's directly the parameters object
                    paramValues = { ...paramValues, ...parsedParams };
                    log("SUCCESS: Applied top-level parameters");
                    foundParams = true;
                }
            } catch (parseErr) {
                log("ERROR: Could not parse JSON: " + parseErr.toString());
            }
        } else {
            log("ERROR: adsk.parameters is NOT available");
            log("DEBUG: adsk object has parameters property? " + ('parameters' in adsk));
        }
    } catch (e) {
        log("ERROR: Exception accessing adsk.parameters: " + e.toString());
    }

    if (!foundParams) {
        log("WARNING: Using default hardcoded parameters (TaskParameters not found)");
    }

    log("=== FINAL PARAMETERS ===");
    log("NumSegments=" + paramValues.NumSegments + 
                ", ShellHeight=" + paramValues.ShellHeight +
                ", ShellThick=" + paramValues.ShellThick +
                ", ShellDiam=" + paramValues.ShellDiam);
    log("=== END PARAMETER READ ===" );

    // List all available parameters - debug step
    log("=== LISTING ALL USER PARAMETERS ===");
    if (userParams) {
        log("Total user parameters found: " + userParams.count);
        for (let i = 0; i < userParams.count; i++) {
            const param = userParams.item(i);
            log("  [" + i + "] Name: '" + param.name + "' = " + param.expression + " (value: " + param.value + ")");
        }
    } else {
        log("No user parameters collection found");
    }
    log("=== END PARAMETER LIST ===");

    // Modify the User Parameters
    log("Modifying parameters...");

    if (userParams) {
        // Update NumSegments
        const numSegParam = userParams.itemByName('NumSegments');
        if (numSegParam) {
            log("BEFORE: NumSegments = " + numSegParam.expression);
            try {
                numSegParam.expression = String(paramValues.NumSegments || 4);
                for (let i = 0; i < 5; i++) adsk.doEvents();
                log("AFTER: NumSegments = " + numSegParam.expression);
            } catch (err) {
                log("ERROR setting NumSegments: " + err.toString());
            }
        } else {
            log("NumSegments parameter not found");
        }

        // Update ShellThick
        const thickParam = userParams.itemByName('ShellThick');
        if (thickParam) {
            log("BEFORE: ShellThick = " + thickParam.expression);
            try {
                thickParam.expression = paramValues.ShellThick || "8mm";
                for (let i = 0; i < 5; i++) adsk.doEvents();
                log("AFTER: ShellThick = " + thickParam.expression);
            } catch (err) {
                log("ERROR setting ShellThick: " + err.toString());
            }
        } else {
            log("ShellThick parameter not found");
        }

        // Update ShellHeight
        const heightParam = userParams.itemByName('ShellHeight');
        if (heightParam) {
            log("BEFORE: ShellHeight = " + heightParam.expression);
            try {
                heightParam.expression = paramValues.ShellHeight || "8in";
                for (let i = 0; i < 5; i++) adsk.doEvents();
                log("AFTER: ShellHeight = " + heightParam.expression);
            } catch (err) {
                log("ERROR setting ShellHeight: " + err.toString());
            }
        } else {
            log("ShellHeight parameter not found");
        }

        // Update ShellDiam
        const diamParam = userParams.itemByName('ShellDiam');
        if (diamParam) {
            log("BEFORE: ShellDiam = " + diamParam.expression);
            try {
                diamParam.expression = paramValues.ShellDiam || "14in";
                for (let i = 0; i < 5; i++) adsk.doEvents();
                log("AFTER: ShellDiam = " + diamParam.expression);
            } catch (err) {
                log("ERROR setting ShellDiam: " + err.toString());
            }
        } else {
            log("ShellDiam parameter not found");
        }
    } else {
        log("No userParameters found in design");
    }

    // Force complete model regeneration
    log("Forcing model regeneration...");
    try {
        const timeline = design.timeline;

        if (timeline) {
            // Roll to beginning
            timeline.markerPosition = 0;
            for (let i = 0; i < 10; i++) adsk.doEvents();

            // Roll to end (regenerates everything)
            timeline.markerPosition = timeline.count;
            for (let i = 0; i < 30; i++) adsk.doEvents();

            log("Timeline fully regenerated");
        }

        // More processing time for complex features
        for (let i = 0; i < 20; i++) adsk.doEvents();

    } catch (regenErr) {
        log("Regeneration error: " + regenErr.toString());
    }

    // Export to output.f3d
    log("Exporting Fusion archive to output.f3d...");
    try {
        const exportMgr = design.exportManager;
        const f3dOptions = exportMgr.createFusionArchiveExportOptions('output.f3d');
        exportMgr.execute(f3dOptions);
        log("Export complete");
    } catch (err) {
        log("Fusion archive export failed: " + err.toString());
    }

    // Small flush
    for (let i = 0; i < 5; i++) adsk.doEvents();

    log("Script complete");
} catch (e) {
    console.error("Script failed: " + (e as any).toString());
    const stack = (e as any).stack ? (e as any).stack.toString() : "no stack";
    console.error("Stack: " + stack);
    throw e;
}

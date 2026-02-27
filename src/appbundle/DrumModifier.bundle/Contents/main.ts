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
        log("Open failed: " + String(openError));
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
                log("ERROR: Could not parse JSON: " + String(parseErr));
            }
        } else {
            log("ERROR: adsk.parameters is NOT available");
            log("DEBUG: adsk object has parameters property? " + ('parameters' in adsk));
        }
    } catch (e) {
        log("ERROR: Exception accessing adsk.parameters: " + String(e));
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
                log("ERROR setting NumSegments: " + String(err));
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
                log("ERROR setting ShellThick: " + String(err));
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
                log("ERROR setting ShellHeight: " + String(err));
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
                log("ERROR setting ShellDiam: " + String(err));
            }
        } else {
            log("ShellDiam parameter not found");
        }

        // Update LugTopDist
        const lugTopParam = userParams.itemByName('LugTopDist');
        if (lugTopParam) {
            log("BEFORE: LugTopDist = " + lugTopParam.expression);
            try {
                lugTopParam.expression = paramValues.LugTopDist || "2in";
                for (let i = 0; i < 5; i++) adsk.doEvents();
                log("AFTER: LugTopDist = " + lugTopParam.expression);
            } catch (err) {
                log("ERROR setting LugTopDist: " + String(err));
            }
        } else {
            log("LugTopDist parameter not found");
        }

        // Update LugSpacing
        const lugSpaceParam = userParams.itemByName('LugSpacing');
        if (lugSpaceParam) {
            log("BEFORE: LugSpacing = " + lugSpaceParam.expression);
            try {
                lugSpaceParam.expression = paramValues.LugSpacing || "2in";
                for (let i = 0; i < 5; i++) adsk.doEvents();
                log("AFTER: LugSpacing = " + lugSpaceParam.expression);
            } catch (err) {
                log("ERROR setting LugSpacing: " + String(err));
            }
        } else {
            log("LugSpacing parameter not found");
        }

        // Update LapSizePercent
        const lapParam = userParams.itemByName('LapSizePercent');
        if (lapParam) {
            log("BEFORE: LapSizePercent = " + lapParam.expression);
            try {
                lapParam.expression = String(paramValues.LapSizePercent || 25);
                for (let i = 0; i < 5; i++) adsk.doEvents();
                log("AFTER: LapSizePercent = " + lapParam.expression);
            } catch (err) {
                log("ERROR setting LapSizePercent: " + String(err));
            }
        } else {
            log("LapSizePercent parameter not found");
        }

        // Update LugHoleDiam
        const lugHoleParam = userParams.itemByName('LugHoleDiam');
        if (lugHoleParam) {
            log("BEFORE: LugHoleDiam = " + lugHoleParam.expression);
            try {
                lugHoleParam.expression = paramValues.LugHoleDiam || "0.25in";
                for (let i = 0; i < 5; i++) adsk.doEvents();
                log("AFTER: LugHoleDiam = " + lugHoleParam.expression);
            } catch (err) {
                log("ERROR setting LugHoleDiam: " + String(err));
            }
        } else {
            log("LugHoleDiam parameter not found");
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
        log("Regeneration error: " + String(regenErr));
    }

    // Export to output.stl
    log("Exporting STL to output.stl...");
    try {
        const exportMgr = design.exportManager;
        const rootComp = design.rootComponent;
        log("Got exportMgr and rootComp, rootComp name: " + (rootComp ? rootComp.name : "null"));
        
        // Check how many bodies exist
        const allBodies = rootComp.bRepBodies;
        log("Number of bodies in root component: " + allBodies.count);
        
        if (allBodies.count === 0) {
            // Try getting bodies from all occurrences
            log("No bodies in root, checking occurrences...");
            const occs = rootComp.allOccurrences;
            log("Number of occurrences: " + occs.count);
            for (let i = 0; i < Math.min(occs.count, 3); i++) {
                const occ = occs.item(i);
                log("  Occurrence " + i + ": " + occ.name + " has " + occ.bRepBodies.count + " bodies");
            }
        }
        
        // Create STL export options - export rootComp to file
        const stlOptions = exportMgr.createSTLExportOptions(rootComp, 'output.stl');
        log("Created STL export options");
        
        // IMPORTANT: Set to export to file, not print utility
        stlOptions.sendToPrintUtility = false;
        log("Set sendToPrintUtility = false");
        
        const result = exportMgr.execute(stlOptions);
        log("STL export execute returned: " + result);
        log("STL export complete");
    } catch (err) {
        log("STL export failed: " + String(err));
        log("Error details: " + JSON.stringify(err));
        
        // Last resort: export F3D
        log("Attempting F3D export as last resort...");
        try {
            const exportMgr = design.exportManager;
            const f3dOptions = exportMgr.createFusionArchiveExportOptions('output.stl');
            exportMgr.execute(f3dOptions);
            log("F3D exported with .stl extension");
        } catch (fallbackErr) {
            log("F3D fallback also failed: " + String(fallbackErr));
        }
    }

    // Small flush
    for (let i = 0; i < 5; i++) adsk.doEvents();

    log("Script complete");
} catch (e) {
    console.error("Script failed: " + (e as any));
    const stack = (e as any).stack ? (e as any).stack.toString() : "no stack";
    console.error("Stack: " + stack);
    throw e;
}

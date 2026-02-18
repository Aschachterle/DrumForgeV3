/*global adsk*/

// Drum Modifier Add-in for Fusion 360 Design Automation
// Modifies user parameters in a parametric drum design

function run(context) {
    "use strict";
    
    var app = adsk.core.Application.get();
    var ui = app.userInterface;
    
    try {
        // Get command line arguments
        var args = process.argv.slice(2);
        var inputFile = null;
        var outputFile = null;
        var paramsFile = null;
        
        // Parse command line arguments
        for (var i = 0; i < args.length; i++) {
            if (args[i] === '--file' && i + 1 < args.length) {
                inputFile = args[i + 1];
                i++;
            } else if (args[i] === '--output' && i + 1 < args.length) {
                outputFile = args[i + 1];
                i++;
            } else if (args[i] === '--params' && i + 1 < args.length) {
                paramsFile = args[i + 1];
                i++;
            }
        }
        
        if (!inputFile || !outputFile) {
            throw new Error('Input and output files are required');
        }
        
        // console.log('Input file: ' + inputFile);
        // console.log('Output file: ' + outputFile);
        // console.log('Params file: ' + paramsFile);
        
        // Open the input document
        var doc = app.documents.open(inputFile, false);
        if (!doc) {
            throw new Error('Failed to open input file: ' + inputFile);
        }
        
        var design = adsk.fusion.Design.cast(app.activeProduct);
        if (!design) {
            throw new Error('Failed to get design from document');
        }
        
        // Read parameters from JSON file if provided
        var parameters = {};
        if (paramsFile) {
            var fs = require('fs');
            var paramsData = fs.readFileSync(paramsFile, 'utf8');
            parameters = JSON.parse(paramsData);
            // console.log('Loaded parameters:', JSON.stringify(parameters));
        }
        
        // Get user parameters
        var userParams = design.userParameters;
        
        // Parameter mapping
        var paramMap = {
            'NumSegments': 'NumSegments',
            'ShellThick': 'ShellThick',
            'ShellHeight': 'ShellHeight',
            'ShellDiam': 'ShellDiam',
            'LugTopDist': 'LugTopDist',
            'LugSpacing': 'LugSpacing',
            'LapSizePercent': 'LapSizePercent',
            'LugHoleDiam': 'LugHoleDiam'
        };
        
        // Update parameters
        var updatedCount = 0;
        for (var paramName in parameters) {
            if (parameters.hasOwnProperty(paramName) && paramMap[paramName]) {
                var fusionParamName = paramMap[paramName];
                var param = userParams.itemByName(fusionParamName);
                
                if (param) {
                    var value = parameters[paramName];
                    
                    // Handle different parameter types
                    if (typeof value === 'number') {
                        // Numeric parameter (e.g., NumSegments, LapSizePercent)
                        param.expression = value.toString();
                    } else if (typeof value === 'string') {
                        // String with units (e.g., "8 mm", "7 in")
                        param.expression = value;
                    }
                    
                    // console.log('Updated ' + fusionParamName + ' = ' + param.expression);
                    updatedCount++;
                } else {
                    // console.log('Warning: Parameter ' + fusionParamName + ' not found');
                }
            }
        }
        
        // console.log('Updated ' + updatedCount + ' parameters');
        
        // Save the modified document
        doc.saveAs(outputFile, false, '', '');
        // console.log('Saved to: ' + outputFile);
        
        // Close the document
        doc.close(false);
        
        return { success: true, updatedParameters: updatedCount };
        
    } catch (e) {
        if (ui) {
            ui.messageBox('Error: ' + (e.message || e.toString()));
        }
        // console.error('Error:', e.message || e.toString());
        throw e;
    }
}

// Export the run function
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { run: run };
}

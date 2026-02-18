#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import traceback
import json

# Add Fusion 360 libraries to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def modify_drum_parameters(input_file, output_file, parameters):
    """
    Modify drum parameters in Fusion 360 F3D file
    
    This script opens a parametric Fusion 360 design and updates its user parameters.
    """
    try:
        import adsk.core
        import adsk.fusion
        from adsk.core import Units
        
        # Initialize Fusion 360 application
        app = adsk.core.Application.get()
        ui = app.userInterface
        design = None
        
        # Open the F3D file
        documents = app.documents
        doc = documents.open(input_file, False)
        
        if doc is None:
            raise Exception(f"Failed to open document: {input_file}")
        
        # Get the design
        app.activeProduct.activeDocument.isReadOnly = False
        design = adsk.fusion.Design.cast(app.activeProduct)
        
        if design is None:
            raise Exception("Failed to get design from document")
        
        # Get user parameters
        user_params = design.userParameters
        
        # Update parameters based on input
        param_map = {
            'NumSegments': 'NumSegments',
            'ShellThick': 'ShellThick',
            'ShellHeight': 'ShellHeight',
            'ShellDiam': 'ShellDiam',
            'LugTopDist': 'LugTopDist',
            'LugSpacing': 'LugSpacing',
            'LapSizePercent': 'LapSizePercent',
            'LugHoleDiam': 'LugHoleDiam'
        }
        
        for input_param, fusion_param in param_map.items():
            if input_param in parameters:
                value = parameters[input_param]
                
                try:
                    param = user_params.itemByName(fusion_param)
                    if param:
                        # Set the parameter value
                        if isinstance(value, str):
                            # Handle strings like "6 mm" or "12 in"
                            param.expression = value
                        else:
                            # Handle numeric values
                            param.expression = str(value)
                        
                        print(f"Updated {fusion_param} = {value}")
                except Exception as e:
                    print(f"Warning: Could not update parameter {fusion_param}: {str(e)}")
        
        # Recalculate the design to apply changes
        design.rootComponent.calculateSketch()
        
        # Save the document to output location
        save_options = adsk.core.SaveFileOptions.SaveAsOptions
        doc.saveAs(output_file, False, '', '')
        print(f"Document saved to: {output_file}")
        
        # Close the document
        doc.close(False)
        
        return True
        
    except ImportError as e:
        print(f"Error: Fusion 360 API not available: {str(e)}")
        print("This script must run within Autodesk Design Automation")
        return False
    except Exception as e:
        print(f"Error modifying drum parameters: {str(e)}")
        traceback.print_exc()
        return False

def main():
    """
    Main entry point for Design Automation WorkItem
    """
    try:
        # Default file paths matching Activity localName definitions
        input_file = 'input.f3d'
        output_file = 'output.f3d'
        params_file = 'params.json'
        
        print(f"Input file: {input_file}")
        print(f"Output file: {output_file}")
        print(f"Parameters file: {params_file}")
        
        # Parse parameters from JSON file
        parameters = {}
        if os.path.exists(params_file):
            with open(params_file, 'r') as f:
                parameters = json.load(f)
            print(f"Loaded parameters: {json.dumps(parameters, indent=2)}")
        else:
            print("No parameters file found, using defaults")
        
        # Modify the drum
        success = modify_drum_parameters(input_file, output_file, parameters)
        
        if success:
            print("✓ Drum modification completed successfully")
            sys.exit(0)
        else:
            print("✗ Drum modification failed")
            sys.exit(1)
            
    except Exception as e:
        print(f"Fatal error: {str(e)}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

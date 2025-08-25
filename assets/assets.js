// Assets management system for 3D objects and materials
// This file handles switching between different 3D objects and their material assignments

class AssetsManager {
    constructor() {
        // Configuration des assets
        this.config = {
            glbFile: '../assets/objet.glb', // Chemin vers le fichier GLB
            defaultObject: 'objet1' // Objet par défaut au chargement
        };
        
        this.objects = {
            'objet1': {
                name: 'Cube',
                meshName: 'Cube',
                visible: true,
                material: 'red', // Utilise le matériau "Red"
                materials: {} // Will store material assignments per slot
            },
            'objet2': {
                name: 'Sphere', 
                meshName: 'Sphere',
                visible: false,
                material: 'white', // Utilise le matériau "Blue_Base"
                materials: {} // Will store material assignments per slot
            }
        };
        
        this.currentObject = this.config.defaultObject; // Default to Cube
        this.modelGroup = null; // Reference to the loaded 3D model group
        
        // Initialize the interface
        this.initializeInterface();
        
        // Expose the GLB file path globally for studio.js
        window.GLB_MODEL_URL = this.config.glbFile;
        

    }
    
    // Initialize the HTML interface buttons
    initializeInterface() {
        const btnObjet1 = document.getElementById('btn-objet1');
        const btnObjet2 = document.getElementById('btn-objet2');
        
        if (btnObjet1 && btnObjet2) {
            // Set initial state
            btnObjet1.classList.add('active');
            btnObjet2.classList.remove('active');
            
            // Add event listeners
            btnObjet1.addEventListener('click', () => this.switchToObject('objet1'));
            btnObjet2.addEventListener('click', () => this.switchToObject('objet2'));
            

        } else {
            // Interface buttons not found
        }
    }
    
    // Switch to a specific object
    switchToObject(objectKey) {
        if (!this.objects[objectKey]) {
            return;
        }
        

        
        // Update current object
        this.currentObject = objectKey;
        
        // Update button states
        this.updateButtonStates();
        
        // Update 3D scene visibility
        this.updateSceneVisibility();
        
        // Apply the material for the current object
        this.applyObjectMaterial();
        

    }
    
    // Update button visual states
    updateButtonStates() {
        const btnObjet1 = document.getElementById('btn-objet1');
        const btnObjet2 = document.getElementById('btn-objet2');
        
        if (btnObjet1 && btnObjet2) {
            btnObjet1.classList.toggle('active', this.currentObject === 'objet1');
            btnObjet2.classList.toggle('active', this.currentObject === 'objet2');
        }
    }
    
    // Update 3D scene visibility based on current object
    updateSceneVisibility() {
        if (!this.modelGroup) {
            return;
        }
        

        
        // Find and update mesh visibility
        let foundMeshes = 0;
        this.modelGroup.traverse((child) => {
            if (child.isMesh) {
                foundMeshes++;
                if (child.name === 'Cube') {
                    const shouldBeVisible = this.currentObject === 'objet1';
                    child.visible = shouldBeVisible;
                    // Cube visibility updated
                } else if (child.name === 'Sphere') {
                    const shouldBeVisible = this.currentObject === 'objet2';
                    child.visible = shouldBeVisible;
                    // Sphere visibility updated
                } else {
                    // Unknown mesh found
                }
            }
        });
        
        if (foundMeshes === 0) {
            // No meshes found in model group
        } else {
            // Visibility updated for current object
        }
    }
    
    // Apply the material for the current object
    applyObjectMaterial() {
        if (!this.modelGroup) {
            return;
        }
        
        const currentObject = this.objects[this.currentObject];
        const materialName = currentObject.material;
        
        // Check if the materials API is available
        if (window.__materialsAPI__ && window.__materialsAPI__.applyMaterialByName) {
            // Apply the material to the current object
            window.__materialsAPI__.applyMaterialByName(materialName);
            
            // DÉSACTIVÉ: Ne plus synchroniser automatiquement datGUI
            // datGUI doit rester indépendant de la configuration des objets
            // if (window.__materialsGUI__ && typeof window.__materialsGUI__.syncGuiFromCurrentMaterial === 'function') {
            //     window.__materialsGUI__.syncGuiFromCurrentMaterial(materialName);
            // }
        } else {
            // Materials API not available
        }
    }
    
    // Set the model group reference (called from app.js after loading)
    setModelGroup(modelGroup) {
        this.modelGroup = modelGroup;
        
        // Debug: log what we found in the model
        this.debugModelStructure();
        
        // Apply initial visibility
        this.updateSceneVisibility();
        
        // Apply initial material for the current object
        this.applyObjectMaterial();
    }
    
    // Debug function to see what's in the model
    debugModelStructure() {
        if (!this.modelGroup) {
            return;
        }
        
        // Model structure analyzed
    }
    
    // Force refresh visibility (useful for debugging)
    forceRefreshVisibility() {
        this.updateSceneVisibility();
    }
    
    // Get current object info
    getCurrentObject() {
        return this.objects[this.currentObject];
    }
    
    // Get all objects info
    getAllObjects() {
        return this.objects;
    }
    
    // Check if an object is currently visible
    isObjectVisible(objectKey) {
        return this.currentObject === objectKey;
    }
    
    // Get the material name for a specific object
    getObjectMaterial(objectKey) {
        return this.objects[objectKey] ? this.objects[objectKey].material : null;
    }
    
    // NEW: Test function to verify datGUI independence
    testDatGUIIndependence() {
        if (!window.__materialsGUI__) {
            return;
        }
        
        // datGUI independence verified
    }
    
    // Configuration management methods
    getConfig() {
        return { ...this.config };
    }
    
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Update global variable if GLB file changed
        if (newConfig.glbFile) {
            window.GLB_MODEL_URL = this.config.glbFile;
        }
        
        // Update default object if changed
        if (newConfig.defaultObject && this.objects[newConfig.defaultObject]) {
            this.currentObject = newConfig.defaultObject;
            this.updateButtonStates();
            this.updateSceneVisibility();
            this.applyObjectMaterial();
        }
        
        return this.config;
    }
    
    // Get GLB file path
    getGlbFilePath() {
        return this.config.glbFile;
    }
    
    // Set GLB file path
    setGlbFilePath(newPath) {
        this.updateConfig({ glbFile: newPath });
    }
    
    // Get default object
    getDefaultObject() {
        return this.config.defaultObject;
    }
    
    // Set default object
    setDefaultObject(objectKey) {
        if (this.objects[objectKey]) {
            this.updateConfig({ defaultObject: objectKey });
        } else {
            // Object not found
        }
    }
}

// Create global instance
window.assetsManager = new AssetsManager();

// Debug functions accessible from console
window.debugAssets = {
    // Show current state
    showState: () => {
        // Assets state displayed
    },
    
    // Show configuration
    showConfig: () => {
        // Configuration displayed
    },
    
    // Update configuration
    updateConfig: (newConfig) => {
        const result = window.assetsManager.updateConfig(newConfig);
    },
    
    // Change GLB file path
    setGlbPath: (newPath) => {
        window.assetsManager.setGlbFilePath(newPath);
    },
    
    // Change default object
    setDefaultObject: (objectKey) => {
        window.assetsManager.setDefaultObject(objectKey);
    },
    
    // Force refresh visibility
    refreshVisibility: () => {
        window.assetsManager.forceRefreshVisibility();
    },
    
    // Test object switching
    testSwitch: (objectKey) => {
        if (objectKey === 'objet1' || objectKey === 'objet2') {
            window.assetsManager.switchToObject(objectKey);
        } else {
            // Invalid object key
        }
    },
    
    // Show materials API status
    showMaterialsAPI: () => {
        // Materials API status displayed
    },
    
    // NEW: Test datGUI independence
    testDatGUIIndependence: () => {
        if (window.assetsManager) {
            window.assetsManager.testDatGUIIndependence();
        } else {
            // AssetsManager not available
        }
    },
    
    // NEW: Test click selection system
    testClickSelection: () => {
        // Click selection system tested
    },
    
    // NEW: Enable/disable click selection
    toggleClickSelection: (enabled) => {
        if (window.__clickSelectionAPI__) {
            window.__clickSelectionAPI__.setEnabled(enabled);
        } else {
            // Click Selection API not available
        }
    }
};



// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssetsManager;
}

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
                material: 'blue', // Utilise le matériau "Blue_Base"
                materials: {} // Will store material assignments per slot
            }
        };
        
        this.currentObject = this.config.defaultObject; // Default to Cube
        this.modelGroup = null; // Reference to the loaded 3D model group
        
        // Initialize the interface
        this.initializeInterface();
        
        // Expose the GLB file path globally for studio.js
        window.GLB_MODEL_URL = this.config.glbFile;
        
        console.log(`AssetsManager initialized with GLB file: ${this.config.glbFile}`);
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
            
            console.log('Assets interface initialized');
        } else {
            console.error('Could not find object buttons in HTML');
        }
    }
    
    // Switch to a specific object
    switchToObject(objectKey) {
        if (!this.objects[objectKey]) {
            console.error(`Object "${objectKey}" not found`);
            return;
        }
        
        console.log(`=== Switching from ${this.currentObject} to ${objectKey} ===`);
        
        // Update current object
        this.currentObject = objectKey;
        
        // Update button states
        this.updateButtonStates();
        
        // Update 3D scene visibility
        this.updateSceneVisibility();
        
        // Apply the material for the current object
        this.applyObjectMaterial();
        
        console.log(`=== Successfully switched to ${this.objects[objectKey].name} with material ${this.objects[objectKey].material} ===`);
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
            console.warn('Model group not yet loaded, visibility update deferred');
            return;
        }
        
        console.log(`Updating scene visibility for object: ${this.currentObject}`);
        
        // Find and update mesh visibility
        let foundMeshes = 0;
        this.modelGroup.traverse((child) => {
            if (child.isMesh) {
                foundMeshes++;
                if (child.name === 'Cube') {
                    const shouldBeVisible = this.currentObject === 'objet1';
                    child.visible = shouldBeVisible;
                    console.log(`Cube visibility set to: ${shouldBeVisible}`);
                } else if (child.name === 'Sphere') {
                    const shouldBeVisible = this.currentObject === 'objet2';
                    child.visible = shouldBeVisible;
                    console.log(`Sphere visibility set to: ${shouldBeVisible}`);
                } else {
                    console.log(`Found mesh with unknown name: ${child.name}`);
                }
            }
        });
        
        if (foundMeshes === 0) {
            console.warn('No meshes found in model group');
        } else {
            console.log(`Found ${foundMeshes} meshes, updated visibility for ${this.objects[this.currentObject].name}`);
        }
    }
    
    // Apply the material for the current object
    applyObjectMaterial() {
        if (!this.modelGroup) {
            console.warn('Model group not yet loaded, material application deferred');
            return;
        }
        
        const currentObject = this.objects[this.currentObject];
        const materialName = currentObject.material;
        
        // Check if the materials API is available
        if (window.__materialsAPI__ && window.__materialsAPI__.applyMaterialByName) {
            // Apply the material to the current object
            window.__materialsAPI__.applyMaterialByName(materialName);
            console.log(`Applied material "${materialName}" to ${currentObject.name}`);
            
            // DÉSACTIVÉ: Ne plus synchroniser automatiquement datGUI
            // datGUI doit rester indépendant de la configuration des objets
            // if (window.__materialsGUI__ && typeof window.__materialsGUI__.syncGuiFromCurrentMaterial === 'function') {
            //     window.__materialsGUI__.syncGuiFromCurrentMaterial(materialName);
            // }
        } else {
            console.warn('Materials API not available, cannot apply material');
        }
    }
    
    // Set the model group reference (called from app.js after loading)
    setModelGroup(modelGroup) {
        this.modelGroup = modelGroup;
        console.log('Model group reference set in AssetsManager');
        
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
            console.log('No model group to debug');
            return;
        }
        
        console.log('=== DEBUG: Model Structure ===');
        let meshCount = 0;
        this.modelGroup.traverse((child) => {
            if (child.isMesh) {
                meshCount++;
                console.log(`Mesh ${meshCount}: name="${child.name}", visible=${child.visible}, type=${child.type}`);
            }
        });
        console.log(`Total meshes found: ${meshCount}`);
        console.log('=== End Debug ===');
    }
    
    // Force refresh visibility (useful for debugging)
    forceRefreshVisibility() {
        console.log('Force refreshing visibility...');
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
        console.log('=== Testing datGUI Independence ===');
        
        if (!window.__materialsGUI__) {
            console.log('datGUI not available');
            return;
        }
        
        // Get current datGUI selection
        const currentGUIMaterial = window.__materialsGUI__.getCurrentMaterial ? 
            window.__materialsGUI__.getCurrentMaterial() : 'Unknown';
        
        console.log('Current object:', this.objects[this.currentObject].name);
        console.log('Current object material:', this.objects[this.currentObject].material);
        console.log('Current datGUI selection:', currentGUIMaterial);
        console.log('datGUI should remain independent and not change automatically');
        
        console.log('=== End Test ===');
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
            console.log(`GLB file path updated to: ${this.config.glbFile}`);
        }
        
        // Update default object if changed
        if (newConfig.defaultObject && this.objects[newConfig.defaultObject]) {
            this.currentObject = newConfig.defaultObject;
            this.updateButtonStates();
            this.updateSceneVisibility();
            this.applyObjectMaterial();
            console.log(`Default object changed to: ${newConfig.defaultObject}`);
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
            console.error(`Object "${objectKey}" not found, cannot set as default`);
        }
    }
}

// Create global instance
window.assetsManager = new AssetsManager();

// Debug functions accessible from console
window.debugAssets = {
    // Show current state
    showState: () => {
        console.log('=== Assets Debug State ===');
        console.log('Current object:', window.assetsManager.currentObject);
        console.log('All objects:', window.assetsManager.getAllObjects());
        console.log('Model group loaded:', !!window.assetsManager.modelGroup);
        if (window.assetsManager.modelGroup) {
            window.assetsManager.debugModelStructure();
        }
        console.log('=== End Debug State ===');
    },
    
    // Show configuration
    showConfig: () => {
        console.log('=== Assets Configuration ===');
        console.log('GLB file path:', window.assetsManager.getGlbFilePath());
        console.log('Default object:', window.assetsManager.getDefaultObject());
        console.log('Full config:', window.assetsManager.getConfig());
        console.log('Global GLB_MODEL_URL:', window.GLB_MODEL_URL);
        console.log('=== End Configuration ===');
    },
    
    // Update configuration
    updateConfig: (newConfig) => {
        console.log('Updating configuration with:', newConfig);
        const result = window.assetsManager.updateConfig(newConfig);
        console.log('Configuration updated:', result);
    },
    
    // Change GLB file path
    setGlbPath: (newPath) => {
        console.log(`Changing GLB file path to: ${newPath}`);
        window.assetsManager.setGlbFilePath(newPath);
    },
    
    // Change default object
    setDefaultObject: (objectKey) => {
        console.log(`Setting default object to: ${objectKey}`);
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
            console.error('Invalid object key. Use "objet1" or "objet2"');
        }
    },
    
    // Show materials API status
    showMaterialsAPI: () => {
        console.log('=== Materials API Status ===');
        console.log('API available:', !!window.__materialsAPI__);
        if (window.__materialsAPI__) {
            console.log('Materials config:', window.__materialsAPI__.materialsConfig);
            console.log('Selected material:', window.__materialsAPI__.selectedMaterialName);
        }
        console.log('=== End Materials API Status ===');
    },
    
    // NEW: Test datGUI independence
    testDatGUIIndependence: () => {
        if (window.assetsManager) {
            window.assetsManager.testDatGUIIndependence();
        } else {
            console.error('AssetsManager not available');
        }
    },
    
    // NEW: Test click selection system
    testClickSelection: () => {
        console.log('=== Testing Click Selection System ===');
        
        if (!window.__clickSelectionAPI__) {
            console.log('❌ Click Selection API not available');
            return;
        }
        
        console.log('Click Selection enabled:', window.__clickSelectionAPI__.isEnabled());
        console.log('✅ Click on any 3D object to select its material in datGUI');
        console.log('=== End Test ===');
    },
    
    // NEW: Enable/disable click selection
    toggleClickSelection: (enabled) => {
        if (window.__clickSelectionAPI__) {
            window.__clickSelectionAPI__.setEnabled(enabled);
            console.log(`Click selection ${enabled ? 'enabled' : 'disabled'}`);
        } else {
            console.error('Click Selection API not available');
        }
    }
};

console.log('Assets system loaded. Use window.debugAssets.showState() to debug.');

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssetsManager;
}

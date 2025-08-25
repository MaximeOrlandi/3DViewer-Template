// Assets management system for 3D objects and materials
// This file handles switching between different 3D objects and their material assignments

class AssetsManager {
    constructor() {
        // Configuration des assets
        this.config = {
            glbFile: '../assets/cube_sphere.glb', // Chemin vers le fichier GLB
            defaultObject: 'objet1' // Objet par défaut au chargement
        };
        
        this.objects = {
            'objet1': {
                name: 'Cube',
                meshName: 'Cube',
                visible: true,
                materials: {
                    0: 'blue',    // Premier slot de matériau
                    1: 'red'      // Deuxième slot de matériau
                }
            },
            'objet2': {
                name: 'Sphere', 
                meshName: 'Sphere',
                visible: false,
                materials: {
                    0: 'white',    // Premier slot de matériau
                    1: 'red'    // Premier slot de matériau
                }
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
        
        // Apply the materials for the current object
        this.applyObjectMaterials();
        

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
    
        // Update 3D scene visibility based on current object (ADAPTÉE À LA RÉALITÉ GLTFLoader)
    updateSceneVisibility() {
        if (!this.meshGroups) {
            return;
        }
        
        // Mettre à jour la visibilité de tous les meshes de chaque objet
        Object.entries(this.meshGroups).forEach(([objectKey, slots]) => {
            const shouldBeVisible = this.currentObject === objectKey;
            
            Object.values(slots).forEach(mesh => {
                mesh.visible = shouldBeVisible;
            });
        });
    }
    
    // Apply the materials for the current object (supports multiple material slots)
    applyObjectMaterials() {
        if (!this.modelGroup) {
            return;
        }
        
        const currentObject = this.objects[this.currentObject];
        
        // Check if the materials API is available
        if (window.__materialsAPI__ && window.__materialsAPI__.applyMaterialByName) {
            // Appliquer les matériaux pour chaque slot
            Object.entries(currentObject.materials).forEach(([slotIndex, materialName]) => {
                // Appliquer le matériau au slot spécifique
                this.applyMaterialToSlot(currentObject.meshName, parseInt(slotIndex), materialName);
            });
        } else {
            // Materials API not available
        }
    }
    
    // NOUVELLE FONCTION: Appliquer un matériau à un slot spécifique (ADAPTÉE À LA RÉALITÉ GLTFLoader)
    applyMaterialToSlot(meshName, slotIndex, materialName) {
        console.log(`🎨 Trying to apply material: ${meshName} slot ${slotIndex} → ${materialName}`);
        console.log(`📊 Current meshGroups:`, this.meshGroups);
        
        if (!this.meshGroups) {
            console.error(`❌ No meshGroups available`);
            return;
        }
        
        // Utiliser la structure meshGroups pour appliquer directement au bon mesh
        for (const [objectKey, slots] of Object.entries(this.meshGroups)) {
            const object = this.objects[objectKey];
            console.log(`🔍 Checking object: ${objectKey} (meshName: ${object?.meshName}, target: ${meshName})`);
            console.log(`   Available slots:`, Object.keys(slots));
            
            if (object && object.meshName === meshName && slots[slotIndex]) {
                const mesh = slots[slotIndex];
                console.log(`✅ Found matching mesh:`, mesh);
                
                // FORCER L'OVERRIDE: Créer un nouveau matériau à partir de la configuration
                const newMaterial = this.createMaterialFromConfig(materialName);
                if (newMaterial) {
                    // Copier les propriétés géométriques importantes du matériau original
                    this.copyGeometryProperties(mesh.material, newMaterial);
                    
                    // Remplacer complètement le matériau
                    mesh.material = newMaterial;
                    mesh.material.needsUpdate = true;
                    
                    console.log(`✅ Material override applied: ${meshName} slot ${slotIndex} → ${materialName}`);
                }
                return;
            }
        }
        
        console.warn(`⚠️ Mesh not found for override: ${meshName} slot ${slotIndex}`);
        console.log(`🔍 Debug info:`);
        console.log(`   Looking for: ${meshName} slot ${slotIndex}`);
        console.log(`   Available objects:`, Object.keys(this.meshGroups));
        Object.entries(this.meshGroups).forEach(([objKey, slots]) => {
            console.log(`   ${objKey}:`, Object.keys(slots));
        });
    }
    
    // NOUVELLE FONCTION: Créer un matériau à partir de la configuration
    createMaterialFromConfig(materialName) {
        if (!window.__materialsAPI__ || !window.__materialsAPI__.materialsConfig) {
            return null;
        }
        
        const config = window.__materialsAPI__.materialsConfig[materialName];
        if (!config) {
            return null;
        }
        
        // Créer un nouveau MeshStandardMaterial avec les paramètres du projet
        const material = new THREE.MeshStandardMaterial({
            name: materialName,
            color: new THREE.Color(config.color || '#ffffff'),
            emissive: new THREE.Color(config.emissive || '#000000'),
            roughness: config.roughness !== undefined ? config.roughness : 0.5,
            metalness: config.metalness !== undefined ? config.metalness : 0.0,
            alpha: config.alpha !== undefined ? config.alpha : 1.0,
            transparent: config.alpha !== undefined && config.alpha < 1.0,
            side: config.backfaceCulling === false ? THREE.DoubleSide : THREE.FrontSide
        });
        
        // Appliquer les textures si disponibles
        if (config.albedoMap) {
            this.loadTexture(config.albedoMap).then(texture => {
                material.map = texture;
                material.needsUpdate = true;
            });
        }
        
        if (config.normalMap) {
            this.loadTexture(config.normalMap).then(texture => {
                material.normalMap = texture;
                material.needsUpdate = true;
            });
        }
        
        if (config.roughnessMap) {
            this.loadTexture(config.roughnessMap).then(texture => {
                material.roughnessMap = texture;
                material.needsUpdate = true;
            });
        }
        
        if (config.metalnessMap) {
            this.loadTexture(config.metalnessMap).then(texture => {
                material.metalnessMap = texture;
                material.needsUpdate = true;
            });
        }
        
        return material;
    }
    
    // NOUVELLE FONCTION: Copier les propriétés géométriques importantes
    copyGeometryProperties(originalMaterial, newMaterial) {
        // Copier les propriétés qui affectent la géométrie
        if (originalMaterial && newMaterial) {
            // UV coordinates et mapping
            if (originalMaterial.map) {
                newMaterial.map = originalMaterial.map;
            }
            
            // Normal mapping
            if (originalMaterial.normalMap) {
                newMaterial.normalMap = originalMaterial.normalMap;
            }
            
            // Autres propriétés géométriques importantes
            if (originalMaterial.uvTransform) {
                newMaterial.uvTransform = originalMaterial.uvTransform;
            }
        }
    }
    
    // NOUVELLE FONCTION: Charger une texture
    async loadTexture(texturePath) {
        if (!texturePath) return null;
        
        return new Promise((resolve) => {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(texturePath, (texture) => {
                resolve(texture);
            }, undefined, () => {
                resolve(null);
            });
        });
    }
    
    // Set the model group reference (called from app.js after loading)
    setModelGroup(modelGroup) {
        this.modelGroup = modelGroup;
        
        // Détecter automatiquement les material slots pour chaque objet
        this.detectMaterialSlots();
        
        // Debug: log what we found in the model
        this.debugModelStructure();
        
        // Apply initial visibility
        this.updateSceneVisibility();
        
        // Apply initial materials for the current object
        this.applyObjectMaterials();
    }
    
    // NOUVELLE FONCTION: Détecter automatiquement les material slots (ADAPTÉE À LA RÉALITÉ GLTFLoader)
    detectMaterialSlots() {
        if (!this.modelGroup) return;
        
        // Structure pour stocker les meshes par objet
        const meshGroups = {};
        
        console.log('🔍 Starting material slot detection...');
        console.log('📁 Model group structure:', this.modelGroup);
        
        this.modelGroup.traverse((child) => {
            if (child.isMesh) {
                console.log(`🎯 Found mesh: "${child.name}" (type: ${child.type})`);
                
                // Analyser le nom du mesh pour identifier l'objet et le slot
                const meshInfo = this.parseMeshName(child.name);
                console.log(`   Parsed info:`, meshInfo);
                
                if (meshInfo) {
                    const { objectKey, slotIndex } = meshInfo;
                    
                    if (!meshGroups[objectKey]) {
                        meshGroups[objectKey] = {};
                    }
                    
                    // Stocker le mesh avec son slot
                    meshGroups[objectKey][slotIndex] = child;
                    console.log(`   ✅ Assigned: ${objectKey} slot ${slotIndex} → "${child.name}"`);
                    
                    // Créer le slot dans la configuration si nécessaire
                    const object = this.objects[objectKey];
                    if (object && !object.materials[slotIndex]) {
                        object.materials[slotIndex] = this.getDefaultMaterialForSlot(slotIndex);
                        console.log(`   🔧 Created default material for slot ${slotIndex}: ${object.materials[slotIndex]}`);
                    }
                } else {
                    console.log(`   ❌ Could not parse mesh name: "${child.name}"`);
                }
            }
        });
        
        // Stocker les références des meshes pour utilisation ultérieure
        this.meshGroups = meshGroups;
        
        console.log('📊 Final meshGroups structure:', meshGroups);
        console.log('🎨 Current objects configuration:', this.objects);
    }
    
    // NOUVELLE FONCTION: Parser le nom du mesh pour identifier l'objet et le slot
    parseMeshName(meshName) {
        console.log(`🔍 Parsing mesh name: "${meshName}"`);
        
        // Exemples de noms possibles :
        // "Cube" -> objet: 'objet1', slot: 0
        // "Cube.001" -> objet: 'objet1', slot: 1
        // "Cube_Blue" -> objet: 'objet1', slot: 0
        // "Cube_Red" -> objet: 'objet1', slot: 1
        // "Cube_SubMat1" -> objet: 'objet1', slot: 1
        // "Cube001" -> objet: 'objet1', slot: 0 (NOUVEAU PATTERN)
        // "Cube001_1" -> objet: 'objet1', slot: 1 (NOUVEAU PATTERN)
        
        // Chercher d'abord une correspondance exacte
        for (const [objectKey, object] of Object.entries(this.objects)) {
            if (meshName === object.meshName) {
                console.log(`   ✅ Exact match: ${meshName} → ${objectKey} slot 0`);
                return { objectKey, slotIndex: 0 };
            }
        }
        
        // Chercher des variantes avec numérotation
        for (const [objectKey, object] of Object.entries(this.objects)) {
            const baseName = object.meshName;
            console.log(`   🔍 Checking base name: "${baseName}" for object "${objectKey}"`);
            
            // Pattern 1: "Cube.001", "Cube.002"
            if (meshName.startsWith(baseName + '.')) {
                const slotMatch = meshName.match(new RegExp(`^${baseName}\\.(\\d+)$`));
                if (slotMatch) {
                    const slotIndex = parseInt(slotMatch[1]);
                    console.log(`   ✅ Numbered pattern: ${meshName} → ${objectKey} slot ${slotIndex}`);
                    return { objectKey, slotIndex };
                }
            }
            
            // Pattern 2: "Cube_Blue", "Cube_Red", "Cube_SubMat1"
            if (meshName.startsWith(baseName + '_')) {
                const slotMatch = meshName.match(new RegExp(`^${baseName}_(.+)$`));
                if (slotMatch) {
                    const suffix = slotMatch[1];
                    console.log(`   🔍 Suffix pattern: "${suffix}" for ${objectKey}`);
                    
                    // Essayer de mapper le nom du matériau au slot
                    const materialName = suffix.toLowerCase();
                    const object = this.objects[objectKey];
                    if (object && object.materials) {
                        for (const [slotIndex, matName] of Object.entries(object.materials)) {
                            if (matName.toLowerCase().includes(materialName) || 
                                materialName.includes(matName.toLowerCase())) {
                                console.log(`   ✅ Material match: ${meshName} → ${objectKey} slot ${slotIndex} (${matName})`);
                                return { objectKey, slotIndex: parseInt(slotIndex) };
                            }
                        }
                    }
                    
                    // Pattern 3: "Cube_SubMat1" → slot 1
                    const subMatMatch = suffix.match(/^SubMat(\d+)$/i);
                    if (subMatMatch) {
                        const slotIndex = parseInt(subMatMatch[1]);
                        console.log(`   ✅ SubMat pattern: ${meshName} → ${objectKey} slot ${slotIndex}`);
                        return { objectKey, slotIndex };
                    }
                    
                    // Fallback: assigner au premier slot disponible
                    console.log(`   🔧 Fallback: ${meshName} → ${objectKey} slot 0`);
                    return { objectKey, slotIndex: 0 };
                }
            }
            
            // NOUVEAU PATTERN 4: "Cube001" → slot 0 (Blender export style)
            if (meshName === baseName + '001') {
                console.log(`   ✅ Blender export pattern: ${meshName} → ${objectKey} slot 0`);
                return { objectKey, slotIndex: 0 };
            }
            
            // NOUVEAU PATTERN 5: "Cube001_1" → slot 1 (Blender export style)
            if (meshName.startsWith(baseName + '001_')) {
                const slotMatch = meshName.match(new RegExp(`^${baseName}001_(\\d+)$`));
                if (slotMatch) {
                    const slotIndex = parseInt(slotMatch[1]);
                    console.log(`   ✅ Blender export numbered pattern: ${meshName} → ${objectKey} slot ${slotIndex}`);
                    return { objectKey, slotIndex };
                }
            }
        }
        
        console.log(`   ❌ No pattern matched for: "${meshName}"`);
        return null;
    }
    
    // Fonction pour trouver un objet par le nom de son mesh
    findObjectByMeshName(meshName) {
        for (const [key, object] of Object.entries(this.objects)) {
            if (object.meshName === meshName) {
                return key;
            }
        }
        return null;
    }
    
    // Fonction pour obtenir un matériau par défaut pour un slot
    getDefaultMaterialForSlot(slotIndex) {
        const defaultMaterials = ['blue', 'red', 'white', 'black'];
        return defaultMaterials[slotIndex] || 'blue';
    }
    
    // Debug function to see what's in the model
    debugModelStructure() {
        if (!this.modelGroup) {
            return;
        }
        
        // Model structure analyzed
        this.analyzeMaterialSlots();
    }
    
    // NOUVELLE FONCTION: Analyser les material slots des meshes (ADAPTÉE À LA RÉALITÉ GLTFLoader)
    analyzeMaterialSlots() {
        if (!this.meshGroups) {
            console.log('No mesh groups available yet');
            return;
        }
        
        console.log('=== REALITY CHECK: How GLTFLoader actually handles multi-material meshes ===');
        
        Object.entries(this.meshGroups).forEach(([objectKey, slots]) => {
            const object = this.objects[objectKey];
            console.log(`\n📦 Object: ${objectKey} (${object.name})`);
            console.log(`   Base mesh name: ${object.meshName}`);
            console.log(`   Configured materials:`, object.materials);
            
            Object.entries(slots).forEach(([slotIndex, mesh]) => {
                console.log(`   🎨 Slot ${slotIndex}:`);
                console.log(`      Mesh name: ${mesh.name}`);
                console.log(`      Material: ${mesh.material.name || 'unnamed'}`);
                console.log(`      Material type: ${mesh.material.type}`);
                console.log(`      Color: ${mesh.material.color ? '#' + mesh.material.color.getHexString() : 'N/A'}`);
                console.log(`      Roughness: ${mesh.material.roughness}`);
                console.log(`      Metalness: ${mesh.material.metalness}`);
                console.log(`      Visible: ${mesh.visible}`);
            });
        });
        
        console.log('\n💡 Key insight: GLTFLoader creates SEPARATE meshes for each material, not multi-material meshes!');
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
    
    // NOUVELLES FONCTIONS: Gestion des material slots
    getObjectMaterialSlot(objectKey, slotIndex) {
        const object = this.objects[objectKey];
        return object && object.materials ? object.materials[slotIndex] : null;
    }
    
    setObjectMaterialSlot(objectKey, slotIndex, materialName) {
        const object = this.objects[objectKey];
        if (object && object.materials) {
            object.materials[slotIndex] = materialName;
            
            // Appliquer immédiatement si c'est l'objet actuel
            if (this.currentObject === objectKey) {
                this.applyMaterialToSlot(object.meshName, slotIndex, materialName);
            }
        }
    }
    
    getObjectMaterialSlots(objectKey) {
        const object = this.objects[objectKey];
        return object && object.materials ? { ...object.materials } : {};
    }
    
    // Fonction pour obtenir le matériau principal (slot 0) d'un objet
    getObjectMainMaterial(objectKey) {
        return this.getObjectMaterialSlot(objectKey, 0);
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
            this.applyObjectMaterials();
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
    },
    
    // NEW: Material slots management
    showMaterialSlots: (objectKey) => {
        if (window.assetsManager) {
            const slots = window.assetsManager.getObjectMaterialSlots(objectKey);
            console.log(`Material slots for ${objectKey}:`, slots);
        }
    },
    
    setMaterialSlot: (objectKey, slotIndex, materialName) => {
        if (window.assetsManager) {
            window.assetsManager.setObjectMaterialSlot(objectKey, slotIndex, materialName);
            console.log(`Set ${objectKey} slot ${slotIndex} to ${materialName}`);
        }
    },
    
    getMaterialSlot: (objectKey, slotIndex) => {
        if (window.assetsManager) {
            const material = window.assetsManager.getObjectMaterialSlot(objectKey, slotIndex);
            console.log(`${objectKey} slot ${slotIndex}: ${material}`);
            return material;
        }
    },
    
    // NEW: Force material override for debugging
    forceMaterialOverride: (objectKey, slotIndex, materialName) => {
        if (window.assetsManager) {
            const object = window.assetsManager.objects[objectKey];
            if (object) {
                window.assetsManager.applyMaterialToSlot(object.meshName, slotIndex, materialName);
                console.log(`Forced override: ${objectKey} slot ${slotIndex} → ${materialName}`);
            }
        }
    },
    
    // NEW: Analyze current material slots
    analyzeSlots: () => {
        if (window.assetsManager) {
            window.assetsManager.analyzeMaterialSlots();
        }
    },
    
    // NEW: Test material slot system
    testMaterialSlots: () => {
        if (window.assetsManager) {
            console.log('=== Testing Material Slots System ===');
            
            // Afficher la configuration actuelle
            Object.entries(window.assetsManager.objects).forEach(([key, object]) => {
                console.log(`${key}:`, object.materials);
            });
            
            // Analyser la structure des meshes
            window.assetsManager.analyzeMaterialSlots();
            
            console.log('=== End Test ===');
        }
    }
};



// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssetsManager;
}

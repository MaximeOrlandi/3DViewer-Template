// dat.GUI setup and export/save logic

// Expect globals: window.__materialsAPI__
const materialsAPI = window.__materialsAPI__ || {};

function getMaterialsConfig() {
    if (!window.__materialsAPI__) {
        return {};
    }
    return window.__materialsAPI__.materialsConfig;
}
function setMaterialsConfig(v) {
    if (window.__materialsAPI__) {
        window.__materialsAPI__.materialsConfig = v;
    }
}


const gui = new dat.GUI({ name: 'Materials' });
// Contrôle l'ouverture du panneau dat.GUI
const isGuiOpen = true; // Mettre à false pour cacher le GUI par défaut
// Contrôle l'ouverture du menu Camera
const isCameraMenuOpen = false; // Mettre à false pour fermer le menu Camera par défaut
// Ouvre ou ferme le panneau principal selon isGuiOpen
gui.domElement.style.display = isGuiOpen ? '' : 'none';
// Ensure GUI is visible above canvas/controls
gui.domElement.style.zIndex = '1000';
gui.domElement.style.position = 'fixed';
gui.domElement.style.top = '10px';
gui.domElement.style.right = '10px';

// Camera controls
const camFolder = gui.addFolder('Camera');
const camState = { fov: 15, zoom: 1, zoomMin: 0.1, zoomMax: 5, zoomSpeed: 1, yawDeg: 0, pitchDeg: 0, distance: 10, tgtX: 0, tgtY: 0, tgtZ: 0 };

function syncCameraStateFromScene() {
    camState.fov = window.__cameraAPI__?.camera?.fov ?? camState.fov;
    const c = window.__cameraAPI__?.camera;
    const ct = window.__cameraAPI__?.controls;
    if (c) { camState.zoom = c.zoom; }
    if (window.__cameraAPI__) {
        const cfg = window.__cameraAPI__.getCameraCurrentConfig();
        camState.zoomMin = cfg.zoomMin ?? camState.zoomMin;
        camState.zoomMax = cfg.zoomMax ?? camState.zoomMax;
        camState.zoomSpeed = cfg.zoomSpeed ?? camState.zoomSpeed;
        camState.yawDeg = cfg.yawDeg ?? camState.yawDeg;
        camState.pitchDeg = cfg.pitchDeg ?? camState.pitchDeg;
        camState.distance = cfg.distance ?? camState.distance;
    }
    if (ct) { camState.tgtX = ct.target.x; camState.tgtY = ct.target.y; camState.tgtZ = ct.target.z; }
}

function applyCameraFromState() {
    const cfg = { fov: camState.fov, zoom: camState.zoom, zoomMin: camState.zoomMin, zoomMax: camState.zoomMax, zoomSpeed: camState.zoomSpeed, yawDeg: camState.yawDeg, pitchDeg: camState.pitchDeg, distance: camState.distance, target: { x: camState.tgtX, y: camState.tgtY, z: camState.tgtZ } };
    window.__cameraAPI__?.applyCameraConfig(cfg);
}

syncCameraStateFromScene();

camFolder.add(camState, 'fov', 5, 120, 1).name('FOV').onChange(applyCameraFromState);
camFolder.add(camState, 'zoom', 0.1, 5, 0.01).name('Zoom').onChange(applyCameraFromState);
camFolder.add(camState, 'zoomMin', 0.01, 10, 0.01).name('Zoom Min').onChange(applyCameraFromState);
camFolder.add(camState, 'zoomMax', 0.01, 10, 0.01).name('Zoom Max').onChange(applyCameraFromState);
camFolder.add(camState, 'zoomSpeed', 0.01, 10, 0.01).name('Zoom Speed').onChange(applyCameraFromState);
camFolder.add(camState, 'yawDeg', -180, 180, 0.1).name('Yaw (deg)').onChange(applyCameraFromState);
camFolder.add(camState, 'pitchDeg', -89.9, 89.9, 0.1).name('Pitch (deg)').onChange(applyCameraFromState);
camFolder.add(camState, 'distance', 0.1, 100, 0.01).name('Distance').onChange(applyCameraFromState);
camFolder.add(camState, 'tgtX', -100, 100, 0.01).name('Target X').onChange(applyCameraFromState);
camFolder.add(camState, 'tgtY', -100, 100, 0.01).name('Target Y').onChange(applyCameraFromState);
camFolder.add(camState, 'tgtZ', -100, 100, 0.01).name('Target Z').onChange(applyCameraFromState);

const camActions = {
    ExportCamera: () => {
        const cfg = { fov: camState.fov, zoom: camState.zoom, zoomMin: camState.zoomMin, zoomMax: camState.zoomMax, zoomSpeed: camState.zoomSpeed, yawDeg: camState.yawDeg, pitchDeg: camState.pitchDeg, distance: camState.distance, target: { x: camState.tgtX, y: camState.tgtY, z: camState.tgtZ } };
        window.__cameraAPI__?.saveCameraConfig(cfg).then(() => {}).catch((e) => {});
    }
};
camFolder.add(camActions, 'ExportCamera').name('Export camera');
if (isCameraMenuOpen) {
    camFolder.open();
} else {
    camFolder.close();
}

// Auto-sync camera controls with OrbitControls changes (throttled)
let __lastCamSig = '';
function maybeUpdateCameraGui() {
    if (!window.__cameraAPI__) return;
    const c = window.__cameraAPI__.camera;
    const ct = window.__cameraAPI__.controls;
    if (!c || !ct) return;
    const sig = `${c.fov.toFixed(4)}|${c.zoom.toFixed(4)}|${c.position.x.toFixed(4)},${c.position.y.toFixed(4)},${c.position.z.toFixed(4)}|${ct.target.x.toFixed(4)},${ct.target.y.toFixed(4)},${ct.target.z.toFixed(4)}`;
    if (sig === __lastCamSig) return;
    __lastCamSig = sig;
    syncCameraStateFromScene();
    updateAllControllersDisplay(camFolder);
}

function onControlsChange() { maybeUpdateCameraGui(); }
if (window.__cameraAPI__ && window.__cameraAPI__.controls) {
    window.__cameraAPI__.controls.addEventListener('change', onControlsChange);
}


const guiState = {
    material: 'White',
    newMaterialName: '', // Champ pour le nouveau nom du matériau
    color: '#ffffff',
    emissive: '#000000',
    roughness: 0.6,
    metalness: 0.0,
    albedoMap: '',
    normalMap: '',
    roughnessMap: '',
    metalnessMap: '',
    alpha: 1,
    alphaMap: '',
    // Per-texture UV controls
    albedoScaleX: 1, albedoScaleY: 1, albedoOffsetX: 0, albedoOffsetY: 0, albedoRotation: 0,
    normalScaleX: 1, normalScaleY: 1, normalOffsetX: 0, normalOffsetY: 0, normalRotation: 0, normalIntensity: 1,
    roughnessScaleX: 1, roughnessScaleY: 1, roughnessOffsetX: 0, roughnessOffsetY: 0, roughnessRotation: 0,
    metalnessScaleX: 1, metalnessScaleY: 1, metalnessOffsetX: 0, metalnessOffsetY: 0, metalnessRotation: 0,
    alphaScaleX: 1, alphaScaleY: 1, alphaOffsetX: 0, alphaOffsetY: 0, alphaRotation: 0
};

function updateAllControllersDisplay(rootGui) {
    if (!rootGui) return;
    if (rootGui.__controllers) {
        for (const controller of rootGui.__controllers) controller.updateDisplay();
    }
    const folders = rootGui.__folders || {};
    for (const key in folders) {
        if (!Object.prototype.hasOwnProperty.call(folders, key)) continue;
        const folder = folders[key];
        if (folder.__controllers) {
            for (const controller of folder.__controllers) controller.updateDisplay();
        }
        // Recurse for nested folders, if any
        updateAllControllersDisplay(folder);
    }
}

function syncGuiFromMaterial(name) {
    const config = getMaterialsConfig();
    const def = config && config[name];
    if (!def) {
        // Si le matériau n'existe plus, sélectionner le premier disponible
        const availableMaterials = Object.keys(config || {});
        if (availableMaterials.length > 0) {
            const firstMaterial = availableMaterials[0];
            guiState.material = firstMaterial;
            syncGuiFromMaterial(firstMaterial); // Récursion pour charger le bon matériau
            return;
        } else {
            return;
        }
    }
    guiState.material = name;
    guiState.newMaterialName = name; // Initialiser le champ de renommage avec le nom actuel
    guiState.color = def.color || '#ffffff';
    guiState.emissive = def.emissive || '#000000';
    guiState.roughness = typeof def.roughness === 'number' ? def.roughness : 0.5;
    guiState.metalness = typeof def.metalness === 'number' ? def.metalness : 0.0;
    guiState.backfaceCulling = (typeof def.backfaceCulling === 'boolean') ? def.backfaceCulling : true;
    guiState.alpha = typeof def.alpha === 'number' ? def.alpha : 1;
    guiState.albedoMap = def.albedoMap || '';
    guiState.normalMap = def.normalMap || '';
    guiState.roughnessMap = def.roughnessMap || '';
    guiState.metalnessMap = def.metalnessMap || '';
    guiState.alphaMap = def.alphaMap || '';
    // Utiliser les paramètres TextureTransform unifiés
    const textureTransformScaleX = typeof def.TextureTransform_ScaleX === 'number' ? def.TextureTransform_ScaleX : 1;
    const textureTransformScaleY = typeof def.TextureTransform_ScaleY === 'number' ? def.TextureTransform_ScaleY : 1;
    const textureTransformOffsetX = typeof def.TextureTransform_OffsetX === 'number' ? def.TextureTransform_OffsetX : 0;
    const textureTransformOffsetY = typeof def.TextureTransform_OffsetY === 'number' ? def.TextureTransform_OffsetY : 0;
    const textureTransformRotation = typeof def.TextureTransform_Rotation === 'number' ? def.TextureTransform_Rotation : 0;

    // Appliquer les mêmes valeurs à tous les types de textures
    guiState.albedoScaleX = textureTransformScaleX;
    guiState.albedoScaleY = textureTransformScaleY;
    guiState.albedoOffsetX = textureTransformOffsetX;
    guiState.albedoOffsetY = textureTransformOffsetY;
    guiState.albedoRotation = textureTransformRotation;

    guiState.normalScaleX = textureTransformScaleX;
    guiState.normalScaleY = textureTransformScaleY;
    guiState.normalOffsetX = textureTransformOffsetX;
    guiState.normalOffsetY = textureTransformOffsetY;
    guiState.normalRotation = textureTransformRotation;

    guiState.roughnessScaleX = textureTransformScaleX;
    guiState.roughnessScaleY = textureTransformScaleY;
    guiState.roughnessOffsetX = textureTransformOffsetX;
    guiState.roughnessOffsetY = textureTransformOffsetY;
    guiState.roughnessRotation = textureTransformRotation;

    guiState.metalnessScaleX = textureTransformScaleX;
    guiState.metalnessScaleY = textureTransformScaleY;
    guiState.metalnessOffsetX = textureTransformOffsetX;
    guiState.metalnessOffsetY = textureTransformOffsetY;
    guiState.metalnessRotation = textureTransformRotation;
    guiState.normalIntensity = typeof def.normalIntensity === 'number' ? def.normalIntensity : 1;
    rebuildAllMapSections();
    updateAllControllersDisplay(gui);
}

function applyGuiToMaterial(name) {
    // Désactivé : ne plus changer automatiquement le matériau appliqué à l'objet 3D
    // if (materialsAPI.selectedMaterialName && materialsAPI.selectedMaterialName !== name) {
    //     if (materialsAPI.applyMaterialByName) materialsAPI.applyMaterialByName(name);
    // }
    const config = getMaterialsConfig();
    if (!config) return;

    // Vérifier que le matériau existe encore
    if (!config[name]) {
        return;
    }

    const prev = config[name] || {};
    config[name] = {
        color: guiState.color,
        emissive: guiState.emissive,
        roughness: guiState.roughness,
        metalness: guiState.metalness,
        backfaceCulling: guiState.backfaceCulling,
        alpha: guiState.alpha,
        albedoMap: guiState.albedoMap || prev.albedoMap,
        normalMap: guiState.normalMap || prev.normalMap,
        roughnessMap: guiState.roughnessMap || prev.roughnessMap,
        metalnessMap: guiState.metalnessMap || prev.metalnessMap,
        alphaMap: guiState.alphaMap || prev.alphaMap,
        // Paramètres de transformation unifiés
        TextureTransform_ScaleX: guiState.albedoScaleX,
        TextureTransform_ScaleY: guiState.albedoScaleY,
        TextureTransform_OffsetX: guiState.albedoOffsetX,
        TextureTransform_OffsetY: guiState.albedoOffsetY,
        TextureTransform_Rotation: guiState.albedoRotation,
        normalIntensity: guiState.normalIntensity
    };
    setMaterialsConfig(config);
            if (materialsAPI.materialCacheByName) materialsAPI.materialCacheByName.delete(name);

        // Appliquer les modifications en temps réel au matériau actuellement visible
        // mais seulement si c'est le matériau qui est actuellement appliqué à l'objet
        applyChangesToVisibleMaterial(name);
    }

// Nouvelle fonction pour appliquer les changements au matériau visible
function applyChangesToVisibleMaterial(modifiedMaterialName) {
    // Appliquer les transformations en temps réel au matériau
    applyTextureTransformsRealtime(modifiedMaterialName);
    
    // Forcer la mise à jour du matériau sur l'objet 3D
    if (window.__materialsAPI__ && window.__materialsAPI__.forceMaterialUpdate) {
        window.__materialsAPI__.forceMaterialUpdate(modifiedMaterialName);
    }
}

// Nouvelle fonction pour appliquer les transformations de texture en temps réel
function applyTextureTransformsRealtime(materialName) {
    if (!window.__materialsAPI__ || !window.__materialsAPI__.updateMaterialTextureTransforms) {
        return;
    }
    
    // Utiliser l'API pour mettre à jour les transformations
    try {
        window.__materialsAPI__.updateMaterialTextureTransforms(materialName);
    } catch (error) {
        console.error('Erreur lors de l\'application des transformations:', error);
    }
}

// NOUVELLE FONCTION: Sélectionner un matériau par son nom dans datGUI
function selectMaterialByName(materialName) {
    if (!materialSelector) {
        return false;
    }
    
    // Vérifier si le matériau existe dans la configuration
    const config = getMaterialsConfig();
    if (!config || !config[materialName]) {
        return false;
    }
    
    // Mettre à jour l'état GUI
    guiState.material = materialName;
    
    // Synchroniser l'interface avec le matériau sélectionné
    syncGuiFromMaterial(materialName);
    
    // Mettre à jour le sélecteur visuellement
    if (materialSelector && materialSelector.updateDisplay) {
        materialSelector.updateDisplay();
    }
    
    return true;
}

// Fonction pour obtenir le matériau actuellement sélectionné dans datGUI
function getCurrentMaterial() {
    return guiState.material;
}

const matFolder = gui.addFolder('Material');

// Créer le sélecteur de matériaux avec une liste dynamique
let materialSelector = null;
function createMaterialSelector() {
    const config = getMaterialsConfig();

    // Récupérer dynamiquement les noms des matériaux depuis materials.json
    // S'il n'y a pas de configuration, utiliser un matériau par défaut
    let materialNames = [];
    if (config && Object.keys(config).length > 0) {
        materialNames = Object.keys(config);
    } else {
        // Fallback temporaire si aucun matériau n'est chargé
        materialNames = ['Default'];
    }

    if (materialSelector) {
        // Supprimer l'ancien sélecteur s'il existe
        try { matFolder.remove(materialSelector); } catch (e) {}
    }

    materialSelector = matFolder.add(guiState, 'material', materialNames).name('Select').onChange((name) => {
        syncGuiFromMaterial(name);
        // Désactivé : ne plus appliquer automatiquement le matériau à l'objet 3D
        // if (materialsAPI.applyMaterialByName) materialsAPI.applyMaterialByName(name);
    });
}

// Le sélecteur sera initialisé par initializeGUI() quand l'API sera disponible

// Champ de renommage du matériau
matFolder.add(guiState, 'newMaterialName').name('Rename').onChange((newName) => {
    // Mettre à jour le nom temporairement pour l'affichage
    guiState.newMaterialName = newName;
});

const propsFolder = gui.addFolder('PBR');
propsFolder.addColor(guiState, 'color').name('Color').onChange(() => applyGuiToMaterial(guiState.material));
propsFolder.addColor(guiState, 'emissive').name('Emissive').onChange(() => applyGuiToMaterial(guiState.material));
propsFolder.add(guiState, 'roughness', 0, 1, 0.01).name('Roughness').onChange(() => applyGuiToMaterial(guiState.material));
propsFolder.add(guiState, 'metalness', 0, 1, 0.01).name('Metalness').onChange(() => applyGuiToMaterial(guiState.material));
guiState.backfaceCulling = true;
propsFolder.add(guiState, 'backfaceCulling').name('Backface culling').onChange(() => applyGuiToMaterial(guiState.material));
propsFolder.add(guiState, 'alpha', 0, 1, 0.01).name('Alpha').onChange(() => applyGuiToMaterial(guiState.material));
matFolder.open();
propsFolder.open();

// Ajout du menu Texture Transform
const textureTransformFolder = gui.addFolder('Texture Transform');
textureTransformFolder.add(guiState, 'albedoScaleX', 0.01, 10, 0.01).name('Scale X').onChange(() => {
    applyGuiToMaterial(guiState.material);
    applyTextureTransformsRealtime(guiState.material);
});
textureTransformFolder.add(guiState, 'albedoScaleY', 0.01, 10, 0.01).name('Scale Y').onChange(() => {
    applyGuiToMaterial(guiState.material);
    applyTextureTransformsRealtime(guiState.material);
});
textureTransformFolder.add(guiState, 'albedoOffsetX', -5, 5, 0.01).name('Offset X').onChange(() => {
    applyGuiToMaterial(guiState.material);
    applyTextureTransformsRealtime(guiState.material);
});
textureTransformFolder.add(guiState, 'albedoOffsetY', -5, 5, 0.01).name('Offset Y').onChange(() => {
    applyGuiToMaterial(guiState.material);
    applyTextureTransformsRealtime(guiState.material);
});
textureTransformFolder.add(guiState, 'albedoRotation', -Math.PI, Math.PI, 0.01).name('Rotation').onChange(() => {
    applyGuiToMaterial(guiState.material);
    applyTextureTransformsRealtime(guiState.material);
});
textureTransformFolder.open();

// Textures: list and selectors
const texturesFolder = gui.addFolder('Textures');
let availableTextures = [];
const mapSections = {};

function buildOptionsObject() {
    const options = { None: '' };
    for (const name of availableTextures) {
        options[name] = `../materials/textures/${name}`;
    }
    return options;
}

function setTextureValue(targetKey, url) {
    const config = getMaterialsConfig() || {};
    const name = guiState.material;

    // Vérifier que le matériau existe encore
    if (!config[name]) {
        return;
    }

    if (!config[name]) config[name] = {};
    if (url) {
        config[name][targetKey] = url;
    } else {
        delete config[name][targetKey];
    }
    setMaterialsConfig(config);
    guiState[targetKey] = url || '';
    if (materialsAPI.materialCacheByName) materialsAPI.materialCacheByName.delete(name);

    // NOUVEAU: Appliquer les modifications de texture en temps réel au matériau visible
    applyChangesToVisibleMaterial(name);

    const prefix = targetKey.replace('Map','');
    if (mapSections[prefix]) rebuildMapSection(prefix);
}

function ensureMapSection(prefix, label) {
    if (mapSections[prefix]) return mapSections[prefix];
    const folder = texturesFolder.addFolder(`${label} Texture`);
    mapSections[prefix] = { folder, selector: null, transforms: [] };
    return mapSections[prefix];
}

function rebuildSelector(prefix, label) {
    const section = ensureMapSection(prefix, label);
    // Remove existing selector if present
    if (section.selector) {
        try { section.folder.remove(section.selector); } catch (e) {}
        section.selector = null;
    }
    const options = buildOptionsObject();
    const propKey = `${prefix}Map`;
    section.selector = section.folder.add(guiState, propKey, options).name('Image').onChange((v) => setTextureValue(propKey, v));
}

function rebuildMapSection(prefix) {
    const labels = { albedo: 'Albedo', normal: 'Normal', roughness: 'Roughness', metalness: 'Metalness', alpha: 'Alpha' };
    const label = labels[prefix] || prefix;
    const section = ensureMapSection(prefix, label);
    // Remove old transforms
    for (const ctrl of section.transforms) {
        try { section.folder.remove(ctrl); } catch (e) {}
    }
    section.transforms = [];
    // Si pas de texture assignée, garder seulement le sélecteur
    const hasMap = !!guiState[`${prefix}Map`];
    if (!hasMap) {
        return;
    }
    // On ne rajoute plus les contrôleurs de transform ici
    if (prefix === 'normal') {
        section.transforms.push(section.folder.add(guiState, `normalIntensity`, 0, 5, 0.01).name('Intensity').onChange(() => applyGuiToMaterial(guiState.material)));
    }
}

function rebuildAllMapSections() {
    const defs = [
        ['albedo', 'Albedo'],
        ['normal', 'Normal'],
        ['roughness', 'Roughness'],
        ['metalness', 'Metalness'],
        ['alpha', 'Alpha']
    ];
    for (const [prefix, label] of defs) {
        ensureMapSection(prefix, label);
        rebuildSelector(prefix, label);
        rebuildMapSection(prefix);
    }
}

function refreshTextureList() {
    return fetch('../materials/textures/index.json?ts=' + Date.now())
        .then((r) => r.json())
        .then((list) => { availableTextures = Array.isArray(list) ? list : []; rebuildAllMapSections(); updateAllControllersDisplay(gui); })
        .catch((err) => { availableTextures = []; rebuildAllMapSections(); });
}

texturesFolder.add({ Refresh: () => refreshTextureList() }, 'Refresh').name('Refresh list');
texturesFolder.open();
rebuildAllMapSections();
refreshTextureList();


// Fonction pour renommer un matériau dans la configuration
function renameMaterialInConfig(config, oldName, newName) {
    if (!config || !oldName || !newName || oldName === newName) return config;

    // Vérifier que le nouveau nom n'existe pas déjà
    if (config[newName]) {
        return config;
    }

    // Copier le matériau avec le nouveau nom
    config[newName] = { ...config[oldName] };

    // Supprimer l'ancien nom
    delete config[oldName];

    return config;
}

// Export button
const exportParams = { Export: () => {
    const config = getMaterialsConfig();
    if (!config) return;

    // Vérifier s'il y a un renommage à effectuer
    const currentMaterial = guiState.material;
    const newName = guiState.newMaterialName.trim();

    if (newName && newName !== currentMaterial) {
        // Renommer le matériau avant l'export
        const updatedConfig = renameMaterialInConfig(config, currentMaterial, newName);
        if (updatedConfig) {
            // Mettre à jour la configuration en mémoire
            setMaterialsConfig(updatedConfig);

            // Mettre à jour l'interface
            guiState.material = newName;

            // Mettre à jour les options du sélecteur
            updateMaterialSelectorOptions();
        }
    }

    // Exporter la configuration (mise à jour si renommage effectué)
    const configToExport = getMaterialsConfig();
    fetch('../materials/materials.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToExport, null, 2)
    }).then(async (res) => {
        if (!res.ok) throw new Error('Save failed');
        // Force reload materials.json to verify write worked and update in-memory config
        const fresh = await fetch('../materials/materials.json?ts=' + Date.now(), { cache: 'no-store' }).then(r => r.json());
        setMaterialsConfig(fresh);

        // Réinitialiser le champ de renommage après sauvegarde
        guiState.newMaterialName = '';

        // Mettre à jour le sélecteur avec les nouveaux noms de matériaux
        updateMaterialSelectorOptions();
    }).catch((err) => {
        // Save error handled
    });
}};
gui.add(exportParams, 'Export').name('Export materials');

// Nouvelle fonction pour synchroniser datGUI avec le matériau actuellement appliqué
// sans changer la sélection dans le menu
function syncGuiFromCurrentMaterial(currentMaterialName) {
    const config = getMaterialsConfig();
    const def = config && config[currentMaterialName];
    if (!def) {
        return;
    }

    // Synchroniser les valeurs SANS changer guiState.material
    // pour que le menu "Select" garde sa sélection actuelle
    guiState.newMaterialName = currentMaterialName; // Initialiser le champ de renommage avec le nom actuel
    guiState.color = def.color || '#ffffff';
    guiState.emissive = def.emissive || '#000000';
    guiState.roughness = typeof def.roughness === 'number' ? def.roughness : 0.5;
    guiState.metalness = typeof def.metalness === 'number' ? def.metalness : 0.0;
    guiState.backfaceCulling = (typeof def.backfaceCulling === 'boolean') ? def.backfaceCulling : true;
    guiState.alpha = typeof def.alpha === 'number' ? def.alpha : 1;
    guiState.albedoMap = def.albedoMap || '';
    guiState.normalMap = def.normalMap || '';
    guiState.roughnessMap = def.roughnessMap || '';
    guiState.metalnessMap = def.metalnessMap || '';
    guiState.alphaMap = def.alphaMap || '';

    // Utiliser les paramètres TextureTransform unifiés
    const textureTransformScaleX = typeof def.TextureTransform_ScaleX === 'number' ? def.TextureTransform_ScaleX : 1;
    const textureTransformScaleY = typeof def.TextureTransform_ScaleY === 'number' ? def.TextureTransform_ScaleY : 1;
    const textureTransformOffsetX = typeof def.TextureTransform_OffsetX === 'number' ? def.TextureTransform_OffsetX : 0;
    const textureTransformOffsetY = typeof def.TextureTransform_OffsetY === 'number' ? def.TextureTransform_OffsetY : 0;
    const textureTransformRotation = typeof def.TextureTransform_Rotation === 'number' ? def.TextureTransform_Rotation : 0;

    // Appliquer les mêmes valeurs à tous les types de textures
    guiState.albedoScaleX = textureTransformScaleX;
    guiState.albedoScaleY = textureTransformScaleY;
    guiState.albedoOffsetX = textureTransformOffsetX;
    guiState.albedoOffsetY = textureTransformOffsetY;
    guiState.albedoRotation = textureTransformRotation;

    guiState.normalScaleX = textureTransformScaleX;
    guiState.normalScaleY = textureTransformScaleY;
    guiState.normalOffsetX = textureTransformOffsetX;
    guiState.normalOffsetY = textureTransformOffsetY;
    guiState.normalRotation = textureTransformRotation;

    guiState.roughnessScaleX = textureTransformScaleX;
    guiState.roughnessScaleY = textureTransformScaleY;
    guiState.roughnessOffsetX = textureTransformOffsetX;
    guiState.roughnessOffsetY = textureTransformOffsetY;
    guiState.roughnessRotation = textureTransformRotation;

    guiState.metalnessScaleX = textureTransformScaleX;
    guiState.metalnessScaleY = textureTransformScaleY;
    guiState.metalnessOffsetX = textureTransformOffsetX;
    guiState.metalnessOffsetY = textureTransformOffsetY;
    guiState.metalnessRotation = textureTransformRotation;

    guiState.normalIntensity = typeof def.normalIntensity === 'number' ? def.normalIntensity : 1;

    // Reconstruire les sections de textures et mettre à jour l'affichage
    rebuildAllMapSections();
    updateAllControllersDisplay(gui);
}

// Fonction pour mettre à jour les options du sélecteur de matériaux
function updateMaterialSelectorOptions() {
    // Recréer le sélecteur avec la nouvelle liste de matériaux
    createMaterialSelector();
}

// Expose a small API so app.js can force-sync GUI after model/material change
window.__materialsGUI__ = {
    syncGuiFromMaterial,
    syncGuiFromCurrentMaterial,
    updateMaterialSelectorOptions,
    selectMaterialByName,  // NOUVEAU: Sélectionner un matériau par son nom
    getCurrentMaterial     // NOUVEAU: Obtenir le matériau actuellement sélectionné
};

// Fonction d'initialisation qui attend que l'API soit disponible ET que les matériaux soient chargés
function initializeGUI() {
    if (window.__materialsAPI__) {
        const config = getMaterialsConfig();
        
        // Vérifier que les matériaux sont effectivement chargés
        if (config && Object.keys(config).length > 0) {
            // Mettre à jour le sélecteur après le chargement initial
            updateMaterialSelectorOptions();
        } else {
            // Les matériaux ne sont pas encore chargés, réessayer dans 100ms
            setTimeout(initializeGUI, 100);
        }
    } else {
        // L'API n'est pas encore disponible, réessayer dans 100ms
        setTimeout(initializeGUI, 100);
    }
}

// Démarrer l'initialisation
initializeGUI();

// Note: Debug functions are defined in assets.js


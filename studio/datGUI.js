// dat.GUI setup and export/save logic

// Expect globals: window.__materialsAPI__
const materialsAPI = window.__materialsAPI__ || {};

function getMaterialsConfig() { return window.__materialsAPI__.materialsConfig; }
function setMaterialsConfig(v) { window.__materialsAPI__.materialsConfig = v; }



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
        window.__cameraAPI__?.saveCameraConfig(cfg).then(() => console.log('Camera saved')).catch((e) => console.error('Camera save failed', e));
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
    if (!def) return;
    guiState.material = name;
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
    
    // IMPORTANT : Appliquer le matériau modifié pour voir les changements en temps réel
    // Mais sans changer quel matériau est "sélectionné" dans l'interface
    if (materialsAPI.applyMaterialByName) materialsAPI.applyMaterialByName(name);
}

const matFolder = gui.addFolder('Material');
matFolder.add(guiState, 'material', ['Blue', 'White', 'Red']).name('Select').onChange((name) => {
    syncGuiFromMaterial(name);
    // Désactivé : ne plus appliquer automatiquement le matériau à l'objet 3D
    // if (materialsAPI.applyMaterialByName) materialsAPI.applyMaterialByName(name);
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
textureTransformFolder.add(guiState, 'albedoScaleX', 0.01, 10, 0.01).name('Scale X').onChange(() => applyGuiToMaterial(guiState.material));
textureTransformFolder.add(guiState, 'albedoScaleY', 0.01, 10, 0.01).name('Scale Y').onChange(() => applyGuiToMaterial(guiState.material));
textureTransformFolder.add(guiState, 'albedoOffsetX', -5, 5, 0.01).name('Offset X').onChange(() => applyGuiToMaterial(guiState.material));
textureTransformFolder.add(guiState, 'albedoOffsetY', -5, 5, 0.01).name('Offset Y').onChange(() => applyGuiToMaterial(guiState.material));
textureTransformFolder.add(guiState, 'albedoRotation', -Math.PI, Math.PI, 0.01).name('Rotation').onChange(() => applyGuiToMaterial(guiState.material));
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
    if (!config[name]) config[name] = {};
    if (url) {
        config[name][targetKey] = url;
    } else {
        delete config[name][targetKey];
    }
    setMaterialsConfig(config);
    guiState[targetKey] = url || '';
    if (materialsAPI.materialCacheByName) materialsAPI.materialCacheByName.delete(name);
    
    // IMPORTANT : Appliquer le matériau modifié pour voir les changements de textures en temps réel
    if (materialsAPI.applyMaterialByName) materialsAPI.applyMaterialByName(name);
    
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
        .catch((err) => { console.error('Failed to list textures', err); availableTextures = []; rebuildAllMapSections(); });
}

texturesFolder.add({ Refresh: () => refreshTextureList() }, 'Refresh').name('Refresh list');
texturesFolder.open();
rebuildAllMapSections();
refreshTextureList();


// Export button
const exportParams = { Export: () => {
    const config = getMaterialsConfig();
    if (!config) return;
    fetch('../materials/materials.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config, null, 2)
    }).then(async (res) => {
        if (!res.ok) throw new Error('Save failed');
        console.log('Materials saved');
        // Force reload materials.json to verify write worked and update in-memory config
        const fresh = await fetch('../materials/materials.json?ts=' + Date.now(), { cache: 'no-store' }).then(r => r.json());
        setMaterialsConfig(fresh);
    }).catch((err) => {
        console.error('Save error', err);
    });
}};
gui.add(exportParams, 'Export').name('Export materials');

// Nouvelle fonction pour synchroniser datGUI avec le matériau actuellement appliqué
// sans changer la sélection dans le menu
function syncGuiFromCurrentMaterial(currentMaterialName) {
    const config = getMaterialsConfig();
    const def = config && config[currentMaterialName];
    if (!def) return;
    
    // Synchroniser les valeurs SANS changer guiState.material
    // pour que le menu "Select" garde sa sélection actuelle
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

// Expose a small API so app.js can force-sync GUI after model/material change
window.__materialsGUI__ = {
    syncGuiFromMaterial,
    syncGuiFromCurrentMaterial
};


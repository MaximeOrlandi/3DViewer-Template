// App orchestration: load materials, load model, buttons, animate

// Expect globals from studio.js: scene, camera, renderer, controls, modelGroup,
// currentEnvIntensity, applyEnvIntensityToObject3D, GLB_MODEL_URL, loadEnvironment
// Also expects updateCameraFrame, and camera/controls to be globally accessible

// Materials state
let materialsConfig = null;
const materialCacheByName = new Map();
let selectedMaterialName = null;

const textureLoader = new THREE.TextureLoader();
// Camera zoom constraints (defaults)
let cameraZoomMin = 0.1;
let cameraZoomMax = 5;

function loadMaterialsConfig() {
    return fetch('../materials/materials.json')
        .then((res) => res.json())
        .then((json) => { materialsConfig = json; })
        .catch((err) => { console.error('Erreur chargement materials.json', err); materialsConfig = {}; });
}

function loadAndApplyMaps(material, definition) {
    if (!definition) return;
    const cacheBust = '?ts=' + Date.now();
    if (definition.albedoMap) {
        textureLoader.load(definition.albedoMap + cacheBust, (tex) => {
            tex.encoding = THREE.sRGBEncoding;
            material.map = tex;
            tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
            applyTextureTransformFor(tex, definition, 'albedo');
            material.needsUpdate = true;
        });
    } else {
        material.map = null;
    }
    if (definition.normalMap) {
        textureLoader.load(definition.normalMap + cacheBust, (tex) => {
            material.normalMap = tex;
            tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
            applyTextureTransformFor(tex, definition, 'normal');
            // Apply normal intensity if provided
            const k = (typeof definition.normalIntensity === 'number') ? definition.normalIntensity : 1;
            if (material.normalScale) material.normalScale.set(k, k);
            material.needsUpdate = true;
        });
    } else {
        material.normalMap = null;
    }
    if (definition.roughnessMap) {
        textureLoader.load(definition.roughnessMap + cacheBust, (tex) => {
            material.roughnessMap = tex;
            tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
            applyTextureTransformFor(tex, definition, 'roughness');
            material.needsUpdate = true;
        });
    } else {
        material.roughnessMap = null;
    }
    if (definition.metalnessMap) {
        textureLoader.load(definition.metalnessMap + cacheBust, (tex) => {
            material.metalnessMap = tex;
            tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
            applyTextureTransformFor(tex, definition, 'metalness');
            material.needsUpdate = true;
        });
    } else {
        material.metalnessMap = null;
    }
    if (definition.alphaMap) {
        textureLoader.load(definition.alphaMap + cacheBust, (tex) => {
            material.alphaMap = tex;
            tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
            applyTextureTransformFor(tex, definition, 'alpha');
            material.transparent = true;
            material.needsUpdate = true;
        });
    } else {
        material.alphaMap = null;
        // Keep transparent if opacity < 1
        material.transparent = material.opacity < 1;
    }
}

function applyTextureTransformFor(tex, definition, prefix) {
    if (!tex || !definition) return;
    const scaleX = typeof definition[`${prefix}ScaleX`] === 'number' ? definition[`${prefix}ScaleX`] : 1;
    const scaleY = typeof definition[`${prefix}ScaleY`] === 'number' ? definition[`${prefix}ScaleY`] : 1;
    const offsetX = typeof definition[`${prefix}OffsetX`] === 'number' ? definition[`${prefix}OffsetX`] : 0;
    const offsetY = typeof definition[`${prefix}OffsetY`] === 'number' ? definition[`${prefix}OffsetY`] : 0;
    const rotation = typeof definition[`${prefix}Rotation`] === 'number' ? definition[`${prefix}Rotation`] : 0;
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(scaleX, scaleY);
    tex.offset.set(offsetX, offsetY);
    tex.center.set(0.5, 0.5);
    tex.rotation = rotation;
    tex.needsUpdate = true;
}

function createMaterialFromDefinition(definition) {
    const color = definition.color || '#ffffff';
    const roughness = typeof definition.roughness === 'number' ? definition.roughness : 0.5;
    const metalness = typeof definition.metalness === 'number' ? definition.metalness : 0.0;
    const emissive = definition.emissive || '#000000';
    const backfaceCulling = (typeof definition.backfaceCulling === 'boolean') ? definition.backfaceCulling : true;
    const alpha = typeof definition.alpha === 'number' ? THREE.MathUtils.clamp(definition.alpha, 0, 1) : 1;

    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness,
        metalness,
        emissive: new THREE.Color(emissive),
        transparent: alpha < 1 || !!definition.alphaMap,
        opacity: alpha
    });
    material.side = backfaceCulling ? THREE.FrontSide : THREE.DoubleSide;
    material.envMapIntensity = currentEnvIntensity;
    material.needsUpdate = true;
    loadAndApplyMaps(material, definition);
    // Apply transforms for any maps that are already present
    applyTextureTransformFor(material.map, definition, 'albedo');
    applyTextureTransformFor(material.normalMap, definition, 'normal');
    applyTextureTransformFor(material.roughnessMap, definition, 'roughness');
    applyTextureTransformFor(material.metalnessMap, definition, 'metalness');
    applyTextureTransformFor(material.alphaMap, definition, 'alpha');
    // Apply normal intensity if normal map exists
    if (material.normalMap) {
        const k = (typeof definition.normalIntensity === 'number') ? definition.normalIntensity : 1;
        if (material.normalScale) material.normalScale.set(k, k);
    }
    return material;
}

function getOrCreateMaterialByName(materialName) {
    if (!materialsConfig) return null;
    if (materialCacheByName.has(materialName)) return materialCacheByName.get(materialName);
    const def = materialsConfig[materialName];
    if (!def) return null;
    const mat = createMaterialFromDefinition(def);
    materialCacheByName.set(materialName, mat);
    return mat;
}

function applyMaterialByName(materialName) {
    if (!window.loadedModel) return;
    const mat = getOrCreateMaterialByName(materialName);
    if (!mat) return;
    selectedMaterialName = materialName;
    window.loadedModel.traverse((child) => {
        if (child.isMesh) {
            child.material = mat;
        }
    });
}

// GLB loading
const gltfLoader = new THREE.GLTFLoader();
function loadModelFromUrl(url) {
    return new Promise((resolve, reject) => {
        gltfLoader.load(url, (gltf) => {
            if (window.loadedModel) modelGroup.remove(window.loadedModel);
            window.loadedModel = gltf.scene;

            const box = new THREE.Box3().setFromObject(window.loadedModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2.0 / maxDim;

            window.loadedModel.position.sub(center);
            window.loadedModel.scale.multiplyScalar(scale);

            applyEnvIntensityToObject3D(window.loadedModel, currentEnvIntensity);
            modelGroup.add(window.loadedModel);

            if (selectedMaterialName) {
                applyMaterialByName(selectedMaterialName);
                if (window.__materialsGUI__ && typeof window.__materialsGUI__.syncGuiFromMaterial === 'function') {
                    window.__materialsGUI__.syncGuiFromMaterial(selectedMaterialName);
                }
            } else {
                applyMaterialByName('White');
                if (window.__materialsGUI__ && typeof window.__materialsGUI__.syncGuiFromMaterial === 'function') {
                    window.__materialsGUI__.syncGuiFromMaterial('White');
                }
            }
            resolve();
        }, undefined, reject);
    });
}

// Buttons -> materials
document.getElementById('btn-blue').addEventListener('click', () => {
    applyMaterialByName('Blue');
    if (window.__materialsGUI__ && typeof window.__materialsGUI__.syncGuiFromMaterial === 'function') {
        window.__materialsGUI__.syncGuiFromMaterial('Blue');
    }
});
document.getElementById('btn-white').addEventListener('click', () => {
    applyMaterialByName('White');
    if (window.__materialsGUI__ && typeof window.__materialsGUI__.syncGuiFromMaterial === 'function') {
        window.__materialsGUI__.syncGuiFromMaterial('White');
    }
});
document.getElementById('btn-red').addEventListener('click', () => {
    applyMaterialByName('Red');
    if (window.__materialsGUI__ && typeof window.__materialsGUI__.syncGuiFromMaterial === 'function') {
        window.__materialsGUI__.syncGuiFromMaterial('Red');
    }
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    if (typeof updateCameraFrame === 'function') updateCameraFrame();
    renderer.render(scene, camera);
}

// Boot
Promise.resolve()
    .then(() => loadCameraConfig())
    .then(() => loadMaterialsConfig())
    .then(() => loadEnvironment())
    .then(() => loadModelFromUrl(GLB_MODEL_URL))
    .finally(() => animate());

// Export API for datGUI.js
window.__materialsAPI__ = {
    get materialsConfig() { return materialsConfig; },
    set materialsConfig(v) { materialsConfig = v; },
    get selectedMaterialName() { return selectedMaterialName; },
    materialCacheByName,
    applyMaterialByName
};

// Camera config load/save helpers for datGUI
function getCameraCurrentConfig() {
    const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
    const distance = offset.length();
    const yawRad = Math.atan2(offset.x, offset.z);
    const pitchRad = Math.atan2(offset.y, Math.sqrt(offset.x * offset.x + offset.z * offset.z));
    return {
        fov: camera.fov,
        zoom: camera.zoom,
        zoomMin: controls.minDistance ?? cameraZoomMin,
        zoomMax: controls.maxDistance ?? cameraZoomMax,
        zoomSpeed: (typeof controls.zoomSpeed === 'number') ? controls.zoomSpeed : 1,
        yawDeg: THREE.MathUtils.radToDeg(yawRad),
        pitchDeg: THREE.MathUtils.radToDeg(pitchRad),
        distance,
        position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        target: { x: controls.target.x, y: controls.target.y, z: controls.target.z }
    };
}

function applyCameraConfig(cfg) {
    if (!cfg) return;
    if (typeof cfg.fov === 'number') camera.fov = cfg.fov;
    if (typeof cfg.zoomMin === 'number') { cameraZoomMin = cfg.zoomMin; controls.minDistance = cfg.zoomMin; }
    if (typeof cfg.zoomMax === 'number') { cameraZoomMax = cfg.zoomMax; controls.maxDistance = cfg.zoomMax; }
    if (typeof cfg.zoom === 'number') {
        const z = Math.min(Math.max(cfg.zoom, cameraZoomMin), cameraZoomMax);
        camera.zoom = z;
    }
    if (typeof cfg.zoomSpeed === 'number' && typeof controls.zoomSpeed === 'number') {
        controls.zoomSpeed = cfg.zoomSpeed;
    }
    // Position from yaw/pitch/distance if provided
    if ((typeof cfg.yawDeg === 'number' && typeof cfg.pitchDeg === 'number') || typeof cfg.distance === 'number') {
        const target = cfg.target ? new THREE.Vector3(cfg.target.x ?? controls.target.x, cfg.target.y ?? controls.target.y, cfg.target.z ?? controls.target.z) : controls.target.clone();
        const dist = (typeof cfg.distance === 'number') ? cfg.distance : new THREE.Vector3().subVectors(camera.position, target).length();
        const yawRad = THREE.MathUtils.degToRad(cfg.yawDeg ?? THREE.MathUtils.radToDeg(Math.atan2(camera.position.x - target.x, camera.position.z - target.z)));
        const pitchRad = THREE.MathUtils.degToRad(cfg.pitchDeg ?? THREE.MathUtils.radToDeg(Math.atan2(camera.position.y - target.y, Math.hypot(camera.position.x - target.x, camera.position.z - target.z))));
        const cosP = Math.cos(pitchRad);
        const sinP = Math.sin(pitchRad);
        const sinY = Math.sin(yawRad);
        const cosY = Math.cos(yawRad);
        const x = dist * sinY * cosP;
        const y = dist * sinP;
        const z = dist * cosY * cosP;
        camera.position.set(target.x + x, target.y + y, target.z + z);
    } else if (cfg.position) {
        camera.position.set(cfg.position.x ?? camera.position.x, cfg.position.y ?? camera.position.y, cfg.position.z ?? camera.position.z);
    }
    if (cfg.target) {
        controls.target.set(cfg.target.x ?? controls.target.x, cfg.target.y ?? controls.target.y, cfg.target.z ?? controls.target.z);
    }
    camera.updateProjectionMatrix();
}

function loadCameraConfig() {
    return fetch('../studio/camera.json').then(r => r.json()).then((cfg) => applyCameraConfig(cfg)).catch(() => {});
}

function saveCameraConfig(cfg) {
    return fetch('../studio/camera.json', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg, null, 2) });
}

window.__cameraAPI__ = { getCameraCurrentConfig, applyCameraConfig, loadCameraConfig, saveCameraConfig, camera, controls };


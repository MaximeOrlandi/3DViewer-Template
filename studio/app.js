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
        .catch((err) => { materialsConfig = {}; });
}

function loadAndApplyMaps(material, definition) {
    if (!definition) return;
    
    const cacheBust = '?ts=' + Date.now();
    let texturesToLoad = 0;
    let texturesLoaded = 0;
    
    // Compter le nombre de textures à charger
    if (definition.albedoMap) texturesToLoad++;
    if (definition.normalMap) texturesToLoad++;
    if (definition.roughnessMap) texturesToLoad++;
    if (definition.metalnessMap) texturesToLoad++;
    if (definition.alphaMap) texturesToLoad++;
    
    // Fonction pour appliquer les transformations une fois toutes les textures chargées
    const applyTransformsWhenReady = () => {
        texturesLoaded++;
        if (texturesLoaded >= texturesToLoad) {
            // Toutes les textures sont chargées, appliquer les transformations
            if (material.map) {
                applyTextureTransformFor(material.map, definition, 'albedo');
            }
            if (material.normalMap) {
                applyTextureTransformFor(material.normalMap, definition, 'normal');
            }
            if (material.roughnessMap) {
                applyTextureTransformFor(material.roughnessMap, definition, 'roughness');
            }
            if (material.metalnessMap) {
                applyTextureTransformFor(material.metalnessMap, definition, 'metalness');
            }
            if (material.alphaMap) {
                applyTextureTransformFor(material.alphaMap, definition, 'alpha');
            }
            material.needsUpdate = true;
        }
    };
    
    if (definition.albedoMap) {
        textureLoader.load(definition.albedoMap + cacheBust, (tex) => {
            tex.encoding = THREE.sRGBEncoding;
            material.map = tex;
            tex.wrapS = THREE.RepeatWrapping; 
            tex.wrapT = THREE.RepeatWrapping;
            applyTransformsWhenReady();
        });
    } else {
        material.map = null;
        if (texturesToLoad === 0) applyTransformsWhenReady();
    }
    
    if (definition.normalMap) {
        textureLoader.load(definition.normalMap + cacheBust, (tex) => {
            material.normalMap = tex;
            tex.wrapS = THREE.RepeatWrapping; 
            tex.wrapT = THREE.RepeatWrapping;
            // Apply normal intensity if provided
            const k = (typeof definition.normalIntensity === 'number') ? definition.normalIntensity : 1;
            if (material.normalScale) material.normalScale.set(k, k);
            applyTransformsWhenReady();
        });
    } else {
        material.normalMap = null;
    }
    
    if (definition.roughnessMap) {
        textureLoader.load(definition.roughnessMap + cacheBust, (tex) => {
            material.roughnessMap = tex;
            tex.wrapS = THREE.RepeatWrapping; 
            tex.wrapT = THREE.RepeatWrapping;
            applyTransformsWhenReady();
        });
    } else {
        material.roughnessMap = null;
    }
    
    if (definition.metalnessMap) {
        textureLoader.load(definition.metalnessMap + cacheBust, (tex) => {
            material.metalnessMap = tex;
            tex.wrapS = THREE.RepeatWrapping; 
            tex.wrapT = THREE.RepeatWrapping;
            applyTransformsWhenReady();
        });
    } else {
        material.metalnessMap = null;
    }
    
    if (definition.alphaMap) {
        textureLoader.load(definition.alphaMap + cacheBust, (tex) => {
            material.alphaMap = tex;
            tex.wrapS = THREE.RepeatWrapping; 
            tex.wrapT = THREE.RepeatWrapping;
            material.transparent = true;
            applyTransformsWhenReady();
        });
    } else {
        material.alphaMap = null;
        // Keep transparent if opacity < 1
        material.transparent = material.opacity < 1;
    }
}

function applyTextureTransformFor(tex, definition, prefix) {
    if (!tex || !definition) return;
    // Utiliser les paramètres TextureTransform unifiés pour tous les types de textures
    const scaleX = typeof definition.TextureTransform_ScaleX === 'number' ? definition.TextureTransform_ScaleX : 1;
    const scaleY = typeof definition.TextureTransform_ScaleY === 'number' ? definition.TextureTransform_ScaleY : 1;
    const offsetX = typeof definition.TextureTransform_OffsetX === 'number' ? definition.TextureTransform_OffsetX : 0;
    const offsetY = typeof definition.TextureTransform_OffsetY === 'number' ? definition.TextureTransform_OffsetY : 0;
    const rotation = typeof definition.TextureTransform_Rotation === 'number' ? definition.TextureTransform_Rotation : 0;
    
    tex.wrapS = THREE.RepeatWrapping; 
    tex.wrapT = THREE.RepeatWrapping;
    
    // Réinitialiser la matrice
    tex.matrixAutoUpdate = false;
    tex.matrix.identity();
    
    // Appliquer les transformations dans le bon ordre
    if (rotation !== 0) {
        // 1. Déplacer au centre (0.5, 0.5)
        tex.matrix.translate(0.5, 0.5, 0);
        // 2. Appliquer la rotation
        tex.matrix.rotateZ(rotation);
        // 3. Revenir à l'origine
        tex.matrix.translate(-0.5, -0.5, 0);
    }
    
    // 4. Appliquer l'offset
    tex.matrix.translate(offsetX, offsetY, 0);
    // 5. Appliquer le scale
    tex.matrix.scale(scaleX, scaleY, 1);
    
    tex.needsUpdate = true;
}

// Nouvelle fonction pour appliquer les transformations en temps réel
function applyTextureTransformRealtime(tex, scaleX, scaleY, offsetX, offsetY, rotation) {
    if (!tex) return;
    
    // Réinitialiser la matrice
    tex.matrixAutoUpdate = false;
    tex.matrix.identity();
    
    // Appliquer les transformations dans le bon ordre
    if (rotation !== 0) {
        // 1. Déplacer au centre (0.5, 0.5)
        tex.matrix.translate(0.5, 0.5, 0);
        // 2. Appliquer la rotation
        tex.matrix.rotateZ(rotation);
        // 3. Revenir à l'origine
        tex.matrix.translate(-0.5, -0.5, 0);
    }
    
    // 4. Appliquer l'offset
    tex.matrix.translate(offsetX, offsetY, 0);
    // 5. Appliquer le scale
    tex.matrix.scale(scaleX, scaleY, 1);
    
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
    
    // Si assetsManager est disponible, utiliser le système de slots
    if (window.assetsManager && window.assetsManager.getCurrentObject) {
        const currentObject = window.assetsManager.getCurrentObject();
        if (currentObject && currentObject.materials) {
            // Appliquer le matériau aux slots qui l'utilisent
            Object.entries(currentObject.materials).forEach(([slotIndex, matName]) => {
                if (matName === materialName) {
                    applyMaterialToSlot(materialName, parseInt(slotIndex));
                }
            });
        }
    } else {
        // Fallback : appliquer partout si assetsManager n'est pas disponible
        const mat = getOrCreateMaterialByName(materialName);
        if (!mat) return;
        selectedMaterialName = materialName;
        window.loadedModel.traverse((child) => {
            if (child.isMesh) {
                child.material = mat;
            }
        });
    }
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

            // Notifier l'AssetsManager que le modèle est chargé
            if (window.assetsManager && typeof window.assetsManager.setModelGroup === 'function') {
                window.assetsManager.setModelGroup(window.loadedModel);
            }

            if (selectedMaterialName) {
                applyMaterialByName(selectedMaterialName);
                // Synchroniser datGUI avec le matériau appliqué (sans changer la sélection)
                if (window.__materialsGUI__ && typeof window.__materialsGUI__.syncGuiFromCurrentMaterial === 'function') {
                    window.__materialsGUI__.syncGuiFromCurrentMaterial(selectedMaterialName);
                }
            } else {
                applyMaterialByName('White');
                // Synchroniser datGUI avec le matériau appliqué (sans changer la sélection)
                if (window.__materialsGUI__ && typeof window.__materialsGUI__.syncGuiFromCurrentMaterial === 'function') {
                    window.__materialsGUI__.syncGuiFromCurrentMaterial('White');
                }
            }
            resolve();
        }, undefined, reject);
    });
}

// Buttons -> materials (removed - buttons no longer exist in HTML)

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

// Nouvelle fonction pour forcer la mise à jour des transformations sur un matériau existant
function updateMaterialTextureTransforms(materialName) {
    if (!materialsConfig) {
        console.error('materialsConfig not available');
        return;
    }
    
    const def = materialsConfig[materialName];
    if (!def) {
        console.error('Material definition not found for:', materialName);
        return;
    }
    
    // Obtenir ou créer le matériau s'il n'existe pas dans le cache
    let material = materialCacheByName.get(materialName);
    if (!material) {
        material = getOrCreateMaterialByName(materialName);
        if (!material) {
            console.error('Failed to create material for:', materialName);
            return;
        }
    }
    
    // Appliquer les transformations aux textures existantes
    if (material.map) {
        applyTextureTransformFor(material.map, def, 'albedo');
    }
    if (material.normalMap) {
        applyTextureTransformFor(material.normalMap, def, 'normal');
    }
    if (material.roughnessMap) {
        applyTextureTransformFor(material.roughnessMap, def, 'roughness');
    }
    if (material.metalnessMap) {
        applyTextureTransformFor(material.metalnessMap, def, 'metalness');
    }
    if (material.alphaMap) {
        applyTextureTransformFor(material.alphaMap, def, 'alpha');
    }
    
    material.needsUpdate = true;
    
    // Forcer le rendu si le matériau est actuellement appliqué
    if (window.loadedModel && selectedMaterialName === materialName) {
        window.loadedModel.traverse((child) => {
            if (child.isMesh) {
                // Si l'objet utilise le même matériau, mettre à jour ses textures
                if (child.material === material) {
                    child.material.needsUpdate = true;
                } else {
                    // Sinon, appliquer les transformations directement au matériau de l'objet
                    // en recréant le matériau avec les nouvelles transformations
                    const newMaterial = getOrCreateMaterialByName(materialName);
                    if (newMaterial) {
                        child.material = newMaterial;
                        child.material.needsUpdate = true;
                    }
                }
            }
        });
    }
}

// Fonction pour appliquer un matériau à un slot spécifique
function applyMaterialToSlot(materialName, slotIndex) {
    if (!window.loadedModel) return;
    
    const material = getOrCreateMaterialByName(materialName);
    if (!material) return;
    
    // Trouver le sous-mesh correspondant au slot
    let meshIndex = 0;
    window.loadedModel.traverse((child) => {
        if (child.isMesh) {
            if (meshIndex === slotIndex) {
                child.material = material;
                child.material.needsUpdate = true;
                
                // FORCER l'application des transformations sauvegardées avec un délai
                // pour s'assurer que les textures sont chargées
                setTimeout(() => {
                    if (materialsConfig && materialsConfig[materialName]) {
                        const def = materialsConfig[materialName];
                        
                        console.log(`🔧 Applying saved transforms for ${materialName}:`, {
                            scaleX: def.TextureTransform_ScaleX,
                            scaleY: def.TextureTransform_ScaleY,
                            offsetX: def.TextureTransform_OffsetX,
                            offsetY: def.TextureTransform_OffsetY,
                            rotation: def.TextureTransform_Rotation
                        });
                        
                        // Appliquer les transformations aux textures existantes
                        if (material.map) {
                            applyTextureTransformFor(material.map, def, 'albedo');
                        }
                        if (material.normalMap) {
                            applyTextureTransformFor(material.normalMap, def, 'normal');
                        }
                        if (material.roughnessMap) {
                            applyTextureTransformFor(material.roughnessMap, def, 'roughness');
                        }
                        if (material.metalnessMap) {
                            applyTextureTransformFor(material.metalnessMap, def, 'metalness');
                        }
                        if (material.alphaMap) {
                            applyTextureTransformFor(material.alphaMap, def, 'alpha');
                        }
                        
                        material.needsUpdate = true;
                        child.material.needsUpdate = true;
                        console.log(`✅ Transforms applied for ${materialName}`);
                    }
                }, 100); // Délai de 100ms pour s'assurer que les textures sont chargées
            }
            meshIndex++;
        }
    });
}

// Fonction pour forcer la mise à jour du matériau actuellement appliqué
function forceMaterialUpdate(materialName) {
    if (!window.loadedModel) return;
    
    // Obtenir le matériau mis à jour depuis le cache
    const updatedMaterial = getOrCreateMaterialByName(materialName);
    if (!updatedMaterial) return;
    
    // Appliquer le matériau mis à jour uniquement aux sous-meshes qui l'utilisent
    // au lieu de l'appliquer partout
    if (window.assetsManager && window.assetsManager.getCurrentObject) {
        const currentObject = window.assetsManager.getCurrentObject();
        if (currentObject && currentObject.materials) {
            // Appliquer le matériau aux slots qui l'utilisent
            Object.entries(currentObject.materials).forEach(([slotIndex, matName]) => {
                if (matName === materialName) {
                    applyMaterialToSlot(materialName, parseInt(slotIndex));
                }
            });
        }
    } else {
        // Fallback : appliquer partout si assetsManager n'est pas disponible
        window.loadedModel.traverse((child) => {
            if (child.isMesh) {
                child.material = updatedMaterial;
                child.material.needsUpdate = true;
            }
        });
    }
    

}

// Exposer la fonction globalement pour datGUI
window.__materialsAPI__ = {
    get materialsConfig() { return materialsConfig; },
    set materialsConfig(v) { materialsConfig = v; },
    get selectedMaterialName() { return selectedMaterialName; },
    materialCacheByName,
    applyMaterialByName,
    applyMaterialToSlot,
    updateMaterialTextureTransforms,
    forceMaterialUpdate
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


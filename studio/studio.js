// --- Configuration de la scène ---

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 15;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.outputEncoding = THREE.sRGBEncoding;
document.getElementById('container').appendChild(renderer.domElement);

// --- Group parent for loaded model to allow rotating environment effect by rotating model ---
const modelGroup = new THREE.Group();
scene.add(modelGroup);

// --- HDR controls (code-configurable) ---
const HDR_INTENSITY = 1; // 0..2 (1 = 100%)
const HDR_YAW_DEGREES = 0; // -180..180
const HDR_PITCH_DEGREES = 0; // -90..90
// --- Model path (configured in assets.js) ---
// GLB_MODEL_URL is now defined globally by assets.js
// If not available, fallback to default path
// const GLB_MODEL_URL = window.GLB_MODEL_URL || '../assets/objet.glb';

function getClampedHDRAngles() {
    const yaw = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(HDR_YAW_DEGREES, -180, 180));
    const pitch = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(HDR_PITCH_DEGREES, -90, 90));
    return { yaw, pitch };
}

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

let loadedModel;
let currentEnvIntensity = THREE.MathUtils.clamp(HDR_INTENSITY, 0, 2);

function applyEnvIntensityToModel(intensity) {
    if (!loadedModel) return;
    loadedModel.traverse((child) => {
        if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach((m) => {
                    if (m.isMeshStandardMaterial) {
                        m.envMapIntensity = intensity;
                        m.needsUpdate = true;
                    }
                });
            } else if (child.material.isMeshStandardMaterial) {
                child.material.envMapIntensity = intensity;
                child.material.needsUpdate = true;
            }
        }
    });
}

// --- Éclairage de base ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// --- Contrôles de la souris ---
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.minDistance = 1;
controls.maxDistance = 40;

// --- Système de sélection de matériaux par clic ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Fonction pour gérer le clic sur un objet 3D
function onMouseClick(event) {
    // Calculer la position de la souris en coordonnées normalisées (-1 à +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Lancer un rayon depuis la caméra vers la position de la souris
    raycaster.setFromCamera(mouse, camera);
    
    // Trouver tous les objets intersectés par le rayon
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        
        // Vérifier si c'est un mesh avec un matériau
        if (clickedObject.isMesh && clickedObject.material) {
            // Trouver le nom du matériau appliqué
            let materialName = null;
            
            if (window.__materialsAPI__ && window.__materialsAPI__.materialsConfig) {
                // Parcourir tous les matériaux pour trouver celui qui correspond
                Object.entries(window.__materialsAPI__.materialsConfig).forEach(([name, config]) => {
                    // Vérifier si le matériau correspond à celui de l'objet cliqué
                    if (clickedObject.material.name === name || 
                        clickedObject.material.uuid === window.__materialsAPI__.materialCacheByName.get(name)?.uuid) {
                        materialName = name;
                    }
                });
            }
            
            if (materialName) {
                // Sélectionner ce matériau dans datGUI
                if (window.__materialsGUI__ && window.__materialsGUI__.selectMaterialByName) {
                    window.__materialsGUI__.selectMaterialByName(materialName);
                }
            }
        }
    }
}

// Ajouter l'écouteur d'événements pour le clic
renderer.domElement.addEventListener('click', onMouseClick, false);

// Fonction pour activer/désactiver la sélection par clic
function setClickSelectionEnabled(enabled) {
    if (enabled) {
        renderer.domElement.addEventListener('click', onMouseClick, false);
    } else {
        renderer.domElement.removeEventListener('click', onMouseClick, false);
    }
}

// Exposer les fonctions globalement
window.__clickSelectionAPI__ = {
    setEnabled: setClickSelectionEnabled,
    isEnabled: () => renderer.domElement.hasEventListener('click', onMouseClick)
};

// --- Smooth zoom handling (wheel) ---
// We override wheel dolly with a smoothed distance lerp to avoid abrupt jumps
let smoothZoomTargetDistance = null;
const zoomSmoothFactor = 0.15; // 0..1 (higher = faster)
// Disable built-in zoom to avoid double-applying
controls.enableZoom = false;

function getCurrentCameraDistance() {
	const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
	return offset.length();
}

function setCameraDistancePreserveDirection(distance) {
	const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
	if (offset.length() === 0) return;
	offset.normalize().multiplyScalar(distance);
	camera.position.copy(controls.target).add(offset);
	camera.updateProjectionMatrix();
}

renderer.domElement.addEventListener('wheel', (e) => {
	// Intercept wheel to implement smoothed dolly
	e.preventDefault();
	if (smoothZoomTargetDistance === null) smoothZoomTargetDistance = getCurrentCameraDistance();
	const base = 0.95;
	const speed = (typeof controls.zoomSpeed === 'number' ? controls.zoomSpeed : 1);
	const step = Math.pow(base, speed);
	if (e.deltaY < 0) {
		// Zoom in → reduce distance
		smoothZoomTargetDistance = Math.max(smoothZoomTargetDistance * step, controls.minDistance);
	} else if (e.deltaY > 0) {
		// Zoom out → increase distance
		smoothZoomTargetDistance = Math.min(smoothZoomTargetDistance / step, controls.maxDistance);
	}
	// Clamp applied inline above
	// Notify listeners so UI can sync
	controls.dispatchEvent({ type: 'change' });
}, { passive: false });

// --- Logique de retour de la caméra ---
const initialPolarAngle = Math.PI / 2;
let isReturningToInitial = false;
controls.addEventListener('start', () => { isReturningToInitial = false; });
controls.addEventListener('end', () => { isReturningToInitial = true; });

// --- Loaders ---
const rgbeLoader = new THREE.RGBELoader();

// --- Utilitaire: appliquer l'intensité d'IBL à un Object3D ---
function applyEnvIntensityToObject3D(object3D, intensity) {
    if (!object3D) return;
    object3D.traverse((child) => {
        if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach((m) => {
                    if (m.isMeshStandardMaterial) {
                        m.envMapIntensity = intensity;
                        m.needsUpdate = true;
                    }
                });
            } else if (child.material.isMeshStandardMaterial) {
                child.material.envMapIntensity = intensity;
                child.material.needsUpdate = true;
            }
        }
    });
}

// --- (dat.GUI déplacé vers datGUI.js) ---

// --- (chargement du GLB déplacé vers app.js) ---

// --- Chargement de l'éclairage HDR ---
function loadEnvironment() {
    // Utilise le HDR situé dans le même dossier que ce fichier JS (résolu depuis index.html)
    const hdrUrl = '../studio/default.hdr';
    
    rgbeLoader.load(hdrUrl, (hdrTexture) => {
        const { yaw, pitch } = getClampedHDRAngles();

        // Build a rotatable sky sphere scene and capture it into a cubemap
        const envScene = new THREE.Scene();
        const skyGeometry = new THREE.SphereGeometry(50, 64, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({ map: hdrTexture, side: THREE.BackSide });
        const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
        skyMesh.rotation.y = yaw;
        skyMesh.rotation.x = pitch;
        envScene.add(skyMesh);

        const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
        const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);
        cubeCamera.update(renderer, envScene);

        const envMap = pmremGenerator.fromCubemap(cubeRenderTarget.texture).texture;
        scene.environment = envMap; // IBL only
        // Keep background white

        // Cleanup temporary resources
        skyGeometry.dispose();
        skyMaterial.dispose();
        cubeRenderTarget.dispose();
        hdrTexture.dispose();

        // Re-apply intensity if a model is already loaded
        applyEnvIntensityToModel(currentEnvIntensity);
    });
}

// --- (gestion des boutons déplacée vers app.js) ---


// --- Mise à jour caméra (appelée chaque frame par app.js) ---
function updateCameraFrame() {
    controls.update();
    // Apply smooth zoom if target set
    if (smoothZoomTargetDistance !== null) {
        const current = getCurrentCameraDistance();
        const next = THREE.MathUtils.lerp(current, smoothZoomTargetDistance, zoomSmoothFactor);
        setCameraDistancePreserveDirection(next);
        if (Math.abs(next - smoothZoomTargetDistance) < 1e-4) {
            smoothZoomTargetDistance = null;
        }
    }
    if (isReturningToInitial) {
        const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        if (Math.abs(spherical.phi - initialPolarAngle) < 0.005) {
            spherical.phi = initialPolarAngle;
            isReturningToInitial = false;
        } else {
            spherical.phi = THREE.MathUtils.lerp(spherical.phi, initialPolarAngle, 0.1);
        }
        offset.setFromSpherical(spherical);
        camera.position.copy(controls.target).add(offset);
        camera.lookAt(controls.target);
    }
}

// --- Gestion du redimensionnement de la fenêtre ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

// --- (initialisation déplacée vers app.js) ---

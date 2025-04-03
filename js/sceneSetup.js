// js/sceneSetup.js
import * as THREE from 'three';
import * as GlobalConfig from './config.js'; // Renamed for clarity

/**
 * Initializes the core Three.js components: scene, camera, renderer, and lighting.
 * @param {HTMLCanvasElement} canvasElement - The canvas element to render to.
 * @param {object} levelConfig - The configuration object for the current level.
 * @returns {{scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer}}
 */
export function initScene(canvasElement, levelConfig) { // Added levelConfig
    // Scene
    const scene = new THREE.Scene();
    // Use levelConfig for scene appearance
    scene.background = new THREE.Color(levelConfig.SCENE_BACKGROUND_COLOR);
    scene.fog = new THREE.Fog(levelConfig.SCENE_FOG_COLOR, levelConfig.SCENE_FOG_NEAR, levelConfig.SCENE_FOG_FAR);

    // Camera
    const camera = new THREE.PerspectiveCamera(
        GlobalConfig.CAMERA_FOV, // Use GlobalConfig for camera
        window.innerWidth / window.innerHeight,
        GlobalConfig.CAMERA_NEAR_PLANE,
        GlobalConfig.CAMERA_FAR_PLANE
    );
    // Initial camera position (will likely be overridden by follow logic later)
    camera.position.set(0, 50, 100);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
        canvas: canvasElement,
        antialias: true,
        // Disable texture flipping to prevent WebGL warnings with 3D textures
        // See: https://threejs.org/docs/#api/en/renderers/WebGLRenderer
        alpha: true
    });

    // Disable texture flipping which causes warnings with 3D textures
    renderer.outputEncoding = THREE.LinearEncoding;

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true; // Keep shadows enabled

    // Lighting
    const ambientLight = new THREE.AmbientLight(
        levelConfig.AMBIENT_LIGHT_COLOR, // Use levelConfig
        levelConfig.AMBIENT_LIGHT_INTENSITY
    );
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(
        levelConfig.DIRECTIONAL_LIGHT_COLOR, // Use levelConfig
        levelConfig.DIRECTIONAL_LIGHT_INTENSITY
    );
    directionalLight.position.set(
        levelConfig.DIRECTIONAL_LIGHT_POS_X, // Use levelConfig
        levelConfig.DIRECTIONAL_LIGHT_POS_Y,
        levelConfig.DIRECTIONAL_LIGHT_POS_Z
    );
    directionalLight.castShadow = true; // Keep shadows enabled
    // Configure shadow properties if needed
    // directionalLight.shadow.mapSize.width = 2048;
    // directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    return { scene, camera, renderer };
}

/**
 * Handles window resize events to update camera aspect ratio and renderer size.
 * @param {THREE.PerspectiveCamera} camera
 * @param {THREE.WebGLRenderer} renderer
 */
export function handleResize(camera, renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
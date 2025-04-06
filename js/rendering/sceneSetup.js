// js/rendering/sceneSetup.js
import * as THREE from 'three'; // Re-enabled THREE import
import configManager from '../utils/configManager.js'; // Import config manager
// Import specific constants and performanceManager
import {
    performanceManager,
    CAMERA_FOV, CAMERA_NEAR_PLANE, CAMERA_FAR_PLANE,
    RENDERING, // Basic rendering config
    RENDERING_ADVANCED // Advanced config (shadows, etc.)
    // PLAYER_HEIGHT_OFFSET // Needed? No, camera pos is absolute now.
} from '../config/config.js'; // Moved to config

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
        CAMERA_FOV, // Use imported constant
        window.innerWidth / window.innerHeight,
        CAMERA_NEAR_PLANE, // Use imported constant
        CAMERA_FAR_PLANE // Use imported constant
    );
    // Initial camera position using constants
    camera.position.set(
        RENDERING_ADVANCED.INITIAL_CAMERA_POS_X,
        RENDERING_ADVANCED.INITIAL_CAMERA_POS_Y,
        RENDERING_ADVANCED.INITIAL_CAMERA_POS_Z
    );
    camera.lookAt(0, 0, 0); // Look at origin initially

    // Renderer
    const renderer = new THREE.WebGLRenderer({
        canvas: canvasElement,
        antialias: RENDERING.ANTIALIAS, // Use imported constant
        // Disable texture flipping to prevent WebGL warnings with 3D textures
        // See: https://threejs.org/docs/#api/en/renderers/WebGLRenderer
        alpha: true,
        powerPreference: 'high-performance'
    });

    // Disable texture flipping which causes warnings with 3D textures
    renderer.outputEncoding = THREE.LinearEncoding;

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(RENDERING.PIXEL_RATIO); // Use imported constant
    renderer.shadowMap.enabled = RENDERING.SHADOWS_ENABLED; // Use imported constant

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
    directionalLight.castShadow = RENDERING.SHADOWS_ENABLED; // Use imported constant

    // Configure shadow properties based on performance settings and constants
    if (RENDERING.SHADOWS_ENABLED) {
        const shadowQuality = performanceManager.currentQuality === 'low' ? RENDERING_ADVANCED.SHADOW_MAP_SIZE_LOW :
                             performanceManager.currentQuality === 'medium' ? RENDERING_ADVANCED.SHADOW_MAP_SIZE_MEDIUM :
                             RENDERING_ADVANCED.SHADOW_MAP_SIZE_HIGH;

        directionalLight.shadow.mapSize.width = shadowQuality;
        directionalLight.shadow.mapSize.height = shadowQuality;
        directionalLight.shadow.camera.near = RENDERING_ADVANCED.SHADOW_CAMERA_NEAR;
        directionalLight.shadow.camera.far = RENDERING_ADVANCED.SHADOW_CAMERA_FAR;
        directionalLight.shadow.bias = RENDERING_ADVANCED.SHADOW_BIAS;

        // Configure shadow camera frustum
        const frustumSize = RENDERING_ADVANCED.SHADOW_FRUSTUM_SIZE;
        directionalLight.shadow.camera.left = -frustumSize;
        directionalLight.shadow.camera.right = frustumSize;
        directionalLight.shadow.camera.top = frustumSize;
        directionalLight.shadow.camera.bottom = -frustumSize;
        directionalLight.shadow.camera.updateProjectionMatrix(); // Important after changing frustum
    }
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
    // Maintain pixel ratio from performance settings
    renderer.setPixelRatio(RENDERING.PIXEL_RATIO); // Use imported constant
}

/**
 * Creates an FPS counter display element
 * @returns {HTMLElement} The FPS counter element
 */
export function createFpsCounter() {
    const fpsCounter = document.createElement('div');
    fpsCounter.id = 'fpsCounter';
    fpsCounter.style.position = 'fixed';
    fpsCounter.style.top = '5px';
    fpsCounter.style.right = '5px';
    fpsCounter.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    fpsCounter.style.color = 'white';
    fpsCounter.style.padding = '5px';
    fpsCounter.style.borderRadius = '3px';
    fpsCounter.style.fontFamily = 'monospace';
    fpsCounter.style.fontSize = '12px'; // Keep style for now
    fpsCounter.style.zIndex = '1000'; // Keep style for now
    fpsCounter.style.display = configManager.get('debug.showFPS') ? 'block' : 'none'; // Use configManager
    fpsCounter.textContent = `${RENDERING_ADVANCED.FPS_COUNTER_PREFIX}--`; // Use constant
    document.body.appendChild(fpsCounter);
    return fpsCounter;
}

/**
 * Updates the FPS counter with the current FPS
 * @param {HTMLElement} fpsCounter - The FPS counter element
 * @param {number} fps - The current FPS
 */
export function updateFpsCounter(fpsCounter, fps) {
    if (!fpsCounter) return;
    // Use constants for text
    fpsCounter.textContent = `${RENDERING_ADVANCED.FPS_COUNTER_PREFIX}${Math.round(fps)}${RENDERING_ADVANCED.FPS_COUNTER_SEPARATOR}${performanceManager.currentQuality}`;
    fpsCounter.style.display = configManager.get('debug.showFPS') ? 'block' : 'none'; // Use configManager
}
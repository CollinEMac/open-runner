// js/sceneSetup.js
import * as THREE from 'three';
import * as GlobalConfig from './config.js'; // Renamed for clarity
import { performanceManager } from './config.js';

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
        antialias: GlobalConfig.RENDERING.ANTIALIAS,
        // Disable texture flipping to prevent WebGL warnings with 3D textures
        // See: https://threejs.org/docs/#api/en/renderers/WebGLRenderer
        alpha: true,
        powerPreference: 'high-performance'
    });

    // Disable texture flipping which causes warnings with 3D textures
    renderer.outputEncoding = THREE.LinearEncoding;

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(GlobalConfig.RENDERING.PIXEL_RATIO);
    renderer.shadowMap.enabled = GlobalConfig.RENDERING.SHADOWS_ENABLED;

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
    directionalLight.castShadow = GlobalConfig.RENDERING.SHADOWS_ENABLED;

    // Configure shadow properties based on performance settings
    if (GlobalConfig.RENDERING.SHADOWS_ENABLED) {
        // Lower shadow map size for better performance on lower-end devices
        const shadowQuality = performanceManager.currentQuality === 'low' ? 512 :
                             performanceManager.currentQuality === 'medium' ? 1024 : 2048;

        directionalLight.shadow.mapSize.width = shadowQuality;
        directionalLight.shadow.mapSize.height = shadowQuality;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.bias = -0.001;
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
    renderer.setPixelRatio(GlobalConfig.RENDERING.PIXEL_RATIO);
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
    fpsCounter.style.fontSize = '12px';
    fpsCounter.style.zIndex = '1000';
    fpsCounter.style.display = GlobalConfig.SHOW_FPS ? 'block' : 'none';
    fpsCounter.textContent = 'FPS: --';
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
    fpsCounter.textContent = `FPS: ${Math.round(fps)} | Quality: ${performanceManager.currentQuality}`;
    fpsCounter.style.display = GlobalConfig.SHOW_FPS ? 'block' : 'none';
}
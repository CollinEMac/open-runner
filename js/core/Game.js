// js/core/Game.js

import * as THREE from 'three';
import { createLogger } from '../utils/logger.js';
import eventBus from '../eventBus.js';
import Scene from './Scene.js';
import gameStateManager, { GameStates } from '../gameStateManager.js';
import * as config from '../config.js';

const logger = createLogger('Game');

/**
 * Main game class that manages the game loop and scenes
 */
export default class Game {
    /**
     * Create a new Game instance
     * @param {HTMLCanvasElement} canvas - The canvas element to render to
     * @param {Object} [options={}] - Configuration options
     */
    constructor(canvas, options = {}) {
        if (!canvas) {
            throw new Error('Canvas element is required to initialize the game.');
        }

        /**
         * The canvas element
         * @type {HTMLCanvasElement}
         */
        this.canvas = canvas;

        /**
         * The renderer
         * @type {THREE.WebGLRenderer}
         */
        this.renderer = null;

        /**
         * The clock for timing
         * @type {THREE.Clock}
         */
        this.clock = new THREE.Clock();

        /**
         * Current active scene
         * @type {Scene|null}
         */
        this.activeScene = null;

        /**
         * Map of scenes by name
         * @type {Map<string, Scene>}
         */
        this.scenes = new Map();

        /**
         * Whether the game is running
         * @type {boolean}
         */
        this.running = false;

        /**
         * Whether the game is initialized
         * @type {boolean}
         */
        this.initialized = false;

        /**
         * Event listeners
         * @type {Array<{target: EventTarget, type: string, listener: Function}>}
         */
        this.eventListeners = [];

        logger.debug('Game instance created');
    }

    /**
     * Initialize the game
     * @returns {Promise<boolean>} Whether initialization was successful
     */
    async init() {
        logger.debug('Initializing game');

        try {
            // Initialize renderer
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                antialias: true
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);

            // Set up event listeners
            this._setupEventListeners();

            // Set initialized flag
            this.initialized = true;

            logger.debug('Game initialized successfully');
            return true;
        } catch (error) {
            logger.error('Failed to initialize game:', error);
            return false;
        }
    }

    /**
     * Start the game loop
     */
    start() {
        if (!this.initialized) {
            logger.error('Cannot start game: not initialized');
            return;
        }

        if (this.running) {
            logger.warn('Game already running');
            return;
        }

        this.running = true;
        this.clock.start();
        
        logger.debug('Game started');
        
        // Start the animation loop
        this._animate();
    }

    /**
     * Stop the game loop
     */
    stop() {
        this.running = false;
        this.clock.stop();
        
        logger.debug('Game stopped');
    }

    /**
     * Create a new scene
     * @param {string} name - Name of the scene
     * @param {Object} [options={}] - Scene options
     * @returns {Scene} The created scene
     */
    createScene(name, options = {}) {
        if (this.scenes.has(name)) {
            logger.warn(`Scene "${name}" already exists`);
            return this.scenes.get(name);
        }

        const scene = new Scene({ name, ...options });
        scene.setRenderer(this.renderer);
        
        this.scenes.set(name, scene);
        
        logger.debug(`Created scene: ${name}`);
        return scene;
    }

    /**
     * Set the active scene
     * @param {string} name - Name of the scene to activate
     * @returns {boolean} Whether the scene was activated
     */
    setActiveScene(name) {
        if (!this.scenes.has(name)) {
            logger.error(`Cannot set active scene: "${name}" does not exist`);
            return false;
        }

        // Deactivate current scene if any
        if (this.activeScene) {
            this.activeScene.setActive(false);
        }

        // Activate new scene
        this.activeScene = this.scenes.get(name);
        this.activeScene.setActive(true);
        
        logger.debug(`Set active scene: ${name}`);
        
        // Emit event
        eventBus.emit('sceneChanged', name);
        
        return true;
    }

    /**
     * Get a scene by name
     * @param {string} name - Name of the scene
     * @returns {Scene|null} The scene, or null if not found
     */
    getScene(name) {
        return this.scenes.get(name) || null;
    }

    /**
     * Remove a scene
     * @param {string} name - Name of the scene to remove
     * @returns {boolean} Whether the scene was removed
     */
    removeScene(name) {
        if (!this.scenes.has(name)) {
            return false;
        }

        const scene = this.scenes.get(name);
        
        // If this is the active scene, deactivate it
        if (this.activeScene === scene) {
            this.activeScene = null;
        }
        
        // Dispose of the scene
        scene.dispose();
        this.scenes.delete(name);
        
        logger.debug(`Removed scene: ${name}`);
        return true;
    }

    /**
     * Handle window resize
     */
    _handleResize() {
        if (!this.renderer) return;
        
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update camera aspect ratio if available
        if (this.activeScene && this.activeScene.mainCamera) {
            const camera = this.activeScene.mainCamera;
            if (camera instanceof THREE.PerspectiveCamera) {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
            }
        }
        
        logger.debug('Handled window resize');
    }

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Window resize
        const resizeListener = this._handleResize.bind(this);
        window.addEventListener('resize', resizeListener);
        this.eventListeners.push({ target: window, type: 'resize', listener: resizeListener });
        
        logger.debug('Set up event listeners');
    }

    /**
     * Remove all event listeners
     */
    _removeEventListeners() {
        for (const { target, type, listener } of this.eventListeners) {
            target.removeEventListener(type, listener);
        }
        this.eventListeners = [];
        
        logger.debug('Removed event listeners');
    }

    /**
     * Animation loop
     */
    _animate() {
        if (!this.running) return;
        
        requestAnimationFrame(this._animate.bind(this));
        
        // Calculate delta time with a maximum to prevent large jumps
        const deltaTime = Math.min(this.clock.getDelta(), config.MAX_DELTA_TIME);
        const elapsedTime = this.clock.getElapsedTime();
        
        // Update the active scene
        if (this.activeScene) {
            this.activeScene.update(deltaTime, elapsedTime);
            this.activeScene.render();
        }
    }

    /**
     * Dispose of the game and all resources
     */
    dispose() {
        logger.debug('Disposing game');
        
        // Stop the game loop
        this.stop();
        
        // Remove event listeners
        this._removeEventListeners();
        
        // Dispose of all scenes
        for (const scene of this.scenes.values()) {
            scene.dispose();
        }
        this.scenes.clear();
        
        // Dispose of renderer
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        
        // Clear references
        this.activeScene = null;
        this.initialized = false;
        
        logger.debug('Game disposed');
    }
}
// js/core/Scene.js

import * as THREE from 'three';
import { createLogger } from '../utils/logger.js';
import GameObject from './GameObject.js';
import eventBus from '../eventBus.js';

const logger = createLogger('Scene');

/**
 * Manages a game scene with game objects and rendering
 */
export default class Scene {
    /**
     * Create a new Scene
     * @param {Object} [options={}] - Configuration options
     * @param {string} [options.name='Scene'] - Name of the scene
     * @param {THREE.Color|number|string} [options.backgroundColor=0x000000] - Background color
     * @param {boolean} [options.fog=false] - Whether to enable fog
     * @param {Object} [options.fogOptions] - Fog options if fog is enabled
     */
    constructor(options = {}) {
        const {
            name = 'Scene',
            backgroundColor = 0x000000,
            fog = false,
            fogOptions = {}
        } = options;

        /**
         * Name of this scene
         * @type {string}
         */
        this.name = name;

        /**
         * The Three.js scene
         * @type {THREE.Scene}
         */
        this.scene = new THREE.Scene();

        /**
         * Game objects in the scene
         * @type {Map<string, GameObject>}
         */
        this.gameObjects = new Map();

        /**
         * Lights in the scene
         * @type {Array<THREE.Light>}
         */
        this.lights = [];

        /**
         * Whether the scene is active
         * @type {boolean}
         */
        this.active = true;

        /**
         * The main camera for the scene
         * @type {THREE.Camera|null}
         */
        this.mainCamera = null;

        /**
         * The renderer for the scene
         * @type {THREE.WebGLRenderer|null}
         */
        this.renderer = null;

        // Set background color
        if (backgroundColor instanceof THREE.Color) {
            this.scene.background = backgroundColor;
        } else {
            this.scene.background = new THREE.Color(backgroundColor);
        }

        // Set up fog if enabled
        if (fog) {
            this.setupFog(fogOptions);
        }

        logger.debug(`Created scene: ${this.name}`);
    }

    /**
     * Set up fog for the scene
     * @param {Object} [options={}] - Fog options
     * @param {THREE.Color|number|string} [options.color=0xffffff] - Fog color
     * @param {number} [options.near=1] - Near distance
     * @param {number} [options.far=1000] - Far distance
     * @param {number} [options.density=0.00025] - Fog density (for FogExp2)
     * @param {string} [options.type='linear'] - Fog type ('linear' or 'exponential')
     */
    setupFog(options = {}) {
        const {
            color = 0xffffff,
            near = 1,
            far = 1000,
            density = 0.00025,
            type = 'linear'
        } = options;

        const fogColor = color instanceof THREE.Color
            ? color
            : new THREE.Color(color);

        if (type === 'exponential') {
            this.scene.fog = new THREE.FogExp2(fogColor, density);
        } else {
            this.scene.fog = new THREE.Fog(fogColor, near, far);
        }

        logger.debug(`Set up ${type} fog for scene: ${this.name}`);
    }

    /**
     * Set the renderer for the scene
     * @param {THREE.WebGLRenderer} renderer - The renderer to use
     */
    setRenderer(renderer) {
        this.renderer = renderer;
    }

    /**
     * Set the main camera for the scene
     * @param {THREE.Camera} camera - The camera to use
     */
    setMainCamera(camera) {
        this.mainCamera = camera;
        this.scene.add(camera);
    }

    /**
     * Add a game object to the scene
     * @param {GameObject} gameObject - The game object to add
     * @returns {GameObject} The added game object
     */
    addGameObject(gameObject) {
        if (!(gameObject instanceof GameObject)) {
            logger.error(`Cannot add non-GameObject to scene: ${this.name}`);
            return null;
        }

        this.gameObjects.set(gameObject.id, gameObject);
        gameObject.addToScene(this.scene);

        logger.debug(`Added game object ${gameObject.name} to scene: ${this.name}`);
        return gameObject;
    }

    /**
     * Get a game object by ID
     * @param {string} id - The ID of the game object
     * @returns {GameObject|null} The game object, or null if not found
     */
    getGameObject(id) {
        return this.gameObjects.get(id) || null;
    }

    /**
     * Remove a game object from the scene
     * @param {string|GameObject} gameObjectOrId - The game object or its ID
     * @returns {boolean} Whether the game object was removed
     */
    removeGameObject(gameObjectOrId) {
        const id = typeof gameObjectOrId === 'string'
            ? gameObjectOrId
            : gameObjectOrId.id;

        if (!this.gameObjects.has(id)) {
            return false;
        }

        const gameObject = this.gameObjects.get(id);
        gameObject.removeFromScene();
        this.gameObjects.delete(id);

        logger.debug(`Removed game object ${gameObject.name} from scene: ${this.name}`);
        return true;
    }

    /**
     * Add a light to the scene
     * @param {THREE.Light} light - The light to add
     */
    addLight(light) {
        if (!(light instanceof THREE.Light)) {
            logger.error(`Cannot add non-Light to scene: ${this.name}`);
            return;
        }

        this.lights.push(light);
        this.scene.add(light);

        logger.debug(`Added light to scene: ${this.name}`);
    }

    /**
     * Remove a light from the scene
     * @param {THREE.Light} light - The light to remove
     * @returns {boolean} Whether the light was removed
     */
    removeLight(light) {
        const index = this.lights.indexOf(light);
        if (index === -1) {
            return false;
        }

        this.lights.splice(index, 1);
        this.scene.remove(light);

        logger.debug(`Removed light from scene: ${this.name}`);
        return true;
    }

    /**
     * Initialize the scene and all game objects
     * @returns {Promise<boolean>} Whether initialization was successful
     */
    async init() {
        logger.debug(`Initializing scene: ${this.name}`);

        // Initialize all game objects
        for (const gameObject of this.gameObjects.values()) {
            const success = await gameObject.init();
            if (!success) {
                logger.error(`Failed to initialize game object ${gameObject.name} in scene: ${this.name}`);
                return false;
            }
        }

        logger.debug(`Scene initialized: ${this.name}`);
        return true;
    }

    /**
     * Update the scene and all game objects
     * @param {number} deltaTime - Time since last update in seconds
     * @param {number} elapsedTime - Total elapsed time in seconds
     */
    update(deltaTime, elapsedTime) {
        if (!this.active) return;

        // Update all game objects
        for (const gameObject of this.gameObjects.values()) {
            gameObject.update(deltaTime, elapsedTime);
        }
    }

    /**
     * Render the scene
     */
    render() {
        if (!this.active || !this.renderer || !this.mainCamera) return;

        this.renderer.render(this.scene, this.mainCamera);
    }

    /**
     * Set whether the scene is active
     * @param {boolean} active - Whether the scene should be active
     */
    setActive(active) {
        this.active = Boolean(active);

        // Set all game objects active/inactive
        for (const gameObject of this.gameObjects.values()) {
            gameObject.setActive(this.active);
        }
    }

    /**
     * Dispose of the scene and all game objects
     */
    dispose() {
        logger.debug(`Disposing scene: ${this.name}`);

        // Dispose of all game objects
        for (const gameObject of this.gameObjects.values()) {
            gameObject.dispose();
        }
        this.gameObjects.clear();

        // Remove all lights
        for (const light of this.lights) {
            this.scene.remove(light);
        }
        this.lights = [];

        // Clear the scene
        this.scene.clear();

        // Emit event
        eventBus.emit('sceneDisposed', this.name);
    }

    /**
     * Find game objects by name
     * @param {string} name - The name to search for
     * @returns {Array<GameObject>} Matching game objects
     */
    findGameObjectsByName(name) {
        const result = [];
        for (const gameObject of this.gameObjects.values()) {
            if (gameObject.name === name) {
                result.push(gameObject);
            }
        }
        return result;
    }

    /**
     * Find game objects by tag
     * @param {string} tag - The tag to search for
     * @returns {Array<GameObject>} Matching game objects
     */
    findGameObjectsByTag(tag) {
        const result = [];
        for (const gameObject of this.gameObjects.values()) {
            if (gameObject.properties.tag === tag) {
                result.push(gameObject);
            }
        }
        return result;
    }

    /**
     * Find game objects by component type
     * @param {string} componentType - The component type to search for
     * @returns {Array<GameObject>} Matching game objects
     */
    findGameObjectsByComponent(componentType) {
        const result = [];
        for (const gameObject of this.gameObjects.values()) {
            if (gameObject.hasComponent(componentType)) {
                result.push(gameObject);
            }
        }
        return result;
    }

    /**
     * Raycast from a point in a direction
     * @param {THREE.Vector3} origin - Origin point
     * @param {THREE.Vector3} direction - Direction vector
     * @param {number} [maxDistance=Infinity] - Maximum distance
     * @param {Array<GameObject>} [excludeObjects=[]] - Objects to exclude
     * @returns {Object|null} Hit result or null if no hit
     */
    raycast(origin, direction, maxDistance = Infinity, excludeObjects = []) {
        const raycaster = new THREE.Raycaster(origin, direction.normalize(), 0, maxDistance);
        
        // Get all objects to test
        const objects = [];
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                objects.push(object);
            }
        });
        
        // Perform raycast
        const intersects = raycaster.intersectObjects(objects, true);
        
        // Filter out excluded objects
        const excludeIds = excludeObjects.map(obj => obj.id);
        const filteredIntersects = intersects.filter(intersect => {
            // Find the GameObject this mesh belongs to
            let current = intersect.object;
            while (current && (!current.userData || !current.userData.gameObject)) {
                current = current.parent;
            }
            
            if (!current || !current.userData || !current.userData.gameObject) {
                return true; // Keep if no GameObject found
            }
            
            const gameObject = current.userData.gameObject;
            return !excludeIds.includes(gameObject.id);
        });
        
        if (filteredIntersects.length === 0) {
            return null;
        }
        
        const hit = filteredIntersects[0];
        
        // Find the GameObject this mesh belongs to
        let current = hit.object;
        while (current && (!current.userData || !current.userData.gameObject)) {
            current = current.parent;
        }
        
        const gameObject = current && current.userData && current.userData.gameObject;
        
        return {
            distance: hit.distance,
            point: hit.point,
            normal: hit.face ? hit.face.normal : null,
            object: hit.object,
            gameObject: gameObject || null
        };
    }
}
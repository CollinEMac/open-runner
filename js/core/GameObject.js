// js/core/GameObject.js

import * as THREE from 'three';
import { createLogger } from '../utils/logger.js';
import eventBus from '../eventBus.js';
import ComponentManager from './ComponentManager.js';
import Component from './Component.js';

const logger = createLogger('GameObject');

/**
 * Base class for all game objects
 * Provides common functionality for objects in the game world
 */
export default class GameObject {
    /**
     * Create a new GameObject
     * @param {Object} [options={}] - Configuration options
     * @param {string} [options.name='GameObject'] - Name of the object
     * @param {THREE.Vector3} [options.position] - Initial position
     * @param {THREE.Quaternion} [options.rotation] - Initial rotation
     * @param {THREE.Vector3} [options.scale] - Initial scale
     * @param {boolean} [options.visible=true] - Whether the object is visible
     * @param {boolean} [options.collidable=false] - Whether the object can be collided with
     * @param {Array<Component>} [options.components=[]] - Initial components to add
     */
    constructor(options = {}) {
        // Set default options
        const {
            name = 'GameObject',
            position,
            rotation,
            scale,
            visible = true,
            collidable = false,
            components = []
        } = options;

        /**
         * Unique identifier for this object
         * @type {string}
         */
        this.id = `${name}_${Math.floor(Math.random() * 1000000)}`;

        /**
         * Name of this object
         * @type {string}
         */
        this.name = name;

        /**
         * The Three.js group containing all meshes for this object
         * @type {THREE.Group}
         */
        this.object3D = new THREE.Group();
        this.object3D.name = this.id;

        // Store a reference to this GameObject on the Three.js object for raycasting
        this.object3D.userData.gameObject = this;

        /**
         * Whether this object can be collided with
         * @type {boolean}
         */
        this.collidable = collidable;

        /**
         * Whether this object is active in the scene
         * @type {boolean}
         */
        this.active = true;

        /**
         * Custom properties for this object
         * @type {Object}
         */
        this.properties = {};

        /**
         * Parent object if this is a child
         * @type {GameObject|null}
         */
        this.parent = null;

        /**
         * Child objects
         * @type {Array<GameObject>}
         */
        this.children = [];

        /**
         * Component manager for this object
         * @type {ComponentManager}
         */
        this.components = new ComponentManager(this);

        // Set initial transform
        if (position) this.setPosition(position);
        if (rotation) this.setRotation(rotation);
        if (scale) this.setScale(scale);
        this.setVisible(visible);

        // Add initial components
        for (const component of components) {
            this.addComponent(component);
        }

        logger.debug(`Created ${this.name} (${this.id})`);
    }

    /**
     * Initialize the object and its components
     * Override in subclasses to add specific initialization logic
     * @returns {Promise<boolean>} Whether initialization was successful
     */
    async init() {
        // Initialize components first
        const componentsInitialized = await this.components.initComponents();
        if (!componentsInitialized) {
            logger.error(`Failed to initialize components for ${this.name}`);
            return false;
        }

        // Initialize children
        for (const child of this.children) {
            const childInitialized = await child.init();
            if (!childInitialized) {
                logger.error(`Failed to initialize child ${child.name} of ${this.name}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Update the object and its components
     * Override in subclasses to add specific update logic
     * @param {number} deltaTime - Time since last update in seconds
     * @param {number} elapsedTime - Total elapsed time in seconds
     */
    update(deltaTime, elapsedTime) {
        // Base update logic
        if (!this.active) return;

        // Update components
        this.components.updateComponents(deltaTime, elapsedTime);

        // Update children
        for (const child of this.children) {
            child.update(deltaTime, elapsedTime);
        }
    }

    /**
     * Add a component to this object
     * @param {Component} component - The component to add
     * @returns {Component} The added component
     */
    addComponent(component) {
        return this.components.addComponent(component);
    }

    /**
     * Get a component by type
     * @param {string} type - The type of component to get
     * @returns {Component|null} The component, or null if not found
     */
    getComponent(type) {
        return this.components.getComponent(type);
    }

    /**
     * Check if this object has a component of the given type
     * @param {string} type - The type of component to check for
     * @returns {boolean} Whether this object has the component
     */
    hasComponent(type) {
        return this.components.hasComponent(type);
    }

    /**
     * Remove a component by type
     * @param {string} type - The type of component to remove
     * @returns {boolean} Whether the component was removed
     */
    removeComponent(type) {
        return this.components.removeComponent(type);
    }

    /**
     * Set the position of the object
     * @param {THREE.Vector3|Object} position - New position
     */
    setPosition(position) {
        if (position instanceof THREE.Vector3) {
            this.object3D.position.copy(position);
        } else {
            this.object3D.position.set(
                position.x || 0,
                position.y || 0,
                position.z || 0
            );
        }
    }

    /**
     * Get the position of the object
     * @returns {THREE.Vector3} Current position
     */
    getPosition() {
        return this.object3D.position.clone();
    }

    /**
     * Set the rotation of the object
     * @param {THREE.Quaternion|THREE.Euler|Object} rotation - New rotation
     */
    setRotation(rotation) {
        if (rotation instanceof THREE.Quaternion) {
            this.object3D.quaternion.copy(rotation);
        } else if (rotation instanceof THREE.Euler) {
            this.object3D.rotation.copy(rotation);
        } else {
            this.object3D.rotation.set(
                rotation.x || 0,
                rotation.y || 0,
                rotation.z || 0
            );
        }
    }

    /**
     * Get the rotation of the object
     * @param {boolean} [asEuler=false] - Whether to return as Euler angles
     * @returns {THREE.Quaternion|THREE.Euler} Current rotation
     */
    getRotation(asEuler = false) {
        return asEuler
            ? this.object3D.rotation.clone()
            : this.object3D.quaternion.clone();
    }

    /**
     * Set the scale of the object
     * @param {THREE.Vector3|Object|number} scale - New scale
     */
    setScale(scale) {
        if (scale instanceof THREE.Vector3) {
            this.object3D.scale.copy(scale);
        } else if (typeof scale === 'number') {
            this.object3D.scale.set(scale, scale, scale);
        } else {
            this.object3D.scale.set(
                scale.x || 1,
                scale.y || 1,
                scale.z || 1
            );
        }
    }

    /**
     * Get the scale of the object
     * @returns {THREE.Vector3} Current scale
     */
    getScale() {
        return this.object3D.scale.clone();
    }

    /**
     * Set whether the object is visible
     * @param {boolean} visible - Whether the object should be visible
     */
    setVisible(visible) {
        this.object3D.visible = Boolean(visible);
    }

    /**
     * Get whether the object is visible
     * @returns {boolean} Whether the object is visible
     */
    isVisible() {
        return this.object3D.visible;
    }

    /**
     * Set whether the object is active
     * @param {boolean} active - Whether the object should be active
     */
    setActive(active) {
        const wasActive = this.active;
        this.active = Boolean(active);

        // Handle component activation/deactivation
        if (wasActive !== this.active) {
            this.components.setAllEnabled(this.active);

            // Emit events
            if (this.active) {
                this.emit('activated');
            } else {
                this.emit('deactivated');
            }
        }
    }

    /**
     * Get whether the object is active
     * @returns {boolean} Whether the object is active
     */
    isActive() {
        return this.active;
    }

    /**
     * Add a child object
     * @param {GameObject} child - Child object to add
     */
    addChild(child) {
        if (!(child instanceof GameObject)) {
            logger.error(`Cannot add non-GameObject as child to ${this.name}`);
            return;
        }

        if (child.parent) {
            child.parent.removeChild(child);
        }

        this.children.push(child);
        child.parent = this;
        this.object3D.add(child.object3D);

        // Emit events
        this.emit('childAdded', child);
        child.emit('parentChanged', this);
    }

    /**
     * Remove a child object
     * @param {GameObject} child - Child object to remove
     * @returns {boolean} Whether the child was removed
     */
    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index === -1) return false;

        this.children.splice(index, 1);
        child.parent = null;
        this.object3D.remove(child.object3D);

        // Emit events
        this.emit('childRemoved', child);
        child.emit('parentChanged', null);

        return true;
    }

    /**
     * Add this object to a parent scene or object
     * @param {THREE.Scene|THREE.Object3D} parent - Parent to add to
     */
    addToScene(parent) {
        if (!parent) {
            logger.error(`Cannot add ${this.name} to null parent`);
            return;
        }

        parent.add(this.object3D);
        this.emit('addedToScene', parent);
    }

    /**
     * Remove this object from its parent scene or object
     */
    removeFromScene() {
        if (this.object3D.parent) {
            const parent = this.object3D.parent;
            this.object3D.parent.remove(this.object3D);
            this.emit('removedFromScene', parent);
        }
    }

    /**
     * Dispose of this object and its resources
     * Override in subclasses to add specific cleanup logic
     */
    dispose() {
        // Emit event before disposal
        this.emit('disposing');

        // Remove from parent if any
        this.removeFromScene();

        // Dispose of all components
        this.components.disposeComponents();

        // Dispose of all children
        for (const child of this.children) {
            child.dispose();
        }
        this.children = [];

        // Dispose of Three.js resources
        this.object3D.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
                if (obj.geometry) {
                    obj.geometry.dispose();
                }

                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(material => material.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            }
        });

        // Clear references
        this.object3D.userData.gameObject = null;

        logger.debug(`Disposed ${this.name} (${this.id})`);
    }

    /**
     * Check if this object intersects with another object
     * @param {GameObject} other - Other object to check
     * @returns {boolean} Whether the objects intersect
     */
    intersects(other) {
        // Basic implementation - override in subclasses for more specific collision detection
        if (!this.collidable || !other.collidable) return false;

        // Simple bounding box intersection check
        const box1 = new THREE.Box3().setFromObject(this.object3D);
        const box2 = new THREE.Box3().setFromObject(other.object3D);

        return box1.intersectsBox(box2);
    }

    /**
     * Get the bounding box of this object
     * @returns {THREE.Box3} Bounding box
     */
    getBoundingBox() {
        return new THREE.Box3().setFromObject(this.object3D);
    }

    /**
     * Look at a target position
     * @param {THREE.Vector3|Object} target - Position to look at
     */
    lookAt(target) {
        if (target instanceof THREE.Vector3) {
            this.object3D.lookAt(target);
        } else {
            this.object3D.lookAt(
                target.x || 0,
                target.y || 0,
                target.z || 0
            );
        }
    }

    /**
     * Emit an event from this object
     * @param {string} eventName - Name of the event
     * @param {...any} args - Event arguments
     */
    emit(eventName, ...args) {
        eventBus.emit(`${this.id}:${eventName}`, ...args);
        eventBus.emit(`gameObject:${eventName}`, this, ...args);
    }

    /**
     * Subscribe to events from this object
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Event callback
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback) {
        return eventBus.subscribe(`${this.id}:${eventName}`, callback);
    }

    /**
     * Get the world position of this object
     * @returns {THREE.Vector3} World position
     */
    getWorldPosition() {
        const worldPosition = new THREE.Vector3();
        this.object3D.getWorldPosition(worldPosition);
        return worldPosition;
    }

    /**
     * Get the world quaternion of this object
     * @returns {THREE.Quaternion} World quaternion
     */
    getWorldQuaternion() {
        const worldQuaternion = new THREE.Quaternion();
        this.object3D.getWorldQuaternion(worldQuaternion);
        return worldQuaternion;
    }

    /**
     * Get the world scale of this object
     * @returns {THREE.Vector3} World scale
     */
    getWorldScale() {
        const worldScale = new THREE.Vector3();
        this.object3D.getWorldScale(worldScale);
        return worldScale;
    }

    /**
     * Get the forward direction of this object
     * @returns {THREE.Vector3} Forward direction
     */
    getForward() {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.getWorldQuaternion());
        return forward;
    }

    /**
     * Get the right direction of this object
     * @returns {THREE.Vector3} Right direction
     */
    getRight() {
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(this.getWorldQuaternion());
        return right;
    }

    /**
     * Get the up direction of this object
     * @returns {THREE.Vector3} Up direction
     */
    getUp() {
        const up = new THREE.Vector3(0, 1, 0);
        up.applyQuaternion(this.getWorldQuaternion());
        return up;
    }
}
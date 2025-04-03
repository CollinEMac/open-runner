// js/core/ComponentManager.js

import Component from './Component.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ComponentManager');

/**
 * Manages components for a GameObject
 */
export default class ComponentManager {
    /**
     * Create a new ComponentManager
     * @param {GameObject} gameObject - The GameObject this manager belongs to
     */
    constructor(gameObject) {
        /**
         * The GameObject this manager belongs to
         * @type {GameObject}
         */
        this.gameObject = gameObject;

        /**
         * Map of components by type
         * @type {Map<string, Component>}
         */
        this.components = new Map();

        /**
         * Array of components for iteration
         * @type {Array<Component>}
         */
        this.componentArray = [];

        /**
         * Whether components need to be sorted
         * @type {boolean}
         */
        this.needsSort = false;
    }

    /**
     * Add a component to the GameObject
     * @param {Component} component - The component to add
     * @returns {Component} The added component
     * @throws {Error} If component is not a Component instance
     */
    addComponent(component) {
        if (!(component instanceof Component)) {
            throw new Error(`Cannot add non-Component to ${this.gameObject.name}`);
        }

        // Check if component of this type already exists
        if (this.components.has(component.constructor.name)) {
            logger.warn(`Component of type ${component.constructor.name} already exists on ${this.gameObject.name}`);
            return this.components.get(component.constructor.name);
        }

        // Add component
        this.components.set(component.constructor.name, component);
        this.componentArray.push(component);
        this.needsSort = true;

        // Attach component to GameObject
        component.onAttach(this.gameObject);

        return component;
    }

    /**
     * Get a component by type
     * @param {string} type - The type of component to get
     * @returns {Component|null} The component, or null if not found
     */
    getComponent(type) {
        return this.components.get(type) || null;
    }

    /**
     * Check if the GameObject has a component of the given type
     * @param {string} type - The type of component to check for
     * @returns {boolean} Whether the GameObject has the component
     */
    hasComponent(type) {
        return this.components.has(type);
    }

    /**
     * Remove a component by type
     * @param {string} type - The type of component to remove
     * @returns {boolean} Whether the component was removed
     */
    removeComponent(type) {
        if (!this.components.has(type)) {
            return false;
        }

        const component = this.components.get(type);
        
        // Detach component from GameObject
        component.onDetach();
        
        // Remove from collections
        this.components.delete(type);
        const index = this.componentArray.indexOf(component);
        if (index !== -1) {
            this.componentArray.splice(index, 1);
        }

        return true;
    }

    /**
     * Initialize all components
     * @returns {Promise<boolean>} Whether all components initialized successfully
     */
    async initComponents() {
        let allSuccessful = true;
        
        for (const component of this.componentArray) {
            try {
                const success = await component.init();
                if (!success) {
                    logger.error(`Failed to initialize component ${component.name} on ${this.gameObject.name}`);
                    allSuccessful = false;
                }
            } catch (error) {
                logger.error(`Error initializing component ${component.name} on ${this.gameObject.name}:`, error);
                allSuccessful = false;
            }
        }
        
        return allSuccessful;
    }

    /**
     * Update all enabled components
     * @param {number} deltaTime - Time since last update in seconds
     * @param {number} elapsedTime - Total elapsed time in seconds
     */
    updateComponents(deltaTime, elapsedTime) {
        // Sort components by priority if needed
        if (this.needsSort) {
            this.componentArray.sort((a, b) => a.priority - b.priority);
            this.needsSort = false;
        }
        
        // Update each enabled component
        for (const component of this.componentArray) {
            if (component.enabled) {
                component.update(deltaTime, elapsedTime);
            }
        }
    }

    /**
     * Dispose of all components
     */
    disposeComponents() {
        for (const component of this.componentArray) {
            component.dispose();
        }
        
        this.components.clear();
        this.componentArray = [];
    }

    /**
     * Get all components
     * @returns {Array<Component>} Array of all components
     */
    getAllComponents() {
        return [...this.componentArray];
    }

    /**
     * Enable or disable all components
     * @param {boolean} enabled - Whether components should be enabled
     */
    setAllEnabled(enabled) {
        for (const component of this.componentArray) {
            component.setEnabled(enabled);
        }
    }
}
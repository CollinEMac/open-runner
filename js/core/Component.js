// js/core/Component.js

import { createLogger } from '../utils/logger.js';

const logger = createLogger('Component');

/**
 * Base class for all components
 * Components add behavior to GameObjects
 */
export default class Component {
    /**
     * Create a new Component
     * @param {Object} [options={}] - Configuration options
     * @param {string} [options.name='Component'] - Name of the component
     */
    constructor(options = {}) {
        const { name = 'Component' } = options;

        /**
         * Name of this component
         * @type {string}
         */
        this.name = name;

        /**
         * Unique identifier for this component
         * @type {string}
         */
        this.id = `${name}_${Math.floor(Math.random() * 1000000)}`;

        /**
         * The GameObject this component is attached to
         * @type {GameObject|null}
         */
        this.gameObject = null;

        /**
         * Whether this component is enabled
         * @type {boolean}
         */
        this.enabled = true;

        /**
         * Priority for update order (lower numbers update first)
         * @type {number}
         */
        this.priority = 0;

        logger.debug(`Created ${this.name} (${this.id})`);
    }

    /**
     * Called when the component is attached to a GameObject
     * @param {GameObject} gameObject - The GameObject this component is attached to
     */
    onAttach(gameObject) {
        this.gameObject = gameObject;
        logger.debug(`Attached ${this.name} to ${gameObject.name}`);
    }

    /**
     * Called when the component is detached from a GameObject
     */
    onDetach() {
        logger.debug(`Detached ${this.name} from ${this.gameObject?.name || 'unknown'}`);
        this.gameObject = null;
    }

    /**
     * Initialize the component
     * Override in subclasses to add specific initialization logic
     * @returns {Promise<boolean>} Whether initialization was successful
     */
    async init() {
        return true;
    }

    /**
     * Update the component
     * Override in subclasses to add specific update logic
     * @param {number} deltaTime - Time since last update in seconds
     * @param {number} elapsedTime - Total elapsed time in seconds
     */
    update(deltaTime, elapsedTime) {
        // Base update logic - override in subclasses
    }

    /**
     * Enable or disable the component
     * @param {boolean} enabled - Whether the component should be enabled
     */
    setEnabled(enabled) {
        const wasEnabled = this.enabled;
        this.enabled = Boolean(enabled);
        
        if (wasEnabled !== this.enabled) {
            if (this.enabled) {
                this.onEnable();
            } else {
                this.onDisable();
            }
        }
    }

    /**
     * Called when the component is enabled
     * Override in subclasses to add specific enable logic
     */
    onEnable() {
        // Base enable logic - override in subclasses
    }

    /**
     * Called when the component is disabled
     * Override in subclasses to add specific disable logic
     */
    onDisable() {
        // Base disable logic - override in subclasses
    }

    /**
     * Dispose of this component and its resources
     * Override in subclasses to add specific cleanup logic
     */
    dispose() {
        if (this.gameObject) {
            this.onDetach();
        }
        
        logger.debug(`Disposed ${this.name} (${this.id})`);
    }
}
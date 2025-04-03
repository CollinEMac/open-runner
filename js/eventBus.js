// js/eventBus.js

/**
 * A robust event bus for decoupled communication between modules.
 * Implements the Singleton pattern to ensure a single event bus instance.
 */
class EventBus {
    constructor() {
        this.listeners = new Map();
        this.debugMode = false; // Can be toggled for verbose logging
    }

    /**
     * Enable or disable debug logging
     * @param {boolean} enabled - Whether to enable debug logging
     */
    setDebugMode(enabled) {
        this.debugMode = Boolean(enabled);
    }

    /**
     * Log a message if debug mode is enabled
     * @private
     * @param {string} message - The message to log
     * @param {*} [data] - Optional data to log
     */
    _debugLog(message, data) {
        if (!this.debugMode) return;

        if (data !== undefined) {
            console.log(`[EventBus] ${message}`, data);
        } else {
            console.log(`[EventBus] ${message}`);
        }
    }

    /**
     * Subscribe to an event.
     * @param {string} eventName - The name of the event to subscribe to.
     * @param {function} callback - The function to call when the event is emitted.
     * @returns {function} - Unsubscribe function for easy cleanup
     */
    subscribe(eventName, callback) {
        if (!eventName || typeof callback !== 'function') {
            console.error('[EventBus] Invalid parameters for subscribe:', { eventName, callback });
            return () => {}; // Return empty function to prevent errors
        }

        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }

        this.listeners.get(eventName).add(callback);
        this._debugLog(`Subscribed to ${eventName}`);

        // Return an unsubscribe function for easier cleanup
        return () => this.unsubscribe(eventName, callback);
    }

    /**
     * Unsubscribe from an event.
     * @param {string} eventName - The name of the event to unsubscribe from.
     * @param {function} callback - The specific callback function to remove.
     * @returns {boolean} - Whether the unsubscribe was successful
     */
    unsubscribe(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            return false;
        }

        const result = this.listeners.get(eventName).delete(callback);

        // Clean up empty event sets
        if (this.listeners.get(eventName).size === 0) {
            this.listeners.delete(eventName);
        }

        if (result) {
            this._debugLog(`Unsubscribed from ${eventName}`);
        }

        return result;
    }

    /**
     * Unsubscribe all listeners for a specific event
     * @param {string} eventName - The event to clear listeners for
     * @returns {boolean} - Whether any listeners were removed
     */
    unsubscribeAll(eventName) {
        if (!this.listeners.has(eventName)) {
            return false;
        }

        const hadListeners = this.listeners.get(eventName).size > 0;
        this.listeners.delete(eventName);

        if (hadListeners) {
            this._debugLog(`Unsubscribed all listeners from ${eventName}`);
        }

        return hadListeners;
    }

    /**
     * Emit an event, calling all subscribed listeners.
     * @param {string} eventName - The name of the event to emit.
     * @param {...*} args - Arguments to pass to the listeners.
     * @returns {boolean} - Whether any listeners were called
     */
    emit(eventName, ...args) {
        if (!this.listeners.has(eventName) || this.listeners.get(eventName).size === 0) {
            this._debugLog(`No listeners for event: ${eventName}`);
            return false;
        }

        this._debugLog(`Emitting ${eventName}`, args);

        let hasErrors = false;
        this.listeners.get(eventName).forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                hasErrors = true;
                console.error(`[EventBus] Error in listener for ${eventName}:`, error);
            }
        });

        return !hasErrors;
    }

    /**
     * Get the number of listeners for a specific event
     * @param {string} eventName - The event to check
     * @returns {number} - The number of listeners
     */
    listenerCount(eventName) {
        if (!this.listeners.has(eventName)) {
            return 0;
        }
        return this.listeners.get(eventName).size;
    }

    /**
     * Check if an event has any listeners
     * @param {string} eventName - The event to check
     * @returns {boolean} - Whether the event has listeners
     */
    hasListeners(eventName) {
        return this.listenerCount(eventName) > 0;
    }
}

// Export a single instance (Singleton pattern)
const eventBus = new EventBus();
export default eventBus;
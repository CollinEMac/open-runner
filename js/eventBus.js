// js/eventBus.js

/**
 * A simple event bus for decoupled communication between modules.
 */
class EventBus {
    constructor() {
        this.listeners = {};
    }

    /**
     * Subscribe to an event.
     * @param {string} eventName - The name of the event to subscribe to.
     * @param {function} callback - The function to call when the event is emitted.
     */
    subscribe(eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);
        console.log(`[EventBus] Subscribed to ${eventName}`); // Optional: for debugging
    }

    /**
     * Unsubscribe from an event.
     * @param {string} eventName - The name of the event to unsubscribe from.
     * @param {function} callback - The specific callback function to remove.
     */
    unsubscribe(eventName, callback) {
        if (!this.listeners[eventName]) {
            return;
        }
        this.listeners[eventName] = this.listeners[eventName].filter(
            listener => listener !== callback
        );
        console.log(`[EventBus] Unsubscribed from ${eventName}`); // Optional: for debugging
    }

    /**
     * Emit an event, calling all subscribed listeners.
     * @param {string} eventName - The name of the event to emit.
     * @param {...*} args - Arguments to pass to the listeners.
     */
    emit(eventName, ...args) {
        if (!this.listeners[eventName]) {
            // console.warn(`[EventBus] No listeners for event: ${eventName}`); // Optional: warning if no listeners
            return;
        }
        console.log(`[EventBus] Emitting ${eventName} with args:`, args); // Optional: for debugging
        this.listeners[eventName].forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`[EventBus] Error in listener for ${eventName}:`, error);
            }
        });
    }
}

// Export a single instance (Singleton pattern)
const eventBus = new EventBus();
export default eventBus;
/**
 * Centralized event bus for decoupling application components.
 * Provides a global pub/sub mechanism for loose coupling between services and views.
 */
class EventBus {
    constructor() {
        this.events = new Map();
        this.debugMode = false;
    }

    /**
     * Subscribe to an event
     * @param {string} eventType - Event name
     * @param {Function} listener - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(eventType, listener) {
        if (!this.events.has(eventType)) {
            this.events.set(eventType, new Set());
        }

        this.events.get(eventType).add(listener);

        if (this.debugMode) {
            console.debug(
                `EventBus: Subscribed to '${eventType}', total listeners: ${this.events.get(eventType).size}`
            );
        }

        // Return unsubscribe function
        return () => this.off(eventType, listener);
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventType - Event name
     * @param {Function} listener - Callback function
     */
    off(eventType, listener) {
        const listeners = this.events.get(eventType);
        if (listeners) {
            listeners.delete(listener);
            if (listeners.size === 0) {
                this.events.delete(eventType);
            }

            if (this.debugMode) {
                console.debug(`EventBus: Unsubscribed from '${eventType}', remaining listeners: ${listeners.size}`);
            }
        }
    }

    /**
     * Emit an event to all subscribers
     * @param {string} eventType - Event name
     * @param {*} data - Event data
     */
    emit(eventType, data = null) {
        const listeners = this.events.get(eventType);

        if (this.debugMode) {
            console.debug(`EventBus: Emitting '${eventType}' to ${listeners?.size || 0} listeners`, data);
        }

        if (listeners) {
            for (const listener of listeners) {
                try {
                    listener(data);
                } catch (error) {
                    console.error(`EventBus: Error in listener for '${eventType}':`, error);
                }
            }
        }
    }

    /**
     * Subscribe to an event only once
     * @param {string} eventType - Event name
     * @param {Function} listener - Callback function
     * @returns {Function} Unsubscribe function
     */
    once(eventType, listener) {
        const onceListener = (data) => {
            listener(data);
            this.off(eventType, onceListener);
        };

        return this.on(eventType, onceListener);
    }

    /**
     * Remove all listeners for an event type
     * @param {string} eventType - Event name
     */
    removeAllListeners(eventType) {
        this.events.delete(eventType);

        if (this.debugMode) {
            console.debug(`EventBus: Removed all listeners for '${eventType}'`);
        }
    }

    /**
     * Clear all event listeners
     */
    clear() {
        this.events.clear();

        if (this.debugMode) {
            console.debug('EventBus: Cleared all listeners');
        }
    }

    /**
     * Get current event listeners count
     * @param {string} eventType - Optional event type
     * @returns {number|Object} Listener count or counts by event type
     */
    getListenerCount(eventType) {
        if (eventType) {
            return this.events.get(eventType)?.size || 0;
        }

        const counts = {};
        for (const [type, listeners] of this.events) {
            counts[type] = listeners.size;
        }
        return counts;
    }

    /**
     * Enable/disable debug logging
     * @param {boolean} enabled - Debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
}

// Global singleton instance
const eventBus = new EventBus();

// Export both class and instance for use in other modules
globalThis.GlobalEventBus = eventBus;
globalThis.EventBus = eventBus; // Keep for compatibility
globalThis.EventBusClass = EventBus;

// Helper function to get the EventBus instance safely
globalThis.getEventBus = () => globalThis.GlobalEventBus || globalThis.EventBus;

/**
 * @file A simple EventEmitter class for pub/sub pattern.
 */
class EventEmitter {
    constructor() {
        this.events = {};
    }

    /**
     * Subscribes a listener function to an event type.
     * @param {string} eventType - The name of the event to listen for.
     * @param {Function} listener - The callback function to execute when the event is emitted.
     */
    subscribe(eventType, listener) {
        if (!this.events[eventType]) {
            this.events[eventType] = [];
        }
        this.events[eventType].push(listener);
    }

    /**
     * Unsubscribes a listener function from an event type.
     * @param {string} eventType - The name of the event.
     * @param {Function} listener - The callback function to remove.
     */
    unsubscribe(eventType, listener) {
        if (!this.events[eventType]) {
            return;
        }
        this.events[eventType] = this.events[eventType].filter((currentListener) => currentListener !== listener);
    }

    /**
     * Emits an event, calling all subscribed listeners with the provided data.
     * @protected // Indicates intended for internal use by subclasses
     * @param {string} eventType - The name of the event to emit.
     * @param {*} data - The data to pass to the listeners.
     */
    _emit(eventType, data) {
        if (!this.events[eventType]) {
            return;
        }
        for (const listener of this.events[eventType]) {
            try {
                listener(data);
            } catch (error) {
                console.error(`Error in listener for event "${eventType}":`, error);
            }
        }
    }
}

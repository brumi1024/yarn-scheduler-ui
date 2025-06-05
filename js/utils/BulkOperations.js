/**
 * Bulk operations utility for queue management.
 * Allows users to perform operations on multiple queues simultaneously.
 */
class BulkOperations {
    constructor(schedulerConfigModel, notificationView) {
        this.schedulerConfigModel = schedulerConfigModel;
        this.notificationView = notificationView;
        this.selectedQueues = new Set();
        this.callbacks = new Map();
    }

    /**
     * Registers a callback for bulk operation events.
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
    }

    /**
     * Emits an event to registered callbacks.
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    _emit(event, data) {
        if (this.callbacks.has(event)) {
            for (const callback of this.callbacks.get(event)) {
                callback(data);
            }
        }
    }

    /**
     * Selects a queue for bulk operations.
     * @param {string} queuePath - Queue path to select
     */
    selectQueue(queuePath) {
        this.selectedQueues.add(queuePath);
        this._emit('selectionChanged', {
            selected: Array.from(this.selectedQueues),
            count: this.selectedQueues.size
        });
    }

    /**
     * Deselects a queue from bulk operations.
     * @param {string} queuePath - Queue path to deselect
     */
    deselectQueue(queuePath) {
        this.selectedQueues.delete(queuePath);
        this._emit('selectionChanged', {
            selected: Array.from(this.selectedQueues),
            count: this.selectedQueues.size
        });
    }

    /**
     * Toggles queue selection.
     * @param {string} queuePath - Queue path to toggle
     */
    toggleQueue(queuePath) {
        if (this.selectedQueues.has(queuePath)) {
            this.deselectQueue(queuePath);
        } else {
            this.selectQueue(queuePath);
        }
    }

    /**
     * Selects all visible queues.
     * @param {Array} queuePaths - Array of queue paths to select
     */
    selectAll(queuePaths) {
        for (const queuePath of queuePaths) {
            this.selectedQueues.add(queuePath);
        }
        this._emit('selectionChanged', {
            selected: Array.from(this.selectedQueues),
            count: this.selectedQueues.size
        });
    }

    /**
     * Clears all queue selections.
     */
    clearSelection() {
        this.selectedQueues.clear();
        this._emit('selectionChanged', {
            selected: [],
            count: 0
        });
    }

    /**
     * Gets currently selected queues.
     * @returns {Array} Array of selected queue paths
     */
    getSelectedQueues() {
        return Array.from(this.selectedQueues);
    }

    /**
     * Checks if a queue is selected.
     * @param {string} queuePath - Queue path to check
     * @returns {boolean} True if selected
     */
    isSelected(queuePath) {
        return this.selectedQueues.has(queuePath);
    }

    /**
     * Performs bulk state change operation.
     * @param {string} newState - New state (RUNNING or STOPPED)
     * @returns {Promise<Object>} Operation result
     */
    async bulkChangeState(newState) {
        if (this.selectedQueues.size === 0) {
            return { success: false, message: 'No queues selected' };
        }

        if (!['RUNNING', 'STOPPED'].includes(newState)) {
            return { success: false, message: 'Invalid state value' };
        }

        const results = {
            success: [],
            failed: [],
            total: this.selectedQueues.size
        };

        for (const queuePath of this.selectedQueues) {
            try {
                // Stage the state change
                this.schedulerConfigModel.stageUpdateQueue(queuePath, { state: newState });
                results.success.push(queuePath);
            } catch (error) {
                results.failed.push({ queuePath, error: error.message });
            }
        }

        const message = `Bulk state change: ${results.success.length} successful, ${results.failed.length} failed`;
        if (results.failed.length === 0) {
            this.notificationView.showSuccess(message);
        } else {
            this.notificationView.showWarning(message);
        }

        this._emit('operationCompleted', { operation: 'changeState', results });
        return { success: results.failed.length === 0, results };
    }

    /**
     * Performs bulk capacity adjustment.
     * @param {string} operation - Operation type ('multiply', 'add', 'set')
     * @param {number} value - Value for the operation
     * @returns {Promise<Object>} Operation result
     */
    async bulkAdjustCapacity(operation, value) {
        if (this.selectedQueues.size === 0) {
            return { success: false, message: 'No queues selected' };
        }

        if (!['multiply', 'add', 'set'].includes(operation)) {
            return { success: false, message: 'Invalid operation type' };
        }

        const results = {
            success: [],
            failed: [],
            total: this.selectedQueues.size
        };

        for (const queuePath of this.selectedQueues) {
            try {
                const currentCapacity = this._getCurrentCapacity(queuePath);
                if (currentCapacity === null) {
                    results.failed.push({ queuePath, error: 'Could not determine current capacity' });
                    continue;
                }

                let newCapacity;
                switch (operation) {
                    case 'multiply':
                        newCapacity = currentCapacity * value;
                        break;
                    case 'add':
                        newCapacity = currentCapacity + value;
                        break;
                    case 'set':
                        newCapacity = value;
                        break;
                }

                // Validate new capacity
                if (newCapacity < 0 || newCapacity > 100) {
                    results.failed.push({ queuePath, error: 'New capacity out of valid range (0-100)' });
                    continue;
                }

                // Stage the capacity change
                this.schedulerConfigModel.stageUpdateQueue(queuePath, { capacity: newCapacity.toFixed(1) });
                results.success.push(queuePath);
            } catch (error) {
                results.failed.push({ queuePath, error: error.message });
            }
        }

        const message = `Bulk capacity adjustment: ${results.success.length} successful, ${results.failed.length} failed`;
        if (results.failed.length === 0) {
            this.notificationView.showSuccess(message);
        } else {
            this.notificationView.showWarning(message);
        }

        this._emit('operationCompleted', { operation: 'adjustCapacity', results });
        return { success: results.failed.length === 0, results };
    }

    /**
     * Performs bulk queue deletion.
     * @param {boolean} includeChildren - Whether to delete child queues
     * @returns {Promise<Object>} Operation result
     */
    async bulkDeleteQueues(includeChildren = false) {
        if (this.selectedQueues.size === 0) {
            return { success: false, message: 'No queues selected' };
        }

        // Sort queues by depth (deepest first) to avoid parent-child conflicts
        const sortedQueues = Array.from(this.selectedQueues).sort((a, b) => {
            const depthA = a.split('.').length;
            const depthB = b.split('.').length;
            return depthB - depthA; // Deepest first
        });

        const results = {
            success: [],
            failed: [],
            total: sortedQueues.length
        };

        for (const queuePath of sortedQueues) {
            try {
                // Check if queue can be deleted
                if (queuePath === 'root') {
                    results.failed.push({ queuePath, error: 'Cannot delete root queue' });
                    continue;
                }

                // Check for child queues if not including children
                if (!includeChildren && this._hasChildQueues(queuePath)) {
                    results.failed.push({ queuePath, error: 'Queue has child queues. Use "Include Children" option.' });
                    continue;
                }

                // Stage the deletion
                this.schedulerConfigModel.stageRemoveQueue(queuePath);
                results.success.push(queuePath);
            } catch (error) {
                results.failed.push({ queuePath, error: error.message });
            }
        }

        const message = `Bulk deletion: ${results.success.length} successful, ${results.failed.length} failed`;
        if (results.failed.length === 0) {
            this.notificationView.showSuccess(message);
        } else {
            this.notificationView.showWarning(message);
        }

        this._emit('operationCompleted', { operation: 'deleteQueues', results });
        return { success: results.failed.length === 0, results };
    }


    /**
     * Gets current capacity for a queue.
     * @param {string} queuePath - Queue path
     * @returns {number|null} Current capacity percentage or null if not found
     */
    _getCurrentCapacity(queuePath) {
        try {
            const allPaths = this.schedulerConfigModel.getAllQueuePaths();
            if (!allPaths.includes(queuePath)) return null;

            // Get current properties from the trie
            const nodeProperties = this.schedulerConfigModel.getQueueNodeProperties(queuePath);
            if (!nodeProperties) return null;
            
            const capacityKey = `yarn.scheduler.capacity.${queuePath}.capacity`;
            const capacityValue = nodeProperties.get(capacityKey);
            
            if (!capacityValue) return null;

            // Parse capacity value - just extract numeric part for percentage
            const numericMatch = capacityValue.match(/^(\d+(?:\.\d+)?)/);
            return numericMatch ? parseFloat(numericMatch[1]) : null;
        } catch (error) {
            console.error(`Error getting capacity for ${queuePath}:`, error);
            return null;
        }
    }

    /**
     * Checks if a queue has child queues.
     * @param {string} queuePath - Queue path
     * @returns {boolean} True if has children
     */
    _hasChildQueues(queuePath) {
        try {
            const allPaths = this.schedulerConfigModel.getAllQueuePaths();
            return allPaths.some(path => path.startsWith(`${queuePath}.`) && path !== queuePath);
        } catch (error) {
            console.error(`Error checking children for ${queuePath}:`, error);
            return false;
        }
    }

}
/**
 * @file Manages efficient DOM updates by calculating minimal changesets between data states.
 * Reduces unnecessary re-renders and improves UI responsiveness.
 */

class DiffManager {
    constructor() {
        this.previousState = null;
        this.changeListeners = new Map();
    }

    /**
     * Calculates the minimal set of changes between two queue hierarchy states.
     * @param {Object} oldData - Previous hierarchy state
     * @param {Object} newData - New hierarchy state
     * @returns {Object} Changeset with added, modified, and removed queues
     */
    calculateMinimalUpdates(oldData, newData) {
        const changes = {
            added: [],
            modified: [],
            removed: [],
            reordered: []
        };

        if (!oldData && !newData) return changes;
        
        // Handle initial load
        if (!oldData && newData) {
            changes.added = this._extractAllPaths(newData);
            return changes;
        }
        
        // Handle complete removal
        if (oldData && !newData) {
            changes.removed = this._extractAllPaths(oldData);
            return changes;
        }

        // Build path maps for efficient comparison
        const oldPaths = this._buildPathMap(oldData);
        const newPaths = this._buildPathMap(newData);

        // Find removed queues
        for (const [path, oldNode] of oldPaths) {
            if (!newPaths.has(path)) {
                changes.removed.push({
                    path,
                    node: oldNode,
                    parentPath: oldNode.parentPath
                });
            }
        }

        // Find added and modified queues
        for (const [path, newNode] of newPaths) {
            const oldNode = oldPaths.get(path);
            
            if (!oldNode) {
                changes.added.push({
                    path,
                    node: newNode,
                    parentPath: newNode.parentPath
                });
            } else if (this._hasNodeChanged(oldNode, newNode)) {
                changes.modified.push({
                    path,
                    oldNode,
                    newNode,
                    changedProperties: this._getChangedProperties(oldNode, newNode)
                });
            }
        }

        // Detect reordering within parent containers
        changes.reordered = this._detectReorderedQueues(oldData, newData);

        return changes;
    }

    /**
     * Applies a changeset to DOM elements efficiently.
     * @param {Object} changes - Changeset from calculateMinimalUpdates
     * @param {Function} renderCallback - Function to render individual queue nodes
     */
    applyChangesToDOM(changes, renderCallback) {
        const updateBatch = [];

        // Process removals first
        for (const removal of changes.removed) {
            updateBatch.push({
                type: 'remove',
                path: removal.path,
                action: () => {
                    const element = document.querySelector(`[data-queue-path="${removal.path}"]`);
                    if (element) {
                        element.classList.add('queue-removing');
                        setTimeout(() => element.remove(), 300); // Allow CSS transition
                    }
                }
            });
        }

        // Process modifications
        for (const modification of changes.modified) {
            updateBatch.push({
                type: 'modify',
                path: modification.path,
                action: () => {
                    const element = document.querySelector(`[data-queue-path="${modification.path}"]`);
                    if (element) {
                        // Only update changed properties
                        this._updateElementProperties(element, modification.changedProperties);
                    }
                }
            });
        }

        // Process additions
        for (const addition of changes.added) {
            updateBatch.push({
                type: 'add',
                path: addition.path,
                action: () => {
                    renderCallback(addition.node, addition.parentPath);
                }
            });
        }

        // Execute updates in requestAnimationFrame for better performance
        this._executeBatchUpdates(updateBatch);
    }

    /**
     * Registers a listener for specific queue path changes.
     * @param {string} queuePath - Queue path to monitor
     * @param {Function} callback - Callback when queue changes
     * @returns {Function} Unsubscribe function
     */
    watchQueue(queuePath, callback) {
        if (!this.changeListeners.has(queuePath)) {
            this.changeListeners.set(queuePath, new Set());
        }
        
        this.changeListeners.get(queuePath).add(callback);
        
        return () => {
            const listeners = this.changeListeners.get(queuePath);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    this.changeListeners.delete(queuePath);
                }
            }
        };
    }

    _buildPathMap(node, map = new Map(), parentPath = null) {
        if (!node) return map;
        
        const nodeCopy = { ...node, parentPath };
        map.set(node.path, nodeCopy);
        
        if (node.children) {
            for (const childKey of Object.keys(node.children)) {
                this._buildPathMap(node.children[childKey], map, node.path);
            }
        }
        
        return map;
    }

    _extractAllPaths(node, paths = []) {
        if (!node) return paths;
        
        paths.push({
            path: node.path,
            node: node,
            parentPath: node.parentPath
        });
        
        if (node.children) {
            for (const child of Object.values(node.children)) {
                this._extractAllPaths(child, paths);
            }
        }
        
        return paths;
    }

    _hasNodeChanged(oldNode, newNode) {
        // Properties that trigger visual updates
        const watchedProperties = [
            'capacity', 'maxCapacity', 'capacityDisplay', 'maxCapacityDisplay',
            'state', 'liveState', 'numApplications', 'absoluteUsedCapacityDisplay',
            'statusClass', 'hasPendingChanges', 'isNew', 'uiLabels',
            'effectiveCapacityMode', 'auto-create-child-queue.enabled'
        ];
        
        for (const prop of watchedProperties) {
            if (oldNode[prop] !== newNode[prop]) {
                return true;
            }
        }
        
        // Check if UI labels changed (array comparison)
        if (JSON.stringify(oldNode.uiLabels) !== JSON.stringify(newNode.uiLabels)) {
            return true;
        }
        
        return false;
    }

    _getChangedProperties(oldNode, newNode) {
        const changed = {};
        const allProps = new Set([
            ...Object.keys(oldNode),
            ...Object.keys(newNode)
        ]);
        
        for (const prop of allProps) {
            if (oldNode[prop] !== newNode[prop]) {
                changed[prop] = {
                    old: oldNode[prop],
                    new: newNode[prop]
                };
            }
        }
        
        return changed;
    }

    _detectReorderedQueues(oldRoot, newRoot) {
        const reordered = [];
        
        const checkOrder = (oldParent, newParent) => {
            if (!oldParent?.children || !newParent?.children) return;
            
            const oldOrder = Object.keys(oldParent.children);
            const newOrder = Object.keys(newParent.children);
            
            // Check if order changed
            if (oldOrder.length === newOrder.length && 
                oldOrder.some((key, index) => key !== newOrder[index])) {
                reordered.push({
                    parentPath: oldParent.path,
                    oldOrder,
                    newOrder
                });
            }
            
            // Recursively check children
            for (const key of newOrder) {
                if (oldParent.children[key] && newParent.children[key]) {
                    checkOrder(oldParent.children[key], newParent.children[key]);
                }
            }
        };
        
        checkOrder(oldRoot, newRoot);
        return reordered;
    }

    _updateElementProperties(element, changedProperties) {
        // Update capacity display
        if (changedProperties.capacityDisplay) {
            const capacityEl = element.querySelector('.queue-capacity-value');
            if (capacityEl) {
                capacityEl.textContent = changedProperties.capacityDisplay.new;
            }
        }
        
        // Update max capacity display
        if (changedProperties.maxCapacityDisplay) {
            const maxCapacityEl = element.querySelector('.queue-max-capacity-value');
            if (maxCapacityEl) {
                maxCapacityEl.textContent = changedProperties.maxCapacityDisplay.new;
            }
        }
        
        // Update application count
        if (changedProperties.numApplications) {
            const appCountEl = element.querySelector('.queue-app-count');
            if (appCountEl) {
                appCountEl.textContent = changedProperties.numApplications.new;
            }
        }
        
        // Update status classes
        if (changedProperties.statusClass) {
            element.classList.remove(changedProperties.statusClass.old);
            element.classList.add(changedProperties.statusClass.new);
        }
        
        // Notify change listeners
        const listeners = this.changeListeners.get(element.dataset.queuePath);
        if (listeners) {
            for (const callback of listeners) {
                callback(changedProperties);
            }
        }
    }

    _executeBatchUpdates(updateBatch) {
        // Group updates by type for optimal execution order
        const grouped = {
            remove: [],
            modify: [],
            add: []
        };
        
        for (const update of updateBatch) {
            grouped[update.type].push(update);
        }
        
        // Execute in optimal order: remove -> modify -> add
        requestAnimationFrame(() => {
            // Removals
            for (const update of grouped.remove) {
                update.action();
            }
            
            // Modifications (in next frame for better visual flow)
            requestAnimationFrame(() => {
                for (const update of grouped.modify) {
                    update.action();
                }
                
                // Additions (in final frame)
                requestAnimationFrame(() => {
                    for (const update of grouped.add) {
                        update.action();
                    }
                });
            });
        });
    }

    /**
     * Creates a snapshot of current state for future comparison.
     * @param {Object} data - Current hierarchy data
     */
    snapshot(data) {
        this.previousState = this._deepClone(data);
    }

    _deepClone(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        
        const clone = Array.isArray(obj) ? [] : {};
        for (const key in obj) {
            clone[key] = this._deepClone(obj[key]);
        }
        
        return clone;
    }
}
/**
 * @file QueueConfigurationManager - Unified queue configuration and change management
 * Replaces both SchedulerConfigTrie and ChangeLog with a single, coherent data structure
 */

/**
 * Represents a queue node that includes both current state and pending changes
 */
class QueueNode {
    constructor(segment = '') {
        this.segment = segment; // Queue name segment (e.g., "default")
        this.fullPath = ''; // Full path (e.g., "root.default")
        this.isQueue = false; // Whether this represents an actual queue

        // Current state (from loaded configuration)
        this.baseProperties = new Map(); // Original properties from server

        // Pending changes
        this.pendingOperation = null; // 'add' | 'update' | 'delete' | null
        this.pendingProperties = new Map(); // Staged property changes
        this.oldProperties = new Map(); // Original values for rollback
        this.changeId = null; // Unique ID for this change
        this.timestamp = null; // When change was staged

        // Tree structure
        this.children = new Map(); // Map<string, QueueNode>
        this.parent = null; // Reference to parent node
    }

    /**
     * Gets the effective properties (base + pending changes)
     */
    getEffectiveProperties() {
        if (this.pendingOperation === 'add') {
            return new Map(this.pendingProperties);
        } else if (this.pendingOperation === 'delete') {
            return new Map(); // Deleted queues have no effective properties
        } else {
            const effective = new Map(this.baseProperties);
            for (const [key, value] of this.pendingProperties) {
                effective.set(key, value);
            }
            return effective;
        }
    }

    /**
     * Returns whether this node has any pending changes
     */
    hasPendingChanges() {
        return this.pendingOperation !== null;
    }

    /**
     * Returns whether this node is effectively deleted
     */
    isDeleted() {
        return this.pendingOperation === 'delete';
    }

    /**
     * Returns whether this node is a new addition
     */
    isNew() {
        return this.pendingOperation === 'add';
    }

    /**
     * Clears all pending changes from this node
     */
    clearPendingChanges() {
        this.pendingOperation = null;
        this.pendingProperties.clear();
        this.oldProperties.clear();
        this.changeId = null;
        this.timestamp = null;
    }
}

/**
 * Unified queue configuration manager that handles both current state and pending changes
 */
class QueueConfigurationManager {
    constructor() {
        this.rootNode = null;
        this.globalProperties = new Map(); // Current global properties
        this.pendingGlobalChanges = new Map(); // Pending global changes
        this.oldGlobalProperties = new Map(); // Original global values for rollback
        this.globalChangeId = null;

        this._changeIdCounter = 0;
        this._YARN_SCHEDULER_CAPACITY_PREFIX = 'yarn.scheduler.capacity.';
        this._QUEUES_SUFFIX = '.queues';
    }

    /**
     * Initializes from scheduler configuration properties
     */
    initializeFromConfig(schedulerConfigProperties) {
        this.rootNode = new QueueNode('root');
        this.rootNode.isQueue = true;
        this.rootNode.fullPath = 'root';
        this.globalProperties.clear();
        this.clearAllPendingChanges();

        if (!schedulerConfigProperties || !Array.isArray(schedulerConfigProperties)) {
            console.warn('QueueConfigurationManager: No properties provided for initialization.');
            return;
        }

        const queueDefinitions = new Map();
        const otherProperties = [];

        for (const prop of schedulerConfigProperties) {
            if (!prop.name || typeof prop.name !== 'string') continue;

            if (prop.name.startsWith(this._YARN_SCHEDULER_CAPACITY_PREFIX)) {
                if (prop.name.endsWith(this._QUEUES_SUFFIX)) {
                    const queuePath = prop.name.slice(
                        this._YARN_SCHEDULER_CAPACITY_PREFIX.length,
                        -this._QUEUES_SUFFIX.length
                    );
                    const childNames = (prop.value || '')
                        .split(',')
                        .map((name) => name.trim())
                        .filter((name) => name.length > 0);
                    queueDefinitions.set(queuePath, new Set(childNames));
                } else {
                    if (this._isGlobalCapacityProperty(prop.name)) {
                        this.globalProperties.set(prop.name, prop.value || '');
                    } else {
                        otherProperties.push(prop);
                    }
                }
            } else {
                this.globalProperties.set(prop.name, prop.value || '');
            }
        }

        this._buildQueueHierarchy(queueDefinitions);
        this._assignPropertiesToQueues(otherProperties);
    }

    /**
     * Builds the queue hierarchy from queue definitions
     */
    _buildQueueHierarchy(queueDefinitions) {
        const processedPaths = new Set(['root']);
        const pendingPaths = new Map(queueDefinitions);

        while (pendingPaths.size > 0) {
            let progressMade = false;

            for (const [parentPath, childNames] of pendingPaths) {
                if (processedPaths.has(parentPath)) {
                    const parentNode = this._getOrCreateQueueNode(parentPath);

                    for (const childName of childNames) {
                        const childPath = parentPath === 'root' ? `root.${childName}` : `${parentPath}.${childName}`;
                        const childNode = this._getOrCreateQueueNode(childPath);
                        childNode.segment = childName;
                        childNode.fullPath = childPath;
                        childNode.isQueue = true;
                        childNode.parent = parentNode;
                        parentNode.children.set(childName, childNode);
                        processedPaths.add(childPath);
                    }

                    pendingPaths.delete(parentPath);
                    progressMade = true;
                }
            }

            if (!progressMade && pendingPaths.size > 0) {
                console.warn('QueueConfigurationManager: Circular dependency or missing parent queues detected:', [
                    ...pendingPaths.keys(),
                ]);
                break;
            }
        }
    }

    /**
     * Assigns properties to the appropriate queue nodes
     */
    _assignPropertiesToQueues(properties) {
        for (const prop of properties) {
            const queuePath = this._extractQueuePathFromProperty(prop.name);
            if (queuePath) {
                const node = this._getOrCreateQueueNode(queuePath);
                node.baseProperties.set(prop.name, prop.value || '');
            }
        }
    }

    /**
     * Extracts queue path from a property name
     */
    _extractQueuePathFromProperty(propertyName) {
        if (!propertyName.startsWith(this._YARN_SCHEDULER_CAPACITY_PREFIX)) {
            return null;
        }

        const remainder = propertyName.slice(this._YARN_SCHEDULER_CAPACITY_PREFIX.length);
        const segments = remainder.split('.');

        for (let i = segments.length - 1; i >= 1; i--) {
            const candidatePath = segments.slice(0, i).join('.');
            if (this._isValidQueuePath(candidatePath)) {
                return candidatePath;
            }
        }
        return null;
    }

    /**
     * Checks if a path represents a valid queue
     */
    _isValidQueuePath(path) {
        const node = this.getQueueNode(path);
        return node && node.isQueue;
    }

    /**
     * Gets or creates a queue node for the given path
     */
    _getOrCreateQueueNode(path) {
        if (path === 'root') {
            return this.rootNode;
        }

        const segments = path.split('.');
        let currentNode = this.rootNode;

        for (let i = 1; i < segments.length; i++) {
            const segment = segments[i];
            if (!currentNode.children.has(segment)) {
                const newNode = new QueueNode(segment);
                newNode.fullPath = segments.slice(0, i + 1).join('.');
                newNode.parent = currentNode;
                currentNode.children.set(segment, newNode);
            }
            currentNode = currentNode.children.get(segment);
        }

        return currentNode;
    }

    /**
     * Determines if a property that starts with yarn.scheduler.capacity. is actually a global property
     */
    _isGlobalCapacityProperty(propertyName) {
        return PropertyKeyMapper.isGlobalProperty(propertyName);
    }

    /**
     * Gets a queue node by path
     */
    getQueueNode(path) {
        if (!path || path === 'root') {
            return this.rootNode;
        }

        const segments = path.split('.');
        let currentNode = this.rootNode;

        for (let i = 1; i < segments.length; i++) {
            const segment = segments[i];
            if (!currentNode.children.has(segment)) {
                return null;
            }
            currentNode = currentNode.children.get(segment);
        }

        return currentNode;
    }

    /**
     * Gets all queue paths
     */
    getAllQueuePaths() {
        const paths = [];

        function collectPaths(node) {
            if (node.isQueue && !node.isDeleted()) {
                paths.push(node.fullPath);
            }
            for (const child of node.children.values()) {
                collectPaths(child);
            }
        }

        if (this.rootNode) {
            collectPaths(this.rootNode);
        }

        return paths.sort();
    }

    /**
     * Stages a queue addition
     */
    stageAddQueue(queuePath, properties) {
        const changeId = this._generateChangeId();
        const node = this._getOrCreateQueueNode(queuePath);
        node.pendingOperation = 'add';
        node.pendingProperties = new Map(properties);
        node.oldProperties.clear();
        node.changeId = changeId;
        node.timestamp = Date.now();
        node.isQueue = true;
        return changeId;
    }

    /**
     * Stages a queue update
     */
    stageUpdateQueue(queuePath, properties) {
        const node = this.getQueueNode(queuePath);
        if (!node) {
            throw new Error(`Cannot update non-existent queue: ${queuePath}`);
        }
        const changeId = this._generateChangeId();

        if (node.pendingOperation === 'add') {
            // If it's already a new addition, just update the properties
            for (const [key, value] of properties) {
                node.pendingProperties.set(key, value);
            }
        } else {
            node.pendingOperation = 'update';
            // Store original values for rollback
            for (const [key] of properties) {
                if (!node.oldProperties.has(key)) {
                    node.oldProperties.set(key, node.baseProperties.get(key) || '');
                }
            }
            // Apply new values
            for (const [key, value] of properties) {
                node.pendingProperties.set(key, value);
            }
            node.changeId = changeId;
            node.timestamp = Date.now();
        }
        return changeId;
    }

    /**
     * Stages a queue deletion
     */
    stageDeleteQueue(queuePath) {
        const node = this.getQueueNode(queuePath);
        if (!node) {
            throw new Error(`Cannot delete non-existent queue: ${queuePath}`);
        }
        const changeId = this._generateChangeId();
        node.pendingOperation = 'delete';
        node.pendingProperties.clear();
        node.oldProperties.clear();
        node.changeId = changeId;
        node.timestamp = Date.now();
        return changeId;
    }

    /**
     * Stages global configuration updates
     */
    stageGlobalUpdate(properties) {
        this.globalChangeId = this._generateChangeId();

        for (const [key, value] of Object.entries(properties)) {
            if (!this.oldGlobalProperties.has(key)) {
                // Store the actual original value - if it was undefined, keep it as undefined
                this.oldGlobalProperties.set(key, this.globalProperties.get(key));
            }
            this.pendingGlobalChanges.set(key, value);
        }

        return this.globalChangeId;
    }

    /**
     * Gets effective global properties (base + pending)
     */
    getEffectiveGlobalProperties() {
        const effective = new Map(this.globalProperties);
        for (const [key, value] of this.pendingGlobalChanges) {
            effective.set(key, value);
        }
        return effective;
    }

    /**
     * Clears all pending changes
     */
    clearAllPendingChanges() {
        this.pendingGlobalChanges.clear();
        this.oldGlobalProperties.clear();
        this.globalChangeId = null;

        if (this.rootNode) {
            this._clearNodePendingChanges(this.rootNode);
        }
    }

    /**
     * Recursively clears pending changes from nodes
     */
    _clearNodePendingChanges(node) {
        node.clearPendingChanges();
        for (const child of node.children.values()) {
            this._clearNodePendingChanges(child);
        }
    }

    /**
     * Checks if there are any pending changes
     */
    hasPendingChanges() {
        if (this.pendingGlobalChanges.size > 0) {
            return true;
        }

        if (this.rootNode) {
            return this._nodeHasPendingChanges(this.rootNode);
        }

        return false;
    }

    /**
     * Recursively checks if any node has pending changes
     */
    _nodeHasPendingChanges(node) {
        if (node.hasPendingChanges()) {
            return true;
        }
        for (const child of node.children.values()) {
            if (this._nodeHasPendingChanges(child)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Gets a summary of pending changes
     */
    getChangesSummary() {
        const summary = { added: 0, modified: 0, deleted: 0, global: 0 };

        if (this.pendingGlobalChanges.size > 0) {
            summary.global = 1;
        }

        if (this.rootNode) {
            this._collectNodeChanges(this.rootNode, summary);
        }

        return summary;
    }

    /**
     * Recursively collects change counts from nodes
     */
    _collectNodeChanges(node, summary) {
        switch (node.pendingOperation) {
        case 'add': {
            summary.added++;
        
        break;
        }
        case 'update': {
            summary.modified++;
        
        break;
        }
        case 'delete': {
            summary.deleted++;
        
        break;
        }
        // No default
        }

        for (const child of node.children.values()) {
            this._collectNodeChanges(child, summary);
        }
    }

    /**
     * Generates API payload for applying changes
     */
    getApiPayload() {
        const payload = {
            addQueues: [],
            updateQueues: [],
            removeQueues: [],
            globalUpdates: {},
        };

        // Collect queue changes
        if (this.rootNode) {
            this._collectQueueChanges(this.rootNode, payload);
        }

        // Add global changes
        for (const [key, value] of this.pendingGlobalChanges) {
            payload.globalUpdates[key] = value;
        }

        return payload;
    }

    /**
     * Recursively collects queue changes for API payload
     */
    _collectQueueChanges(node, payload) {
        switch (node.pendingOperation) {
        case 'add': {
            const params = {};
            for (const [fullKey, value] of node.pendingProperties) {
                const simpleKey = PropertyKeyMapper.toSimpleKey(fullKey);
                if (simpleKey !== '_ui_capacityMode') {
                    params[simpleKey] = this._cleanValueForApi(value, simpleKey);
                }
            }
            payload.addQueues.push({
                queueName: node.fullPath,
                params: params,
            });
        
        break;
        }
        case 'update': {
            const params = {};
            for (const [fullKey, value] of node.pendingProperties) {
                const simpleKey = PropertyKeyMapper.toSimpleKey(fullKey);
                if (simpleKey !== '_ui_capacityMode') {
                    params[simpleKey] = this._cleanValueForApi(value, simpleKey);
                }
            }
            payload.updateQueues.push({
                queueName: node.fullPath,
                params: params,
            });
        
        break;
        }
        case 'delete': {
            payload.removeQueues.push(node.fullPath);
        
        break;
        }
        // No default
        }

        for (const child of node.children.values()) {
            this._collectQueueChanges(child, payload);
        }
    }

    /**
     * Cleans values for API submission
     * @param {string} value - The value to clean
     * @param {string} simpleKey - The simple key to determine cleaning rules
     * @returns {string} Cleaned value
     */
    _cleanValueForApi(value, simpleKey) {
        if (typeof value !== 'string') {
            return String(value);
        }

        if ((
            simpleKey === 'capacity' ||
            simpleKey === 'maximum-capacity' ||
            simpleKey.endsWith('.capacity') ||
            simpleKey.endsWith('.maximum-capacity')
        ) && value.endsWith('%') && !value.startsWith('[')) {
                return value.slice(0, -1);
            }

        return value;
    }

    /**
     * Gets queue additions (compatibility with ChangeLog interface)
     */
    getQueueAdditions() {
        const additions = [];
        if (this.rootNode) {
            this._collectAdditions(this.rootNode, additions);
        }
        return additions;
    }

    /**
     * Gets queue updates (compatibility with ChangeLog interface)
     */
    getQueueUpdates() {
        const updates = [];
        if (this.rootNode) {
            this._collectUpdates(this.rootNode, updates);
        }
        return updates;
    }

    /**
     * Gets queue deletions (compatibility with ChangeLog interface)
     */
    getQueueDeletions() {
        const deletions = [];
        if (this.rootNode) {
            this._collectDeletions(this.rootNode, deletions);
        }
        return deletions;
    }

    /**
     * Gets change summary (compatibility with ChangeLog interface)
     */
    getSummary() {
        return this.getChangesSummary();
    }

    /**
     * Gets all changes (compatibility with ChangeLog interface)
     * Required for ChangePreview.fromChangeLog()
     */
    getChanges() {
        const allChanges = [];

        // Collect additions
        const additions = this.getQueueAdditions();
        for (const addition of additions) {
            for (const [fullKey, value] of addition.properties || new Map()) {
                allChanges.push({
                    id: addition.id,
                    operation: 'ADD',
                    queuePath: addition.path,
                    propertyKey: fullKey,
                    oldValue: null,
                    newValue: value,
                });
            }
        }

        // Collect updates
        const updates = this.getQueueUpdates();
        for (const update of updates) {
            for (const [fullKey, value] of update.properties || new Map()) {
                const oldValue = update.oldProperties ? update.oldProperties.get(fullKey) : null;
                allChanges.push({
                    id: update.id,
                    operation: 'UPDATE',
                    queuePath: update.path,
                    propertyKey: fullKey,
                    oldValue: oldValue,
                    newValue: value,
                });
            }
        }

        // Collect deletions
        const deletions = this.getQueueDeletions();
        for (const deletion of deletions) {
            allChanges.push({
                id: deletion.id,
                operation: 'DELETE',
                queuePath: deletion.path,
                propertyKey: null,
                oldValue: null,
                newValue: null,
            });
        }

        // Collect global changes
        if (this.pendingGlobalChanges.size > 0) {
            for (const [fullKey, newValue] of this.pendingGlobalChanges) {
                const oldValue = this.oldGlobalProperties.get(fullKey);
                // If oldValue is undefined, this is a new property (ADD operation)
                const operation = oldValue === undefined ? 'ADD' : 'UPDATE';
                allChanges.push({
                    id: this.globalChangeId || 'global-change',
                    operation: operation,
                    queuePath: null, // Global changes don't have a queue path
                    propertyKey: fullKey,
                    oldValue: oldValue === undefined ? null : oldValue,
                    newValue: newValue,
                });
            }
        }

        return allChanges;
    }

    /**
     * Removes a change by ID (compatibility with ChangeLog interface)
     */
    removeChange(changeId) {
        if (this.rootNode) {
            this._removeChangeFromNode(this.rootNode, changeId);
        }
        if (this.globalChangeId === changeId) {
            this.pendingGlobalChanges.clear();
            this.oldGlobalProperties.clear();
            this.globalChangeId = null;
        }
    }

    /**
     * Recursively removes change with given ID
     */
    _removeChangeFromNode(node, changeId) {
        if (node.changeId === changeId) {
            node.clearPendingChanges();
        }
        for (const child of node.children.values()) {
            this._removeChangeFromNode(child, changeId);
        }
    }

    /**
     * Recursively collects additions
     */
    _collectAdditions(node, additions) {
        if (node.pendingOperation === 'add') {
            additions.push({
                id: node.changeId,
                type: 'add',
                path: node.fullPath,
                properties: new Map(node.pendingProperties),
            });
        }
        for (const child of node.children.values()) {
            this._collectAdditions(child, additions);
        }
    }

    /**
     * Recursively collects updates
     */
    _collectUpdates(node, updates) {
        if (node.pendingOperation === 'update') {
            updates.push({
                id: node.changeId,
                type: 'update',
                path: node.fullPath,
                properties: new Map(node.pendingProperties),
                oldProperties: new Map(node.oldProperties),
            });
        }
        for (const child of node.children.values()) {
            this._collectUpdates(child, updates);
        }
    }

    /**
     * Recursively collects deletions
     */
    _collectDeletions(node, deletions) {
        if (node.pendingOperation === 'delete') {
            deletions.push({
                id: node.changeId,
                type: 'delete',
                path: node.fullPath,
            });
        }
        for (const child of node.children.values()) {
            this._collectDeletions(child, deletions);
        }
    }

    /**
     * Generates a unique change ID
     */
    _generateChangeId() {
        return `change_${++this._changeIdCounter}_${Date.now()}`;
    }
}

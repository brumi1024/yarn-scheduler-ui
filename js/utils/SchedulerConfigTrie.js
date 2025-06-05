/**
 * @file Defines the Trie data structure for storing and accessing YARN scheduler configurations.
 */

/**
 * Represents a node in the Scheduler Configuration Trie.
 */
class SchedulerTrieNode {
    constructor(segment = '') {
        this.segment = segment; // The name of this queue segment (e.g., "default" in "root.default")
        this.fullPath = ''; // The full path to this node (e.g., "root.default")
        this.properties = new Map(); // Stores all YARN properties for this queue path
        this.children = new Map(); // Map<string, SchedulerTrieNode> for child queues
        this.isQueue = false; // True if this node represents an actual, defined queue
    }
}

/**
 * Manages the Trie structure for YARN scheduler configurations.
 * It parses the flat list of properties from the scheduler-conf API
 * into a hierarchical Trie and separates global properties.
 */
class SchedulerConfigTrie {
    constructor() {
        this.rootNode = null;
        this.globalProperties = new Map(); // Stores full_key -> value for global properties

        this._YARN_SCHEDULER_CAPACITY_PREFIX = 'yarn.scheduler.capacity.';
        this._QUEUES_SUFFIX = '.queues';
    }

    /**
     * Initializes the Trie and global properties from a flat list of scheduler properties.
     * @param {Array<Object>} schedulerConfigProperties - Array of { name: string, value: string }.
     */
    initializeFromConfig(schedulerConfigProperties) {
        this.rootNode = new SchedulerTrieNode('root');
        this.rootNode.isQueue = true; // Root is always a queue
        this.rootNode.fullPath = 'root';
        this.globalProperties.clear();

        const queueDefinitions = new Map(); // Map<String(parentPath), Set<String(childName)>>
        const otherProperties = []; // To store properties not defining queue structure

        if (!schedulerConfigProperties || !Array.isArray(schedulerConfigProperties)) {
            console.warn('SchedulerConfigTrie: No properties provided for initialization.');
            return;
        }

        // Pass 1: Identify queue hierarchy definitions (*.queues) and global properties.
        for (const property of schedulerConfigProperties) {
            if (!property || typeof property.name !== 'string') continue;
            const configKey = property.name;
            const value = property.value;

            if (!configKey.startsWith(this._YARN_SCHEDULER_CAPACITY_PREFIX)) {
                this.globalProperties.set(configKey, value); // Store it as global for now if outside prefix
                continue;
            }

            const prefixlessName = configKey.slice(this._YARN_SCHEDULER_CAPACITY_PREFIX.length);

            if (!prefixlessName.startsWith('root')) {
                // Global CS properties
                this.globalProperties.set(configKey, value);
            } else if (prefixlessName.endsWith(this._QUEUES_SUFFIX)) {
                const parentPath = prefixlessName.slice(0, Math.max(0, prefixlessName.length - this._QUEUES_SUFFIX.length));
                if (parentPath.length > 0) {
                    const children = new Set(
                        value
                            .split(',')
                            .map((q) => q.trim())
                            .filter(Boolean)
                    );
                    queueDefinitions.set(parentPath, children);
                } else {
                    console.warn(`SchedulerConfigTrie: Malformed 'queues' property key: ${configKey}`);
                }
            } else {
                // Queue-specific properties or complex global properties starting with "root" but not ".queues"
                otherProperties.push({ originalKey: configKey, prefixlessPropertyName: prefixlessName, value });
            }
        }

        // Pass 2: Build the Trie skeleton based strictly on '.queues' definitions.
        this._buildTrieSkeleton(this.rootNode, 'root', queueDefinitions);

        // Pass 3: Assign all other properties (queue-specific and complex global) to the Trie nodes.
        for (const property of otherProperties) {
            this._assignPropertyToNode(property.prefixlessPropertyName, property.originalKey, property.value);
        }
    }

    /**
     * Recursively builds the Trie skeleton based on 'queues' definitions.
     * @param {SchedulerTrieNode} parentNode - The current parent node in the Trie.
     * @param {string} parentPathKey - The full path key for the parentNode.
     * @param {Map<string, Set<string>>} queueDefinitions - Map of parent paths to sets of child queue names.
     * @private
     */
    _buildTrieSkeleton(parentNode, parentPathKey, queueDefinitions) {
        const childNames = queueDefinitions.get(parentPathKey);
        if (childNames) {
            for (const childName of childNames) {
                if (!childName) continue; // Skip empty child names
                const newNode = new SchedulerTrieNode(childName);
                newNode.fullPath = `${parentNode.fullPath}.${childName}`;
                newNode.isQueue = true; // These are explicitly defined as queues
                parentNode.children.set(childName, newNode); // Use original case for map key
                this._buildTrieSkeleton(newNode, newNode.fullPath, queueDefinitions);
            }
        }
    }

    /**
     * Assigns a property to the appropriate node in the Trie.
     * Properties like 'root.default.accessible-node-labels.labelA.capacity' belong to 'root.default'.
     * @param {string} prefixlessPropertyName - Property name without "yarn.scheduler.capacity."
     * @param {string} originalKey - The full, original YARN property name.
     * @param {string} value - The property value.
     * @private
     */
    _assignPropertyToNode(prefixlessPropertyName, originalKey, value) {
        const parts = prefixlessPropertyName.split('.'); // e.g., ["root", "q1", "sub_prop_key", "nested_val"]
        let currentNode = this.rootNode;
        let lastConfirmedQueueNode = this.rootNode; // 'root' is always a queue

        // Start loop from 1 as parts[0] is 'root', already assigned to currentNode
        for (let index = 1; index < parts.length; index++) {
            const segment = parts[index];
            const childNode = currentNode.children.get(segment);

            if (childNode && childNode.isQueue) {
                // If the segment corresponds to a defined child queue, traverse deeper
                currentNode = childNode;
                lastConfirmedQueueNode = currentNode;
            } else {
                // If segment is not a defined child queue (e.g., it's 'accessible-node-labels', or 'GPU'),
                // the property belongs to `lastConfirmedQueueNode`.
                // The remaining parts of `prefixlessPropertyName` form the specific sub-property key.
                break;
            }
        }
        lastConfirmedQueueNode.properties.set(originalKey, value);
    }

    /**
     * Retrieves a specific queue node from the Trie. Traversal is case-sensitive based on stored segments.
     * @param {string} queuePath - The full path of the queue (e.g., "root.default").
     * @returns {SchedulerTrieNode | null} The node if found and is marked as a queue, otherwise null.
     */
    getQueueNode(queuePath) {
        if (!this.rootNode || !queuePath) return null;
        const segments = queuePath.split('.');

        if (segments.length === 0 || segments[0] !== this.rootNode.segment) {
            // Path doesn't start with 'root' or root segment mismatch
            return null;
        }

        let currentNode = this.rootNode;
        if (segments.length === 1) {
            // Request for the root node itself
            return currentNode.isQueue ? currentNode : null;
        }

        for (let index = 1; index < segments.length; index++) {
            const segment = segments[index];
            if (!currentNode.children.has(segment)) {
                return null; // Path segment not found
            }
            currentNode = currentNode.children.get(segment);
        }
        // Ensure the final node found is indeed marked as a queue
        return currentNode && currentNode.isQueue ? currentNode : null;
    }

    /**
     * Returns all global properties (includes non-CS properties if they were in the input).
     * @returns {Map<string, string>}
     */
    getGlobalConfigs() {
        return new Map(this.globalProperties);
    }
}

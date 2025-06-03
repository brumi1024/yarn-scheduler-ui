/**
 * Represents a node in the Scheduler Configuration Trie.
 */
class SchedulerTrieNode {
    constructor(segment = '') {
        this.segment = segment;
        this.properties = new Map();
        this.children = new Map();
        this.isQueue = false;
        this.fullPath = '';
    }
}

/**
 * Manages the Trie structure for YARN scheduler configurations.
 */
class SchedulerConfigTrie {
    constructor() {
        this.rootNode = null;
        this.globalProperties = new Map();

        // Special properties that need to be handled differently
        this.specialPropertyKeywords = new Set([
            // Node Labels
            "accessible-node-labels",
            // AQCv1
            "leaf-queue-template",
            // AQCv2
            "template",
            "parent-template",
            "leaf-template",
        ]);
        this.prefix = "yarn.scheduler.capacity.";
    }

    /**
     * Initializes the Trie from the flat list of scheduler properties.
     * This is the main entry point to build the Trie.
     */
    initializeFromConfig(schedulerConfProperties) {
        this.rootNode = new SchedulerTrieNode('root');
        this.rootNode.isQueue = true;
        this.rootNode.fullPath = 'root';
        this.globalProperties = new Map();

        const queueDefinitions = new Map(); // Map<String(parentPath), Set<String(childName)>> (original case)
        const otherProperties = [];

        // Pass 1: Separate '<queue-path>.queues' properties to mimic how CS intializes the queues,
        // and collect all other properties.
        for (const prop of schedulerConfProperties) {
            const configKey = prop.name;
            const value = prop.value;

            if (!configKey.startsWith(this.prefix)) continue; // Skip non-matching properties
            const prefixlessPropertyName = configKey.substring(this.prefix.length);

            // Separate global properties (those not starting with 'root') from queue-specific properties.
            if (!prefixlessPropertyName.startsWith("root")) {
                this.globalProperties.set(configKey, value);
                continue;
            }

            if (prefixlessPropertyName.endsWith(".queues")) {
                const parentPath = prefixlessPropertyName.substring(0, prefixlessPropertyName.length - ".queues".length);
                // Ensure parentPath is valid (e.g. "root" or "root.subqueue")
                if (parentPath.length > 0 && (parentPath === "root" || parentPath.startsWith("root."))) {
                    const children = new Set(value.split(',').map(q => q.trim()));
                    queueDefinitions.set(parentPath, children);
                } else {
                    console.warn(`Malformed 'queues' property key: ${configKey}`);
                }
            }
            otherProperties.push({ originalKey: configKey, prefixlessPropertyName: prefixlessPropertyName, value: value });
        }

        // Pass 2: Build the Trie skeleton based ONLY on 'queues' definitions.
        this._buildTrieSkeleton(this.rootNode, "root", queueDefinitions);

        // Pass 3: Assign all other properties to the existing queue nodes in the Trie.
        for (const prop of otherProperties) {
            this._assignPropertyToTrie(prop.prefixlessPropertyName, prop.originalKey, prop.value);
        }
    }

    /**
     * Recursively constructs a trie skeleton for scheduling purposes by adding child nodes
     * to a given parent node based on the queues definitions provided.
     *
     * @param {SchedulerTrieNode} parentNode - The current node in the trie that will
     * receive child nodes.
     * @param {string} parentPathKey - The full path key associated with the current node,
     * used to retrieve the child node definitions.
     * @param {Map<string, string[]>} queuesDefinitions - A map representing the definitions
     * of child nodes for each path key in the structure.
     * @return {void} This method does not return a value. It modifies the provided parentNode
     * and its children in-place.
     */
    _buildTrieSkeleton(parentNode, parentPathKey, queuesDefinitions) {
        const childNames = queuesDefinitions.get(parentPathKey);
        if (childNames) {
            for (const childName of childNames) {
                const newNode = new SchedulerTrieNode(childName);
                newNode.fullPath = `${parentNode.fullPath}.${childName}`;
                newNode.isQueue = true;
                parentNode.children.set(childName, newNode);
                this._buildTrieSkeleton(newNode, newNode.fullPath, queuesDefinitions);
            }
        }
    }

    /**
     * Assigns a property to the trie structure based on the prefixless property name.
     * Traverses the trie to determine the appropriate node to assign the property.
     *
     * @param {string} prefixlessPropertyName - The property name without any prefix, used to navigate the trie structure.
     * @param {string} originalKey - The original key of the property being assigned.
     * @param {*} value - The value to be assigned to the property in the trie.
     * @return {void}
     */
    _assignPropertyToTrie(prefixlessPropertyName, originalKey, value) {
        const parts = prefixlessPropertyName.split('.'); // e.g., ["root", "test", "accessible-node-labels", "GPU", "capacity"]
        let currentNode = this.rootNode;
        let lastConfirmedQueueNode = this.rootNode;

        for (let i = 1; i < parts.length; i++) {
            const segment = parts[i];

            if (currentNode.children.has(segment)) {
                const childNode = currentNode.children.get(segment);
                if (childNode.isQueue) {
                    currentNode = childNode;
                    lastConfirmedQueueNode = currentNode;
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        lastConfirmedQueueNode.properties.set(originalKey, value);
    }

    /**
     * Retrieves a specific queue node (SchedulerTrieNode) from the Trie.
     * Path segments are treated case-insensitively for lookup.
     * @param {string} queuePath - The full path of the queue (e.g., "root.default").
     * @returns {SchedulerTrieNode | null} The node if found and is marked as a queue, otherwise null.
     */
    getQueueNode(queuePath) {
        if (!queuePath) return null;
        const segments = queuePath.split('.');

        if (segments.length === 0 || segments[0] !== 'root') {
            return null;
        }

        let currentNode = this.rootNode;
        if (segments.length === 1 && segments[0] === 'root') {
            return currentNode;
        }

        for (let i = 1; i < segments.length; i++) {
            const segment = segments[i];
            if (!currentNode.children.has(segment)) {
                return null;
            }
            currentNode = currentNode.children.get(segment);
        }

        return currentNode && currentNode.isQueue ? currentNode : null;
    }
}
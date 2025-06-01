/**
 * Represents a node in the Scheduler Configuration Trie.
 */
class SchedulerTrieNode {
    constructor(segment = '') {
        this.segment = segment; // The name of this part of the queue path (e.g., "default", "sales")
        this.properties = new Map(); // Stores actual config key-value pairs for this queue (e.g., {'capacity': '20%', 'state': 'RUNNING'})
        this.children = new Map();   // Maps the next queue path segment (string) to another SchedulerTrieNode
        this.isQueue = false;        // True if this node represents a fully defined queue with properties
        this.fullPath = '';          // The full path from root to this queue (e.g., "root.default")
    }
}

/**
 * Manages the Trie structure for YARN scheduler configurations.
 */
class SchedulerConfigTrie {
    constructor() {
        this.rootNode = new SchedulerTrieNode('root'); // The root of the Trie always represents the "root" queue
        this.rootNode.isQueue = true; // Mark root as a queue by default
        this.rootNode.fullPath = 'root';
        this.globalProperties = new Map(); // For configurations not tied to a specific queue path
    }

    /**
     * Inserts a property from the SCHEDULER_CONF into the Trie.
     * @param {string} configKey - The full YARN property key (e.g., "yarn.scheduler.capacity.root.default.capacity").
     * @param {string} value - The value of the property.
     */
    insertProperty(configKey, value) {
        const prefix = "yarn.scheduler.capacity.";
        if (!configKey.startsWith(prefix)) {
            // Optionally handle or log non-capacity scheduler properties if necessary
            return;
        }

        const anPath = configKey.substring(prefix.length); // e.g., "root.default.capacity" or "some-global-setting"

        if (anPath.startsWith("root")) {
            const parts = anPath.split('.'); // e.g., ["root", "default", "capacity"]
            const propertyName = parts.pop(); // e.g., "capacity"
            const queuePathSegments = parts;  // e.g., ["root", "default"] or ["root"] for root's direct properties

            let currentNode = this.rootNode;
            // The first segment queuePathSegments[0] is "root".
            // We iterate starting from its children, so loop from index 1.
            for (let i = 1; i < queuePathSegments.length; i++) {
                const segment = queuePathSegments[i];
                if (!currentNode.children.has(segment)) {
                    const newNode = new SchedulerTrieNode(segment);
                    newNode.fullPath = `${currentNode.fullPath}.${segment}`;
                    currentNode.children.set(segment, newNode);
                }
                currentNode = currentNode.children.get(segment);
            }
            // currentNode now points to the correct queue node (or rootNode itself if path was just "root")
            currentNode.isQueue = true; // Any node that has properties is effectively a queue
            currentNode.properties.set(propertyName, value);
        } else {
            // Assumed to be a global property if it doesn't start with "root"
            this.globalProperties.set(anPath, value);
        }
    }

    /**
     * Retrieves a specific queue node from the Trie.
     * @param {string} queuePath - The full path of the queue (e.g., "root.default").
     * @returns {SchedulerTrieNode | null} The node if found and marked as a queue, otherwise null.
     */
    getQueueNode(queuePath) {
        const segments = queuePath.split('.');
        if (segments.length === 0 || segments[0] !== 'root') {
            return null;
        }

        let currentNode = this.rootNode;
        for (let i = 1; i < segments.length; i++) { // Start from 1 as rootNode is segments[0]
            const segment = segments[i];
            if (!currentNode.children.has(segment)) {
                return null; // Path does not exist
            }
            currentNode = currentNode.children.get(segment);
        }
        return currentNode.isQueue ? currentNode : null;
    }

    /**
     * Builds a plain JavaScript object hierarchy from the Trie.
     * @param {SchedulerTrieNode} node - The current Trie node to process.
     * @param {string | null} parentPath - The path of the parent queue.
     * @returns {Object} A queue object representing the hierarchy.
     */
    buildQueueHierarchyObject(node = this.rootNode, parentPath = null) {
        const queueObject = {
            name: node.segment,
            path: node.fullPath,
            parentPath: parentPath,
            children: {},
            properties: new Map(node.properties), // Convert Map to plain object
            // UI-specific fields like capacityMode, state, etc., will be derived here or by rendering logic
        };

        // Example: Derive capacityMode from properties
        const capString = node.properties.get('capacity');
        if (capString) {
            if (String(capString).endsWith('w')) queueObject.capacityMode = 'weight';
            else if (String(capString).startsWith('[')) queueObject.capacityMode = 'absolute'; // Or 'vector' based on further parsing
            else queueObject.capacityMode = 'percentage';
        } else {
            // Fallback to a default or derive from metadata if capacity is not explicitly set
            // For example, find default in QUEUE_CONFIG_CATEGORIES for '...capacity'
            // const capDefaultMeta = QUEUE_CONFIG_CATEGORIES.flatMap(cat => Object.values(cat.properties)).find(p => p.displayName === 'Capacity');
            // const capDefault = capDefaultMeta ? capDefaultMeta.defaultValue : '0%';
            // Similar logic for default mode from capDefault string. For now, just a basic default:
            queueObject.capacityMode = 'percentage';
        }
        // Example: Derive state
        queueObject.state = node.properties.get('state') || 'RUNNING'; // Default to RUNNING if not specified

        // Example: Derive autoCreateChildQueueEnabled
        const autoCreateEnabledProp = node.properties.get('auto-create-child-queue.enabled'); // Ensure exact property name match
        queueObject.autoCreateChildQueueEnabled = autoCreateEnabledProp === 'true';


        // Recursively build children. The `queues` property is key for defining the hierarchy.
        const childrenNamesString = node.properties.get('queues');
        if (childrenNamesString) {
            childrenNamesString.split(',').forEach(childSegment => {
                const trimmedChildName = childSegment.trim();
                const childNode = node.children.get(trimmedChildName);
                if (childNode && childNode.isQueue) { // Ensure child exists in Trie and is a queue
                    queueObject.children[trimmedChildName] = this.buildQueueHierarchyObject(childNode, node.fullPath);
                } else {
                    // console.warn(`Queue ${node.fullPath} lists child ${trimmedChildName} in its 'queues' property, but this child has no properties of its own or doesn't exist.`);
                    // Optionally create a minimal placeholder if necessary, but typically SCHEDULER_CONF would define children with their own props.
                }
            });
        } else {
            // Fallback: If 'queues' property is missing, but Trie nodes exist as children, build them.
            // This handles cases where hierarchy might be implied by path structure even if 'queues' prop is absent for a parent.
            for (const [childName, childNode] of node.children.entries()) {
                if (childNode.isQueue) { // Process only if the child node is a recognized queue
                    queueObject.children[childName] = this.buildQueueHierarchyObject(childNode, node.fullPath);
                }
            }
        }
        return queueObject;
    }
}
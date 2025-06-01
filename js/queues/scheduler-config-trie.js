/**
 * Represents a node in the Scheduler Configuration Trie.
 */
class SchedulerTrieNode {
    constructor(segment = '') {
        this.segment = segment;
        this.properties = new Map();
        this.children = new Map();
        this.isQueue = false; // Will be true if explicitly defined by a 'queues' property or is root
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
    }

    /**
     * Initializes the Trie from the flat list of scheduler properties.
     * This is the main entry point to build the Trie.
     */
    initializeFromConfig(schedulerConfProperties) {
        this.rootNode = new SchedulerTrieNode('root');
        this.rootNode.isQueue = true; // Root is always a queue
        this.rootNode.fullPath = 'root';
        this.globalProperties = new Map();

        const queueDefinitions = new Map(); // Map<String(parentPath), Set<String(childName)>>
        const otherProperties = [];      // Array of { originalKey: string, prefixlessPropertyName: string,// value: string }

        // Pass 1: Separate '<queue-path>.queues' properties to mimic how CS intializes the queues,
        // and collect all other properties.
        for (const prop of schedulerConfProperties) {
            const configKey = prop.name;
            const value = prop.value;
            const prefix = "yarn.scheduler.capacity.";

            if (!configKey.startsWith(prefix)) continue; // Skip non-matching properties
            const prefixlessPropertyName = configKey.substring(prefix.length);

            // Separate global properties (those not starting with 'root') from queue-specific properties.
            if (!prefixlessPropertyName.startsWith("root")) {
                this.globalProperties.set(prefixlessPropertyName, value);
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
            this._assignPropertyToTrie(prop.prefixlessPropertyName, prop.value, prop.originalKey);
        }
    }

    _buildTrieSkeleton(parentNode, parentPathKey, queuesDefinitions) {
        const childNames = queuesDefinitions.get(parentPathKey);
        if (childNames) {
            for (const childName of childNames) {
                // Only create child if it doesn't exist (though with 'queues' defining structure, this is less likely an issue)
                if (!parentNode.children.has(childName)) {
                    const newNode = new SchedulerTrieNode(childName);
                    newNode.fullPath = `${parentPathKey}.${childName}`;
                    newNode.isQueue = true; // Mark as an actual queue as per 'queues' definition
                    parentNode.children.set(childName, newNode);
                    this._buildTrieSkeleton(newNode, newNode.fullPath, queuesDefinitions); // Recurse
                }
            }
        }
    }

    _assignPropertyToTrie(prefixlessPropertyName, value, originalKeyForDebug = '') {
        const parts = prefixlessPropertyName.split('.'); // e.g., ["root", "test", "accessible-node-labels", "GPU", "capacity"]
        let currentNode = this.rootNode;
        let lastConfirmedQueueNode = this.rootNode;
        let depthOfLastConfirmedQueue = 0; // Depth in 'parts' array (0 is 'root')

        // Find the deepest existing Trie node that matches the first part of prefixlessPropertyName.
        // These nodes would have been created by _buildTrieSkeleton and marked isQueue=true.
        for (let i = 1; i < parts.length; i++) { // Start checking from children of root
            const segment = parts[i];
            if (currentNode.children.has(segment)) {
                const childNode = currentNode.children.get(segment);
                if (childNode.isQueue) { // Crucial: only traverse through confirmed queues
                    currentNode = childNode;
                    lastConfirmedQueueNode = currentNode;
                    depthOfLastConfirmedQueue = i;
                } else {
                    // Child node exists in Trie but wasn't marked as a queue
                    // This means the path diverges from the explicit queue hierarchy.
                    break;
                }
            } else {
                // Segment not found as a child, so the property belongs to 'lastConfirmedQueueNode'.
                break;
            }
        }

        // The propertyName is the part of prefixlessPropertyName that extends beyond the path of lastConfirmedQueueNode.
        // parts[0...depthOfLastConfirmedQueue] is the path of lastConfirmedQueueNode.
        // So, propertyName starts from parts[depthOfLastConfirmedQueue + 1].
        const propertyName = parts.slice(depthOfLastConfirmedQueue + 1).join('.');
        lastConfirmedQueueNode.properties.set(propertyName, value);
    }

    /**
     * Retrieves a specific queue node from the Trie.
     * @param {string} queuePath - The full path of the queue (e.g., "root.default").
     * @returns {SchedulerTrieNode | null} The node if found and marked as a queue, otherwise null.
     */
    getQueueNode(queuePath) {
        const segments = queuePath.split('.');
        if (segments.length === 0 || segments[0] !== 'root') return null;
        let currentNode = this.rootNode;
        for (let i = 1; i < segments.length; i++) {
            const segment = segments[i];
            if (!currentNode.children.has(segment)) return null;
            currentNode = currentNode.children.get(segment);
        }
        return currentNode;
    }

    // buildQueueHierarchyObject: This method now simply translates the Trie (built strictly by 'queues')
    // into the desired JS object structure. All properties, including complex ones, are already on the correct nodes.
    buildQueueHierarchyObject(trieNode = this.rootNode, parentPathString = null) {
        if (!trieNode || !trieNode.isQueue) { // Process only nodes that were marked as actual queues
            return null;
        }

        const finalQueueObject = {
            name: trieNode.segment,
            path: trieNode.fullPath,
            parentPath: parentPathString,
            children: {},
            properties: new Map(trieNode.properties), // All props are already correctly assigned
            capacityMode: CAPACITY_MODES.PERCENTAGE,  // Default
            state: 'RUNNING', // Default
        };

        // The 'queues' property on the trieNode defines the children for the hierarchy object
        const childQueueNames = new Set(
            (trieNode.properties.get('queues') || '').split(',').map(q => q.trim()).filter(q => q)
        );

        for (const childName of childQueueNames) {
            const childTrieNode = trieNode.children.get(childName);
            if (childTrieNode && childTrieNode.isQueue) { // Check if child exists in Trie and is a queue
                finalQueueObject.children[childName] = this.buildQueueHierarchyObject(childTrieNode, trieNode.fullPath);
            } else {
                // console.warn(`Queue ${trieNode.fullPath} lists child '${childName}' but it's not found in Trie or not marked as a queue.`);
            }
        }

        // Derive top-level convenience fields from the properties map
        const capString = finalQueueObject.properties.get('capacity');
        if (capString !== undefined) {
            finalQueueObject.capacity = capString;
            if (String(capString).endsWith('w')) finalQueueObject.capacityMode = CAPACITY_MODES.WEIGHT;
            else if (String(capString).startsWith('[')) finalQueueObject.capacityMode = CAPACITY_MODES.ABSOLUTE;
            else finalQueueObject.capacityMode = CAPACITY_MODES.PERCENTAGE;
        } else {
            finalQueueObject.capacity = '0%'; // Default capacity if not specified
            finalQueueObject.capacityMode = CAPACITY_MODES.PERCENTAGE;
        }

        const stateStr = finalQueueObject.properties.get('state');
        if (stateStr !== undefined) finalQueueObject.state = stateStr; else finalQueueObject.state = 'RUNNING';

        finalQueueObject.maxCapacity = finalQueueObject.properties.get('maximum-capacity');
        finalQueueObject.autoCreateChildQueueEnabled = finalQueueObject.properties.get('auto-create-child-queue.enabled') === 'true';
        // finalQueueObject.accessibleNodeLabels = finalQueueObject.properties.get('accessible-node-labels');

        return finalQueueObject;
    }
}
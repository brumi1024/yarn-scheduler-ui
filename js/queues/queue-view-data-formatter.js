class QueueViewDataFormatter {
    constructor(queueStateStore) {
        this.queueStateStore = queueStateStore;
    }

    // --- Private Helper Methods ---
    /**
     * Determines the effective capacity mode for a given queue object.
     *
     * @param {Object} basicQueueObject - The basic queue object containing properties
     *          like `_ui_capacityMode`, `path`, and a `properties` Map to derive capacity mode.
     * @return {string} - The determined capacity mode, which could be one of the values in `CAPACITY_MODES`.
     */
    _determineEffectiveCapacityMode(basicQueueObject) {
        if (basicQueueObject._ui_capacityMode) {
            return basicQueueObject._ui_capacityMode;
        }
        // basicQueueObject.properties is a Map: fullYarnName -> rawValue
        const capFullName = `yarn.scheduler.capacity.${basicQueueObject.path}.capacity`;
        const rawCapacityString = basicQueueObject.properties.get(capFullName);

        if (rawCapacityString !== undefined) {
            const capStr = String(rawCapacityString);
            if (capStr.endsWith('w')) return CAPACITY_MODES.WEIGHT;
            if (capStr.startsWith('[') && capStr.endsWith(']')) return CAPACITY_MODES.ABSOLUTE; // Or VECTOR
        }
        return CAPACITY_MODES.PERCENTAGE;
    }

    /**
     * Retrieves the raw property value associated with a specific key from a given queue object.
     *
     * @param {Object} basicQueueObject - The queue object containing property information.
     * @param {string} simplePropKey - The key representing the desired property.
     * @param {*} [defaultValue=undefined] - The default value to return if the property is not found.
     * @return {*} - The value of the property if found, or the default value if the property does not exist.
     */
    _getRawPropertyValue(basicQueueObject, simplePropKey, defaultValue = undefined) {
        let fullYarnName = null;
        for (const category of QUEUE_CONFIG_CATEGORIES) {
            for (const placeholderName in category.properties) {
                if (placeholderName.endsWith(`.${simplePropKey}`)) {
                    fullYarnName = placeholderName.replace(Q_PATH_PLACEHOLDER, basicQueueObject.path);
                    break;
                }
            }
            if (fullYarnName) break;
        }
        if (!fullYarnName && basicQueueObject.path) {
            fullYarnName = `yarn.scheduler.capacity.${basicQueueObject.path}.${simplePropKey}`;
        }


        if (fullYarnName && basicQueueObject.properties.has(fullYarnName)) {
            return basicQueueObject.properties.get(fullYarnName);
        }
        return defaultValue;
    }

    /**
     * Ensures the given raw value is formatted correctly based on the specified capacity mode.
     * If the rawValue is undefined or null, a default value is used instead.
     *
     * @param {any} rawValue - The input value to be formatted.
     * @param {string} mode - The mode to determine the format (e.g., percentage, weight, absolute, vector).
     * @param {any} defaultValue - The default value to use if rawValue is undefined or null.
     * @return {string} The formatted value as a string, based on the specified mode.
     */
    _ensureCapacityFormat(rawValue, mode, defaultValue) {
        let valStr = String(rawValue);
        if (rawValue === undefined || rawValue === null) {
            valStr = String(defaultValue !== undefined ? defaultValue : this._getDefaultCapacityValue(mode));
        }

        if (mode === CAPACITY_MODES.PERCENTAGE) {
            return valStr.endsWith('%') ? valStr : `${(parseFloat(valStr) || 0).toFixed(1)}%`;
        } else if (mode === CAPACITY_MODES.WEIGHT) {
            return valStr.endsWith('w') ? valStr : `${(parseFloat(valStr) || 0).toFixed(1)}w`;
        } else if (mode === CAPACITY_MODES.ABSOLUTE || mode === CAPACITY_MODES.VECTOR) {
            return (valStr.startsWith('[') && valStr.endsWith(']')) ? valStr : `[${valStr.replace(/[\[\]]/g, '')}]`;
        }
        return valStr;
    }

    /**
     * Ensures the given raw value is formatted correctly as a maximum capacity value.
     *
     * @param {any} rawValue - The raw value to be formatted. Can be a number, string, or undefined/null.
     * @param {string} effectiveParentMode - The effective parent mode, which may influence the default maximum capacity.
     * @param {any} defaultValue - The default value to use if rawValue is undefined or null.
     * @return {string} The formatted maximum capacity value as a string, ensuring it ends with '%' unless bracketed.
     */
    _ensureMaxCapacityFormat(rawValue, effectiveParentMode, defaultValue) {
        let valStr = String(rawValue);
        if (rawValue === undefined || rawValue === null) {
            valStr = String(defaultValue !== undefined ? defaultValue : this._getDefaultMaxCapacityValue(null, effectiveParentMode));
        }
        if (!(valStr.startsWith('[') && valStr.endsWith(']'))) {
            return valStr.endsWith('%') ? valStr : `${(parseFloat(valStr) || 100).toFixed(1)}%`;
        }
        return valStr;
    }

    _getDefaultCapacityValue(mode) {
        if (mode === CAPACITY_MODES.WEIGHT) return '1.0w';
        if (mode === CAPACITY_MODES.ABSOLUTE || mode === CAPACITY_MODES.VECTOR) return '[memory=1024,vcores=1]';
        return '0%'; // Default for percentage
    }

    _getDefaultMaxCapacityValue(currentCapacity, mode) { // mode is parent's effective capacity mode
        if (mode === CAPACITY_MODES.ABSOLUTE || mode === CAPACITY_MODES.VECTOR) {
            const resources = this._parseResourceVector(currentCapacity); // currentCapacity of the queue itself
            if (resources.length > 0) {
                return '[' + resources.map(r => `${r.key}=${(parseInt(r.value) || 1024) * 2}${r.unit || ''}`).join(',') + ']';
            }
            return '[memory=2048,vcores=2]'; // Fallback absolute default
        }
        return '100%'; // Default for percentage
    }

    /**
     * Parses a resource vector string and converts it into an array of key-value-unit objects.
     *
     * @param {string} resourceString A string representing resources in the format "[key1=value1unit1,key2=value2unit2,...]".
     *                                Each entry is expected to contain a key, a value, and an optional unit.
     * @return {Array<Object>} Returns an array of objects where each object contains `key`, `value`, and `unit` properties.
     *                         Returns an empty array if the input string is invalid or empty.
     */
    _parseResourceVector(resourceString) {
        if (!resourceString || typeof resourceString !== 'string') return [];
        let cleanStr = resourceString.trim();
        if (cleanStr.startsWith("[") && cleanStr.endsWith("]")) cleanStr = cleanStr.slice(1, -1);
        if (!cleanStr) return [];

        return cleanStr.split(',').map(pair => {
            const [key, valuePart] = pair.split('=').map(s => s.trim());
            const match = (valuePart || "").match(/^([0-9.]+)(.*)/);
            let value = valuePart || "";
            let unit = "";
            if (match) { value = match[1]; unit = match[2]; }
            return { key, value, unit: unit || "" };
        }).filter(item => item.key);
    }

    /**
     * Generates an array of label objects based on the provided queue data. Each label includes a text description, CSS class, and a title for additional context.
     *
     * @param {Object} formattedQueueData - The data object representing the formatted queue information.
     * @param {string} formattedQueueData.effectiveCapacityMode - The current capacity mode of the queue (e.g., "percentage", "weight", "absolute", or "vector").
     * @param {string} formattedQueueData.state - The state of the queue ("STOPPED" or other running states).
     * @param {boolean} formattedQueueData.autoCreateChildQueueEnabled - Indicates whether auto-creation of child queues is enabled.
     * @return {Array<Object>} An array of label objects. Each label contains `text` (label name), `cssClass` (styling class), and `title` (tooltip description).
     */
    _generateUILabels(formattedQueueData) {
        const labels = [];
        const modeIcons = { percentage: "📊", weight: "⚖️", absolute: "🎯", vector: "📐" };
        const modeText = formattedQueueData.effectiveCapacityMode.charAt(0).toUpperCase() + formattedQueueData.effectiveCapacityMode.slice(1);
        labels.push({ text: `${modeIcons[formattedQueueData.effectiveCapacityMode] || "📊"} ${modeText}`, cssClass: "queue-tag tag-mode", title: `Capacity Mode: ${modeText}` });

        if (formattedQueueData.state === "STOPPED") {
            labels.push({ text: "🛑 Stopped", cssClass: "queue-tag tag-state tag-stopped", title: "Queue State: Stopped"});
        } else {
            labels.push({ text: "▶️ Running", cssClass: "queue-tag tag-state tag-running", title: "Queue State: Running"});
        }

        if (formattedQueueData.autoCreateChildQueueEnabled) {
            labels.push({ text: "⚡ Auto-Create", cssClass: "queue-tag tag-auto-create", title: "Auto Queue Creation Enabled"});
        }
        return labels;
    }

    /**
     * Retrieves the live queue data for a given queue path.
     *
     * @param {string} queuePath - The path of the target queue to search for in the scheduler information.
     * @return {Object|null} The queue object matching the given queue path if found, otherwise null.
     */
    // TODO: this should be stored in the SchedulerConfigTrie instead of rawSchedulerInfo
    _getLiveQueueData(queuePath) {
        if (rawSchedulerInfo && rawSchedulerInfo.scheduler && rawSchedulerInfo.scheduler.schedulerInfo) {
            // Recursive function to find the queue in rawSchedulerInfo
            function findQueueInInfo(infoNode, targetPath) {
                if (!infoNode) return null;
                if (infoNode.queuePath === targetPath) return infoNode;
                if (infoNode.queues && infoNode.queues.queue) {
                    const children = Array.isArray(infoNode.queues.queue) ? infoNode.queues.queue : [infoNode.queues.queue];
                    for (const child of children) {
                        const found = findQueueInInfo(child, targetPath);
                        if (found) return found;
                    }
                }
                return null;
            }
            return findQueueInInfo(rawSchedulerInfo.scheduler.schedulerInfo, queuePath);
        }
        return null;
    }


    /**
     * Retrieves and formats a queue object based on a specific queue path.
     * This method processes the raw queue data and transforms it into a
     * comprehensive formatted object suitable for use in the UI, including
     * derived properties and conditional metadata.
     *
     * @param {string} queuePath - The path of the queue to retrieve and format.
     * @return {Object|null} The formatted queue object containing all relevant*/
    getFormattedQueue(queuePath) {
        const basicQueueObject = this.queueStateStore.getQueue(queuePath);
        if (!basicQueueObject) return null;

        const formattedQueue = {
            path: basicQueueObject.path,
            name: basicQueueObject.name, // Original case name
            parentPath: basicQueueObject.parentPath,
            level: (basicQueueObject.path || "").split(".").length - 1,
            changeStatus: basicQueueObject.changeStatus || "UNCHANGED",

            // Store derived UI properties directly on the object
            // And also a map of simpleKey -> formattedValue for properties defined in metadata
            propertiesForEditModal: new Map(), // Will hold simpleKey -> effective, formatted value
        };

        // UI states
        formattedQueue.isNew = (formattedQueue.changeStatus === ADD_OP);
        formattedQueue.isDeleted = (formattedQueue.changeStatus === DELETE_OP);
        formattedQueue.hasPendingChanges = (formattedQueue.changeStatus === UPDATE_OP) && !formattedQueue.isDeleted;
        formattedQueue.isRoot = (queuePath === 'root');

        if (formattedQueue.isDeleted) formattedQueue.statusClass = 'to-be-deleted';
        else if (formattedQueue.isNew) formattedQueue.statusClass = 'new-queue';
        else if (formattedQueue.hasPendingChanges) formattedQueue.statusClass = 'pending-changes';
        else formattedQueue.statusClass = '';

        // Determine effective capacity mode (crucial for formatting other capacity fields)
        formattedQueue.effectiveCapacityMode = this._determineEffectiveCapacityMode(basicQueueObject);

        // Iterate QUEUE_CONFIG_CATEGORIES to get metadata for properties
        // Q_PATH_PLACEHOLDER and QUEUE_CONFIG_CATEGORIES are global
        QUEUE_CONFIG_CATEGORIES.forEach(category => {
            for (const placeholderPropName in category.properties) {
                if (Object.hasOwnProperty.call(category.properties, placeholderPropName)) {
                    const propDef = category.properties[placeholderPropName];
                    const simpleKey = placeholderPropName.substring(placeholderPropName.lastIndexOf('.') + 1);

                    let rawEffectiveValue = this._getRawPropertyValue(basicQueueObject, simpleKey, propDef.defaultValue);
                    let formattedValue = rawEffectiveValue; // Start with raw or default

                    // Apply specific formatting based on property type and mode
                    if (simpleKey === 'capacity') {
                        formattedValue = this._ensureCapacityFormat(rawEffectiveValue, formattedQueue.effectiveCapacityMode, propDef.defaultValue);
                    } else if (simpleKey === 'maximum-capacity') { // Ensure consistent simpleKey
                        formattedValue = this._ensureMaxCapacityFormat(rawEffectiveValue, formattedQueue.effectiveCapacityMode, propDef.defaultValue);
                    } else if (propDef.type === 'boolean' && typeof rawEffectiveValue !== 'string' && rawEffectiveValue !== undefined) {
                        formattedValue = String(rawEffectiveValue); // Ensure boolean is string "true" or "false"
                    } else if (propDef.type === 'percentage' && simpleKey !== 'maximum-am-resource-percent'){ // max-am-resource-percent is 0-1
                        // Other percentages might need specific formatting if not 'X.Y%'
                    }
                    if (simpleKey === 'state' && formattedValue === undefined) {
                        formattedValue = 'RUNNING'; // Default state if property not found
                    }


                    // Store on formattedQueue directly for easy access AND in the map for edit modal
                    formattedQueue[simpleKey] = formattedValue;
                    formattedQueue.propertiesForEditModal.set(simpleKey, formattedValue);
                }
            }
        });

        // Ensure core fields are set even if not in metadata loop (using direct property access)
        formattedQueue.state = formattedQueue.state || this._getRawPropertyValue(basicQueueObject, 'state', 'RUNNING');
        formattedQueue.capacity = formattedQueue.capacity || this._ensureCapacityFormat(this._getRawPropertyValue(basicQueueObject, 'capacity'), formattedQueue.effectiveCapacityMode, this._getDefaultCapacityValue(formattedQueue.effectiveCapacityMode));
        formattedQueue.maxCapacity = formattedQueue.maxCapacity || this._ensureMaxCapacityFormat(this._getRawPropertyValue(basicQueueObject, 'maximum-capacity'), formattedQueue.effectiveCapacityMode, this._getDefaultMaxCapacityValue(formattedQueue.capacity, formattedQueue.effectiveCapacityMode));
        formattedQueue.autoCreateChildQueueEnabled = formattedQueue.autoCreateChildQueueEnabled || (this._getRawPropertyValue(basicQueueObject, 'auto-create-child-queue.enabled') === 'true');

        // Display-specific strings
        formattedQueue.displayName = formattedQueue.name || formattedQueue.path.split('.').pop();
        formattedQueue.displayNameTitle = `${formattedQueue.path} (Click to edit)`;
        formattedQueue.capacityDisplay = formattedQueue.capacity;
        formattedQueue.maxCapacityDisplay = formattedQueue.maxCapacity;

        if (formattedQueue.effectiveCapacityMode === CAPACITY_MODES.ABSOLUTE || formattedQueue.effectiveCapacityMode === CAPACITY_MODES.VECTOR) {
            formattedQueue.capacityDetails = this._parseResourceVector(formattedQueue.capacityDisplay);
            formattedQueue.maxCapacityDetails = this._parseResourceVector(formattedQueue.maxCapacityDisplay);
        }

        // Live data from scheduler (if available, e.g. from window.rawSchedulerInfo)
        const liveData = this._getLiveQueueData(queuePath);
        formattedQueue.absoluteUsedCapacityDisplay = (liveData && liveData.absoluteUsedCapacity !== undefined) ? liveData.absoluteUsedCapacity.toFixed(1) + '%' : 'N/A';
        formattedQueue.numApplications = (liveData && liveData.numApplications !== undefined) ? liveData.numApplications : 0;

        // Deletion eligibility (checkDeletability is global or passed)
        const eligibility = typeof checkDeletability === "function" ? checkDeletability(queuePath, this.queueStateStore) : { canDelete: !formattedQueue.isRoot, reason: formattedQueue.isRoot ? "Cannot delete root." : ""};
        formattedQueue.canBeDeletedForDropdown = formattedQueue.isDeleted ? true : eligibility.canDelete;
        formattedQueue.actionLabelForDelete = formattedQueue.isDeleted ? "Undo Delete" : "Delete Queue";
        formattedQueue.deletionReason = formattedQueue.isDeleted ? "Marked for deletion." : eligibility.reason;

        formattedQueue.uiLabels = this._generateUILabels(formattedQueue);

        // Children will be populated by getFormattedQueueHierarchy
        formattedQueue.children = {}; // Initialize, to be filled by recursive call

        return formattedQueue;
    }

    /**
     * Retrieves the formatted hierarchy of the queue by processing the raw Trie root node.
     *
     * The method obtains the raw Trie root node from the queue state store and formats it
     * recursively into a structured hierarchy. If the root node is not found, a warning is
     * logged and the method returns null.
     *
     * @return {Object|null} The formatted queue hierarchy as an object, or null if the root node is unavailable.
     */
    getFormattedQueueHierarchy() {
        const trieRootNode = this.queueStateStore.getQueueHierarchy(); // Gets raw Trie root
        if (!trieRootNode) {
            console.warn("Root TrieNode not found for hierarchy formatting.");
            return null;
        }
        return this._formatQueueRecursive(trieRootNode);
    }

    _formatQueueRecursive(trieNode) {
        // Get the fully formatted plain object for the current trieNode
        const formattedQueue = this.getFormattedQueue(trieNode.fullPath);
        if (!formattedQueue) {
            return null;
        }

        // Recursively format children
        // trieNode.children is a Map of (segment -> SchedulerTrieNode)
        if (trieNode.children && trieNode.children.size > 0) {
            trieNode.children.forEach((childTrieNode, childSegment) => {
                if (childTrieNode.isQueue) { // Ensure it's an actual queue
                    const formattedChild = this._formatQueueRecursive(childTrieNode);
                    if (formattedChild) {
                        // Use childSegment (original case key from Trie children map) or childTrieNode.segment
                        formattedQueue.children[childTrieNode.segment] = formattedChild;
                    }
                }
            });
        }

        // Determine queueType based on formatted children
        formattedQueue.queueType = (Object.keys(formattedQueue.children).length > 0) ? 'parent' : 'leaf';

        return formattedQueue;
    }
}
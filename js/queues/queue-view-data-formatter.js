class QueueViewDataFormatter {
    constructor(queueStateStore) {
        this.queueStateStore = queueStateStore;
    }

    // --- Helper methods ---
    _getRawPropertyValue(basicQueueObject, simplePropKey, defaultValue = undefined) {
        // This helper is used to get a raw property value from the basicQueueObject's properties map.
        // It can construct the full YARN property name.
        // For simplicity in this example, we'll assume that if a direct lookup on
        // basicQueueObject.properties using a pre-constructed fullYarnName (passed as simplePropKey sometimes)
        // is needed, the caller can do that. This version is simplified.
        // A more robust version would use QUEUE_CONFIG_CATEGORIES to map simpleKey to full placeholder,
        // then replace Q_PATH_PLACEHOLDER.

        let fullYarnName = `yarn.scheduler.capacity.${basicQueueObject.path}.${simplePropKey}`;
        // A quick check if simplePropKey might already be a full name (e.g. global properties)
        if (simplePropKey.startsWith("yarn.scheduler.capacity.")) {
            fullYarnName = simplePropKey;
        }


        if (basicQueueObject.properties && basicQueueObject.properties.has(fullYarnName)) {
            return basicQueueObject.properties.get(fullYarnName);
        }
        // Fallback for cases where simplePropKey might have been used directly if not path-specific
        if (basicQueueObject.properties && basicQueueObject.properties.has(simplePropKey)) {
            return basicQueueObject.properties.get(simplePropKey);
        }
        return defaultValue;
    }

    _determineEffectiveCapacityMode(basicQueueObject) {
        if (basicQueueObject._ui_capacityMode) { // UI hint from pending changes
            return basicQueueObject._ui_capacityMode;
        }
        // basicQueueObject.properties is a Map: fullYarnName -> rawValue
        const rawCapacityString = basicQueueObject.properties.get(`yarn.scheduler.capacity.${basicQueueObject.path}.capacity`);
        if (rawCapacityString !== undefined) {
            const capStr = String(rawCapacityString);
            if (capStr.endsWith('w')) return CAPACITY_MODES.WEIGHT;
            if (capStr.startsWith('[') && capStr.endsWith(']')) return CAPACITY_MODES.ABSOLUTE;
        }
        return CAPACITY_MODES.PERCENTAGE; // Default
    }

    _ensureCapacityFormat(rawValue, mode, defaultValueForEmptyOrInvalid) {
        let valStr = (rawValue !== undefined && rawValue !== null) ? String(rawValue).trim() : "";
        if (valStr === "") {
            return String(defaultValueForEmptyOrInvalid);
        }

        if (mode === CAPACITY_MODES.PERCENTAGE) {
            if (valStr.endsWith('%')) {
                const num = parseFloat(valStr.slice(0, -1));
                return isNaN(num) ? String(defaultValueForEmptyOrInvalid) : valStr;
            }
            const num = parseFloat(valStr);
            return isNaN(num) ? String(defaultValueForEmptyOrInvalid) : `${num.toFixed(1)}%`;
        } else if (mode === CAPACITY_MODES.WEIGHT) {
            if (valStr.endsWith('w')) {
                const num = parseFloat(valStr.slice(0, -1));
                return isNaN(num) ? String(defaultValueForEmptyOrInvalid) : valStr;
            }
            const num = parseFloat(valStr);
            return isNaN(num) ? String(defaultValueForEmptyOrInvalid) : `${num.toFixed(1)}w`;
        } else if (mode === CAPACITY_MODES.ABSOLUTE || mode === CAPACITY_MODES.VECTOR) {
            if (valStr.startsWith('[') && valStr.endsWith(']')) {
                return (valStr === "[]") ? String(defaultValueForEmptyOrInvalid) : valStr;
            }
            // If mode is absolute but value isn't bracketed, return default to enforce format
            return String(defaultValueForEmptyOrInvalid);
        }
        return String(defaultValueForEmptyOrInvalid); // Fallback
    }

    _ensureMaxCapacityFormat(rawValue, defaultValue = '100.0%') {
        let valStr = (rawValue !== undefined && rawValue !== null) ? String(rawValue).trim() : "";
        if (valStr === "") {
            return defaultValue;
        }
        if (this._isLikelyVectorString(valStr)) { // Use helper
            return (valStr === "[]") ? defaultValue : valStr;
        }
        if (this._isLikelyPercentageString(valStr)) { // Use helper
            const num = parseFloat(valStr.slice(0, -1));
            return isNaN(num) ? defaultValue : valStr;
        }
        const num = parseFloat(valStr); // Try to parse as plain number for percentage
        if (!isNaN(num)) {
            return `${num.toFixed(1)}%`;
        }
        // If malformed (e.g. "abc", "memory=1024" without brackets)
        return defaultValue;
    }

    _getDefaultCapacityValue(mode) {
        if (mode === CAPACITY_MODES.WEIGHT) return '1.0w';
        if (mode === CAPACITY_MODES.ABSOLUTE) return '[memory=1024,vcores=1]';
        return '10.0%';
    }

    _getDefaultMaxCapacityValue() { // Simplified, doesn't depend on queue's primary mode
        return '100.0%';
    }

    _parseResourceVector(resourceString) {
        if (!resourceString || typeof resourceString !== 'string') return [];
        let cleanStr = resourceString.trim();
        if (cleanStr.startsWith("[") && cleanStr.endsWith("]")) cleanStr = cleanStr.slice(1, -1);
        if (!cleanStr) return [];
        return cleanStr.split(',').map(pair => {
            const parts = pair.split('=');
            const key = parts[0] ? parts[0].trim() : null;
            const valuePart = parts[1] ? parts[1].trim() : "";
            const match = valuePart.match(/^([0-9.]+)(.*)/);
            let value = valuePart;
            let unit = "";
            if (match) { value = match[1]; unit = match[2].trim(); }
            return { key, value, unit };
        }).filter(item => item.key && item.value !== "");
    }

    _isLikelyVectorString(valStr) {
        return typeof valStr === 'string' && valStr.startsWith('[') && valStr.endsWith(']');
    }

    _isLikelyPercentageString(valStr) {
        return typeof valStr === 'string' && valStr.endsWith('%');
    }

    _generateUILabels(formattedQueue) {
        const labels = [];
        const modeIcons = { percentage: "📊", weight: "⚖️", absolute: "🎯", vector: "📐" };
        const mode = formattedQueue.effectiveCapacityMode || CAPACITY_MODES.PERCENTAGE;
        const modeText = mode.charAt(0).toUpperCase() + mode.slice(1);
        labels.push({ text: `${modeIcons[mode] || "📊"} ${modeText}`, cssClass: "queue-tag tag-mode", title: `Capacity Mode: ${modeText}`});

        const state = formattedQueue.state || 'RUNNING'; // Use derived state
        if (state === "STOPPED") {
            labels.push({ text: "🛑 Stopped", cssClass: "queue-tag tag-state tag-stopped", title: "Queue State: Stopped"});
        } else {
            labels.push({ text: "▶️ Running", cssClass: "queue-tag tag-state tag-running", title: "Queue State: Running"});
        }
        if (formattedQueue.autoCreateChildQueueEnabled) { // Use derived boolean
            labels.push({ text: "⚡ Auto-Create", cssClass: "queue-tag tag-auto-create", title: "Auto Queue Creation Enabled"});
        }
        return labels;
    }

    _getLiveQueueData(queuePath) {
        if (window.rawSchedulerInfo?.scheduler?.schedulerInfo) {
            function findQueueInInfo(infoNode, targetPath) {
                if (!infoNode) return null;
                if (infoNode.queuePath === targetPath) return infoNode;
                if (infoNode.queues?.queue) {
                    const children = Array.isArray(infoNode.queues.queue) ? infoNode.queues.queue : [infoNode.queues.queue];
                    for (const child of children) {
                        const found = findQueueInInfo(child, targetPath);
                        if (found) return found;
                    }
                }
                return null;
            }
            return findQueueInInfo(window.rawSchedulerInfo.scheduler.schedulerInfo, queuePath);
        }
        return null;
    }

    getFormattedQueue(queuePath) {
        const basicQueueObject = this.queueStateStore.getQueue(queuePath);
        if (!basicQueueObject) return null;

        const formattedQueue = {
            path: basicQueueObject.path,
            name: basicQueueObject.name,
            parentPath: basicQueueObject.parentPath,
            level: (basicQueueObject.path || "").split(".").length - 1,
            properties: new Map(basicQueueObject.properties), // Key: full YARN name, Value: raw effective value
            changeStatus: basicQueueObject.changeStatus || "UNCHANGED",
            children: {},
            // queueType will be set by _formatQueueRecursive
        };

        // --- UI State Flags ---
        formattedQueue.isNew = (formattedQueue.changeStatus === ADD_OP);
        formattedQueue.isDeleted = (formattedQueue.changeStatus === DELETE_OP);
        formattedQueue.hasPendingChanges = (formattedQueue.changeStatus === UPDATE_OP) && !formattedQueue.isDeleted;
        formattedQueue.isRoot = (queuePath === 'root');

        if (formattedQueue.isDeleted) formattedQueue.statusClass = 'to-be-deleted';
        else if (formattedQueue.isNew) formattedQueue.statusClass = 'new-queue';
        else if (formattedQueue.hasPendingChanges) formattedQueue.statusClass = 'pending-changes';
        else formattedQueue.statusClass = '';

        // --- Essential Derived Top-Level UI Properties ---
        formattedQueue.displayName = formattedQueue.name;
        formattedQueue.displayNameTitle = `${formattedQueue.path} (Click to edit)`;

        formattedQueue.effectiveCapacityMode = this._determineEffectiveCapacityMode(basicQueueObject);

        // State (display string, with default)
        const rawState = formattedQueue.properties.get(`yarn.scheduler.capacity.${queuePath}.state`) || 'RUNNING';
        formattedQueue.state = String(rawState);

        // Auto Create Child Queue Enabled (boolean for UI logic)
        const rawAutoCreate = formattedQueue.properties.get(`yarn.scheduler.capacity.${queuePath}.auto-create-child-queue.enabled`);
        formattedQueue.autoCreateChildQueueEnabled = (String(rawAutoCreate).toLowerCase() === 'true');

        // Formatted display strings for capacity and maxCapacity
        const rawCapacity = formattedQueue.properties.get(`yarn.scheduler.capacity.${queuePath}.capacity`);
        formattedQueue.capacityDisplay = this._ensureCapacityFormat(rawCapacity,
            formattedQueue.effectiveCapacityMode,
            this._getDefaultCapacityValue(formattedQueue.effectiveCapacityMode));

        const rawMaxCapacity = formattedQueue.properties.get(`yarn.scheduler.capacity.${queuePath}.maximum-capacity`);
        formattedQueue.maxCapacityDisplay = this._ensureMaxCapacityFormat(rawMaxCapacity, this._getDefaultMaxCapacityValue());

        // Parsed details for vector capacities
        formattedQueue.capacityDetails = this._isLikelyVectorString(formattedQueue.capacityDisplay) ? this._parseResourceVector(formattedQueue.capacityDisplay) : [];
        formattedQueue.maxCapacityDetails = this._isLikelyVectorString(formattedQueue.maxCapacityDisplay) ? this._parseResourceVector(formattedQueue.maxCapacityDisplay) : [];

        // Sortable capacity
        if (formattedQueue.effectiveCapacityMode === CAPACITY_MODES.PERCENTAGE || formattedQueue.effectiveCapacityMode === CAPACITY_MODES.WEIGHT) {
            formattedQueue.sortableCapacity = parseFloat(formattedQueue.capacityDisplay) || 0;
        } else if (formattedQueue.effectiveCapacityMode === CAPACITY_MODES.ABSOLUTE || formattedQueue.effectiveCapacityMode === CAPACITY_MODES.VECTOR) {
            let memoryValue = 0;
            if (formattedQueue.capacityDetails.length > 0) {
                const memResource = formattedQueue.capacityDetails.find(r => r.key && (r.key.toLowerCase() === 'memory' || r.key.toLowerCase() === 'memory-mb'));
                if (memResource && memResource.value) memoryValue = parseFloat(memResource.value) || 0;
            }
            formattedQueue.sortableCapacity = memoryValue;
        } else {
            formattedQueue.sortableCapacity = 0;
        }

        // Live data
        const liveData = this._getLiveQueueData(queuePath);
        formattedQueue.absoluteUsedCapacityDisplay = (liveData?.absoluteUsedCapacity !== undefined) ? liveData.absoluteUsedCapacity.toFixed(1) + '%' : 'N/A';
        formattedQueue.numApplications = (liveData?.numApplications !== undefined) ? liveData.numApplications : (basicQueueObject.numApplications || 0);

        // Deletion Info
        const eligibility = (typeof checkDeletability === "function" && this.queueStateStore) ?
            checkDeletability(queuePath, this.queueStateStore) :
            { canDelete: !formattedQueue.isRoot, reason: formattedQueue.isRoot ? "Cannot delete root." : "" };
        formattedQueue.canBeDeletedForDropdown = formattedQueue.isDeleted ? true : eligibility.canDelete;
        formattedQueue.actionLabelForDelete = formattedQueue.isDeleted ? "Undo Delete" : "Delete Queue";
        formattedQueue.deletionReason = formattedQueue.isDeleted ? "Marked for deletion." : eligibility.reason;

        // Preliminary queueType (more accurate one set by _formatQueueRecursive)
        let hasChildrenInBasic = false;
        if (basicQueueObject.children) {
            for (const childName in basicQueueObject.children) {
                if (Object.hasOwnProperty.call(basicQueueObject.children, childName) &&
                    !this.queueStateStore.isStateDelete(basicQueueObject.children[childName].path)) {
                    hasChildrenInBasic = true; break;
                }
            }
        }
        if (!hasChildrenInBasic && this.queueStateStore) {
            this.queueStateStore._iter(ADD_OP).forEach(entry => {
                const newQ = entry.data.change.newQueueData;
                if (newQ && newQ.parentPath === formattedQueue.path && !this.queueStateStore.isStateDelete(newQ.path)) {
                    hasChildrenInBasic = true;
                }
            });
        }
        formattedQueue.queueType = hasChildrenInBasic ? 'parent' : 'leaf';

        // UI Labels (depends on derived state, mode, autoCreate)
        formattedQueue.uiLabels = this._generateUILabels(formattedQueue);

        return formattedQueue;
    }

    getFormattedQueueHierarchy() {
        const trieRootNode = this.queueStateStore.getQueueHierarchy();
        if (!trieRootNode || !trieRootNode.isQueue) {
            console.warn("Root TrieNode not found or not a queue for hierarchy formatting.");
            return null;
        }
        return this._formatQueueRecursive(trieRootNode);
    }

    _formatQueueRecursive(trieNode) {
        const formattedQueue = this.getFormattedQueue(trieNode.fullPath);
        if (!formattedQueue) return null;

        formattedQueue.children = {}; // Initialize/clear from single getFormattedQueue call
        let actualActiveChildrenCount = 0;

        // Process children from Trie
        if (trieNode.children && trieNode.children.size > 0) {
            trieNode.children.forEach((childTrieNode) => { // childTrieNode is a SchedulerTrieNode
                if (childTrieNode.isQueue) {
                    const formattedChild = this._formatQueueRecursive(childTrieNode);
                    if (formattedChild) {
                        formattedQueue.children[childTrieNode.segment] = formattedChild; // Use original case segment
                        if (!formattedChild.isDeleted) actualActiveChildrenCount++;
                    }
                }
            });
        }

        // Graft staged new children
        if (this.queueStateStore) {
            this.queueStateStore._iter(ADD_OP).forEach(entry => {
                const newQueueBlueprint = entry.data.change.newQueueData;
                if (newQueueBlueprint && newQueueBlueprint.parentPath === formattedQueue.path) {
                    // Check if this new child name isn't already a key from Trie children
                    if (!formattedQueue.children[newQueueBlueprint.name]) {
                        // Get the fully formatted version of this new child.
                        const formattedNewChild = this.getFormattedQueue(newQueueBlueprint.path);
                        if (formattedNewChild) {
                            formattedQueue.children[newQueueBlueprint.name] = formattedNewChild;
                            if (!formattedNewChild.isDeleted) actualActiveChildrenCount++;
                        }
                    }
                }
            });
        }

        // Set definitive queueType based on all processed children
        formattedQueue.queueType = (actualActiveChildrenCount > 0) ? 'parent' : 'leaf';
        return formattedQueue;
    }
}
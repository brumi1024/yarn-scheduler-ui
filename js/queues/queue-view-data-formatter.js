class QueueViewDataFormatter {
    constructor(queueStateStore) {
        this.queueStateStore = queueStateStore;
    }

    /**
     * Returns a single queue object, fully formatted for display.
     * @param {string} queuePath - The full path of the queue.
     * @returns {Object|null} The formatted queue object, or null if not found.
     */
    getFormattedQueue(queuePath) {
        // 1. Get baseQueueData from the store.
        //    baseQueueData.properties is expected to be a Map with FULL YARN NAMES as keys.
        const baseQueueData = this.queueStateStore.getQueue(queuePath);

        if (!baseQueueData) {
            return null;
        }

        // 2. Initialize formattedQueue.
        //    Start with essential non-property fields from baseQueueData.
        //    The 'properties' map on the final formattedQueue will store simpleKey -> formattedValue.
        const formattedQueue = {
            path: baseQueueData.path,
            name: baseQueueData.name,
            parentPath: baseQueueData.parentPath,
            children: baseQueueData.children || {}, // Raw children, to be processed by _formatQueueRecursive
            level: baseQueueData.level !== undefined ? baseQueueData.level : (baseQueueData.path || "").split(".").length - 1,
            changeStatus: baseQueueData.changeStatus || "UNCHANGED",
            // This will be a new Map for simple-keyed formatted properties for the UI model
            properties: new Map(),
        };

        // Safely access properties from baseQueueData (which has full YARN names)
        const basePropsWithFullNames = baseQueueData.properties instanceof Map ?
            baseQueueData.properties :
            new Map(Object.entries(baseQueueData.properties || {}));


        // 3. Determine UI-specific states and flags from baseQueueData.changeStatus
        formattedQueue.isNew = (formattedQueue.changeStatus === ADD_OP); // Assuming ADD_OP, UPDATE_OP, DELETE_OP are defined constants
        formattedQueue.isDeleted = (formattedQueue.changeStatus === DELETE_OP);
        formattedQueue.hasPendingChanges = (formattedQueue.changeStatus === UPDATE_OP) && !formattedQueue.isDeleted;
        formattedQueue.isRoot = (queuePath === 'root');

        // Status class based on these flags (this part of your code was good)
        if (formattedQueue.isDeleted) {
            formattedQueue.statusClass = 'to-be-deleted';
        } else if (formattedQueue.isNew) {
            formattedQueue.statusClass = 'new-queue';
        } else if (formattedQueue.hasPendingChanges) {
            formattedQueue.statusClass = 'pending-changes';
        } else {
            formattedQueue.statusClass = '';
        }

        // 4. Determine Effective Capacity Mode
        //    Priority: UI hint from an UPDATE_OP's payload > mode on baseQueueData (if store sets it) > re-detect.
        const pendingChangeDirectPayload = (formattedQueue.changeStatus === UPDATE_OP && this.queueStateStore._changes.get(queuePath)) ?
            this.queueStateStore._changes.get(queuePath).change :
            null;
        let effectiveMode = pendingChangeDirectPayload?._ui_capacityMode || baseQueueData.capacityMode;
        if (!effectiveMode) {
            const capFullName = `yarn.scheduler.capacity.${queuePath}.capacity`;
            const capString = basePropsWithFullNames.get(capFullName);
            effectiveMode = this._detectCapacityModeInternal(String(capString));
        }
        formattedQueue.effectiveCapacityMode = effectiveMode;


        // 5. Populate formattedQueue with simple-keyed properties by iterating QUEUE_CONFIG_CATEGORIES
        (QUEUE_CONFIG_CATEGORIES).forEach(category => {
            for (const placeholderPropName in category.properties) {
                if (Object.hasOwnProperty.call(category.properties, placeholderPropName)) {
                    const propDef = category.properties[placeholderPropName];
                    const simpleKey = placeholderPropName.substring(placeholderPropName.lastIndexOf('.') + 1);
                    const fullYarnName = placeholderPropName.replace(Q_PATH_PLACEHOLDER, queuePath);

                    let rawEffectiveValue;

                    // Priority for getting the raw value:
                    // 1. From pendingChangeDirectPayload (for UPDATE_OP, already has fullYarnName as key)
                    if (pendingChangeDirectPayload && pendingChangeDirectPayload[fullYarnName] !== undefined) {
                        rawEffectiveValue = pendingChangeDirectPayload[fullYarnName];
                    }
                        // 2. From basePropsWithFullNames (from store's getQueue().properties which has full YARN names)
                    //    This covers Trie values for existing queues and initial values for ADD_OP queues.
                    else if (basePropsWithFullNames.has(fullYarnName)) {
                        rawEffectiveValue = basePropsWithFullNames.get(fullYarnName);
                    }
                    // 3. Default value from metadata
                    else {
                        rawEffectiveValue = propDef.defaultValue;
                    }

                    // Format this rawEffectiveValue for UI display
                    let formattedValue = rawEffectiveValue;
                    if (simpleKey === 'capacity') {
                        formattedValue = this._ensureCapacityFormat(rawEffectiveValue, formattedQueue.effectiveCapacityMode, propDef.defaultValue);
                    } else if (simpleKey === 'maximum-capacity') { // Ensure consistent simpleKey
                        formattedValue = this._ensureMaxCapacityFormat(rawEffectiveValue, formattedQueue.effectiveCapacityMode, propDef.defaultValue);
                    } else if (propDef.type === 'boolean' && typeof rawEffectiveValue !== 'string' && rawEffectiveValue !== undefined) {
                        formattedValue = String(rawEffectiveValue);
                    }
                    // Add other specific property formatting if needed

                    // Set as a top-level simple-keyed property on the formattedQueue object
                    formattedQueue[simpleKey] = formattedValue;
                    // Also populate the new 'properties' map on formattedQueue with simpleKey -> formattedValue
                    formattedQueue.properties.set(simpleKey, formattedValue);
                }
            }
        });

        // Ensure main convenience fields like 'capacity', 'maximum-capacity', 'state' reflect the values
        // now stored with simple keys on formattedQueue object itself (and in its simple-keyed properties map).
        // These lines are more like assertions now, as the loop above should have set them.
        formattedQueue.maxCapacity = formattedQueue['maximum-capacity']; // capacity is already set in the loop

        // 6. Calculate other Display-Specific Strings & Values
        formattedQueue.displayName = formattedQueue.name || formattedQueue.path.split('.').pop();
        formattedQueue.displayNameTitle = `${formattedQueue.path} (Click to edit)`;

        // These use the already formatted simple-keyed properties from formattedQueue
        formattedQueue.capacityDisplay = formattedQueue.capacity;
        formattedQueue.maxCapacityDisplay = formattedQueue.maxCapacity;

        if (formattedQueue.effectiveCapacityMode === CAPACITY_MODES.ABSOLUTE || formattedQueue.effectiveCapacityMode === CAPACITY_MODES.VECTOR) {
            formattedQueue.capacityDetails = this._parseResourceVector(formattedQueue.capacityDisplay);
            formattedQueue.maxCapacityDetails = this._parseResourceVector(formattedQueue.maxCapacityDisplay);
        }

        // Use values from baseQueueData for runtime stats if they are not part of config
        formattedQueue.absoluteUsedCapacityDisplay = (baseQueueData.absoluteUsedCapacity !== undefined ? baseQueueData.absoluteUsedCapacity.toFixed(1) + '%' : 'N/A');
        formattedQueue.numApplications = baseQueueData.numApplications || 0;
        // queueType should be based on the structure after all pending changes are considered for hierarchy.
        // The formatter's _formatQueueRecursive will build the children, then we can determine type.
        // For now, use baseQueueData.queueType or derive simply.
        // This might be better set after _formatQueueRecursive builds the children for formattedQueue.
        formattedQueue.queueType = baseQueueData.queueType || (formattedQueue.children && Object.keys(formattedQueue.children).length > 0 ? 'parent' : 'leaf');


        // 7. Generate UI Labels (tags)
        formattedQueue.uiLabels = this._generateUILabels(formattedQueue);

        // 8. Status Class - already set in point 3.

        // 9. Deletion Eligibility (action labels for dropdown)
        //    (Using this.checkDeletability which is passed or global)
        if (formattedQueue.isDeleted) {
            formattedQueue.canBeDeletedForDropdown = true; // Action is "Undo Delete"
            formattedQueue.actionLabelForDelete = "Undo Delete";
            formattedQueue.deletionReason = "Marked for deletion.";
        } else if (formattedQueue.isRoot) {
            formattedQueue.canBeDeletedForDropdown = false;
            formattedQueue.actionLabelForDelete = "Delete Queue";
            formattedQueue.deletionReason = "Cannot delete root queue.";
        } else {
            // Use the checkDeletability helper
            const eligibility = checkDeletability(queuePath, this.queueStateStore); // Assuming checkDeletability is method or accessible
            formattedQueue.canBeDeletedForDropdown = eligibility.canDelete;
            formattedQueue.actionLabelForDelete = "Delete Queue";
            formattedQueue.deletionReason = eligibility.reason;
        }

        // 10. Children: formattedQueue.children was initialized from baseQueueData.children (raw).
        //     _formatQueueRecursive will replace/populate this with formatted children.

        return formattedQueue;
    }

    // --- Private Helper Methods ---

    _detectCapacityModeInternal(capacityString) {
        if (capacityString === undefined || capacityString === null) return CAPACITY_MODES.PERCENTAGE;
        const capStr = String(capacityString);
        if (capStr.endsWith('w')) return CAPACITY_MODES.WEIGHT;
        if (capStr.startsWith('[') && capStr.endsWith(']')) return CAPACITY_MODES.ABSOLUTE; // Or VECTOR
        return CAPACITY_MODES.PERCENTAGE;
    }

    _ensureCapacityFormat(value, mode, defaultValue) {
        let valStr = String(value);
        // Use defaultValue if current value is undefined/null
        if (value === undefined || value === null) {
            valStr = String(defaultValue !== undefined ? defaultValue : this._getDefaultCapacityValue(mode));
        }

        if (mode === CAPACITY_MODES.PERCENTAGE) {
            return valStr.endsWith('%') ? valStr : `${(parseFloat(valStr) || 0).toFixed(1)}%`;
        } else if (mode === CAPACITY_MODES.WEIGHT) {
            return valStr.endsWith('w') ? valStr : `${(parseFloat(valStr) || 0).toFixed(1)}w`;
        } else if (mode === CAPACITY_MODES.ABSOLUTE || mode === CAPACITY_MODES.VECTOR) {
            // Ensure it's bracketed for absolute/vector if not already
            return (valStr.startsWith('[') && valStr.endsWith(']')) ? valStr : `[${valStr.replace(/[\[\]]/g, '')}]`;
        }
        return valStr; // Should not happen if mode is one of the above
    }

    _ensureMaxCapacityFormat(value, effectiveParentMode, defaultValue) {
        let valStr = String(value);
        if (value === undefined || value === null) {
            valStr = String(defaultValue !== undefined ? defaultValue : this._getDefaultMaxCapacityValue(null, effectiveParentMode));
        }

        // Max capacity is usually percentage or absolute. If not an absolute vector, format as percentage.
        if (!(valStr.startsWith('[') && valStr.endsWith(']'))) {
            return valStr.endsWith('%') ? valStr : `${(parseFloat(valStr) || 100).toFixed(1)}%`;
        }
        return valStr; // Return as-is if it's an absolute vector
    }

    _getDefaultCapacityValue(mode) {
        if (mode === CAPACITY_MODES.WEIGHT) return '1.0w';
        if (mode === CAPACITY_MODES.ABSOLUTE || mode === CAPACITY_MODES.VECTOR) return '[memory=1024,vcores=1]';
        return '0%';
    }

    _getDefaultMaxCapacityValue(currentCapacity, mode) {
        // If current capacity is absolute, max often is too, or 100% of parent if relative.
        // This is a simplification; YARN's true default might be more complex (e.g. based on parent).
        if (mode === CAPACITY_MODES.ABSOLUTE || mode === CAPACITY_MODES.VECTOR) {
            // Attempt to parse currentCapacity and double it, or a fixed default
            const resources = this._parseResourceVector(currentCapacity);
            if (resources.length > 0) {
                return '[' + resources.map(r => `${r.key}=${(parseInt(r.value) || 1024) * 2}${r.unit || ''}`).join(',') + ']';
            }
            return '[memory=2048,vcores=2]';
        }
        return '100%';
    }


    _formatCapacityForDisplay(capacityValue, mode) {
        // (Copied from previous outline, seems robust)
        if (capacityValue === undefined || capacityValue === null) return "N/A";
        const capStr = String(capacityValue);
        switch (mode) {
            case CAPACITY_MODES.PERCENTAGE:
                return capStr.endsWith('%') ? capStr : `${(parseFloat(capStr) || 0).toFixed(1)}%`;
            case CAPACITY_MODES.WEIGHT:
                return capStr.endsWith('w') ? capStr : `${(parseFloat(capStr) || 0).toFixed(1)}w`;
            case CAPACITY_MODES.ABSOLUTE:
            case CAPACITY_MODES.VECTOR:
                return capStr; // Raw string for these modes often contains resource types
            default:
                return capStr;
        }
    }

    _formatMaxCapacityForDisplay(maxCapacityValue, effectiveParentMode) {
        if (maxCapacityValue === undefined || maxCapacityValue === null) return "N/A";
        const maxCapStr = String(maxCapacityValue);
        // If maxCapacity is absolute vector (starts with '['), display as is.
        if (maxCapStr.startsWith('[')) return maxCapStr;
        // Otherwise, assume it's a percentage.
        return maxCapStr.endsWith('%') ? maxCapStr : `${(parseFloat(maxCapStr) || 0).toFixed(1)}%`;
    }


    _parseResourceVector(resourceString) {
        // (Logic from createCapacityDisplay in queue-card.js)
        if (!resourceString || typeof resourceString !== 'string') return [];
        let cleanStr = resourceString.trim();
        if (cleanStr.startsWith("[") && cleanStr.endsWith("]")) {
            cleanStr = cleanStr.slice(1, -1);
        }
        if (!cleanStr) return [];

        return cleanStr.split(',').map(pair => {
            const [key, valuePart] = pair.split('=').map(s => s.trim());
            // Regex to separate value and unit (e.g., "1024mb" -> value: "1024", unit: "mb")
            const match = (valuePart || "").match(/^([0-9.]+)(.*)/);
            let value = valuePart || "";
            let unit = "";
            if (match) {
                value = match[1];
                unit = match[2];
            }
            return { key, value, unit: unit || "" }; // Ensure unit is always a string
        }).filter(item => item.key);
    }


    _generateUILabels(queueData) {
        // (Copied from previous outline, using queueData.effectiveCapacityMode and queueData.state)
        const labels = [];
        const modeIcons = {
            percentage: "📊", weight: "⚖️", absolute: "🎯", vector: "📐",
        };
        const modeText = queueData.effectiveCapacityMode.charAt(0).toUpperCase() + queueData.effectiveCapacityMode.slice(1);
        labels.push({
            text: `${modeIcons[queueData.effectiveCapacityMode] || "📊"} ${modeText}`,
            cssClass: "queue-tag tag-mode",
            title: `Capacity Mode: ${modeText}`
        });

        const state = queueData.state; // Already effective
        if (state === "STOPPED") {
            labels.push({ text: "🛑 Stopped", cssClass: "queue-tag tag-state tag-stopped", title: "Queue State: Stopped"});
        } else {
            labels.push({ text: "▶️ Running", cssClass: "queue-tag tag-state tag-running", title: "Queue State: Running"});
        }

        const autoCreateEnabled = queueData.properties.get('auto-create-child-queue.enabled') === 'true' ||
            queueData.properties.get('autoCreationEligibility') === "on" || // Check property from original data
            queueData.properties.get('autoCreationEligibility') === "enabled";
        if (autoCreateEnabled) {
            labels.push({ text: "⚡ Auto-Create", cssClass: "queue-tag tag-auto-create", title: "Auto Queue Creation Enabled"});
        }
        return labels;
    }

    // getFormattedQueueHierarchy and _formatQueueRecursive would remain as in the previous outline,
    // but _formatQueueRecursive would call this.getFormattedQueue(childPath).
    getFormattedQueueHierarchy() {
        const rootPath = this.queueStateStore.getQueueHierarchy()?.path;
        if (!rootPath) {
            console.warn("Root path not found for hierarchy formatting.");
            return null;
        }
        return this._formatQueueRecursive(rootPath);
    }

    _formatQueueRecursive(queuePath) {
        const formattedQueue = this.getFormattedQueue(queuePath);
        if (!formattedQueue) {
            // If getFormattedQueue returns null (e.g. queue truly doesn't exist), skip.
            return null;
        }

        // If a parent is marked for deletion, its children are effectively also going to be removed.
        // For display, we might still want to show them, but styled as affected.
        // Or, we can choose not to render children of a deleted parent.
        // For now, let's assume we render them if they exist, and they'll get their own status.
        // The `createQueueCard` for the parent will show it as "to-be-deleted".

        const baseQueueFromStore = this.queueStateStore.getQueue(queuePath); // Get it again to access its raw children structure
        if (baseQueueFromStore && baseQueueFromStore.children) {
            formattedQueue.children = {};
            Object.values(baseQueueFromStore.children).forEach(rawChild => {
                const formattedChild = this._formatQueueRecursive(rawChild.path);
                if (formattedChild) { // Only add if child itself is found and formatted
                    formattedQueue.children[rawChild.name] = formattedChild;
                }
            });
        }

        // Add pending new children (that are not yet in baseQueueFromStore.children)
        // This logic remains important.
        this.queueStateStore._iter(ADD_OP).forEach(entry => { // _iter from store
            const newQueueData = entry.data.change.newQueueData || entry.data.change;
            if (newQueueData.parentPath === queuePath) {
                if (!formattedQueue.children) formattedQueue.children = {};
                // Check if this new child isn't already processed (e.g. if store's getQueue included it somehow)
                if (!formattedQueue.children[newQueueData.name]) {
                    const formattedNewChild = this.getFormattedQueue(newQueueData.path); // Format the new child
                    if (formattedNewChild) {
                        formattedQueue.children[newQueueData.name] = formattedNewChild;
                    }
                }
            }
        });
        return formattedQueue;
    }
}
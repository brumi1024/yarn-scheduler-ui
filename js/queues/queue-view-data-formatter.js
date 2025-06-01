class QueueViewDataFormatter {
    constructor(queueStateStore, queueConfigMetadata, qPathPlaceholder) {
        this.queueStateStore = queueStateStore;
        this.QUEUE_CONFIG_CATEGORIES = queueConfigMetadata; // e.g., QUEUE_CONFIG_CATEGORIES
        this.Q_PATH_PLACEHOLDER = qPathPlaceholder;         // e.g., Q_PATH_PLACEHOLDER
    }

    /**
     * Returns a single queue object, fully formatted for display.
     * @param {string} queuePath - The full path of the queue.
     * @returns {Object|null} The formatted queue object, or null if not found.
     */
    getFormattedQueue(queuePath) {
        // 1. Get the base queue data with pending property changes already applied by the store.
        //    QueueStateStore.getQueue() should handle:
        //    - Retrieving from Trie or pendingAdditions.
        //    - Cloning the object.
        //    - Overlaying modifications from pendingChanges onto the properties map.
        //    - Setting basic fields like 'name', 'path', 'parentPath', 'properties', 'children' (raw),
        //      'capacityMode' (initial detection), 'state' (from properties).
        const baseQueueData = this.queueStateStore.getQueue(queuePath);

        if (!baseQueueData) {
            return null; // Queue genuinely doesn't exist in current state (Trie or pending).
        }

        // 2. Initialize the formattedQueue object (can be a shallow copy for top-level, deep for properties if needed)
        const formattedQueue = { ...baseQueueData };
        // Ensure properties is a Map, getQueue should already do this.
        formattedQueue.properties = new Map(baseQueueData.properties);


        // 3. Determine UI-specific states and flags
        const pendingChangeDirect = this.queueStateStore._changes.get(queuePath); // Get the raw change op + data
        formattedQueue.isNew = pendingChangeDirect?.op === ADD_OP && !(pendingChangeDirect?.change?.isDeletionMarked);
        formattedQueue.isDeleted = pendingChangeDirect?.op === DELETE_OP;
        formattedQueue.hasPendingChanges = pendingChangeDirect?.op === UPDATE_OP && !formattedQueue.isDeleted;
        formattedQueue.isRoot = (queuePath === 'root');
        formattedQueue.level = queuePath.split(".").length - 1;

        if (formattedQueue.isDeleted) {
            formattedQueue.statusClass = 'to-be-deleted';
        } else if (formattedQueue.isNew) {
            formattedQueue.statusClass = 'new-queue';
        } else if (formattedQueue.hasPendingChanges) {
            formattedQueue.statusClass = 'pending-changes';
        } else {
            formattedQueue.statusClass = '';
        }

        // When a queue is marked for deletion, canBeDeleted should be false,
        // and deletionReason should indicate it's already marked.
        // However, the dropdown menu needs to change (e.g., "Undo delete").
        // Let's ensure the formatter sets this clearly.
        const rawDeletionStatus = (typeof canQueueBeDeleted === 'function') ? canQueueBeDeleted(queuePath, formattedQueue.isDeleted) : { canDelete: !formattedQueue.isRoot && !formattedQueue.isDeleted, reason: "" };

        if (formattedQueue.isDeleted) {
            formattedQueue.canBeDeleted = false; // Or true, if 'delete' means 'undo delete' action
            formattedQueue.deletionReason = "Marked for deletion.";
        } else {
            formattedQueue.canBeDeleted = rawDeletionStatus.canDelete;
            formattedQueue.deletionReason = rawDeletionStatus.reason;
        }

        // 4. Determine Effective Capacity Mode (crucial for subsequent formatting)
        //    Priority: pending _ui_capacityMode > mode on baseQueueData (from store's initial detection) > re-detect.
        let effectiveMode = pendingChangeDirect?.change?._ui_capacityMode || baseQueueData.capacityMode;
        if (!effectiveMode) { // Fallback detection if store didn't set it or it's not in pending changes
            const capString = formattedQueue.properties.get('capacity');
            effectiveMode = this._detectCapacityModeInternal(capString);
        }
        formattedQueue.effectiveCapacityMode = effectiveMode;

        // 5. Populate core and metadata-defined properties on formattedQueue
        //    Iterate QUEUE_CONFIG_CATEGORIES to determine which properties to include and their effective values.
        //    The `baseQueueData.properties` (from the store) already reflects pending changes for *existing* properties.
        this.QUEUE_CONFIG_CATEGORIES.forEach(category => {
            for (const placeholderPropName in category.properties) {
                if (Object.hasOwnProperty.call(category.properties, placeholderPropName)) {
                    const propDef = category.properties[placeholderPropName];
                    // Determine the simple key (e.g., 'capacity') and the full YARN property name
                    const simpleKey = placeholderPropName.substring(placeholderPropName.lastIndexOf('.') + 1);
                    const fullYarnName = placeholderPropName.replace(this.Q_PATH_PLACEHOLDER, queuePath);

                    let effectiveValue;

                    // Priority for getting the value:
                    // 1. Pending changes for the full YARN property name (most specific)
                    const pendingChangeForFullYarnName = pendingChangeDirect?.change?.[fullYarnName];
                    // 2. Value from baseQueueData.properties (which store should have updated with pending simpleKey changes)
                    const valueFromStoreProps = formattedQueue.properties.get(simpleKey);
                    // 3. Default value from metadata
                    const defaultValueFromMetadata = propDef.defaultValue;

                    if (pendingChangeForFullYarnName !== undefined) {
                        effectiveValue = pendingChangeForFullYarnName;
                    } else if (valueFromStoreProps !== undefined) {
                        effectiveValue = valueFromStoreProps;
                    } else {
                        effectiveValue = defaultValueFromMetadata;
                    }

                    // Ensure correct format for specific properties like 'capacity' and 'maximumCapacity'
                    // based on the effectiveCapacityMode.
                    if (simpleKey === 'capacity') {
                        effectiveValue = this._ensureCapacityFormat(effectiveValue, formattedQueue.effectiveCapacityMode, defaultValueFromMetadata);
                    } else if (simpleKey === 'maximumCapacity') { // Ensure your simpleKey in metadata matches this
                        effectiveValue = this._ensureMaxCapacityFormat(effectiveValue, formattedQueue.effectiveCapacityMode, defaultValueFromMetadata);
                    }
                    // Add other specific property formatting if needed (e.g., for boolean strings 'true'/'false')

                    // Store this effective value in the properties map (using simpleKey)
                    formattedQueue.properties.set(simpleKey, effectiveValue);

                    // Also set as a top-level convenience field on formattedQueue if desired
                    // (e.g., formattedQueue.capacity, formattedQueue.state).
                    // You can choose a naming convention (e.g., camelCase from simpleKey if it has hyphens).
                    // For direct mapping:
                    formattedQueue[simpleKey] = effectiveValue;
                }
            }
        });
        formattedQueue.capacity = formattedQueue.properties.get('capacity');
        formattedQueue.maxCapacity = formattedQueue.properties.get('maximum-capacity'); // or the simpleKey you use for it
        formattedQueue.state = formattedQueue.properties.get('state');

        // 6. Calculate Display-Formatted Strings & Values
        formattedQueue.displayName = baseQueueData.name; // Highlighting can be done by the component
        formattedQueue.displayNameTitle = `${queuePath} (Click to edit)`;

        formattedQueue.capacityDisplay = this._formatCapacityForDisplay(
            formattedQueue.capacity,
            formattedQueue.effectiveCapacityMode
        );
        formattedQueue.maxCapacityDisplay = this._formatMaxCapacityForDisplay(
            formattedQueue.maxCapacity,
            formattedQueue.effectiveCapacityMode // Max cap mode is usually relative to parent or absolute
        );

        // For absolute/vector capacities, provide structured data
        if (formattedQueue.effectiveCapacityMode === CAPACITY_MODES.ABSOLUTE || formattedQueue.effectiveCapacityMode === CAPACITY_MODES.VECTOR) {
            formattedQueue.capacityDetails = this._parseResourceVector(formattedQueue.capacity);
            formattedQueue.maxCapacityDetails = this._parseResourceVector(formattedQueue.maxCapacity);
        }
        // Include other specific data points needed by info modal
        formattedQueue.absoluteUsedCapacityDisplay = (baseQueueData.absoluteUsedCapacity !== undefined ? baseQueueData.absoluteUsedCapacity.toFixed(1) + '%' : 'N/A');
        formattedQueue.numApplications = baseQueueData.numApplications || 0;
        formattedQueue.queueType = baseQueueData.queueType || (baseQueueData.children && Object.keys(baseQueueData.children).length > 0 ? 'parent' : 'leaf');


        // 7. Generate UI Labels (tags)
        formattedQueue.uiLabels = this._generateUILabels(formattedQueue);


        // 8. Determine Status Class for card styling
        if (formattedQueue.isNew) formattedQueue.statusClass = 'new-queue';
        else if (formattedQueue.isDeleted) formattedQueue.statusClass = 'to-be-deleted';
        else if (formattedQueue.hasPendingChanges) formattedQueue.statusClass = 'pending-changes';
        else formattedQueue.statusClass = '';


        // 9. Deletion Eligibility
        if (formattedQueue.isDeleted) {
            // For a queue ALREADY marked for deletion
            formattedQueue.canBeDeletedForDropdown = true; // True means the "Undo Delete" action is available
            formattedQueue.actionLabelForDelete = "Undo Delete";
            formattedQueue.deletionReason = "Marked for deletion.";
        } else if (formattedQueue.isRoot) {
            formattedQueue.canBeDeletedForDropdown = false;
            formattedQueue.actionLabelForDelete = "Delete Queue"; // Button will be disabled
            formattedQueue.deletionReason = "Cannot delete root queue.";
        }
        else {
            // For a queue NOT yet marked for deletion, check if it *can* be.
            // Assume 'checkDeletability' is now a global helper or accessible to the formatter.
            // It needs the store instance.
            const eligibility = checkDeletability(queuePath, this.queueStateStore);
            formattedQueue.canBeDeletedForDropdown = eligibility.canDelete;
            formattedQueue.actionLabelForDelete = "Delete Queue";
            formattedQueue.deletionReason = eligibility.reason;
        }

        // 10. Raw children object for hierarchy building (to be processed by _formatQueueRecursive)
        //     The 'children' from baseQueueData are raw. _formatQueueRecursive will handle formatting them.
        formattedQueue.children = baseQueueData.children || {};


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
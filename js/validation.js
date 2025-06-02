function validateQueueName(name) {
    if (!name) {
        return "Queue name is required";
    }
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
        return "Queue name is required";
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedName)) {
        return "Queue name can only contain letters, numbers, underscores, and hyphens";
    }
    return null;
}

function validateCapacity(capacity, mode) {
    const errors = [];
    const capacityStr = capacity != null ? capacity.toString() : '';

    if (mode === "weight") {
        if (!capacityStr.endsWith("w")) {
            errors.push('Weight capacity must end with "w"');
        }
    } else if (mode === "absolute") {
        const trimmedCapacityStr = capacityStr.trim();
        if (!trimmedCapacityStr.startsWith("[") || !trimmedCapacityStr.endsWith("]")) {
            errors.push("Absolute capacity must be enclosed in brackets []");
        }
        if (trimmedCapacityStr === "[]") {
            errors.push("Absolute capacity cannot be empty");
        }
    } else if (mode === "percentage") {
        const num = parseFloat(capacityStr);
        if (isNaN(num) || num < 0 || num > 100) {
            errors.push("Percentage capacity must be between 0 and 100");
        }
    }

    return errors;
}

/**
 * Validates that the sum of percentage capacities of direct children of a parent queue does not exceed 100%.
 * This function now operates on the hierarchy provided by QueueViewDataFormatter.
 * @returns {Array<Object>} An array of error objects, e.g., [{ message: "Error string" }]
 */
function validateCapacityTotals() {
    const errors = [];
    if (!viewDataFormatter) {
        console.warn("validateCapacityTotals: ViewDataFormatter not available.");
        return errors;
    }

    const formattedHierarchyRoot = viewDataFormatter.getFormattedQueueHierarchy();
    if (!formattedHierarchyRoot) {
        return errors;
    }

    function checkParentFormattedQueue(formattedParentQueue) {
        if (formattedParentQueue.isDeleted) {
            return;
        }

        if (formattedParentQueue.children && Object.keys(formattedParentQueue.children).length > 0) {
            let totalPercentageCapacity = 0;
            let hasPercentageChildren = false;

            Object.values(formattedParentQueue.children).forEach((formattedChildQueue) => {
                if (formattedChildQueue.isDeleted) {
                    return;
                }

                const childCapacityStr = String(formattedChildQueue.capacity);
                const childMode = formattedChildQueue.effectiveCapacityMode;

                if (childMode === CAPACITY_MODES.PERCENTAGE) {
                    hasPercentageChildren = true;
                    totalPercentageCapacity += parseFloat(childCapacityStr.replace('%', '')) || 0;
                }
            });

            if (hasPercentageChildren && totalPercentageCapacity > 100.001) { // Add a small epsilon for float comparisons
                errors.push({
                    message: `Queue ${formattedParentQueue.path}: Child percentage capacities sum to ${totalPercentageCapacity.toFixed(1)}%, which exceeds 100%.`
                });
            }

            Object.values(formattedParentQueue.children).forEach((child) => {
                if (!child.isDeleted && child.children && Object.keys(child.children).length > 0) { // Check !child.isDeleted here too
                    checkParentFormattedQueue(child);
                }
            });
        }
    }

    checkParentFormattedQueue(formattedHierarchyRoot);
    return errors;
}

/**
 * Validates all pending changes, currently focusing on capacity totals.
 * @returns {Array<Object>} An array of error objects.
 */
function validatePendingChanges() {
    return validateCapacityTotals();
}

window.validateQueueName = validateQueueName;
window.validateCapacity = validateCapacity;
window.validatePendingChanges = validatePendingChanges;
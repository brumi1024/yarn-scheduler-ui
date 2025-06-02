function validateQueueName(name) {
    if (!name || name.trim().length === 0) {
        return "Queue name is required";
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(name.trim())) {
        return "Queue name can only contain letters, numbers, underscores, and hyphens";
    }

    return null;
}

function validateCapacity(capacity, mode) {
    const errors = [];

    if (mode === "weight") {
        if (!capacity.toString().endsWith("w")) {
            errors.push('Weight capacity must end with "w"');
        }
    } else if (mode === "absolute") {
        const capacityStr = capacity.toString().trim();
        if (!capacityStr.startsWith("[") || !capacityStr.endsWith("]")) {
            errors.push("Absolute capacity must be enclosed in brackets []");
        }
        if (capacityStr === "[]") {
            errors.push("Absolute capacity cannot be empty");
        }
    } else if (mode === "percentage") {
        const num = parseFloat(capacity);
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
        // errors.push({ message: "Validation system error: Formatter not available." }); // Optional
        return errors; // Cannot perform validation without the formatter
    }

    const formattedHierarchyRoot = viewDataFormatter.getFormattedQueueHierarchy();
    if (!formattedHierarchyRoot) {
        // No hierarchy, so no totals to validate, or an error occurred fetching it.
        // Depending on desired behavior, could return empty errors or an error if root is expected.
        return errors;
    }

    function checkParentFormattedQueue(formattedParentQueue) {
        // Only proceed if the parent queue itself is not marked for deletion
        if (formattedParentQueue.isDeleted) {
            return;
        }

        if (formattedParentQueue.children && Object.keys(formattedParentQueue.children).length > 0) {
            let totalPercentageCapacity = 0;
            let hasPercentageChildren = false;

            Object.values(formattedParentQueue.children).forEach((formattedChildQueue) => {
                // Skip children that are marked for deletion in the formatted object
                if (formattedChildQueue.isDeleted) {
                    return;
                }

                // Values are already effective/pending, directly from the formatted object
                const childCapacityStr = String(formattedChildQueue.capacity); // e.g., "10%", "5w", "[mem=1,vc=1]"
                const childMode = formattedChildQueue.effectiveCapacityMode;

                if (childMode === CAPACITY_MODES.PERCENTAGE) {
                    hasPercentageChildren = true;
                    // Ensure '%' is removed if present before parsing, though formatter might provide numeric for percentage if desired
                    totalPercentageCapacity += parseFloat(childCapacityStr.replace('%', '')) || 0;
                }
            });

            if (hasPercentageChildren && totalPercentageCapacity > 100.001) { // Add a small epsilon for float comparisons
                errors.push({
                    message: `Queue ${formattedParentQueue.path}: Child percentage capacities sum to ${totalPercentageCapacity.toFixed(1)}%, which exceeds 100%.`
                });
            }

            // Recursively check children that are parents
            Object.values(formattedParentQueue.children).forEach((child) => {
                if (child.children && Object.keys(child.children).length > 0) { // Only recurse if child is a parent
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
    // This function might be expanded in the future to include other types of validations.
    return validateCapacityTotals();
}

window.validateQueueName = validateQueueName;
window.validateCapacity = validateCapacity;
window.validatePendingChanges = validatePendingChanges;

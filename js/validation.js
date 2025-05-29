function validateQueueName(name) {
    if (!name || name.trim().length === 0) {
        return 'Queue name is required';
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(name.trim())) {
        return 'Queue name can only contain letters, numbers, underscores, and hyphens';
    }

    return null;
}

function validateCapacity(capacity, mode) {
    const errors = [];

    if (mode === 'weight') {
        if (!capacity.toString().endsWith('w')) {
            errors.push('Weight capacity must end with "w"');
        }
    } else if (mode === 'absolute') {
        const capacityStr = capacity.toString().trim();
        if (!capacityStr.startsWith('[') || !capacityStr.endsWith(']')) {
            errors.push('Absolute capacity must be enclosed in brackets []');
        }
        if (capacityStr === '[]') {
            errors.push('Absolute capacity cannot be empty');
        }
    } else if (mode === 'percentage') {
        const num = parseFloat(capacity);
        if (isNaN(num) || num < 0 || num > 100) {
            errors.push('Percentage capacity must be between 0 and 100');
        }
    }

    return errors;
}

function validateCapacityTotals() {
    const errors = [];

    function checkParentQueue(queue) {
        if (queue.children && Object.keys(queue.children).length > 0) {
            let totalCapacity = 0;
            let hasPercentageChildren = false;

            Object.values(queue.children).forEach(child => {
                if (!pendingDeletions.has(child.path)) {
                    const pendingChange = pendingChanges.get(child.path);
                    const capacity = pendingChange?.capacity ?? child.capacity;
                    const mode = pendingChange?.capacityMode ?? child.capacityMode;

                    if (mode === 'percentage') {
                        hasPercentageChildren = true;
                        totalCapacity += parseFloat(capacity) || 0;
                    }
                }
            });

            Array.from(pendingAdditions.values()).forEach(newQueue => {
                if (newQueue.parentPath === queue.path && newQueue.capacityMode === 'percentage') {
                    hasPercentageChildren = true;
                    totalCapacity += parseFloat(newQueue.capacity) || 0;
                }
            });

            if (hasPercentageChildren && totalCapacity > 100) {
                errors.push(`Queue ${queue.path}: Child percentage capacities sum to ${totalCapacity.toFixed(1)}%, cannot exceed 100%`);
            }

            Object.values(queue.children).forEach(child => {
                checkParentQueue(child);
            });
        }
    }

    if (window.queueData) {
        checkParentQueue(window.queueData);
    }

    return errors;
}

function validatePendingChanges() {
    return validateCapacityTotals();
}

window.validateQueueName = validateQueueName;
window.validateCapacity = validateCapacity;
window.validatePendingChanges = validatePendingChanges;
// Types for capacity management
export interface ParsedCapacity {
    type: 'percentage' | 'weight' | 'absolute' | 'invalid';
    value?: number;
    resources?: Record<string, number | string>;
    error?: string;
}

export interface CapacityValidationResult {
    valid: boolean;
    errors?: string[];
    warnings?: string[];
}

/**
 * Parse a capacity value string into a structured format
 * Supports percentage, weight, and absolute resource formats
 */
export function parseCapacityValue(value: string): ParsedCapacity {
    // Return error for empty string
    if (!value || value.trim() === '') {
        return { type: 'invalid', error: 'Empty capacity value' };
    }

    const trimmed = value.trim();

    // Check for negative values first (but allow negative weight format like -5w)
    if (trimmed.startsWith('-') && !trimmed.endsWith('w')) {
        return { type: 'invalid', error: 'Capacity cannot be negative' };
    }

    // Check for percentage format (numeric or with % suffix)
    if (/^\d+(\.\d+)?%?$/.test(trimmed)) {
        const numValue = parseFloat(trimmed.replace('%', ''));
        
        // Check for negative values
        if (numValue < 0) {
            return { type: 'invalid', error: 'Capacity cannot be negative' };
        }
        
        // Check for percentage over 100
        if (trimmed.includes('%') && numValue > 100) {
            return { type: 'invalid', error: 'Percentage cannot exceed 100' };
        }
        
        return { type: 'percentage', value: numValue };
    }

    // Check for weight format (number followed by 'w') - including negative weights
    if (/^-?\d+(\.\d+)?w$/.test(trimmed)) {
        const numValue = parseFloat(trimmed.slice(0, -1));
        
        // Check for negative values
        if (numValue <= 0) {
            return { type: 'invalid', error: 'Weight must be positive' };
        }
        
        return { type: 'weight', value: numValue };
    }

    // Check for absolute resource format [resource=value, ...]
    if (trimmed.startsWith('[')) {
        if (!trimmed.endsWith(']')) {
            return { type: 'invalid', error: 'Invalid absolute resource format' };
        }
        
        try {
            const content = trimmed.slice(1, -1);
            const resources: Record<string, number | string> = {};
            
            // Split by comma and parse each resource
            const pairs = content.split(',').map(s => s.trim());
            
            for (const pair of pairs) {
                const [resource, value] = pair.split('=').map(s => s.trim());
                if (!resource || !value) {
                    return { type: 'invalid', error: 'Invalid absolute resource format' };
                }
                
                resources[resource] = value;
            }
            
            return { type: 'absolute', resources };
        } catch (e) {
            return { type: 'invalid', error: 'Invalid absolute resource format' };
        }
    }

    // Invalid format
    return { type: 'invalid', error: `Invalid capacity format: ${value}` };
}

/**
 * Validate capacity constraints for a queue and its children
 */
export function validateCapacityConstraints(
    config: Record<string, string>,
    queuePath: string
): CapacityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Get queue prefix for property lookups
    const queuePrefix = `yarn.scheduler.capacity.${queuePath}`;
    
    // Get queue capacity
    const capacityStr = config[`${queuePrefix}.capacity`];
    if (!capacityStr) {
        return { valid: true }; // No capacity defined, nothing to validate
    }
    
    const capacity = parseCapacityValue(capacityStr);
    if (capacity.type === 'invalid') {
        errors.push(capacity.error || 'Invalid capacity format');
        return { valid: false, errors };
    }
    
    // Check maximum capacity
    const maxCapacityStr = config[`${queuePrefix}.maximum-capacity`];
    if (maxCapacityStr) {
        const maxCapacity = parseCapacityValue(maxCapacityStr);
        
        // Both must be same type for comparison
        if (capacity.type === 'percentage' && maxCapacity.type === 'percentage') {
            if (maxCapacity.value! < capacity.value!) {
                errors.push(`Maximum capacity (${maxCapacity.value}%) cannot be less than capacity (${capacity.value}%)`);
            }
        }
    }
    
    // Validate child queue capacities
    const queuesStr = config[`${queuePrefix}.queues`];
    if (queuesStr) {
        const childQueues = queuesStr.split(',').map(q => q.trim()).filter(q => q);
        const childCapacityTypes = new Set<string>();
        let totalChildCapacity = 0;
        
        for (const childName of childQueues) {
            const childPath = `${queuePath}.${childName}`;
            const childCapacityStr = config[`yarn.scheduler.capacity.${childPath}.capacity`];
            
            if (childCapacityStr) {
                const childCapacity = parseCapacityValue(childCapacityStr);
                if (childCapacity.type !== 'invalid') {
                    childCapacityTypes.add(childCapacity.type);
                    if (childCapacity.type === 'percentage') {
                        totalChildCapacity += childCapacity.value!;
                    }
                }
            }
        }
        
        // Check for mixed modes
        if (childCapacityTypes.size > 1) {
            warnings.push('Mixed capacity modes detected - percentage validation skipped');
        } else if (capacity.type === 'percentage' && childCapacityTypes.has('percentage') && totalChildCapacity > 0) {
            // Allow small rounding errors (0.01%)
            if (Math.abs(totalChildCapacity - capacity.value!) > 0.01) {
                if (totalChildCapacity > capacity.value!) {
                    errors.push(`Child queue capacities (${totalChildCapacity}%) exceed parent capacity (${capacity.value}%)`);
                }
            }
        }
    }
    
    // Validate weight mode
    if (capacity.type === 'weight' && capacity.value! <= 0) {
        errors.push('Weight must be positive');
    }
    
    // Validate absolute mode
    if (capacity.type === 'absolute' && !capacity.resources?.memory) {
        errors.push('Memory must be specified in absolute resource format');
    }
    
    return {
        valid: errors.length === 0,
        ...(errors.length > 0 && { errors }),
        ...(warnings.length > 0 && { warnings })
    };
}


export type CapacityMode = 'percentage' | 'weight' | 'absolute' | 'mixed';

export interface ParsedCapacity {
    mode: CapacityMode;
    rawValue: string;
    numericValue?: number;
    resources?: Record<string, number>;
}

export class CapacityParser {
    static parse(value: string): ParsedCapacity {
        const trimmed = value.trim();
        
        // Percentage: "50" or "50%" or "50.5%"
        if (trimmed.endsWith('%')) {
            const numeric = parseFloat(trimmed.slice(0, -1));
            return {
                mode: 'percentage',
                rawValue: trimmed,
                numericValue: numeric,
            };
        }
        
        // Weight: "2w" or "10.5w"
        if (trimmed.endsWith('w')) {
            const numeric = parseFloat(trimmed.slice(0, -1));
            return {
                mode: 'weight',
                rawValue: trimmed,
                numericValue: numeric,
            };
        }
        
        // Absolute: "[memory=1024,vcores=2]"
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            const resources: Record<string, number> = {};
            const content = trimmed.slice(1, -1);
            
            content.split(',').forEach(pair => {
                const [key, value] = pair.split('=');
                if (key && value) {
                    resources[key.trim()] = parseFloat(value.trim());
                }
            });
            
            return {
                mode: 'absolute',
                rawValue: trimmed,
                resources,
            };
        }
        
        // Default: assume percentage without % sign
        const numeric = parseFloat(trimmed);
        if (!isNaN(numeric)) {
            return {
                mode: 'percentage',
                rawValue: trimmed,
                numericValue: numeric,
            };
        }
        
        // Invalid format
        throw new Error(`Invalid capacity format: ${value}`);
    }
    
    static format(capacity: ParsedCapacity): string {
        switch (capacity.mode) {
            case 'percentage':
                return `${capacity.numericValue}%`;
            case 'weight':
                return `${capacity.numericValue}w`;
            case 'absolute': {
                const pairs = Object.entries(capacity.resources || {})
                    .map(([k, v]) => `${k}=${v}`)
                    .join(',');
                return `[${pairs}]`;
            }
            default:
                return capacity.rawValue;
        }
    }

    /**
     * Convert a capacity value from one mode to another
     * Note: This is a basic implementation. Real conversion would need more context
     */
    static convertMode(capacity: ParsedCapacity, targetMode: CapacityMode): ParsedCapacity {
        if (capacity.mode === targetMode) {
            return capacity;
        }

        // For now, just preserve the raw value and change the mode
        // In a real implementation, you'd need context about total resources, etc.
        switch (targetMode) {
            case 'percentage':
                if (capacity.mode === 'weight' && capacity.numericValue !== undefined) {
                    // Simple conversion: assume total weight of 100
                    return {
                        mode: 'percentage',
                        rawValue: `${capacity.numericValue}%`,
                        numericValue: capacity.numericValue,
                    };
                }
                break;
            case 'weight':
                if (capacity.mode === 'percentage' && capacity.numericValue !== undefined) {
                    return {
                        mode: 'weight',
                        rawValue: `${capacity.numericValue}w`,
                        numericValue: capacity.numericValue,
                    };
                }
                break;
            case 'absolute':
                // Would need cluster resource information
                return {
                    mode: 'absolute',
                    rawValue: '[memory=1024,vcores=2]',
                    resources: { memory: 1024, vcores: 2 },
                };
        }

        // Fallback: return original capacity
        return capacity;
    }
}
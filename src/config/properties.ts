import { z } from 'zod';

// Single source of truth for all properties
export interface PropertyDefinition {
    key: string;
    label: string;
    type: 'text' | 'number' | 'boolean' | 'select' | 'capacity';
    defaultValue: any;
    description: string;
    validation: z.ZodType;
    options?: string[]; // For select type
    group: 'core' | 'resource' | 'advanced' | 'auto-creation';
    // Function to get the value from a raw queue object for comparison
    getValueFromQueue: (queue: any) => any;
}

// Zod schema for capacity values with custom validation
export const capacityValueSchema = z
    .string()
    .min(1, 'Capacity value is required')
    .refine(
        (value) => {
            const trimmedValue = value.trim();

            // Percentage mode: ends with % or is a raw number
            if (trimmedValue.endsWith('%')) {
                const numericPart = trimmedValue.slice(0, -1);
                const numericValue = parseFloat(numericPart);
                return !isNaN(numericValue) && numericValue >= 0 && numericValue <= 100;
            }

            // Weight mode: ends with w
            if (trimmedValue.endsWith('w')) {
                const numericPart = trimmedValue.slice(0, -1);
                const numericValue = parseFloat(numericPart);
                return !isNaN(numericValue) && numericValue > 0;
            }

            // Absolute mode: [resource=value,resource=value]
            if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
                const resourcePart = trimmedValue.slice(1, -1);
                if (resourcePart.trim() === '') return false;

                const resourcePairs = resourcePart.split(',');
                return resourcePairs.every((pair) => {
                    const [resource, val] = pair.split('=');
                    return resource && val && !isNaN(parseFloat(val));
                });
            }

            // Raw number (assume percentage)
            const numericValue = parseFloat(trimmedValue);
            return !isNaN(numericValue) && numericValue >= 0;
        },
        {
            message:
                'Invalid format. Use percentage (e.g., 10%), weight (e.g., 5w), or absolute ([memory=1024,vcores=2])',
        }
    );

// All queue properties in one place
export const QUEUE_PROPERTIES: Record<string, PropertyDefinition> = {
    capacity: {
        key: 'capacity',
        label: 'Capacity',
        type: 'capacity',
        defaultValue: '10%',
        description: 'Guaranteed queue capacity. Can be percentage, weight, or absolute.',
        validation: capacityValueSchema,
        group: 'core',
        getValueFromQueue: (q) => `${q.capacity}%`,
    },
    'maximum-capacity': {
        key: 'maximum-capacity',
        label: 'Maximum Capacity',
        type: 'capacity',
        defaultValue: '100%',
        description: 'Maximum capacity the queue can utilize.',
        validation: capacityValueSchema,
        group: 'core',
        getValueFromQueue: (q) => `${q.maxCapacity}%`,
    },
    state: {
        key: 'state',
        label: 'State',
        type: 'select',
        options: ['RUNNING', 'STOPPED'],
        defaultValue: 'RUNNING',
        description: 'The operational state of the queue.',
        validation: z.enum(['RUNNING', 'STOPPED']),
        group: 'core',
        getValueFromQueue: (q) => q.state,
    },
    'user-limit-factor': {
        key: 'user-limit-factor',
        label: 'User Limit Factor',
        type: 'number',
        defaultValue: 1,
        description: 'Multiplier for per-user resource limits.',
        validation: z.number().min(0),
        group: 'resource',
        getValueFromQueue: (q) => q.userLimitFactor || 1,
    },
    'maximum-applications': {
        key: 'maximum-applications',
        label: 'Maximum Applications',
        type: 'number',
        defaultValue: 10000,
        description: 'The maximum number of applications that can be active in the queue.',
        validation: z.number().int().min(0),
        group: 'resource',
        getValueFromQueue: (q) => q.maxApplications,
    },
    'maximum-am-resource-percent': {
        key: 'maximum-am-resource-percent',
        label: 'Max AM Resource %',
        type: 'number',
        defaultValue: 0.1,
        description: 'Max % of resources for Application Masters (0.0 to 1.0).',
        validation: z.number().min(0).max(1),
        group: 'resource',
        getValueFromQueue: (q) => q.maxAMResourcePercent || 0.1,
    },
    'ordering-policy': {
        key: 'ordering-policy',
        label: 'Ordering Policy',
        type: 'select',
        options: ['fifo', 'fair'],
        defaultValue: 'fifo',
        description: 'How applications are ordered within the queue.',
        validation: z.enum(['fifo', 'fair']),
        group: 'advanced',
        getValueFromQueue: (q) => q.orderingPolicy || 'fifo',
    },
    disable_preemption: {
        key: 'disable_preemption',
        label: 'Disable Preemption',
        type: 'boolean',
        defaultValue: false,
        description: 'If true, this queue will not have its resources preempted.',
        validation: z.boolean(),
        group: 'advanced',
        getValueFromQueue: (q) => q.preemptionDisabled || false,
    },
    'auto-create-child-queue.enabled': {
        key: 'auto-create-child-queue.enabled',
        label: 'Auto-Create Child Queues (Legacy)',
        type: 'boolean',
        defaultValue: false,
        description: 'Enable automatic creation of leaf queues (legacy mode).',
        validation: z.boolean(),
        group: 'auto-creation',
        getValueFromQueue: (q) => q.autoCreateChildQueueEnabled || false,
    },
    'accessible-node-labels': {
        key: 'accessible-node-labels',
        label: 'Accessible Node Labels',
        type: 'text',
        defaultValue: [],
        description: 'Node labels that this queue can access.',
        validation: z.array(z.string()).optional(),
        group: 'resource',
        getValueFromQueue: (q) => q.nodeLabels || q.accessibleNodeLabels || [],
    },
    // Add other properties here following the same pattern...
};

// Helper function to get property groups for the UI
export function getPropertyGroups() {
    const groups: Record<string, { name: string; properties: PropertyDefinition[] }> = {
        core: { name: 'Core Properties', properties: [] },
        resource: { name: 'Resource Management', properties: [] },
        advanced: { name: 'Advanced Settings', properties: [] },
        'auto-creation': { name: 'Auto-Creation', properties: [] },
    };

    Object.values(QUEUE_PROPERTIES).forEach((prop) => {
        if (groups[prop.group]) {
            groups[prop.group].properties.push(prop);
        }
    });

    return Object.values(groups);
}

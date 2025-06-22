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
    group: 'core' | 'resource' | 'advanced' | 'auto-creation' | 'security';
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

// Add missing validation schemas
export const userLimitSchema = z.number().int().min(0).max(100);
export const queueStateSchema = z.enum(['RUNNING', 'STOPPED']);
export const orderingPolicySchema = z.enum(['fifo', 'fair']);
export const aclSchema = z.string().regex(/^([\w,]+)?(\s+([\w,]+)?)?$/, 'Invalid ACL format');

// Define ALL queue properties from CS_config_guide.md
export const QUEUE_PROPERTIES: Record<string, PropertyDefinition> = {
    // === CORE PROPERTIES ===
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
        validation: queueStateSchema,
        group: 'core',
        getValueFromQueue: (q) => q.state,
    },

    queues: {
        key: 'queues',
        label: 'Child Queues',
        type: 'text',
        defaultValue: '',
        description: 'Comma-separated list of child queue names',
        validation: z.string(),
        group: 'core',
        getValueFromQueue: (q) => q.childQueueNames?.join(',') || '',
    },

    // === RESOURCE MANAGEMENT ===
    'minimum-user-limit-percent': {
        key: 'minimum-user-limit-percent',
        label: 'Minimum User Limit %',
        type: 'number',
        defaultValue: 100,
        description: 'Minimum guaranteed resources per user (0-100)',
        validation: userLimitSchema,
        group: 'resource',
        getValueFromQueue: (q) => q.minimumUserLimitPercent || 100,
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

    'maximum-allocation-mb': {
        key: 'maximum-allocation-mb',
        label: 'Max Allocation Memory (MB)',
        type: 'number',
        defaultValue: -1,
        description: 'Maximum memory per container in MB (-1 inherits from cluster)',
        validation: z.number().int().min(-1),
        group: 'resource',
        getValueFromQueue: (q) => q.maxAllocationMb || -1,
    },

    'maximum-allocation-vcores': {
        key: 'maximum-allocation-vcores',
        label: 'Max Allocation vCores',
        type: 'number',
        defaultValue: -1,
        description: 'Maximum vCores per container (-1 inherits from cluster)',
        validation: z.number().int().min(-1),
        group: 'resource',
        getValueFromQueue: (q) => q.maxAllocationVcores || -1,
    },

    // === ADVANCED SETTINGS ===
    'ordering-policy': {
        key: 'ordering-policy',
        label: 'Ordering Policy',
        type: 'select',
        options: ['fifo', 'fair'],
        defaultValue: 'fifo',
        description: 'How applications are ordered within the queue.',
        validation: orderingPolicySchema,
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

    'intra-queue-preemption.disable_preemption': {
        key: 'intra-queue-preemption.disable_preemption',
        label: 'Disable Intra-Queue Preemption',
        type: 'boolean',
        defaultValue: false,
        description: 'Disable preemption within this queue',
        validation: z.boolean(),
        group: 'advanced',
        getValueFromQueue: (q) => q.intraQueuePreemptionDisabled || false,
    },

    priority: {
        key: 'priority',
        label: 'Queue Priority',
        type: 'number',
        defaultValue: 0,
        description: 'Queue priority (higher values = higher priority)',
        validation: z.number().int(),
        group: 'advanced',
        getValueFromQueue: (q) => q.priority || 0,
    },

    'maximum-application-lifetime': {
        key: 'maximum-application-lifetime',
        label: 'Max Application Lifetime (seconds)',
        type: 'number',
        defaultValue: -1,
        description: 'Maximum application lifetime in seconds (-1 = unlimited)',
        validation: z.number().int().min(-1),
        group: 'advanced',
        getValueFromQueue: (q) => q.maxApplicationLifetime || -1,
    },

    'default-application-lifetime': {
        key: 'default-application-lifetime',
        label: 'Default Application Lifetime (seconds)',
        type: 'number',
        defaultValue: -1,
        description: 'Default application lifetime in seconds (-1 = unlimited)',
        validation: z.number().int().min(-1),
        group: 'advanced',
        getValueFromQueue: (q) => q.defaultApplicationLifetime || -1,
    },

    // === ACLs ===
    acl_submit_applications: {
        key: 'acl_submit_applications',
        label: 'Submit Applications ACL',
        type: 'text',
        defaultValue: '*',
        description: 'Who can submit apps: "user1,user2 group1,group2" (* = everyone)',
        validation: aclSchema,
        group: 'security',
        getValueFromQueue: (q) => q.aclSubmitApps || '*',
    },

    acl_administer_queue: {
        key: 'acl_administer_queue',
        label: 'Administer Queue ACL',
        type: 'text',
        defaultValue: '*',
        description: 'Who can admin queue: "user1,user2 group1,group2" (* = everyone)',
        validation: aclSchema,
        group: 'security',
        getValueFromQueue: (q) => q.aclAdministerQueue || '*',
    },

    // === NODE LABELS ===
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

    'default-node-label-expression': {
        key: 'default-node-label-expression',
        label: 'Default Node Label',
        type: 'text',
        defaultValue: '',
        description: 'Default node label for applications',
        validation: z.string(),
        group: 'resource',
        getValueFromQueue: (q) => q.defaultNodeLabelExpression || '',
    },

    // === AUTO-CREATION ===
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

    'auto-queue-creation-v2.enabled': {
        key: 'auto-queue-creation-v2.enabled',
        label: 'Enable Flexible Auto-Creation',
        type: 'boolean',
        defaultValue: false,
        description: 'Enable auto-creation of parent and leaf queues',
        validation: z.boolean(),
        group: 'auto-creation',
        getValueFromQueue: (q) => q.autoQueueCreationV2Enabled || false,
    },

    'auto-queue-creation-v2.max-queues': {
        key: 'auto-queue-creation-v2.max-queues',
        label: 'Max Auto-Created Queues',
        type: 'number',
        defaultValue: 1000,
        description: 'Maximum number of auto-created queues',
        validation: z.number().int().positive(),
        group: 'auto-creation',
        getValueFromQueue: (q) => q.maxAutoCreatedQueues || 1000,
    },
};

// Helper function to get property groups for the UI
export function getPropertyGroups() {
    const groups: Record<string, { name: string; properties: PropertyDefinition[] }> = {
        core: { name: 'Core Properties', properties: [] },
        resource: { name: 'Resource Management', properties: [] },
        security: { name: 'Security & ACLs', properties: [] },
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

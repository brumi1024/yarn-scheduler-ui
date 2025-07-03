import { z } from 'zod';
import type { PropertyDescriptor, PropertyCategory, PropertyType } from '~/lib/types/property-descriptor';

export const capacityValueSchema = z
    .string()
    .refine(
        (value) => {
            if (!value.trim()) return true;

            const trimmedValue = value.trim();

            if (trimmedValue.endsWith('%')) {
                const numericPart = trimmedValue.slice(0, -1);
                const numericValue = parseFloat(numericPart);
                return !isNaN(numericValue) && numericValue >= 0 && numericValue <= 100;
            }

            if (trimmedValue.endsWith('w')) {
                const numericPart = trimmedValue.slice(0, -1);
                const numericValue = parseFloat(numericPart);
                return !isNaN(numericValue) && numericValue > 0;
            }

            if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
                const resourcePart = trimmedValue.slice(1, -1);
                if (resourcePart.trim() === '') return false;

                const resourcePairs = resourcePart.split(',');
                return resourcePairs.every((pair) => {
                    const [resource, val] = pair.split('=');
                    return resource && val && !isNaN(parseFloat(val));
                });
            }

            const numericValue = parseFloat(trimmedValue);
            return !isNaN(numericValue) && numericValue >= 0 && numericValue <= 100;
        },
        {
            message: 'Invalid capacity format. Use percentage (50), weight (2w), or absolute ([memory=1024,vcores=2])',
        }
    );

export const percentageSchema = z
    .string()
    .refine(
        (value) => {
            if (!value.trim()) return true;
            const numericValue = parseFloat(value);
            return !isNaN(numericValue) && numericValue >= 0 && numericValue <= 100;
        },
        { message: 'Must be a number between 0 and 100' }
    );

export const positiveNumberSchema = z
    .string()
    .refine(
        (value) => {
            if (!value.trim()) return true;
            const numericValue = parseFloat(value);
            return !isNaN(numericValue) && numericValue > 0;
        },
        { message: 'Must be a positive number' }
    );

export const nonNegativeNumberSchema = z
    .string()
    .refine(
        (value) => {
            if (!value.trim()) return true;
            const numericValue = parseFloat(value);
            return !isNaN(numericValue) && numericValue >= 0;
        },
        { message: 'Must be a non-negative number' }
    );

export const integerSchema = z
    .string()
    .refine(
        (value) => {
            if (!value.trim()) return true;
            const numericValue = parseFloat(value);
            return !isNaN(numericValue) && Number.isInteger(numericValue) && numericValue > 0;
        },
        { message: 'Must be a positive integer' }
    );

export const aclFormatSchema = z
    .string()
    .refine(
        (value) => {
            if (!value.trim()) return true;

            if (value === '*' || value === ' ') return true;

            const parts = value.split(' ');
            if (parts.length > 2) return false;

            return parts.every(part => {
                if (!part) return true;
                return part.split(',').every(item =>
                    item.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(item.trim())
                );
            });
        },
        { message: 'Invalid ACL format. Use "user1,user2 group1,group2" or "*" or " " (space for none)' }
    );

export const queuePropertyDefinitions: PropertyDescriptor[] = [
    {
        name: 'capacity',
        displayName: 'Capacity',
        description: 'Queue capacity allocation. Supports percentage (50), weight (2w), or absolute ([memory=1024,vcores=2]) formats.',
        type: 'string' as PropertyType,
        category: 'general' as PropertyCategory,
        defaultValue: '',
        required: true,
        validationRules: [
            {
                type: 'custom',
                message: 'Capacity is required and must be valid format',
                validator: (value: string) => capacityValueSchema.safeParse(value).success && value.trim() !== ''
            }
        ]
    },
    {
        name: 'maximum-capacity',
        displayName: 'Maximum Capacity',
        description: 'Maximum capacity the queue can expand to. Must be >= capacity. Use -1 for unlimited (100%).',
        type: 'string' as PropertyType,
        category: 'general' as PropertyCategory,
        defaultValue: '',
        required: false,
        validationRules: [
            {
                type: 'custom',
                message: 'Invalid maximum capacity format',
                validator: (value: string) => {
                    if (!value.trim()) return true;
                    if (value === '-1') return true;
                    return capacityValueSchema.safeParse(value).success;
                }
            }
        ]
    },
    {
        name: 'state',
        displayName: 'Queue State',
        description: 'Operational state of the queue',
        type: 'enum' as PropertyType,
        category: 'general' as PropertyCategory,
        defaultValue: 'RUNNING',
        required: false,
        enumValues: ['RUNNING', 'STOPPED']
    },

    {
        name: 'minimum-user-limit-percent',
        displayName: 'Minimum User Limit Percent',
        description: 'Minimum percentage of queue resources per user (0-100). 100 means no user limits.',
        type: 'number' as PropertyType,
        category: 'limits' as PropertyCategory,
        defaultValue: '',
        required: false,
        validationRules: [
            {
                type: 'range',
                message: 'Must be between 0 and 100',
                min: 0,
                max: 100
            }
        ]
    },
    {
        name: 'user-limit-factor',
        displayName: 'User Limit Factor',
        description: 'Multiplier for user resource limits beyond queue capacity. Use -1 to disable.',
        type: 'number' as PropertyType,
        category: 'limits' as PropertyCategory,
        defaultValue: '',
        required: false,
        validationRules: [
            {
                type: 'custom',
                message: 'Must be positive number or -1',
                validator: (value: string) => {
                    if (!value.trim()) return true;
                    const num = parseFloat(value);
                    return !isNaN(num) && (num > 0 || num === -1);
                }
            }
        ]
    },

    {
        name: 'maximum-applications',
        displayName: 'Maximum Applications',
        description: 'Maximum concurrent applications (running + pending) in this queue',
        type: 'number' as PropertyType,
        category: 'limits' as PropertyCategory,
        defaultValue: '',
        required: false,
        validationRules: [
            {
                type: 'custom',
                message: 'Must be a positive integer',
                validator: (value: string) => integerSchema.safeParse(value).success
            }
        ]
    },
    {
        name: 'maximum-am-resource-percent',
        displayName: 'Maximum AM Resource Percent',
        description: 'Maximum percentage of queue resources for Application Masters (0.0-1.0)',
        type: 'number' as PropertyType,
        category: 'limits' as PropertyCategory,
        defaultValue: '',
        required: false,
        validationRules: [
            {
                type: 'range',
                message: 'Must be between 0.0 and 1.0',
                min: 0.0,
                max: 1.0
            }
        ],
        displayFormat: {
            suffix: ' (0.0-1.0)',
            decimals: 2
        }
    },
    {
        name: 'max-parallel-apps',
        displayName: 'Max Parallel Apps',
        description: 'Maximum simultaneously running applications (not pending submissions)',
        type: 'number' as PropertyType,
        category: 'limits' as PropertyCategory,
        defaultValue: '',
        required: false,
        validationRules: [
            {
                type: 'custom',
                message: 'Must be a positive integer',
                validator: (value: string) => integerSchema.safeParse(value).success
            }
        ]
    },

    {
        name: 'ordering-policy',
        displayName: 'Ordering Policy',
        description: 'Application ordering policy within the queue',
        type: 'enum' as PropertyType,
        category: 'scheduling' as PropertyCategory,
        defaultValue: '',
        required: false,
        enumValues: ['fifo', 'fair']
    },
    {
        name: 'ordering-policy.fair.enable-size-based-weight',
        displayName: 'Fair Policy Size-Based Weight',
        description: 'Enable size-based weighting in fair scheduling (only applies when ordering-policy=fair)',
        type: 'boolean' as PropertyType,
        category: 'scheduling' as PropertyCategory,
        defaultValue: '',
        required: false,
        enableWhen: {
            'ordering-policy': (value: string) => value === 'fair'
        }
    },
    {
        name: 'default-application-priority',
        displayName: 'Default Application Priority',
        description: 'Default priority for applications submitted to this queue',
        type: 'number' as PropertyType,
        category: 'scheduling' as PropertyCategory,
        defaultValue: '',
        required: false,
        validationRules: [
            {
                type: 'custom',
                message: 'Must be a non-negative integer',
                validator: (value: string) => {
                    if (!value.trim()) return true;
                    const num = parseInt(value, 10);
                    return !isNaN(num) && Number.isInteger(num) && num >= 0;
                }
            }
        ]
    },

    {
        name: 'acl_submit_applications',
        displayName: 'Submit Applications ACL',
        description: 'Controls who can submit applications to this queue. Format: "user1,user2 group1,group2", "*" for all, " " (space) for none.',
        type: 'string' as PropertyType,
        category: 'security' as PropertyCategory,
        defaultValue: '',
        required: false,
        validationRules: [
            {
                type: 'custom',
                message: 'Invalid ACL format',
                validator: (value: string) => aclFormatSchema.safeParse(value).success
            }
        ]
    },
    {
        name: 'acl_administer_queue',
        displayName: 'Administer Queue ACL',
        description: 'Controls who can administer applications on this queue (kill, view, modify). Format: "user1,user2 group1,group2", "*" for all, " " (space) for none.',
        type: 'string' as PropertyType,
        category: 'security' as PropertyCategory,
        defaultValue: '',
        required: false,
        validationRules: [
            {
                type: 'custom',
                message: 'Invalid ACL format',
                validator: (value: string) => aclFormatSchema.safeParse(value).success
            }
        ]
    },

    {
        name: 'maximum-allocation-mb',
        displayName: 'Maximum Allocation MB',
        description: 'Per-queue maximum memory allocation override (MB)',
        type: 'number' as PropertyType,
        category: 'resource' as PropertyCategory,
        defaultValue: '',
        required: false,
        validationRules: [
            {
                type: 'custom',
                message: 'Must be a positive integer',
                validator: (value: string) => integerSchema.safeParse(value).success
            }
        ]
    },
    {
        name: 'maximum-allocation-vcores',
        displayName: 'Maximum Allocation VCores',
        description: 'Per-queue maximum vcore allocation override',
        type: 'number' as PropertyType,
        category: 'resource' as PropertyCategory,
        defaultValue: '',
        required: false,
        validationRules: [
            {
                type: 'custom',
                message: 'Must be a positive integer',
                validator: (value: string) => integerSchema.safeParse(value).success
            }
        ]
    },

    {
        name: 'maximum-application-lifetime',
        displayName: 'Maximum Application Lifetime',
        description: 'Hard limit on application lifetime in seconds. Use -1 to disable.',
        type: 'number' as PropertyType,
        category: 'advanced' as PropertyCategory,
        defaultValue: '',
        required: false,
        validationRules: [
            {
                type: 'custom',
                message: 'Must be positive integer or -1',
                validator: (value: string) => {
                    if (!value.trim()) return true;
                    const num = parseInt(value, 10);
                    return !isNaN(num) && Number.isInteger(num) && (num > 0 || num === -1);
                }
            }
        ]
    },
    {
        name: 'default-application-lifetime',
        displayName: 'Default Application Lifetime',
        description: 'Default application lifetime in seconds. Cannot exceed maximum-application-lifetime.',
        type: 'number' as PropertyType,
        category: 'advanced' as PropertyCategory,
        defaultValue: '',
        required: false,
        validationRules: [
            {
                type: 'custom',
                message: 'Must be positive integer or -1',
                validator: (value: string) => {
                    if (!value.trim()) return true;
                    const num = parseInt(value, 10);
                    return !isNaN(num) && Number.isInteger(num) && (num > 0 || num === -1);
                }
            }
        ]
    },

    {
        name: 'disable_preemption',
        displayName: 'Disable Preemption',
        description: 'Disable preemption for this queue',
        type: 'boolean' as PropertyType,
        category: 'advanced' as PropertyCategory,
        defaultValue: '',
        required: false
    },
    {
        name: 'intra-queue-preemption.disable_preemption',
        displayName: 'Disable Intra-Queue Preemption',
        description: 'Disable preemption within this queue',
        type: 'boolean' as PropertyType,
        category: 'advanced' as PropertyCategory,
        defaultValue: '',
        required: false
    },

    {
        name: 'auto-create-child-queue.enabled',
        displayName: 'Auto-Create Child Queues (Legacy)',
        description: 'Enable automatic leaf queue creation (legacy mode)',
        type: 'boolean' as PropertyType,
        category: 'advanced' as PropertyCategory,
        defaultValue: '',
        required: false
    },
    {
        name: 'leaf-queue-template.capacity',
        displayName: 'Leaf Queue Template Capacity',
        description: 'Template capacity for auto-created leaf queues (required when auto-creation enabled)',
        type: 'string' as PropertyType,
        category: 'advanced' as PropertyCategory,
        defaultValue: '',
        required: false,
        enableWhen: {
            'auto-create-child-queue.enabled': (value: string) => value === 'true'
        },
        validationRules: [
            {
                type: 'custom',
                message: 'Required when auto-creation is enabled',
                validator: (value: string) => capacityValueSchema.safeParse(value).success
            }
        ]
    },

    {
        name: 'auto-queue-creation-v2.enabled',
        displayName: 'Auto-Queue Creation v2',
        description: 'Enable flexible auto-creation (parent and leaf queues)',
        type: 'boolean' as PropertyType,
        category: 'advanced' as PropertyCategory,
        defaultValue: '',
        required: false
    },
    {
        name: 'auto-queue-creation-v2.max-queues',
        displayName: 'Max Auto-Created Queues',
        description: 'Maximum dynamic queues under this parent',
        type: 'number' as PropertyType,
        category: 'advanced' as PropertyCategory,
        defaultValue: '',
        required: false,
        enableWhen: {
            'auto-queue-creation-v2.enabled': (value: string) => value === 'true'
        },
        validationRules: [
            {
                type: 'custom',
                message: 'Must be a positive integer',
                validator: (value: string) => integerSchema.safeParse(value).success
            }
        ]
    },

    // Node Label Access Control Properties (queue-specific configuration)
    {
        name: 'accessible-node-labels',
        displayName: 'Accessible Node Labels',
        description: 'Comma-separated list of node labels this queue can access. Use "*" for all labels, empty for default partition only.',
        type: 'string' as PropertyType,
        category: 'general' as PropertyCategory,
        defaultValue: '',
        required: false,
        validationRules: [
            {
                type: 'custom',
                message: 'Must be a comma-separated list of valid label names, "*" for all, or empty for default partition',
                validator: (value: string) => {
                    if (!value.trim()) return true; // Empty is valid (default partition only)
                    if (value.trim() === '*') return true; // All labels
                    
                    // Validate comma-separated label names
                    const labels = value.split(',').map(l => l.trim());
                    // Check for empty labels (like trailing/leading commas)
                    if (labels.some(label => label.length === 0)) return false;
                    return labels.every(label => /^[0-9a-zA-Z][0-9a-zA-Z-_]*$/.test(label));
                }
            }
        ]
    },
    {
        name: 'default-node-label-expression',
        displayName: 'Default Node Label Expression',
        description: 'Default node label expression for applications submitted to this queue. Empty for default partition.',
        type: 'string' as PropertyType,
        category: 'general' as PropertyCategory,
        defaultValue: '',
        required: false,
        validationRules: [
            {
                type: 'custom',
                message: 'Must be a valid node label name or empty for default partition',
                validator: (value: string) => {
                    if (!value.trim()) return true; // Empty is valid (default partition)
                    return /^[0-9a-zA-Z][0-9a-zA-Z-_]*$/.test(value.trim());
                }
            }
        ]
    }
];

export const globalPropertyDefinitions: PropertyDescriptor[] = [
    // Core Settings
    {
        name: 'legacy-queue-mode.enabled',
        displayName: 'Enable Legacy Queue Mode',
        description: 'Determines if legacy capacity calculation rules are enforced. Default is true. Disabling allows for more flexible capacity configurations but changes behavior significantly.',
        type: 'boolean' as PropertyType,
        category: 'general' as PropertyCategory,
        defaultValue: 'true',
        required: false
    },
    {
        name: 'maximum-applications',
        displayName: 'Maximum Applications (Global)',
        description: 'Maximum number of applications that can be pending and running.',
        type: 'number' as PropertyType,
        category: 'general' as PropertyCategory,
        defaultValue: '10000',
        required: false,
        validationRules: [
            {
                type: 'range',
                message: 'Must be between 1 and 100000',
                min: 1,
                max: 100000
            }
        ]
    },
    {
        name: 'application.fail-fast',
        displayName: 'Application Fail Fast',
        description: 'Whether applications should fail fast if submitted to a non-existent queue.',
        type: 'boolean' as PropertyType,
        category: 'general' as PropertyCategory,
        defaultValue: 'false',
        required: false
    },

    // Preemption Settings
    {
        name: 'preemption.disabled',
        displayName: 'Disable Preemption Globally',
        description: 'Globally disable or enable preemption. This can be overridden per queue.',
        type: 'boolean' as PropertyType,
        category: 'scheduling' as PropertyCategory,
        defaultValue: 'false',
        required: false
    },
    {
        name: 'preemption.monitor_policy',
        displayName: 'Preemption Monitor Policy',
        description: 'Policy for monitoring containers for preemption.',
        type: 'enum' as PropertyType,
        category: 'scheduling' as PropertyCategory,
        defaultValue: 'ProportionalCapacityPreemptionPolicy',
        required: false,
        enumValues: [
            'ProportionalCapacityPreemptionPolicy',
            'FifoPreemptionPolicy'
        ]
    },
    {
        name: 'preemption.monitoring_interval',
        displayName: 'Preemption Monitoring Interval (ms)',
        description: 'Time interval between preemption policy invocations.',
        type: 'number' as PropertyType,
        category: 'scheduling' as PropertyCategory,
        defaultValue: '3000',
        required: false,
        validationRules: [
            {
                type: 'range',
                message: 'Must be between 1000 and 60000',
                min: 1000,
                max: 60000
            }
        ]
    },
    {
        name: 'preemption.max_wait_before_kill',
        displayName: 'Max Wait Before Kill (ms)',
        description: 'Maximum time to wait before forcefully killing a container during preemption.',
        type: 'number' as PropertyType,
        category: 'scheduling' as PropertyCategory,
        defaultValue: '15000',
        required: false,
        validationRules: [
            {
                type: 'range',
                message: 'Must be between 1000 and 300000',
                min: 1000,
                max: 300000
            }
        ]
    },

    // Resource Settings
    {
        name: 'resource-calculator',
        displayName: 'Resource Calculator',
        description: 'Class used to calculate resource requirements.',
        type: 'enum' as PropertyType,
        category: 'resource' as PropertyCategory,
        defaultValue: 'DefaultResourceCalculator',
        required: false,
        enumValues: [
            'DefaultResourceCalculator',
            'DominantResourceCalculator'
        ]
    },
    {
        name: 'user.max-parallel-apps',
        displayName: 'Default Max Parallel Apps per User',
        description: 'Default maximum parallel applications per user',
        type: 'number' as PropertyType,
        category: 'resource' as PropertyCategory,
        defaultValue: '2147483647',
        required: false,
        validationRules: [
            {
                type: 'range',
                message: 'Must be between 1 and 2147483647',
                min: 1,
                max: 2147483647
            }
        ]
    },

    // Locality Settings
    {
        name: 'node-locality-delay',
        displayName: 'Node Locality Delay',
        description: 'Number of missed scheduling opportunities after which the scheduler attempts to schedule rack-local containers. Set to -1 to disable node-locality constraint.',
        type: 'number' as PropertyType,
        category: 'scheduling' as PropertyCategory,
        defaultValue: '40',
        required: false,
        validationRules: [
            {
                type: 'range',
                message: 'Must be between -1 and 1000',
                min: -1,
                max: 1000
            }
        ]
    },
    {
        name: 'rack-locality-additional-delay',
        displayName: 'Rack Locality Additional Delay',
        description: 'Number of additional missed scheduling opportunities over node-locality-delay after which the scheduler attempts to schedule off-switch containers.',
        type: 'number' as PropertyType,
        category: 'scheduling' as PropertyCategory,
        defaultValue: '-1',
        required: false,
        validationRules: [
            {
                type: 'range',
                message: 'Must be between -1 and 1000',
                min: -1,
                max: 1000
            }
        ]
    },

    // Queue Mapping Settings
    {
        name: 'queue-mappings',
        displayName: 'Queue Mappings',
        description: 'A list of mappings that will be used to assign jobs to queues. The syntax for this list is [u|g]:[name]:[queue_name][,next_mapping]*.',
        type: 'string' as PropertyType,
        category: 'scheduling' as PropertyCategory,
        defaultValue: '',
        required: false
    },
    {
        name: 'queue-mappings-override.enable',
        displayName: 'Enable Queue Mappings Override',
        description: 'If a queue mapping is present, will it override the value specified by the user?',
        type: 'boolean' as PropertyType,
        category: 'scheduling' as PropertyCategory,
        defaultValue: 'false',
        required: false
    },
    {
        name: 'mapping-rule-format',
        displayName: 'Mapping Rule Format',
        description: 'Format for queue mapping rules',
        type: 'enum' as PropertyType,
        category: 'scheduling' as PropertyCategory,
        defaultValue: 'legacy',
        required: false,
        enumValues: [
            'legacy',
            'json'
        ]
    },
    {
        name: 'mapping-rule-json',
        displayName: 'JSON Mapping Rules',
        description: 'Queue mapping rules in JSON format',
        type: 'string' as PropertyType,
        category: 'scheduling' as PropertyCategory,
        defaultValue: '',
        required: false
    },
    {
        name: 'workflow-priority-mappings-override.enable',
        displayName: 'Enable Workflow Priority Mappings Override',
        description: 'Enable workflow priority mappings override.',
        type: 'boolean' as PropertyType,
        category: 'scheduling' as PropertyCategory,
        defaultValue: 'false',
        required: false
    },

    // Container Assignment Settings
    {
        name: 'per-node-heartbeat.multiple-assignments-enabled',
        displayName: 'Enable Multiple Container Assignments',
        description: 'Allow multiple container assignments per node heartbeat',
        type: 'boolean' as PropertyType,
        category: 'advanced' as PropertyCategory,
        defaultValue: 'true',
        required: false
    },
    {
        name: 'per-node-heartbeat.maximum-container-assignments',
        displayName: 'Max Container Assignments per Heartbeat',
        description: 'Maximum containers assigned per heartbeat (-1 = unlimited)',
        type: 'number' as PropertyType,
        category: 'advanced' as PropertyCategory,
        defaultValue: '100',
        required: false,
        validationRules: [
            {
                type: 'range',
                message: 'Must be between -1 and 1000',
                min: -1,
                max: 1000
            }
        ]
    },
    {
        name: 'per-node-heartbeat.maximum-offswitch-assignments',
        displayName: 'Maximum Off-switch Assignments Per Heartbeat',
        description: 'Controls the number of OFF_SWITCH assignments allowed during a node heartbeat.',
        type: 'number' as PropertyType,
        category: 'advanced' as PropertyCategory,
        defaultValue: '1',
        required: false,
        validationRules: [
            {
                type: 'range',
                message: 'Must be between 1 and 100',
                min: 1,
                max: 100
            }
        ]
    },

    // Reservation Settings
    {
        name: 'reservations-continue-look-all-nodes',
        displayName: 'Continue Looking All Nodes for Reservations',
        description: 'Continue looking at all nodes even after reservation limit hit',
        type: 'boolean' as PropertyType,
        category: 'advanced' as PropertyCategory,
        defaultValue: 'true',
        required: false
    },

    // Asynchronous Scheduling
    {
        name: 'schedule-asynchronously.enable',
        displayName: 'Enable Asynchronous Scheduling',
        description: 'Enable asynchronous scheduling for better performance',
        type: 'boolean' as PropertyType,
        category: 'advanced' as PropertyCategory,
        defaultValue: 'false',
        required: false
    },
    {
        name: 'schedule-asynchronously.scheduling-interval-ms',
        displayName: 'Async Scheduling Interval (ms)',
        description: 'Scheduling interval for async scheduling',
        type: 'number' as PropertyType,
        category: 'advanced' as PropertyCategory,
        defaultValue: '5',
        required: false,
        validationRules: [
            {
                type: 'range',
                message: 'Must be between 1 and 1000',
                min: 1,
                max: 1000
            }
        ]
    }
];

export function getPropertiesByCategory(category: PropertyCategory): PropertyDescriptor[] {
    return queuePropertyDefinitions.filter(prop => prop.category === category);
}

export function getPropertyCategories(): PropertyCategory[] {
    return ['general', 'resource', 'scheduling', 'limits', 'security', 'advanced'];
}

export function getPropertyDefinition(name: string): PropertyDescriptor | undefined {
    return queuePropertyDefinitions.find(prop => prop.name === name);
}
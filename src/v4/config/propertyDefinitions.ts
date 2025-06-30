import { z } from 'zod';
import type { PropertyDescriptor, PropertyCategory, PropertyType } from '../types/property-descriptor';

// Validation schemas for different property types
export const capacityValueSchema = z
    .string()
    .refine(
        (value) => {
            if (!value.trim()) return true; // Allow empty for optional fields
            
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

            // Raw number (percentage without %)
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
            if (!value.trim()) return true; // Allow empty for optional fields
            const numericValue = parseFloat(value);
            return !isNaN(numericValue) && numericValue >= 0 && numericValue <= 100;
        },
        { message: 'Must be a number between 0 and 100' }
    );

export const positiveNumberSchema = z
    .string()
    .refine(
        (value) => {
            if (!value.trim()) return true; // Allow empty for optional fields
            const numericValue = parseFloat(value);
            return !isNaN(numericValue) && numericValue > 0;
        },
        { message: 'Must be a positive number' }
    );

export const nonNegativeNumberSchema = z
    .string()
    .refine(
        (value) => {
            if (!value.trim()) return true; // Allow empty for optional fields
            const numericValue = parseFloat(value);
            return !isNaN(numericValue) && numericValue >= 0;
        },
        { message: 'Must be a non-negative number' }
    );

export const integerSchema = z
    .string()
    .refine(
        (value) => {
            if (!value.trim()) return true; // Allow empty for optional fields
            const numericValue = parseFloat(value);
            return !isNaN(numericValue) && Number.isInteger(numericValue) && numericValue > 0;
        },
        { message: 'Must be a positive integer' }
    );

export const aclFormatSchema = z
    .string()
    .refine(
        (value) => {
            if (!value.trim()) return true; // Allow empty for optional fields
            
            // Special values
            if (value === '*' || value === ' ') return true;
            
            // Format: "user1,user2 group1,group2"
            const parts = value.split(' ');
            if (parts.length > 2) return false;
            
            // Validate each part contains valid identifiers
            return parts.every(part => {
                if (!part) return true; // Allow empty parts
                return part.split(',').every(item => 
                    item.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(item.trim())
                );
            });
        },
        { message: 'Invalid ACL format. Use "user1,user2 group1,group2" or "*" or " " (space for none)' }
    );

// Core queue properties based on CS_config_guide.md
export const queuePropertyDefinitions: PropertyDescriptor[] = [
    // Basic Queue Configuration
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

    // User Limits
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

    // Application Control
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

    // Scheduling Policy
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

    // Security (ACLs)
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

    // Resource Allocation Overrides
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

    // Application Lifetime
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

    // Preemption
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

    // Auto-Queue Creation (Legacy)
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

    // Auto-Queue Creation v2 (Flexible)
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
    }
];

// Global system properties (these would be for global configuration)
export const globalPropertyDefinitions: PropertyDescriptor[] = [
    {
        name: 'maximum-applications',
        displayName: 'Global Maximum Applications',
        description: 'Maximum number of applications system-wide',
        type: 'number' as PropertyType,
        category: 'general' as PropertyCategory,
        defaultValue: '10000',
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
        displayName: 'Global Maximum AM Resource Percent',
        description: 'Maximum percentage of cluster resources for Application Masters',
        type: 'number' as PropertyType,
        category: 'general' as PropertyCategory,
        defaultValue: '0.1',
        required: false,
        validationRules: [
            {
                type: 'range',
                message: 'Must be between 0.0 and 1.0',
                min: 0.0,
                max: 1.0
            }
        ]
    },
    {
        name: 'resource-calculator',
        displayName: 'Resource Calculator',
        description: 'Resource calculator implementation for multi-dimensional resources',
        type: 'enum' as PropertyType,
        category: 'advanced' as PropertyCategory,
        defaultValue: 'org.apache.hadoop.yarn.util.resource.DefaultResourceCalculator',
        required: false,
        enumValues: [
            'org.apache.hadoop.yarn.util.resource.DefaultResourceCalculator',
            'org.apache.hadoop.yarn.util.resource.DominantResourceCalculator'
        ]
    }
];

// Helper function to get property definitions by category
export function getPropertiesByCategory(category: PropertyCategory): PropertyDescriptor[] {
    return queuePropertyDefinitions.filter(prop => prop.category === category);
}

// Helper function to get all property categories
export function getPropertyCategories(): PropertyCategory[] {
    return ['general', 'resource', 'scheduling', 'limits', 'security', 'advanced'];
}

// Helper function to get property definition by name
export function getPropertyDefinition(name: string): PropertyDescriptor | undefined {
    return queuePropertyDefinitions.find(prop => prop.name === name);
}
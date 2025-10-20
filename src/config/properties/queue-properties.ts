import { capacityValueSchema, integerSchema, aclFormatSchema } from '../schemas/validation';
import { SPECIAL_VALUES } from '~/types';
import type { PropertyDescriptor, PropertyCategory, PropertyType } from '~/types';

// Specify only the short config name (without the yarn.scheduler.capacity.<queue-path> prefix)
export const queuePropertyDefinitions: PropertyDescriptor[] = [
  {
    name: 'capacity',
    displayName: 'Capacity',
    description:
      'Queue capacity allocation. Supports percentage (50), weight (2w), or absolute ([memory=1024,vcores=2]) formats.',
    type: 'string' as PropertyType,
    category: 'general' as PropertyCategory,
    defaultValue: '',
    required: true,
    validationRules: [
      {
        type: 'custom',
        message: 'Capacity is required and must be valid format',
        validator: (value: string) =>
          capacityValueSchema.safeParse(value).success && value.trim() !== '',
      },
    ],
  },
  {
    name: 'maximum-capacity',
    displayName: 'Maximum Capacity',
    description:
      'Maximum capacity the queue can expand to. Must be >= capacity. Use -1 for unlimited (100%).',
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
        },
      },
    ],
  },
  {
    name: 'state',
    displayName: 'Queue State',
    description: 'Operational state of the queue',
    type: 'enum' as PropertyType,
    category: 'general' as PropertyCategory,
    defaultValue: 'RUNNING',
    required: false,
    enumValues: [
      {
        value: 'RUNNING',
        label: 'Running',
        description: 'Queue accepts and schedules new applications.',
      },
      {
        value: 'STOPPED',
        label: 'Stopped',
        description: 'Queue rejects new applications but continues existing workloads.',
      },
    ],
  },

  {
    name: 'minimum-user-limit-percent',
    displayName: 'Minimum User Limit Percent',
    description:
      'Minimum percentage of queue resources per user (0-100). 100 means no user limits.',
    type: 'number' as PropertyType,
    category: 'limits' as PropertyCategory,
    defaultValue: '',
    required: false,
    validationRules: [
      {
        type: 'range',
        message: 'Must be between 0 and 100',
        min: 0,
        max: 100,
      },
    ],
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
        },
      },
    ],
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
        validator: (value: string) => integerSchema.safeParse(value).success,
      },
    ],
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
        max: 1.0,
      },
    ],
    displayFormat: {
      suffix: ' (0.0-1.0)',
      decimals: 2,
    },
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
        validator: (value: string) => integerSchema.safeParse(value).success,
      },
    ],
  },

  {
    name: 'ordering-policy',
    displayName: 'Ordering Policy',
    description: 'Application ordering policy within the queue',
    type: 'enum' as PropertyType,
    category: 'scheduling' as PropertyCategory,
    defaultValue: '',
    required: false,
    enumValues: [
      {
        value: 'fifo',
        label: 'FIFO',
        description: 'First-in First-out scheduling; simple ordering for predictable workloads.',
      },
      {
        value: 'fair',
        label: 'Fair',
        description: 'Balances resource allocation across applications for fairness.',
      },
    ],
  },
  {
    name: 'ordering-policy.fair.enable-size-based-weight',
    displayName: 'Fair Policy Size-Based Weight',
    description:
      'Enable size-based weighting in fair scheduling (only applies when ordering-policy=fair)',
    type: 'boolean' as PropertyType,
    category: 'scheduling' as PropertyCategory,
    defaultValue: '',
    required: false,
    enableWhen: [({ getValue }) => getValue('ordering-policy') === 'fair'],
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
        },
      },
    ],
  },

  {
    name: 'acl_submit_applications',
    displayName: 'Submit Applications ACL',
    description:
      'Controls who can submit applications to this queue. Format: "user1,user2 group1,group2", "*" for all, " " (space) for none.',
    type: 'string' as PropertyType,
    category: 'security' as PropertyCategory,
    defaultValue: '',
    required: false,
    validationRules: [
      {
        type: 'custom',
        message: 'Invalid ACL format',
        validator: (value: string) => aclFormatSchema.safeParse(value).success,
      },
    ],
  },
  {
    name: 'acl_administer_queue',
    displayName: 'Administer Queue ACL',
    description:
      'Controls who can administer applications on this queue (kill, view, modify). Format: "user1,user2 group1,group2", "*" for all, " " (space) for none.',
    type: 'string' as PropertyType,
    category: 'security' as PropertyCategory,
    defaultValue: '',
    required: false,
    validationRules: [
      {
        type: 'custom',
        message: 'Invalid ACL format',
        validator: (value: string) => aclFormatSchema.safeParse(value).success,
      },
    ],
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
        validator: (value: string) => integerSchema.safeParse(value).success,
      },
    ],
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
        validator: (value: string) => integerSchema.safeParse(value).success,
      },
    ],
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
        },
      },
    ],
  },
  {
    name: 'default-application-lifetime',
    displayName: 'Default Application Lifetime',
    description:
      'Default application lifetime in seconds. Cannot exceed maximum-application-lifetime.',
    type: 'number' as PropertyType,
    category: 'advanced' as PropertyCategory,
    defaultValue: '',
    required: false,
    validationRules: [
      {
        type: 'custom',
        message: 'Must be a non-negative integer or -1',
        validator: (value: string) => {
          if (!value.trim()) return true;
          const num = parseInt(value, 10);
          return !isNaN(num) && Number.isInteger(num) && (num >= 0 || num === -1);
        },
      },
    ],
  },

  {
    name: 'disable_preemption',
    displayName: 'Disable Preemption',
    description: 'Disable preemption for this queue',
    type: 'boolean' as PropertyType,
    category: 'advanced' as PropertyCategory,
    defaultValue: '',
    required: false,
  },
  {
    name: 'intra-queue-preemption.disable_preemption',
    displayName: 'Disable Intra-Queue Preemption',
    description: 'Disable preemption within this queue',
    type: 'boolean' as PropertyType,
    category: 'advanced' as PropertyCategory,
    defaultValue: '',
    required: false,
  },

  {
    name: 'auto-create-child-queue.enabled',
    displayName: 'Auto-Create Child Queues (Legacy)',
    description: 'Enable automatic leaf queue creation (legacy mode)',
    type: 'boolean' as PropertyType,
    category: 'advanced' as PropertyCategory,
    defaultValue: '',
    required: false,
  },
  {
    name: 'leaf-queue-template.capacity',
    displayName: 'Leaf Queue Template Capacity',
    description:
      'Template capacity for auto-created leaf queues (required when auto-creation enabled)',
    type: 'string' as PropertyType,
    category: 'advanced' as PropertyCategory,
    defaultValue: '',
    required: false,
    enableWhen: [({ getValue }) => getValue('auto-create-child-queue.enabled') === 'true'],
    validationRules: [
      {
        type: 'custom',
        message: 'Required when auto-creation is enabled',
        validator: (value: string) => capacityValueSchema.safeParse(value).success,
      },
    ],
  },

  {
    name: 'auto-queue-creation-v2.enabled',
    displayName: 'Auto-Queue Creation v2',
    description: 'Enable flexible auto-creation (parent and leaf queues)',
    type: 'boolean' as PropertyType,
    category: 'advanced' as PropertyCategory,
    defaultValue: '',
    required: false,
  },
  {
    name: 'auto-queue-creation-v2.max-queues',
    displayName: 'Max Auto-Created Queues',
    description: 'Maximum dynamic queues under this parent',
    type: 'number' as PropertyType,
    category: 'advanced' as PropertyCategory,
    defaultValue: '',
    required: false,
    enableWhen: [({ getValue }) => getValue('auto-queue-creation-v2.enabled') === 'true'],
    validationRules: [
      {
        type: 'custom',
        message: 'Must be a positive integer',
        validator: (value: string) => integerSchema.safeParse(value).success,
      },
    ],
  },

  // Node Label Access Control Properties (queue-specific configuration)
  {
    name: 'accessible-node-labels',
    displayName: 'Accessible Node Labels',
    description:
      'Comma-separated list of node labels this queue can access. Use "*" for all labels, empty for default partition only.',
    type: 'string' as PropertyType,
    category: 'general' as PropertyCategory,
    defaultValue: '',
    required: false,
    validationRules: [
      {
        type: 'custom',
        message:
          'Must be a comma-separated list of valid label names, "*" for all, or empty for default partition',
        validator: (value: string) => {
          if (!value.trim()) return true; // Empty is valid (default partition only)
          if (value.trim() === SPECIAL_VALUES.ALL_USERS_ACL) return true; // All labels

          // Validate comma-separated label names
          const labels = value.split(',').map((l) => l.trim());
          // Check for empty labels (like trailing/leading commas)
          if (labels.some((label) => label.length === 0)) return false;
          return labels.every((label) => /^[0-9a-zA-Z][0-9a-zA-Z-_]*$/.test(label));
        },
      },
    ],
  },
  {
    name: 'default-node-label-expression',
    displayName: 'Default Node Label Expression',
    description:
      'Default node label expression for applications submitted to this queue. Empty for default partition.',
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
        },
      },
    ],
  },
];

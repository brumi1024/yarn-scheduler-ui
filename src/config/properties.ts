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
}

// Capacity validation schema
const capacitySchema = z.string().refine(val => {
  if (val.endsWith('%')) {
    const num = parseFloat(val.slice(0, -1));
    return !isNaN(num) && num >= 0 && num <= 100;
  }
  if (val.endsWith('w')) {
    const num = parseFloat(val.slice(0, -1));
    return !isNaN(num) && num > 0;
  }
  if (val.startsWith('[') && val.endsWith(']')) {
    return true; // Basic validation for absolute resources
  }
  return false;
}, 'Invalid capacity format');

// All queue properties in one place
export const QUEUE_PROPERTIES: Record<string, PropertyDefinition> = {
  capacity: {
    key: 'capacity',
    label: 'Capacity',
    type: 'capacity',
    defaultValue: '10%',
    description: 'Queue guaranteed capacity',
    validation: capacitySchema,
    group: 'core',
  },
  'maximum-capacity': {
    key: 'maximum-capacity',
    label: 'Maximum Capacity',
    type: 'capacity',
    defaultValue: '100%',
    description: 'Maximum capacity queue can use',
    validation: capacitySchema,
    group: 'core',
  },
  state: {
    key: 'state',
    label: 'State',
    type: 'select',
    options: ['RUNNING', 'STOPPED'],
    defaultValue: 'RUNNING',
    description: 'Queue operational state',
    validation: z.enum(['RUNNING', 'STOPPED']),
    group: 'core',
  },
  'user-limit-factor': {
    key: 'user-limit-factor',
    label: 'User Limit Factor',
    type: 'number',
    defaultValue: 1,
    description: 'Multiplier for per-user resource limits',
    validation: z.union([z.number(), z.string().transform(val => parseFloat(val))]).refine(val => !isNaN(val) && val >= 0),
    group: 'resource',
  },
  'ordering-policy': {
    key: 'ordering-policy',
    label: 'Ordering Policy',
    type: 'select',
    options: ['fifo', 'fair'],
    defaultValue: 'fifo',
    description: 'How applications are ordered',
    validation: z.enum(['fifo', 'fair']),
    group: 'advanced',
  },
  'disable_preemption': {
    key: 'disable_preemption',
    label: 'Disable Preemption',
    type: 'boolean',
    defaultValue: false,
    description: 'Disable preemption for this queue',
    validation: z.boolean(),
    group: 'advanced',
  },
  'max-parallel-apps': {
    key: 'max-parallel-apps',
    label: 'Maximum Parallel Applications',
    type: 'number',
    defaultValue: 0,
    description: 'Maximum number of parallel applications (0 = unlimited)',
    validation: z.union([z.number(), z.string().transform(val => parseInt(val) || 0)]).refine(val => !isNaN(val) && val >= 0),
    group: 'resource',
  },
  'maximum-am-resource-percent': {
    key: 'maximum-am-resource-percent',
    label: 'Maximum AM Resource Percent',
    type: 'number',
    defaultValue: 0.1,
    description: 'Maximum percentage for Application Masters',
    validation: z.union([z.number(), z.string().transform(val => parseFloat(val))]).refine(val => !isNaN(val) && val >= 0 && val <= 1),
    group: 'resource',
  },
  'auto-create-child-queue.enabled': {
    key: 'auto-create-child-queue.enabled',
    label: 'Auto-Create Child Queues',
    type: 'boolean',
    defaultValue: false,
    description: 'Enable automatic child queue creation',
    validation: z.boolean(),
    group: 'auto-creation',
  },
  'acl_submit_applications': {
    key: 'acl_submit_applications',
    label: 'Submit Applications ACL',
    type: 'text',
    defaultValue: '*',
    description: 'Users/groups allowed to submit applications',
    validation: z.string(),
    group: 'advanced',
  },
  'acl_administer_queue': {
    key: 'acl_administer_queue',
    label: 'Administer Queue ACL',
    type: 'text',
    defaultValue: '*',
    description: 'Users/groups allowed to administer the queue',
    validation: z.string(),
    group: 'advanced',
  },
  'auto-queue-creation-v2.enabled': {
    key: 'auto-queue-creation-v2.enabled',
    label: 'Auto-Queue Creation V2',
    type: 'boolean',
    defaultValue: false,
    description: 'Enable auto-queue creation version 2',
    validation: z.boolean(),
    group: 'auto-creation',
  },
  'auto-queue-creation-v2.max-queues': {
    key: 'auto-queue-creation-v2.max-queues',
    label: 'Max Auto-Created Queues',
    type: 'number',
    defaultValue: 1000,
    description: 'Maximum number of auto-created queues',
    validation: z.union([z.number(), z.string().transform(val => parseInt(val) || 1000)]).refine(val => !isNaN(val) && val >= 1),
    group: 'auto-creation',
  },
};

// Helper functions
export function getPropertyGroups() {
  const groups: Record<string, PropertyDefinition[]> = {
    core: [],
    resource: [],
    advanced: [],
    'auto-creation': [],
  };
  
  Object.values(QUEUE_PROPERTIES).forEach(prop => {
    groups[prop.group].push(prop);
  });
  
  return [
    { name: 'Core Properties', properties: groups.core },
    { name: 'Resource Management', properties: groups.resource },
    { name: 'Advanced Settings', properties: groups.advanced },
    { name: 'Auto-Creation', properties: groups['auto-creation'] },
  ];
}

export function validateProperty(key: string, value: any): { valid: boolean; error?: string } {
  const property = QUEUE_PROPERTIES[key];
  if (!property) return { valid: false, error: 'Unknown property' };
  
  try {
    property.validation.parse(value);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message };
    }
    return { valid: false, error: 'Validation failed' };
  }
}
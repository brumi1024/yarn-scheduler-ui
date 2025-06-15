import { z } from 'zod';

// Direct property definitions - no abstraction layers
export const QUEUE_PROPERTIES = {
  capacity: {
    key: 'capacity',
    label: 'Capacity',
    type: 'capacity' as const,
    defaultValue: '10%',
    description: 'Queue guaranteed capacity',
    schema: z.string().refine(val => {
      // Direct validation - no abstraction
      if (val.endsWith('%')) {
        const num = parseFloat(val.slice(0, -1));
        return !isNaN(num) && num >= 0 && num <= 100;
      }
      if (val.endsWith('w')) {
        const num = parseFloat(val.slice(0, -1));
        return !isNaN(num) && num > 0;
      }
      if (val.startsWith('[') && val.endsWith(']')) {
        // Basic absolute resource validation
        return true;
      }
      return false;
    }, 'Invalid capacity format. Use 10%, 5w, or [memory=1024,vcores=2]')
  },
  
  'maximum-capacity': {
    key: 'maximum-capacity',
    label: 'Maximum Capacity',
    type: 'capacity' as const,
    defaultValue: '100%',
    description: 'Maximum capacity queue can use',
    schema: z.string().refine(val => {
      // Same validation as capacity
      if (val.endsWith('%')) {
        const num = parseFloat(val.slice(0, -1));
        return !isNaN(num) && num >= 0 && num <= 100;
      }
      if (val.endsWith('w')) {
        const num = parseFloat(val.slice(0, -1));
        return !isNaN(num) && num > 0;
      }
      if (val.startsWith('[') && val.endsWith(']')) {
        return true;
      }
      return false;
    }, 'Invalid capacity format. Use 10%, 5w, or [memory=1024,vcores=2]')
  },
  
  state: {
    key: 'state',
    label: 'State',
    type: 'select' as const,
    options: ['RUNNING', 'STOPPED'],
    defaultValue: 'RUNNING',
    description: 'Queue operational state',
    schema: z.enum(['RUNNING', 'STOPPED'])
  },
  
  'user-limit-factor': {
    key: 'user-limit-factor',
    label: 'User Limit Factor',
    type: 'number' as const,
    defaultValue: 1,
    description: 'Multiplier for per-user resource limits',
    schema: z.number().min(0)
  },
  
  'ordering-policy': {
    key: 'ordering-policy',
    label: 'Ordering Policy',
    type: 'select' as const,
    options: ['fifo', 'fair'],
    defaultValue: 'fifo',
    description: 'How applications are ordered',
    schema: z.enum(['fifo', 'fair'])
  },
  
  'disable_preemption': {
    key: 'disable_preemption',
    label: 'Disable Preemption',
    type: 'boolean' as const,
    defaultValue: false,
    description: 'Disable preemption for this queue',
    schema: z.boolean()
  },

  'maximum-am-resource-percent': {
    key: 'maximum-am-resource-percent',
    label: 'Maximum AM Resource Percent',
    type: 'number' as const,
    defaultValue: 0.1,
    description: 'Maximum percentage of resources for Application Masters',
    schema: z.number().min(0).max(1)
  },

  'maximum-applications': {
    key: 'maximum-applications',
    label: 'Maximum Applications',
    type: 'number' as const,
    defaultValue: 0,
    description: 'Maximum number of applications in the queue (0 = unlimited)',
    schema: z.number().min(0)
  },

  'acl_submit_applications': {
    key: 'acl_submit_applications',
    label: 'Submit Applications ACL',
    type: 'text' as const,
    defaultValue: '*',
    description: 'Users/groups allowed to submit applications',
    schema: z.string()
  },

  'acl_administer_queue': {
    key: 'acl_administer_queue',
    label: 'Administer Queue ACL',
    type: 'text' as const,
    defaultValue: '*',
    description: 'Users/groups allowed to administer the queue',
    schema: z.string()
  }
};

// Simple helper functions - no abstraction
export function validateQueueProperty(key: string, value: unknown) {
  const property = QUEUE_PROPERTIES[key as keyof typeof QUEUE_PROPERTIES];
  if (!property) return { valid: false, error: 'Unknown property' };
  
  try {
    property.schema.parse(value);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message };
    }
    return { valid: false, error: 'Validation failed' };
  }
}

export function getPropertyDefault(key: string) {
  const property = QUEUE_PROPERTIES[key as keyof typeof QUEUE_PROPERTIES];
  return property?.defaultValue;
}

export function getPropertyInfo(key: string) {
  return QUEUE_PROPERTIES[key as keyof typeof QUEUE_PROPERTIES];
}
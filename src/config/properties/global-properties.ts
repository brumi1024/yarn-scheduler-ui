import type { PropertyDescriptor, PropertyCategory, PropertyType } from '~/types';

export const globalPropertyDefinitions: PropertyDescriptor[] = [
  // Core Settings
  {
    name: 'legacy-queue-mode.enabled',
    displayName: 'Enable Legacy Queue Mode',
    description:
      'Determines if legacy capacity calculation rules are enforced. Default is true. Disabling allows for more flexible capacity configurations but changes behavior significantly.',
    type: 'boolean' as PropertyType,
    category: 'general' as PropertyCategory,
    defaultValue: 'true',
    required: false,
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
        max: 100000,
      },
    ],
  },
  {
    name: 'application.fail-fast',
    displayName: 'Application Fail Fast',
    description: 'Whether applications should fail fast if submitted to a non-existent queue.',
    type: 'boolean' as PropertyType,
    category: 'general' as PropertyCategory,
    defaultValue: 'false',
    required: false,
  },

  // Preemption Settings
  {
    name: 'preemption.disabled',
    displayName: 'Disable Preemption Globally',
    description: 'Globally disable or enable preemption. This can be overridden per queue.',
    type: 'boolean' as PropertyType,
    category: 'scheduling' as PropertyCategory,
    defaultValue: 'false',
    required: false,
  },
  {
    name: 'preemption.monitor_policy',
    displayName: 'Preemption Monitor Policy',
    description: 'Policy for monitoring containers for preemption.',
    type: 'enum' as PropertyType,
    category: 'scheduling' as PropertyCategory,
    defaultValue: 'ProportionalCapacityPreemptionPolicy',
    required: false,
    enumValues: ['ProportionalCapacityPreemptionPolicy', 'FifoPreemptionPolicy'],
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
        max: 60000,
      },
    ],
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
        max: 300000,
      },
    ],
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
      'org.apache.hadoop.yarn.util.resource.DefaultResourceCalculator',
      'org.apache.hadoop.yarn.util.resource.DominantResourceCalculator',
    ],
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
        max: 2147483647,
      },
    ],
  },

  // Locality Settings
  {
    name: 'node-locality-delay',
    displayName: 'Node Locality Delay',
    description:
      'Number of missed scheduling opportunities after which the scheduler attempts to schedule rack-local containers. Set to -1 to disable node-locality constraint.',
    type: 'number' as PropertyType,
    category: 'scheduling' as PropertyCategory,
    defaultValue: '40',
    required: false,
    validationRules: [
      {
        type: 'range',
        message: 'Must be between -1 and 1000',
        min: -1,
        max: 1000,
      },
    ],
  },
  {
    name: 'rack-locality-additional-delay',
    displayName: 'Rack Locality Additional Delay',
    description:
      'Number of additional missed scheduling opportunities over node-locality-delay after which the scheduler attempts to schedule off-switch containers.',
    type: 'number' as PropertyType,
    category: 'scheduling' as PropertyCategory,
    defaultValue: '-1',
    required: false,
    validationRules: [
      {
        type: 'range',
        message: 'Must be between -1 and 1000',
        min: -1,
        max: 1000,
      },
    ],
  },

  // Queue Mapping Settings
  {
    name: 'queue-mappings',
    displayName: 'Queue Mappings',
    description:
      'A list of mappings that will be used to assign jobs to queues. The syntax for this list is [u|g]:[name]:[queue_name][,next_mapping]*.',
    type: 'string' as PropertyType,
    category: 'scheduling' as PropertyCategory,
    defaultValue: '',
    required: false,
  },
  {
    name: 'queue-mappings-override.enable',
    displayName: 'Enable Queue Mappings Override',
    description: 'If a queue mapping is present, will it override the value specified by the user?',
    type: 'boolean' as PropertyType,
    category: 'scheduling' as PropertyCategory,
    defaultValue: 'false',
    required: false,
  },
  {
    name: 'mapping-rule-format',
    displayName: 'Mapping Rule Format',
    description: 'Format for queue mapping rules',
    type: 'enum' as PropertyType,
    category: 'scheduling' as PropertyCategory,
    defaultValue: 'legacy',
    required: false,
    enumValues: ['legacy', 'json'],
  },
  {
    name: 'mapping-rule-json',
    displayName: 'JSON Mapping Rules',
    description: 'Queue mapping rules in JSON format',
    type: 'string' as PropertyType,
    category: 'scheduling' as PropertyCategory,
    defaultValue: '',
    required: false,
  },
  {
    name: 'workflow-priority-mappings-override.enable',
    displayName: 'Enable Workflow Priority Mappings Override',
    description: 'Enable workflow priority mappings override.',
    type: 'boolean' as PropertyType,
    category: 'scheduling' as PropertyCategory,
    defaultValue: 'false',
    required: false,
  },

  // Container Assignment Settings
  {
    name: 'per-node-heartbeat.multiple-assignments-enabled',
    displayName: 'Enable Multiple Container Assignments',
    description: 'Allow multiple container assignments per node heartbeat',
    type: 'boolean' as PropertyType,
    category: 'advanced' as PropertyCategory,
    defaultValue: 'true',
    required: false,
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
        max: 1000,
      },
    ],
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
        max: 100,
      },
    ],
  },

  // Reservation Settings
  {
    name: 'reservations-continue-look-all-nodes',
    displayName: 'Continue Looking All Nodes for Reservations',
    description: 'Continue looking at all nodes even after reservation limit hit',
    type: 'boolean' as PropertyType,
    category: 'advanced' as PropertyCategory,
    defaultValue: 'true',
    required: false,
  },

  // Asynchronous Scheduling
  {
    name: 'schedule-asynchronously.enable',
    displayName: 'Enable Asynchronous Scheduling',
    description: 'Enable asynchronous scheduling for better performance',
    type: 'boolean' as PropertyType,
    category: 'advanced' as PropertyCategory,
    defaultValue: 'false',
    required: false,
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
        max: 1000,
      },
    ],
  },
  {
    name: 'maximum-am-resource-percent',
    displayName: 'Maximum AM Resource Percent',
    description:
      'Maximum percentage of resources that can be used for Application Masters (0.0-1.0)',
    type: 'number' as PropertyType,
    category: 'resource' as PropertyCategory,
    defaultValue: '0.1',
    required: false,
    validationRules: [
      {
        type: 'range',
        message: 'Must be between 0 and 1',
        min: 0,
        max: 1,
      },
    ],
  },
];

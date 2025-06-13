import type { ConfigGroup } from './types';

export const GLOBAL_CONFIG_METADATA: ConfigGroup[] = [
  {
    groupName: 'General Scheduler Settings',
    properties: {
      'yarn.scheduler.capacity.legacy-queue-mode.enabled': {
        key: 'legacy-queue-mode.enabled',
        displayName: 'Legacy Queue Mode',
        description:
          'Enforces legacy queue mode for YARN Capacity Scheduler. With this enabled, mixing resource allocation modes in the hierarchy is not allowed.',
        type: 'boolean',
        defaultValue: 'true',
      },
      'yarn.scheduler.capacity.schedule-asynchronously.enable': {
        key: 'schedule-asynchronously.enable',
        displayName: 'Asynchronous Scheduler',
        description:
          'Enabling this option decouples the scheduling from Node Heartbeats, significantly improving latency.',
        type: 'boolean',
        defaultValue: 'false',
      },
      'yarn.scheduler.capacity.node-locality-delay': {
        key: 'node-locality-delay',
        displayName: 'Node Locality Delay',
        description:
          'Number of scheduling opportunities missed before relaxing locality to node-local. Set to -1 for off.',
        type: 'number',
        defaultValue: '40',
      },
    },
  },
  {
    groupName: 'Global Application Management',
    properties: {
      'yarn.scheduler.capacity.maximum-am-resource-percent': {
        key: 'maximum-am-resource-percent',
        displayName: 'Max AM Resource Percent (Global)',
        description:
          'Maximum percentage of cluster resources that can be used for Application Masters. Applies if not overridden by queue-specific settings.',
        type: 'percentage',
        defaultValue: '0.1',
      },
      'yarn.scheduler.capacity.maximum-applications': {
        key: 'maximum-applications',
        displayName: 'Maximum Applications (Global)',
        description: 'Total number of applications that can be active or pending in the cluster.',
        type: 'number',
        defaultValue: '10000',
      },
    },
  },
  {
    groupName: 'Global Queue Defaults',
    properties: {
      'yarn.scheduler.capacity.user-limit-factor': {
        key: 'user-limit-factor',
        displayName: 'User Limit Factor (Global Default)',
        description:
          'Default factor for calculating user resource limits within queues. Queues can override this.',
        type: 'number',
        step: '0.1',
        defaultValue: '1',
      },
    },
  },
];
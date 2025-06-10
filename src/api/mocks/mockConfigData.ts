import type { ConfigurationResponse } from '../../types/Configuration';

export const mockConfigurationData: ConfigurationResponse = {
  property: [
    // Root queue configuration
    {
      name: 'yarn.scheduler.capacity.root.queues',
      value: 'default,production,development'
    },
    {
      name: 'yarn.scheduler.capacity.root.default.capacity',
      value: '30'
    },
    {
      name: 'yarn.scheduler.capacity.root.default.maximum-capacity',
      value: '30'
    },
    {
      name: 'yarn.scheduler.capacity.root.default.state',
      value: 'RUNNING'
    },
    {
      name: 'yarn.scheduler.capacity.root.default.acl_submit_applications',
      value: '*'
    },
    {
      name: 'yarn.scheduler.capacity.root.default.acl_administer_queue',
      value: '*'
    },

    // Production queue configuration
    {
      name: 'yarn.scheduler.capacity.root.production.capacity',
      value: '50'
    },
    {
      name: 'yarn.scheduler.capacity.root.production.maximum-capacity',
      value: '80'
    },
    {
      name: 'yarn.scheduler.capacity.root.production.state',
      value: 'RUNNING'
    },
    {
      name: 'yarn.scheduler.capacity.root.production.queues',
      value: 'prod01,prod02'
    },
    {
      name: 'yarn.scheduler.capacity.root.production.ordering-policy',
      value: 'fair'
    },
    {
      name: 'yarn.scheduler.capacity.root.production.priority',
      value: '1'
    },

    // Production sub-queues
    {
      name: 'yarn.scheduler.capacity.root.production.prod01.capacity',
      value: '60'
    },
    {
      name: 'yarn.scheduler.capacity.root.production.prod01.maximum-capacity',
      value: '100'
    },
    {
      name: 'yarn.scheduler.capacity.root.production.prod01.state',
      value: 'RUNNING'
    },
    {
      name: 'yarn.scheduler.capacity.root.production.prod01.maximum-applications',
      value: '5000'
    },
    {
      name: 'yarn.scheduler.capacity.root.production.prod01.maximum-am-resource-percent',
      value: '0.1'
    },

    {
      name: 'yarn.scheduler.capacity.root.production.prod02.capacity',
      value: '40'
    },
    {
      name: 'yarn.scheduler.capacity.root.production.prod02.maximum-capacity',
      value: '100'
    },
    {
      name: 'yarn.scheduler.capacity.root.production.prod02.state',
      value: 'RUNNING'
    },
    {
      name: 'yarn.scheduler.capacity.root.production.prod02.accessible-node-labels',
      value: 'gpu'
    },
    {
      name: 'yarn.scheduler.capacity.root.production.prod02.maximum-applications',
      value: '5000'
    },

    // Development queue configuration
    {
      name: 'yarn.scheduler.capacity.root.development.capacity',
      value: '20'
    },
    {
      name: 'yarn.scheduler.capacity.root.development.maximum-capacity',
      value: '40'
    },
    {
      name: 'yarn.scheduler.capacity.root.development.state',
      value: 'RUNNING'
    },
    {
      name: 'yarn.scheduler.capacity.root.development.queues',
      value: 'team1,team2'
    },
    {
      name: 'yarn.scheduler.capacity.root.development.ordering-policy',
      value: 'fair'
    },
    {
      name: 'yarn.scheduler.capacity.root.development.auto-create-child-queue.enabled',
      value: 'true'
    },

    // Development sub-queues
    {
      name: 'yarn.scheduler.capacity.root.development.team1.capacity',
      value: '70'
    },
    {
      name: 'yarn.scheduler.capacity.root.development.team1.maximum-capacity',
      value: '100'
    },
    {
      name: 'yarn.scheduler.capacity.root.development.team1.state',
      value: 'RUNNING'
    },
    {
      name: 'yarn.scheduler.capacity.root.development.team1.accessible-node-labels',
      value: 'gpu'
    },
    {
      name: 'yarn.scheduler.capacity.root.development.team1.maximum-applications',
      value: '500'
    },
    {
      name: 'yarn.scheduler.capacity.root.development.team1.user-limit-factor',
      value: '1'
    },

    {
      name: 'yarn.scheduler.capacity.root.development.team2.capacity',
      value: '30'
    },
    {
      name: 'yarn.scheduler.capacity.root.development.team2.maximum-capacity',
      value: '100'
    },
    {
      name: 'yarn.scheduler.capacity.root.development.team2.state',
      value: 'RUNNING'
    },
    {
      name: 'yarn.scheduler.capacity.root.development.team2.maximum-applications',
      value: '500'
    },

    // Global scheduler settings
    {
      name: 'yarn.scheduler.capacity.resource-calculator',
      value: 'org.apache.hadoop.yarn.util.resource.DefaultResourceCalculator'
    },
    {
      name: 'yarn.scheduler.capacity.node-locality-delay',
      value: '40'
    },
    {
      name: 'yarn.scheduler.capacity.rack-locality-additional-delay',
      value: '-1'
    },
    {
      name: 'yarn.scheduler.capacity.queue-mappings-override.enable',
      value: 'false'
    },
    {
      name: 'yarn.scheduler.capacity.per-node-heartbeat.maximum-offswitch-assignments',
      value: '1'
    },
    {
      name: 'yarn.scheduler.capacity.application.fail-fast',
      value: 'false'
    },
    {
      name: 'yarn.scheduler.capacity.workflow-priority-mappings-override.enable',
      value: 'false'
    },

    // Auto-creation settings
    {
      name: 'yarn.scheduler.capacity.auto-queue-creation-v2.enabled',
      value: 'false'
    },
    {
      name: 'yarn.scheduler.capacity.legacy-queue-mode.enabled',
      value: 'false'
    },

    // Queue mappings
    {
      name: 'yarn.scheduler.capacity.queue-mappings',
      value: 'u:user1:development.team1,u:user2:development.team2,g:dev:development,g:prod:production'
    },

    // Resource preemption
    {
      name: 'yarn.resourcemanager.monitor.capacity.preemption.enabled',
      value: 'true'
    },
    {
      name: 'yarn.resourcemanager.monitor.capacity.preemption.monitoring_interval',
      value: '3000'
    },
    {
      name: 'yarn.resourcemanager.monitor.capacity.preemption.max_wait_before_kill',
      value: '15000'
    },

    // Node labels support
    {
      name: 'yarn.node-labels.enabled',
      value: 'true'
    },
    {
      name: 'yarn.node-labels.configuration-type',
      value: 'centralized'
    }
  ]
};
# Capacity Scheduler XML Configuration Instructions

## Overview

This document provides comprehensive instructions for creating a `capacity-scheduler.xml` configuration file for Apache Hadoop YARN's Capacity Scheduler. The configuration file defines how cluster resources are allocated among different queues and users.

## Configuration File Structure

The capacity scheduler configuration uses XML format with key-value pairs. All configuration keys start with the prefix `yarn.scheduler.capacity.` and follow a hierarchical structure.

## Global Configuration Properties

### System-Wide Settings

| Configuration Key | Default Value | Description |
|-------------------|---------------|-------------|
| `yarn.scheduler.capacity.maximum-applications` | 10000 | Maximum number of applications in the system |
| `yarn.scheduler.capacity.maximum-am-resource-percent` | 0.1 | Maximum percentage of resources for Application Masters |
| `yarn.scheduler.capacity.resource-calculator` | DefaultResourceCalculator | Resource calculator class |
| `yarn.scheduler.capacity.node-locality-delay` | 40 | Node locality delay |
| `yarn.scheduler.capacity.rack-locality-additional-delay` | -1 | Additional delay for rack locality |
| `yarn.scheduler.capacity.rack-locality-full-reset` | true | Whether to reset rack locality |
| `yarn.scheduler.capacity.user-metrics.enable` | false | Enable user metrics |
| `yarn.scheduler.capacity.legacy-queue-mode.enabled` | true | Enable legacy queue mode |

### Reservation and Allocation Settings

| Configuration Key | Default Value | Description |
|-------------------|---------------|-------------|
| `yarn.scheduler.capacity.reservations-continue-look-all-nodes` | true | Continue looking at all nodes for reservations |
| `yarn.scheduler.capacity.skip-allocate-on-nodes-with-reserved-containers` | false | Skip allocation on nodes with reserved containers |
| `yarn.scheduler.capacity.per-node-heartbeat.maximum-offswitch-assignments` | 1 | Maximum off-switch assignments per heartbeat |
| `yarn.scheduler.capacity.per-node-heartbeat.multiple-assignments-enabled` | true | Enable multiple assignments per heartbeat |
| `yarn.scheduler.capacity.per-node-heartbeat.maximum-container-assignments` | 100 | Maximum container assignments per heartbeat |

### Asynchronous Scheduling

| Configuration Key | Default Value | Description |
|-------------------|---------------|-------------|
| `yarn.scheduler.capacity.schedule-asynchronously.enable` | true | Enable asynchronous scheduling |
| `yarn.scheduler.capacity.schedule-asynchronously.maximum-threads` | - | Maximum threads for async scheduling |
| `yarn.scheduler.capacity.schedule-asynchronously.maximum-pending-backlogs` | 100 | Maximum pending backlogs |
| `yarn.scheduler.capacity.schedule-asynchronously.scheduling-interval-ms` | 5 | Scheduling interval in milliseconds |

### Application and Queue Management

| Configuration Key | Default Value | Description |
|-------------------|---------------|-------------|
| `yarn.scheduler.capacity.application.fail-fast` | false | Enable application fail-fast |
| `yarn.scheduler.capacity.lazy-preemption-enabled` | false | Enable lazy preemption |
| `yarn.scheduler.capacity.global-queue-max-application` | -1 | Global maximum applications per queue |
| `yarn.scheduler.capacity.max-parallel-apps` | Integer.MAX_VALUE | Maximum parallel applications |

## Queue Configuration

### Basic Queue Properties

For each queue, use the pattern: `yarn.scheduler.capacity.<queue-path>.<property>`

#### Essential Queue Settings

| Property Suffix | Description | Example |
|----------------|-------------|---------|
| `queues` | Child queues (comma-separated) | `yarn.scheduler.capacity.root.queues=queue1,queue2` |
| `capacity` | Queue capacity percentage, absolute resource, or weight | `yarn.scheduler.capacity.root.queue1.capacity=50` |
| `maximum-capacity` | Maximum capacity the queue can grow to | `yarn.scheduler.capacity.root.queue1.maximum-capacity=80` |
| `state` | Queue state (RUNNING, STOPPED) | `yarn.scheduler.capacity.root.queue1.state=RUNNING` |

#### User Limits

| Property Suffix | Default | Description |
|----------------|---------|-------------|
| `minimum-user-limit-percent` | 100 | Minimum percentage of queue capacity for a user |
| `user-limit-factor` | 1.0 | Factor to multiply user limit |
| `maximum-applications` | -1 | Maximum applications in the queue |
| `maximum-am-resource-percent` | 0.1 | Maximum AM resource percentage for the queue |

#### Node Label Configuration

| Property Suffix | Description |
|----------------|-------------|
| `accessible-node-labels` | Comma-separated list of accessible node labels |
| `default-node-label-expression` | Default node label expression |
| `accessible-node-labels.<label>.capacity` | Capacity for specific node label |
| `accessible-node-labels.<label>.maximum-capacity` | Maximum capacity for specific node label |

### Resource Configuration

#### Absolute Resource Configuration

Use bracket notation for absolute resources (supports custom resource types):
```xml
<property>
  <name>yarn.scheduler.capacity.root.queue1.capacity</name>
  <value>[memory=4096Mi,vcores=4,yarn.io/gpu=2]</value>
</property>
```

#### Weight-Based Configuration

Use 'w' suffix for weight-based capacity:
```xml
<property>
  <name>yarn.scheduler.capacity.root.queue1.capacity</name>
  <value>3w</value>
</property>
```

#### Resource Limits

| Property Suffix | Description |
|----------------|-------------|
| `min-resource` | Minimum absolute resource requirement |
| `max-resource` | Maximum absolute resource requirement |
| `maximum-allocation` | Maximum allocation per container |
| `maximum-allocation-mb` | Maximum memory allocation |
| `maximum-allocation-vcores` | Maximum vcore allocation |

### Access Control Lists (ACLs)

| Property Suffix | Description |
|----------------|-------------|
| `acl_submit_applications` | Users/groups who can submit applications |
| `acl_administer_queue` | Users/groups who can administer the queue |
| `acl_application_max_priority` | Priority-based ACL configuration |

### Application Lifecycle

| Property Suffix | Default | Description |
|----------------|---------|-------------|
| `maximum-application-lifetime` | -1 | Maximum lifetime for applications (seconds) |
| `default-application-lifetime` | -1 | Default lifetime for applications (seconds) |
| `default-application-priority` | 0 | Default application priority |
| `priority` | 0 | Queue priority |

### Ordering Policies

#### Application Ordering Policies

| Property Suffix | Options | Description |
|----------------|---------|-------------|
| `ordering-policy` | fifo, fair, fifo-with-partitions, fifo-for-pending-apps | Application ordering policy |

Available ordering policies:
- `fifo` - First In, First Out
- `fair` - Fair sharing
- `fifo-with-partitions` - FIFO with exclusive partitions
- `fifo-for-pending-apps` - FIFO for pending applications

#### Queue Ordering Policies

| Policy | Description |
|--------|-------------|
| `utilization` | Less relative usage queue gets next resource (default) |
| `priority-utilization` | Combination of relative usage and priority |

### Queue Preemption

| Property Suffix | Default | Description |
|----------------|---------|-------------|
| `disable_preemption` | false | Disable preemption for the queue |
| `intra-queue-preemption.disable_preemption` | false | Disable intra-queue preemption |
| `allow-zero-capacity-sum` | false | Allow zero capacity sum for child queues |

## Auto Queue Creation

### Legacy Auto Creation

| Configuration Key | Default | Description |
|-------------------|---------|-------------|
| `auto-create-child-queue.enabled` | false | Enable auto creation of child queues |
| `auto-create-child-queue.max-queues` | 1000 | Maximum auto-created queues |
| `auto-create-child-queue.management-policy` | GuaranteedOrZeroCapacityOverTimePolicy | Queue management policy |
| `auto-create-child-queue.fail-on-exceeding-parent-capacity` | false | Fail auto creation when parent capacity exceeded |

### Auto Queue Creation V2

| Configuration Key | Default | Description |
|-------------------|---------|-------------|
| `auto-queue-creation-v2.enabled` | false | Enable auto queue creation v2 |
| `auto-queue-creation-v2.max-queues` | 1000 | Maximum queues in v2 |
| `auto-queue-creation-v2.maximum-queue-depth` | 2 | Maximum queue depth |
| `auto-queue-creation-v2.queue-auto-removal.enable` | true | Enable auto removal of expired queues |
| `auto-queue-creation-v2.queue-expiration-time` | 300 | Queue expiration time (seconds) |

### Auto-Created Queue Templates

Use `.leaf-queue-template` for leaf queue properties:
```xml
<property>
  <name>yarn.scheduler.capacity.root.parent.leaf-queue-template.capacity</name>
  <value>1w</value>
</property>
```

## Queue Placement Rules

### Legacy Queue Mapping

| Configuration Key | Description |
|-------------------|-------------|
| `yarn.scheduler.capacity.queue-mappings` | Legacy queue mappings (u:user:queue, g:group:queue format) |
| `yarn.scheduler.capacity.queue-mappings-override.enable` | Enable queue mapping override |

### Modern Placement Rules

| Configuration Key | Description |
|-------------------|-------------|
| `yarn.scheduler.capacity.mapping-rule-format` | Format: "legacy" or "json" |
| `yarn.scheduler.capacity.mapping-rule-json` | Inline JSON mapping rules |
| `yarn.scheduler.capacity.mapping-rule-json-file` | Path to JSON mapping rules file |

### Workflow Priority Mappings

| Configuration Key | Default | Description |
|-------------------|---------|-------------|
| `yarn.scheduler.capacity.workflow-priority-mappings` | - | Workflow priority mappings |
| `yarn.scheduler.capacity.workflow-priority-mappings-override.enable` | false | Enable workflow priority mapping override |

## Preemption Configuration

### Global Preemption Settings

| Configuration Key | Default | Description |
|-------------------|---------|-------------|
| `yarn.resourcemanager.monitor.capacity.preemption.observe_only` | false | Observe-only mode for preemption |
| `yarn.resourcemanager.monitor.capacity.preemption.monitoring_interval` | 3000 | Monitoring interval (ms) |
| `yarn.resourcemanager.monitor.capacity.preemption.max_wait_before_kill` | 15000 | Wait time before killing (ms) |
| `yarn.resourcemanager.monitor.capacity.preemption.total_preemption_per_round` | 0.1 | Maximum preemption per round |
| `yarn.resourcemanager.monitor.capacity.preemption.max_ignored_over_capacity` | 0.1 | Maximum ignored over capacity |
| `yarn.resourcemanager.monitor.capacity.preemption.natural_termination_factor` | 0.2 | Natural termination factor |

### Advanced Preemption Settings

| Configuration Key | Default | Description |
|-------------------|---------|-------------|
| `yarn.resourcemanager.monitor.capacity.preemption.additional_res_balance_based_on_reserved_containers` | false | Additional resource balance based on reserved containers |
| `yarn.resourcemanager.monitor.capacity.preemption.select_based_on_reserved_containers` | false | Select candidates for reserved containers |
| `yarn.resourcemanager.monitor.capacity.preemption.conservative-drf` | false | Conservative DRF for cross-queue preemption |
| `yarn.resourcemanager.monitor.capacity.preemption.preemption-to-balance-queue-after-satisfied.enabled` | false | Preemption to balance queues beyond guaranteed |
| `yarn.resourcemanager.monitor.capacity.preemption.preemption-to-balance-queue-after-satisfied.max-wait-before-kill` | 300000 | Max wait before kill for queue balance preemption |

### Intra-Queue Preemption

| Configuration Key | Default | Description |
|-------------------|---------|-------------|
| `yarn.resourcemanager.monitor.capacity.preemption.intra-queue-preemption.enabled` | false | Enable intra-queue preemption |
| `yarn.resourcemanager.monitor.capacity.preemption.intra-queue-preemption.minimum-threshold` | 0.5 | Minimum threshold |
| `yarn.resourcemanager.monitor.capacity.preemption.intra-queue-preemption.max-allowable-limit` | 0.2 | Maximum allowable limit |
| `yarn.resourcemanager.monitor.capacity.preemption.intra-queue-preemption.preemption-order-policy` | userlimit_first | Preemption order policy |
| `yarn.resourcemanager.monitor.capacity.preemption.intra-queue-preemption.conservative-drf` | true | Conservative DRF for intra-queue preemption |

### Priority-Utilization Ordering Policy

| Configuration Key | Default | Description |
|-------------------|---------|-------------|
| `yarn.scheduler.capacity.ordering-policy.priority-utilization.underutilized-preemption.enabled` | false | Enable underutilized preemption |
| `yarn.scheduler.capacity.ordering-policy.priority-utilization.underutilized-preemption.reserved-container-delay-ms` | 60000 | Reserved container delay |
| `yarn.scheduler.capacity.ordering-policy.priority-utilization.underutilized-preemption.allow-move-reservation` | false | Allow move reservation |

## Multi-Node Placement

| Configuration Key | Default | Description |
|-------------------|---------|-------------|
| `yarn.scheduler.capacity.multi-node-placement-enabled` | false | Enable multi-node placement |
| `yarn.scheduler.capacity.multi-node-sorting.policy.names` | - | List of sorting policies |
| `yarn.scheduler.capacity.multi-node-sorting.policy` | - | Default sorting policy |
| `yarn.scheduler.capacity.multi-node-sorting.policy.<policy>.class` | - | Policy class name |
| `yarn.scheduler.capacity.multi-node-sorting.policy.<policy>.sorting-interval.ms` | 1000 | Sorting interval |

## User-Specific Configuration

### User Weights

Use pattern: `yarn.scheduler.capacity.user.<username>.weight`

### User Parallel Applications

| Configuration Key | Description |
|-------------------|-------------|
| `yarn.scheduler.capacity.user.max-parallel-apps` | Default max parallel apps per user |
| `yarn.scheduler.capacity.user.<username>.max-parallel-apps` | Max parallel apps for specific user |

## Reservation System

| Property Suffix | Description |
|----------------|-------------|
| `reservable` | Whether queue supports reservations |
| `reservation-window` | Reservation window |
| `average-capacity` | Average capacity for reservations |
| `instantaneous-max-capacity` | Instantaneous maximum capacity |
| `reservation-policy` | Reservation admission policy |
| `reservation-agent` | Reservation agent |
| `reservation-planner` | Reservation planner |
| `reservation-move-on-expiry` | Move reservation on expiry |
| `reservation-enforcement-window` | Reservation enforcement window |
| `show-reservations-as-queues` | Show reservations as queues |

## Queue Management Monitoring

| Configuration Key | Default | Description |
|-------------------|---------|-------------|
| `yarn.resourcemanager.monitor.capacity.queue-management.monitoring-interval` | 1500 | Queue management monitoring interval (ms) |
| `yarn.scheduler.capacity.queue.auto.refresh.monitoring-interval` | 5000 | Queue auto refresh monitoring interval (ms) |

## Example Configuration Structure

```xml
<?xml version="1.0"?>
<configuration>
  <!-- Global settings -->
  <property>
    <name>yarn.scheduler.capacity.maximum-applications</name>
    <value>10000</value>
  </property>
  
  <property>
    <name>yarn.scheduler.capacity.maximum-am-resource-percent</name>
    <value>0.1</value>
  </property>
  
  <!-- Enable mixed resource types -->
  <property>
    <name>yarn.scheduler.capacity.legacy-queue-mode.enabled</name>
    <value>false</value>
  </property>
  
  <!-- Root queue children -->
  <property>
    <name>yarn.scheduler.capacity.root.queues</name>
    <value>production,development</value>
  </property>
  
  <!-- Production queue configuration -->
  <property>
    <name>yarn.scheduler.capacity.root.production.capacity</name>
    <value>70</value>
  </property>
  
  <property>
    <name>yarn.scheduler.capacity.root.production.maximum-capacity</name>
    <value>90</value>
  </property>
  
  <property>
    <name>yarn.scheduler.capacity.root.production.state</name>
    <value>RUNNING</value>
  </property>
  
  <property>
    <name>yarn.scheduler.capacity.root.production.ordering-policy</name>
    <value>priority-utilization</value>
  </property>
  
  <!-- Development queue configuration -->
  <property>
    <name>yarn.scheduler.capacity.root.development.capacity</name>
    <value>30</value>
  </property>
  
  <property>
    <name>yarn.scheduler.capacity.root.development.maximum-capacity</name>
    <value>50</value>
  </property>
  
  <!-- Weight-based configuration example -->
  <property>
    <name>yarn.scheduler.capacity.root.weighted-queue.capacity</name>
    <value>5w</value>
  </property>
  
  <!-- Absolute resource configuration example -->
  <property>
    <name>yarn.scheduler.capacity.root.resource-queue.capacity</name>
    <value>[memory=8192Mi,vcores=8,yarn.io/gpu=2]</value>
  </property>
  
  <!-- Auto queue creation example -->
  <property>
    <name>yarn.scheduler.capacity.root.auto-parent.auto-queue-creation-v2.enabled</name>
    <value>true</value>
  </property>
  
  <property>
    <name>yarn.scheduler.capacity.root.auto-parent.auto-queue-creation-v2.max-queues</name>
    <value>100</value>
  </property>
  
  <!-- Node label configuration example -->
  <property>
    <name>yarn.scheduler.capacity.root.gpu-queue.accessible-node-labels</name>
    <value>gpu</value>
  </property>
  
  <property>
    <name>yarn.scheduler.capacity.root.gpu-queue.accessible-node-labels.gpu.capacity</name>
    <value>100</value>
  </property>
</configuration>
```

## Capacity Configuration Formats

### Percentage-based Capacity
```xml
<property>
  <name>yarn.scheduler.capacity.root.queue1.capacity</name>
  <value>50</value>
</property>
```

### Weight-based Capacity
```xml
<property>
  <name>yarn.scheduler.capacity.root.queue1.capacity</name>
  <value>3w</value>
</property>
```

### Absolute Resource Capacity
```xml
<property>
  <name>yarn.scheduler.capacity.root.queue1.capacity</name>
  <value>[memory=4096Mi,vcores=4,yarn.io/gpu=2]</value>
</property>
```

### Mixed Resource Types
**Note**: Mixed resource types (combining percentage-based, weight-based, and absolute resource specifications within a hierarchy or even within a single queue) are only available when legacy queue mode is disabled (`yarn.scheduler.capacity.legacy-queue-mode.enabled=false`).

Examples of mixed configurations:
```xml
<!-- Mixed hierarchy: percentage, weight, and absolute -->
<property>
  <name>yarn.scheduler.capacity.root.percentage-queue.capacity</name>
  <value>50</value>
</property>

<property>
  <name>yarn.scheduler.capacity.root.weight-queue.capacity</name>
  <value>3w</value>
</property>

<property>
  <name>yarn.scheduler.capacity.root.absolute-queue.capacity</name>
  <value>[memory=4096Mi,vcores=4,yarn.io/gpu=2]</value>
</property>

<!-- Mixed within single queue -->
<property>
  <name>yarn.scheduler.capacity.root.mixed-queue.capacity</name>
  <value>[memory=4096Mi,vcores=4w,yarn.io/gpu=20%]</value>
</property>
```

## Best Practices

1. **Capacity Planning**: Ensure child queue capacities sum to 100% (or use weight-based allocation)
2. **Maximum Capacity**: Set reasonable maximum capacities to prevent resource starvation
3. **User Limits**: Configure appropriate user limits to ensure fair sharing
4. **ACLs**: Set proper access controls for queue administration and application submission
5. **Node Labels**: Use node labels for heterogeneous clusters
6. **Preemption**: Configure preemption carefully to balance fairness and stability
7. **Auto Creation**: Use auto queue creation for dynamic workloads
8. **Monitoring**: Enable appropriate monitoring and logging
9. **Queue Ordering**: Choose appropriate queue ordering policies based on workload characteristics
10. **Resource Vectors**: Use new capacity vector format for complex resource requirements
11. **Legacy Mode**: Disable legacy queue mode to enable mixed resource type configurations

## Validation

Before deploying your configuration:
1. Validate XML syntax
2. Ensure capacity percentages are correct
3. Test ACL configurations
4. Verify queue hierarchies
5. Check resource limit configurations
6. Test with sample applications
7. Validate auto queue creation settings
8. Test preemption configurations
9. Verify mixed resource type configurations if using non-legacy mode

## Common Configuration Patterns

### Development/Production Split
- Separate queues for development and production workloads
- Higher capacity for production, burst capability for development

### Multi-Tenant Environment
- Dedicated queues per tenant/team
- Fair resource sharing with appropriate limits

### Batch vs Interactive
- Different queues for batch and interactive workloads
- Different ordering policies and resource limits

### GPU/Specialized Hardware
- Use node labels for specialized hardware
- Separate queues for GPU workloads
- Use absolute resource capacity with custom resource types

### Weight-based Fair Sharing
- Use weight-based capacity allocation
- Automatic resource distribution based on weights

### Mixed Resource Allocation (Non-Legacy Mode)
- Combine percentage, weight, and absolute resource specifications
- Enable flexible resource management across different queue types
- Requires `yarn.scheduler.capacity.legacy-queue-mode.enabled=false`

This configuration system provides extensive flexibility for managing cluster resources according to organizational needs and workload characteristics, with support for both traditional percentage-based allocation and modern weight-based and absolute resource specifications, as well as advanced mixed resource type configurations.
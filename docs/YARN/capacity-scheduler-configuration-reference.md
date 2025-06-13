# Apache Hadoop Capacity Scheduler Configuration Properties

This document provides a comprehensive list of all configuration properties available in the Apache Hadoop Capacity Scheduler, based on the `CapacitySchedulerConfiguration.java` implementation.

## Table of Contents

- [Core Scheduler Properties](#core-scheduler-properties)
- [Asynchronous Scheduling](#asynchronous-scheduling)
- [Container Assignment](#container-assignment)
- [Reservation Properties](#reservation-properties)
- [Application Properties](#application-properties)
- [Queue Properties](#queue-properties)
- [Auto-Created Queue Properties](#auto-created-queue-properties)
- [Queue Mapping Properties](#queue-mapping-properties)
- [User Weight Properties](#user-weight-properties)
- [Preemption Properties](#preemption-properties)
- [Multi-Node Placement](#multi-node-placement)
- [Queue Management](#queue-management)
- [Resource Configuration](#resource-configuration)

---

## Core Scheduler Properties

### Basic Scheduler Configuration

| Property                                              | Default Value             | Data Type | Description                                                             |
| ----------------------------------------------------- | ------------------------- | --------- | ----------------------------------------------------------------------- |
| `yarn.scheduler.capacity.maximum-applications`        | 10000                     | int       | Maximum number of applications in the system                            |
| `yarn.scheduler.capacity.maximum-am-resource-percent` | 0.1                       | float     | Maximum percentage of resources that can be used by application masters |
| `yarn.scheduler.capacity.resource-calculator`         | DefaultResourceCalculator | Class     | ResourceCalculator implementation for resource comparison               |
| `yarn.scheduler.capacity.user-metrics.enable`         | false                     | boolean   | Enable user-level metrics collection                                    |

### Locality Configuration

| Property                                                                   | Default Value | Data Type | Description                                                                                    |
| -------------------------------------------------------------------------- | ------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `yarn.scheduler.capacity.node-locality-delay`                              | 40            | int       | Number of missed scheduling opportunities after which scheduler attempts rack-local allocation |
| `yarn.scheduler.capacity.rack-locality-additional-delay`                   | -1            | int       | Additional delay for rack locality (-1 means disabled)                                         |
| `yarn.scheduler.capacity.rack-locality-full-reset`                         | true          | boolean   | Whether to reset missed opportunities for rack locality                                        |
| `yarn.scheduler.capacity.per-node-heartbeat.maximum-offswitch-assignments` | 1             | int       | Maximum off-switch assignments per heartbeat                                                   |

---

## Asynchronous Scheduling

| Property                                                                   | Default Value | Data Type | Description                          |
| -------------------------------------------------------------------------- | ------------- | --------- | ------------------------------------ |
| `yarn.scheduler.capacity.schedule-asynchronously.enable`                   | false         | boolean   | Enable asynchronous scheduling       |
| `yarn.scheduler.capacity.schedule-asynchronously.maximum-threads`          | -             | int       | Maximum threads for async scheduling |
| `yarn.scheduler.capacity.schedule-asynchronously.maximum-pending-backlogs` | 100           | int       | Maximum pending backlogs             |
| `yarn.scheduler.capacity.schedule-asynchronously.scheduling-interval-ms`   | 5             | long      | Scheduling interval in milliseconds  |

---

## Container Assignment

| Property                                                                   | Default Value | Data Type | Description                                         |
| -------------------------------------------------------------------------- | ------------- | --------- | --------------------------------------------------- |
| `yarn.scheduler.capacity.per-node-heartbeat.multiple-assignments-enabled`  | true          | boolean   | Enable multiple container assignments per heartbeat |
| `yarn.scheduler.capacity.per-node-heartbeat.maximum-container-assignments` | 100           | int       | Maximum container assignments per heartbeat         |

---

## Reservation Properties

| Property                                                                  | Default Value | Data Type | Description                                                    |
| ------------------------------------------------------------------------- | ------------- | --------- | -------------------------------------------------------------- |
| `yarn.scheduler.capacity.reservations-continue-look-all-nodes`            | true          | boolean   | Continue looking at all nodes even after reservation limit hit |
| `yarn.scheduler.capacity.skip-allocate-on-nodes-with-reserved-containers` | false         | boolean   | Skip allocation on nodes with reserved containers              |

---

## Application Properties

| Property                                          | Default Value | Data Type | Description                                                           |
| ------------------------------------------------- | ------------- | --------- | --------------------------------------------------------------------- |
| `yarn.scheduler.capacity.application.fail-fast`   | false         | boolean   | Whether applications should fail fast on resource allocation failures |
| `yarn.scheduler.capacity.lazy-preemption-enabled` | false         | boolean   | Enable lazy preemption                                                |

---

## Queue Properties

All queue properties use the pattern `yarn.scheduler.capacity.<queue-path>.<property>` where `<queue-path>` is the full queue path (e.g., `root.default`).

### Basic Queue Configuration

| Property Pattern                                                   | Default Value | Data Type    | Description                                               |
| ------------------------------------------------------------------ | ------------- | ------------ | --------------------------------------------------------- |
| `yarn.scheduler.capacity.<queue-path>.queues`                      | -             | String       | Comma-separated list of child queues                      |
| `yarn.scheduler.capacity.<queue-path>.capacity`                    | -             | float/String | Queue capacity (percentage, absolute resource, or weight) |
| `yarn.scheduler.capacity.<queue-path>.maximum-capacity`            | 100.0         | float/String | Maximum queue capacity                                    |
| `yarn.scheduler.capacity.<queue-path>.minimum-user-limit-percent`  | 100           | float        | Minimum user limit percentage                             |
| `yarn.scheduler.capacity.<queue-path>.user-limit-factor`           | 1.0           | float        | User limit factor                                         |
| `yarn.scheduler.capacity.<queue-path>.maximum-applications`        | -1            | int          | Maximum applications per queue (-1 means no limit)        |
| `yarn.scheduler.capacity.<queue-path>.maximum-am-resource-percent` | Global value  | float        | Maximum AM resource percent per queue                     |
| `yarn.scheduler.capacity.<queue-path>.state`                       | RUNNING       | String       | Queue state (RUNNING, STOPPED)                            |

### Node Label Configuration

| Property Pattern                                                                                  | Default Value | Data Type    | Description                                         |
| ------------------------------------------------------------------------------------------------- | ------------- | ------------ | --------------------------------------------------- |
| `yarn.scheduler.capacity.<queue-path>.accessible-node-labels`                                     | -             | String       | Comma-separated list of accessible node labels      |
| `yarn.scheduler.capacity.<queue-path>.default-node-label-expression`                              | -             | String       | Default node label expression                       |
| `yarn.scheduler.capacity.<queue-path>.accessible-node-labels.<label>.capacity`                    | -             | float/String | Capacity for specific node label                    |
| `yarn.scheduler.capacity.<queue-path>.accessible-node-labels.<label>.maximum-capacity`            | -             | float/String | Maximum capacity for specific node label            |
| `yarn.scheduler.capacity.<queue-path>.accessible-node-labels.<label>.maximum-am-resource-percent` | -             | float        | Maximum AM resource percent for specific node label |

### Access Control Lists (ACLs)

| Property Pattern                                                    | Default Value           | Data Type | Description                              |
| ------------------------------------------------------------------- | ----------------------- | --------- | ---------------------------------------- |
| `yarn.scheduler.capacity.<queue-path>.acl_submit_applications`      | \* (root), " " (others) | String    | ACL for submitting applications to queue |
| `yarn.scheduler.capacity.<queue-path>.acl_administer_queue`         | \* (root), " " (others) | String    | ACL for administering queue              |
| `yarn.scheduler.capacity.<queue-path>.acl_application_max_priority` | \*                      | String    | ACL for setting application priority     |

### Resource Limits

| Property Pattern                                                 | Default Value | Data Type | Description                                                |
| ---------------------------------------------------------------- | ------------- | --------- | ---------------------------------------------------------- |
| `yarn.scheduler.capacity.<queue-path>.maximum-allocation`        | -             | String    | Maximum allocation per container (e.g., "8192mb,8vcores")  |
| `yarn.scheduler.capacity.<queue-path>.maximum-allocation-mb`     | -1            | int       | Maximum memory allocation per container in MB              |
| `yarn.scheduler.capacity.<queue-path>.maximum-allocation-vcores` | -1            | int       | Maximum vCores allocation per container                    |
| `yarn.scheduler.capacity.<queue-path>.min-resource`              | -             | String    | Absolute minimum resource (e.g., "[memory=1024,vcores=1]") |
| `yarn.scheduler.capacity.<queue-path>.max-resource`              | -             | String    | Absolute maximum resource (e.g., "[memory=8192,vcores=8]") |

### Application Ordering

| Property Pattern                                                   | Default Value | Data Type | Description                 |
| ------------------------------------------------------------------ | ------------- | --------- | --------------------------- |
| `yarn.scheduler.capacity.<queue-path>.ordering-policy`             | "fifo"        | String    | Application ordering policy |
| `yarn.scheduler.capacity.<queue-path>.ordering-policy.<parameter>` | -             | String    | Ordering policy parameters  |

**Available Ordering Policies:**

- `fifo`: First In, First Out
- `fair`: Fair sharing
- `fifo-with-partitions`: FIFO with partitions
- `fifo-for-pending-apps`: FIFO for pending applications

### Priority and Lifecycle

| Property Pattern                                                    | Default Value | Data Type | Description                             |
| ------------------------------------------------------------------- | ------------- | --------- | --------------------------------------- |
| `yarn.scheduler.capacity.<queue-path>.priority`                     | 0             | int       | Queue priority                          |
| `yarn.scheduler.capacity.<queue-path>.default-application-priority` | 0             | int       | Default application priority            |
| `yarn.scheduler.capacity.<queue-path>.maximum-application-lifetime` | -1            | long      | Maximum application lifetime in seconds |
| `yarn.scheduler.capacity.<queue-path>.default-application-lifetime` | -1            | long      | Default application lifetime in seconds |

### Parallel Applications

| Property Pattern                                         | Default Value     | Data Type | Description                   |
| -------------------------------------------------------- | ----------------- | --------- | ----------------------------- |
| `yarn.scheduler.capacity.<queue-path>.max-parallel-apps` | Integer.MAX_VALUE | int       | Maximum parallel applications |

### Preemption Control

| Property Pattern                                                                 | Default Value | Data Type | Description                    |
| -------------------------------------------------------------------------------- | ------------- | --------- | ------------------------------ |
| `yarn.scheduler.capacity.<queue-path>.disable_preemption`                        | false         | boolean   | Disable preemption for queue   |
| `yarn.scheduler.capacity.<queue-path>.intra-queue-preemption.disable_preemption` | false         | boolean   | Disable intra-queue preemption |

### Other Queue Properties

| Property Pattern                                                 | Default Value | Data Type | Description                              |
| ---------------------------------------------------------------- | ------------- | --------- | ---------------------------------------- |
| `yarn.scheduler.capacity.<queue-path>.allow-zero-capacity-sum`   | false         | boolean   | Allow zero capacity sum for child queues |
| `yarn.scheduler.capacity.<queue-path>.multi-node-sorting.policy` | -             | String    | Multi-node sorting policy                |

---

## Auto-Created Queue Properties

### Legacy Auto-Creation (V1)

| Property Pattern                                                                                 | Default Value                          | Data Type | Description                                      |
| ------------------------------------------------------------------------------------------------ | -------------------------------------- | --------- | ------------------------------------------------ |
| `yarn.scheduler.capacity.<queue-path>.auto-create-child-queue.enabled`                           | false                                  | boolean   | Enable auto-creation of child queues             |
| `yarn.scheduler.capacity.<queue-path>.auto-create-child-queue.max-queues`                        | 1000                                   | int       | Maximum auto-created queues                      |
| `yarn.scheduler.capacity.<queue-path>.auto-create-child-queue.fail-on-exceeding-parent-capacity` | false                                  | boolean   | Fail auto-creation when parent capacity exceeded |
| `yarn.scheduler.capacity.<queue-path>.auto-create-child-queue.management-policy`                 | GuaranteedOrZeroCapacityOverTimePolicy | String    | Auto-created queue management policy             |

### Auto-Creation V2

| Property Pattern                                                                        | Default Value | Data Type | Description                           |
| --------------------------------------------------------------------------------------- | ------------- | --------- | ------------------------------------- |
| `yarn.scheduler.capacity.<queue-path>.auto-queue-creation-v2.enabled`                   | false         | boolean   | Enable auto-queue creation v2         |
| `yarn.scheduler.capacity.<queue-path>.auto-queue-creation-v2.max-queues`                | 1000          | int       | Maximum auto-created queues v2        |
| `yarn.scheduler.capacity.<queue-path>.auto-queue-creation-v2.maximum-queue-depth`       | 2             | int       | Maximum queue depth                   |
| `yarn.scheduler.capacity.auto-queue-creation-v2.queue-expiration-time`                  | 300           | long      | Queue expiration time in seconds      |
| `yarn.scheduler.capacity.<queue-path>.auto-queue-creation-v2.queue-auto-removal.enable` | true          | boolean   | Enable auto-removal of expired queues |

### Template Properties

| Property Pattern                                                                         | Default Value | Data Type | Description                      |
| ---------------------------------------------------------------------------------------- | ------------- | --------- | -------------------------------- |
| `yarn.scheduler.capacity.<queue-path>.auto-queue-creation-v2.template.<property>`        | -             | varies    | Common template properties       |
| `yarn.scheduler.capacity.<queue-path>.auto-queue-creation-v2.leaf-template.<property>`   | -             | varies    | Leaf queue template properties   |
| `yarn.scheduler.capacity.<queue-path>.auto-queue-creation-v2.parent-template.<property>` | -             | varies    | Parent queue template properties |

---

## Queue Mapping Properties

| Property                                                 | Default Value | Data Type | Description                                  |
| -------------------------------------------------------- | ------------- | --------- | -------------------------------------------- |
| `yarn.scheduler.capacity.queue-mappings`                 | -             | String    | User/group to queue mappings (legacy format) |
| `yarn.scheduler.capacity.queue-mappings-override.enable` | false         | boolean   | Enable queue mapping override                |
| `yarn.scheduler.capacity.mapping-rule-format`            | "legacy"      | String    | Mapping rule format (legacy or json)         |
| `yarn.scheduler.capacity.mapping-rule-json`              | -             | String    | Inline JSON mapping rules                    |
| `yarn.scheduler.capacity.mapping-rule-json-file`         | -             | String    | JSON mapping rules file path                 |

### Workflow Priority Mapping

| Property                                                             | Default Value | Data Type | Description                               |
| -------------------------------------------------------------------- | ------------- | --------- | ----------------------------------------- |
| `yarn.scheduler.capacity.workflow-priority-mappings`                 | -             | String    | Workflow priority mappings                |
| `yarn.scheduler.capacity.workflow-priority-mappings-override.enable` | false         | boolean   | Enable workflow priority mapping override |

---

## User Weight Properties

| Property Pattern                                                       | Default Value     | Data Type | Description                                     |
| ---------------------------------------------------------------------- | ----------------- | --------- | ----------------------------------------------- |
| `yarn.scheduler.capacity.<queue-path>.user-settings.<username>.weight` | 1.0               | float     | User weight for specific user                   |
| `yarn.scheduler.capacity.max-parallel-apps`                            | Integer.MAX_VALUE | int       | Global default maximum parallel applications    |
| `yarn.scheduler.capacity.user.max-parallel-apps`                       | Integer.MAX_VALUE | int       | Default maximum parallel applications per user  |
| `yarn.scheduler.capacity.user.<username>.max-parallel-apps`            | -                 | int       | Maximum parallel applications for specific user |

---

## Preemption Properties

### Global Preemption Settings

| Property                                                                                               | Default Value | Data Type | Description                                              |
| ------------------------------------------------------------------------------------------------------ | ------------- | --------- | -------------------------------------------------------- |
| `yarn.resourcemanager.monitor.capacity.preemption.observe_only`                                        | false         | boolean   | Observe-only mode for preemption                         |
| `yarn.resourcemanager.monitor.capacity.preemption.monitoring_interval`                                 | 3000          | long      | Preemption monitoring interval in milliseconds           |
| `yarn.resourcemanager.monitor.capacity.preemption.max_wait_before_kill`                                | 15000         | long      | Wait time before killing container in milliseconds       |
| `yarn.resourcemanager.monitor.capacity.preemption.total_preemption_per_round`                          | 0.1           | float     | Total preemption per round                               |
| `yarn.resourcemanager.monitor.capacity.preemption.max_ignored_over_capacity`                           | 0.1           | double    | Maximum ignored over capacity                            |
| `yarn.resourcemanager.monitor.capacity.preemption.natural_termination_factor`                          | 0.2           | double    | Natural termination factor                               |
| `yarn.resourcemanager.monitor.capacity.preemption.select_based_on_reserved_containers`                 | false         | boolean   | Select candidates based on reserved containers           |
| `yarn.resourcemanager.monitor.capacity.preemption.additional_res_balance_based_on_reserved_containers` | false         | boolean   | Additional resource balance based on reserved containers |

### Intra-Queue Preemption

| Property                                                                                          | Default Value     | Data Type | Description                                  |
| ------------------------------------------------------------------------------------------------- | ----------------- | --------- | -------------------------------------------- |
| `yarn.resourcemanager.monitor.capacity.preemption.intra-queue-preemption.enabled`                 | false             | boolean   | Enable intra-queue preemption                |
| `yarn.resourcemanager.monitor.capacity.preemption.intra-queue-preemption.minimum-threshold`       | 0.5               | float     | Minimum threshold for intra-queue preemption |
| `yarn.resourcemanager.monitor.capacity.preemption.intra-queue-preemption.max-allowable-limit`     | 0.2               | float     | Maximum allowable limit                      |
| `yarn.resourcemanager.monitor.capacity.preemption.intra-queue-preemption.preemption-order-policy` | "userlimit_first" | String    | Preemption order policy                      |
| `yarn.resourcemanager.monitor.capacity.preemption.conservative-drf`                               | false             | boolean   | Conservative DRF for cross-queue preemption  |
| `yarn.resourcemanager.monitor.capacity.preemption.intra-queue-preemption.conservative-drf`        | true              | boolean   | Conservative DRF for intra-queue preemption  |

### Queue Balance Preemption

| Property                                                                                                            | Default Value | Data Type | Description                                           |
| ------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ----------------------------------------------------- |
| `yarn.resourcemanager.monitor.capacity.preemption.preemption-to-balance-queue-after-satisfied.enabled`              | false         | boolean   | Enable preemption to balance queues beyond guaranteed |
| `yarn.resourcemanager.monitor.capacity.preemption.preemption-to-balance-queue-after-satisfied.max-wait-before-kill` | 300000        | long      | Max wait before kill for queue balance preemption     |

---

## Multi-Node Placement

| Property                                                                              | Default Value | Data Type | Description                                             |
| ------------------------------------------------------------------------------------- | ------------- | --------- | ------------------------------------------------------- |
| `yarn.scheduler.capacity.multi-node-placement-enabled`                                | false         | boolean   | Enable multi-node placement                             |
| `yarn.scheduler.capacity.multi-node-sorting.policy.names`                             | -             | String    | Comma-separated list of multi-node sorting policy names |
| `yarn.scheduler.capacity.multi-node-sorting.policy`                                   | -             | String    | Multi-node sorting policy                               |
| `yarn.scheduler.capacity.multi-node-sorting.policy.<policy-name>.class`               | -             | String    | Multi-node policy class                                 |
| `yarn.scheduler.capacity.multi-node-sorting.policy.<policy-name>.sorting-interval.ms` | 1000          | long      | Sorting interval for policy in milliseconds             |

---

## Queue Management

| Property                                                                     | Default Value | Data Type | Description                                            |
| ---------------------------------------------------------------------------- | ------------- | --------- | ------------------------------------------------------ |
| `yarn.resourcemanager.monitor.capacity.queue-management.monitoring-interval` | 1500          | long      | Queue management monitoring interval in milliseconds   |
| `yarn.scheduler.capacity.queue.auto.refresh.monitoring-interval`             | 5000          | long      | Queue auto-refresh monitoring interval in milliseconds |
| `yarn.scheduler.capacity.legacy-queue-mode.enabled`                          | true          | boolean   | Enable legacy queue mode                               |

---

## Resource Configuration

### Resource Patterns and Types

- **Absolute Resource Pattern**: `^\\[[\\w\\.,\\-_=\\ /]+\\]$`
    - Example: `[memory=1024,vcores=1]`
- **Default Resource Types**: `memory,vcores`
- **Weight Suffix**: `w` (for weight-based capacity configuration)
    - Example: `50w` means 50% weight

### Constants and Limits

| Constant               | Value | Description                          |
| ---------------------- | ----- | ------------------------------------ |
| Minimum Capacity Value | 0     | Minimum allowed capacity percentage  |
| Maximum Capacity Value | 100   | Maximum allowed capacity percentage  |
| Undefined Value        | -1    | Value indicating undefined/unlimited |
| All ACL                | "\*"  | ACL value allowing all users         |
| None ACL               | " "   | ACL value allowing no users          |
| Default User Weight    | 1.0   | Default weight for users             |

### Reservation Properties (Per Queue)

| Property Pattern                                                      | Default Value | Data Type | Description                         |
| --------------------------------------------------------------------- | ------------- | --------- | ----------------------------------- |
| `yarn.scheduler.capacity.<queue-path>.reservable`                     | false         | boolean   | Whether queue supports reservations |
| `yarn.scheduler.capacity.<queue-path>.reservation-window`             | -             | long      | Reservation window                  |
| `yarn.scheduler.capacity.<queue-path>.average-capacity`               | 100.0         | float     | Average capacity for reservations   |
| `yarn.scheduler.capacity.<queue-path>.instantaneous-max-capacity`     | 100.0         | float     | Instantaneous maximum capacity      |
| `yarn.scheduler.capacity.<queue-path>.reservation-policy`             | -             | String    | Reservation admission policy        |
| `yarn.scheduler.capacity.<queue-path>.reservation-agent`              | -             | String    | Reservation agent                   |
| `yarn.scheduler.capacity.<queue-path>.show-reservations-as-queues`    | -             | boolean   | Show reservations as queues         |
| `yarn.scheduler.capacity.<queue-path>.reservation-planner`            | -             | String    | Reservation planner                 |
| `yarn.scheduler.capacity.<queue-path>.reservation-move-on-expiry`     | -             | boolean   | Move reservation on expiry          |
| `yarn.scheduler.capacity.<queue-path>.reservation-enforcement-window` | -             | long      | Reservation enforcement window      |

---

## Notes

1. **Queue Path Format**: Replace `<queue-path>` with the actual queue path (e.g., `root.default`, `root.production.high`).
2. **Username Format**: Replace `<username>` with the actual username for user-specific configurations.
3. **Node Label Format**: Replace `<label>` with the actual node label name.
4. **Policy Name Format**: Replace `<policy-name>` with the actual policy name.
5. **Resource Format**: Absolute resources should be specified in the format `[resource=value,resource=value]` (e.g., `[memory=1024mb,vcores=1]`).
6. **Capacity Formats**:
    - Percentage: `50.0` (50%)
    - Weight: `50w` (50 weight units)
    - Absolute: `[memory=1024mb,vcores=1]`

---

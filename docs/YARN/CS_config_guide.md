# Apache Hadoop YARN Capacity Scheduler Configuration Guidebook

## Table of Contents

1. [Global System-Wide Configurations](#1-global-system-wide-configurations)
2. [Queue Configuration Properties](#2-queue-configuration-properties)
3. [Resource Allocation Configurations](#3-resource-allocation-configurations)
4. [Scheduling Policy Configurations](#4-scheduling-policy-configurations)
5. [Security and ACL Configurations](#5-security-and-acl-configurations)
6. [Auto-Queue Creation Configurations](#6-auto-queue-creation-configurations)
7. [Preemption Configurations](#7-preemption-configurations)
8. [Advanced Features and Monitoring](#8-advanced-features-and-monitoring)
9. [Configuration Validation Rules](#9-configuration-validation-rules)
10. [Common Misconfigurations and Best Practices](#10-common-misconfigurations-and-best-practices)

---

## 1. Global System-Wide Configurations

### Core Application Management

#### **yarn.scheduler.capacity.maximum-applications**

- **Default**: 10000
- **Data Type**: Integer
- **Valid Range**: Positive integer
- **Description**: Maximum number of applications that can be concurrently active (running and pending) system-wide
- **Mandatory**: No (uses default)
- **Validation**: Must be positive integer
- **Interdependencies**: Proportional limits applied to queues based on their absolute capacities
- **Common Misconfiguration**: Setting too low for large clusters causing application submission rejections

#### **yarn.scheduler.capacity.maximum-am-resource-percent**

- **Default**: 0.1 (10%)
- **Data Type**: Float
- **Valid Range**: 0.0 to 1.0
- **Description**: Maximum percentage of cluster resources for Application Masters
- **Mandatory**: No
- **Validation**: Range 0.0-1.0, where 0.5 = 50%
- **UI Tip**: Display as percentage, validate as float
- **Common Misconfiguration**: Setting too low prevents applications from starting

#### **yarn.scheduler.capacity.max-parallel-apps**

- **Default**: Unlimited (no default limit)
- **Data Type**: Integer
- **Valid Range**: Positive integer or unlimited
- **Description**: Global limit on parallel running applications (not pending submissions)
- **Mandatory**: No
- **Behavior**: Applications stay in ACCEPTED state until slots available
- **Validation**: Positive integer or unlimited
- **Interdependencies**: Lowest value in hierarchy branch enforced

### Resource Calculator Configuration

#### **yarn.scheduler.capacity.resource-calculator**

- **Default**: org.apache.hadoop.yarn.util.resource.DefaultResourceCalculator
- **Data Type**: Java class name
- **Valid Values**:
    - DefaultResourceCalculator (memory only)
    - DominantResourceCalculator (memory + CPU + other resources)
- **Description**: Resource calculator implementation for multi-dimensional resources
- **Mandatory**: No
- **Validation**: Must be valid ResourceCalculator implementation class
- **Common Misconfiguration**: Using DefaultResourceCalculator when CPU scheduling needed

### User Limit Configuration

#### **yarn.scheduler.capacity.minimum-user-limit-percent**

- **Default**: 100 (no user limits)
- **Data Type**: Integer
- **Valid Range**: 0-100
- **Description**: Global minimum percentage of queue resources per user
- **Mandatory**: No
- **Validation**: Range 0-100, where 100 = no limits
- **Interdependencies**: Can be overridden per queue

#### **yarn.scheduler.capacity.user-limit-factor**

- **Default**: 1.0
- **Data Type**: Float
- **Valid Range**: Positive float, -1 to disable
- **Description**: Multiplier for user resource limits beyond queue capacity
- **Mandatory**: No
- **Validation**: Positive float, -1 to disable
- **Special**: Auto-set to -1 with flexible auto-queue creation

### Queue Mapping and Placement

#### **yarn.scheduler.capacity.queue-mappings**

- **Default**: Empty
- **Data Type**: String (comma-separated rules)
- **Format**: `[u|g]:[name]:[queue_name]`
- **Variables**: %user, %primary_group, %secondary_group
- **Description**: Rules for automatic queue assignment
- **Mandatory**: No
- **Validation**: Must follow mapping syntax rules
- **Example**: `u:user1:queue1,g:group1:queue2,u:%user:%user`

#### **yarn.scheduler.capacity.queue-mappings-override.enable**

- **Default**: false
- **Data Type**: Boolean
- **Description**: Whether user-specified queues can be overridden by mappings
- **Mandatory**: No
- **Validation**: Boolean value

#### **yarn.scheduler.capacity.mapping-rule-format**

- **Default**: legacy
- **Data Type**: String
- **Valid Values**: "legacy" or "json"
- **Description**: Format for queue mapping rules
- **Mandatory**: No
- **Interdependencies**: If "json", use mapping-rule-json properties

### Legacy Queue Mode

#### **yarn.scheduler.capacity.legacy-queue-mode.enabled**

- **Default**: true
- **Data Type**: Boolean
- **Description**: Controls capacity configuration flexibility
- **Mandatory**: No
- **Impact**: When false, enables Universal Capacity Vector format
- **Validation**: Boolean value

### Container Assignment Control

#### **yarn.scheduler.capacity.per-node-heartbeat.multiple-assignments-enabled**

- **Default**: true
- **Data Type**: Boolean
- **Description**: Allow multiple container assignments per heartbeat
- **Mandatory**: No

#### **yarn.scheduler.capacity.per-node-heartbeat.maximum-container-assignments**

- **Default**: 100
- **Data Type**: Integer
- **Valid Range**: Positive integer, -1 for unlimited
- **Description**: Max containers assigned per heartbeat
- **Mandatory**: No
- **Validation**: Positive integer, -1 for unlimited

#### **yarn.scheduler.capacity.per-node-heartbeat.maximum-offswitch-assignments**

- **Default**: 1
- **Data Type**: Integer
- **Valid Range**: Positive integer
- **Description**: Max off-switch containers per heartbeat
- **Mandatory**: No

### Locality Scheduling

#### **yarn.scheduler.capacity.node-locality-delay**

- **Default**: 40
- **Data Type**: Integer
- **Valid Range**: Positive integer, -1 to disable
- **Description**: Missed opportunities before relaxing to rack-local
- **Mandatory**: No
- **Recommendation**: Set to number of nodes in cluster
- **Validation**: Positive integer or -1

#### **yarn.scheduler.capacity.rack-locality-additional-delay**

- **Default**: -1 (calculated)
- **Data Type**: Integer
- **Valid Range**: Positive integer, -1 for automatic
- **Description**: Additional delays before off-switch scheduling
- **Mandatory**: No
- **Formula**: L _ C / N (locations _ containers / cluster size)

---

## 2. Queue Configuration Properties

### Basic Queue Hierarchy

#### **yarn.scheduler.capacity.root.queues**

- **Key Pattern**: `yarn.scheduler.capacity.root.queues`
- **Data Type**: Comma-separated string
- **Description**: Defines child queues under root queue
- **Mandatory**: Yes (at least one queue required)
- **Format**: `queue1,queue2,queue3`
- **Validation**: Queue names must be valid identifiers (alphanumeric, hyphens, underscores)
- **Constraints**: No spaces in queue names

#### **yarn.scheduler.capacity.<queue-path>.queues**

- **Key Pattern**: `yarn.scheduler.capacity.<queue-path>.queues`
- **Data Type**: Comma-separated string
- **Description**: Defines child queues for any parent queue
- **Mandatory**: No (only for parent queues)
- **Example**: `yarn.scheduler.capacity.root.dev.queues = eng,qa`
- **Inheritance**: Children do not inherit properties from parent unless noted

### Capacity Configuration

#### **yarn.scheduler.capacity.<queue-path>.capacity**

- **Key Pattern**: `yarn.scheduler.capacity.<queue-path>.capacity`
- **Data Type**: Multiple formats supported
- **Formats**:
    - Percentage: `50.0` (percentage of parent capacity)
    - Weight: `2w` (relative weight)
    - Absolute: `[memory=10240,vcores=12]` (specific resources)
    - Universal Vector: `[memory=50%,vcores=2w,gpu=1]` (mixed modes)
- **Default**: No default - must be explicitly set
- **Mandatory**: Yes for all queues
- **Validation Rules**:
    - Percentage mode: Sum of child queues must equal 100% of parent
    - Weight mode: Automatically calculated proportions
    - Absolute mode: Sum can be less than parent capacity
    - Child queues under same parent must use same capacity mode
- **Common Misconfiguration**: Child capacities not summing to 100%

#### **yarn.scheduler.capacity.<queue-path>.maximum-capacity**

- **Key Pattern**: `yarn.scheduler.capacity.<queue-path>.maximum-capacity`
- **Data Type**: Multiple formats
- **Formats**:
    - Percentage: `75.0` (0-100, only for percentage/weight capacity modes)
    - Absolute: `[memory=20480,vcores=24]` (for absolute capacity mode)
- **Default**: -1 (unlimited, equals 100%)
- **Mandatory**: No
- **Validation**:
    - Must be >= capacity value
    - Cannot exceed parent's maximum-capacity
- **Constraints**: For weight mode, maximum-capacity must use percentages

### User Limits

#### **yarn.scheduler.capacity.<queue-path>.minimum-user-limit-percent**

- **Key Pattern**: `yarn.scheduler.capacity.<queue-path>.minimum-user-limit-percent`
- **Data Type**: Integer
- **Valid Range**: 0-100
- **Default**: 100 (no user limits)
- **Description**: Minimum percentage of queue resources per user
- **Mandatory**: No
- **Example**: With value 25 and 4+ users, no user can use more than 25%

#### **yarn.scheduler.capacity.<queue-path>.user-limit-factor**

- **Key Pattern**: `yarn.scheduler.capacity.<queue-path>.user-limit-factor`
- **Data Type**: Float
- **Default**: 1.0
- **Valid Range**: Positive float, -1 to disable
- **Description**: Multiple of queue capacity a single user can consume
- **Mandatory**: No
- **Special Values**: -1 disables the feature

### Application Control

#### **yarn.scheduler.capacity.<queue-path>.maximum-applications**

- **Key Pattern**: `yarn.scheduler.capacity.<queue-path>.maximum-applications`
- **Data Type**: Integer
- **Default**: 10000 (globally), calculated proportionally per queue
- **Description**: Maximum concurrent applications (running + pending)
- **Mandatory**: No
- **Validation**: Hard limit - submissions rejected when exceeded

#### **yarn.scheduler.capacity.<queue-path>.maximum-am-resource-percent**

- **Key Pattern**: `yarn.scheduler.capacity.<queue-path>.maximum-am-resource-percent`
- **Data Type**: Float
- **Valid Range**: 0.0 to 1.0
- **Default**: 0.1 (10%)
- **Description**: Maximum percent of resources for Application Masters
- **Mandatory**: No

#### **yarn.scheduler.capacity.<queue-path>.max-parallel-apps**

- **Key Pattern**: `yarn.scheduler.capacity.<queue-path>.max-parallel-apps`
- **Data Type**: Integer
- **Default**: Unlimited
- **Description**: Maximum simultaneously running applications
- **Mandatory**: No
- **Behavior**: Applications stay in ACCEPTED state when limit reached

### Queue State

#### **yarn.scheduler.capacity.<queue-path>.state**

- **Key Pattern**: `yarn.scheduler.capacity.<queue-path>.state`
- **Data Type**: String
- **Valid Values**: RUNNING, STOPPED
- **Default**: RUNNING
- **Description**: Queue operational state
- **Mandatory**: No
- **Inheritance**: If parent is STOPPED, children cannot accept applications
- **Validation**: Queue must be STOPPED with no apps before deletion

---

## 3. Resource Allocation Configurations

### Basic Resource Limits

#### **yarn.scheduler.minimum-allocation-mb**

- **Default**: 1024 (1 GB)
- **Data Type**: Integer
- **Valid Range**: > 0, must be ≤ maximum-allocation-mb
- **Description**: Minimum memory allocation per container in MB
- **Mandatory**: No
- **Validation**: Must be positive and not exceed maximum
- **Common Misconfiguration**: Setting too high causes resource waste

#### **yarn.scheduler.maximum-allocation-mb**

- **Default**: 8192 (8 GB)
- **Data Type**: Integer
- **Valid Range**: ≥ minimum-allocation-mb
- **Description**: Maximum memory allocation per container in MB
- **Mandatory**: No
- **Validation**: Must be ≥ minimum allocation

#### **yarn.scheduler.minimum-allocation-vcores**

- **Default**: 1
- **Data Type**: Integer
- **Valid Range**: > 0, must be ≤ maximum-allocation-vcores
- **Description**: Minimum virtual CPU cores allocation per container
- **Mandatory**: No

#### **yarn.scheduler.maximum-allocation-vcores**

- **Default**: 4
- **Data Type**: Integer
- **Valid Range**: ≥ minimum-allocation-vcores
- **Description**: Maximum virtual CPU cores allocation per container
- **Mandatory**: No

### Queue-Level Resource Overrides

#### **yarn.scheduler.capacity.<queue-path>.maximum-allocation-mb**

- **Default**: Inherits from cluster-level setting
- **Data Type**: Integer
- **Valid Range**: ≤ cluster maximum allocation
- **Description**: Per-queue maximum memory allocation override
- **Mandatory**: No

#### **yarn.scheduler.capacity.<queue-path>.maximum-allocation-vcores**

- **Default**: Inherits from cluster-level setting
- **Data Type**: Integer
- **Valid Range**: ≤ cluster maximum allocation
- **Description**: Per-queue maximum vcore allocation override
- **Mandatory**: No

---

## 4. Scheduling Policy Configurations

### Queue Ordering Policies

#### **yarn.scheduler.capacity.<queue-path>.ordering-policy**

- **Default**: fifo
- **Data Type**: String
- **Valid Values**: fifo, fair
- **Description**: Application ordering policy within queue
- **Mandatory**: No
- **Validation**: Must be "fifo" or "fair"
- **Impact**: FIFO = oldest first, Fair = proportional sharing

#### **yarn.scheduler.capacity.<queue-path>.ordering-policy.fair.enable-size-based-weight**

- **Default**: false
- **Data Type**: Boolean
- **Description**: Enable size-based weighting in fair scheduling
- **Mandatory**: No
- **Constraint**: Only applicable when ordering-policy=fair

### Application Priority

#### **yarn.cluster.max-application-priority**

- **Default**: 0
- **Data Type**: Integer
- **Valid Range**: Non-negative integer
- **Description**: Maximum application priority cluster-wide
- **Mandatory**: No
- **Behavior**: Higher priority apps are scheduled first

#### **yarn.scheduler.capacity.root.<queue-path>.default-application-priority**

- **Default**: No default
- **Data Type**: Integer
- **Valid Range**: Within cluster max priority
- **Description**: Default priority for applications in queue
- **Mandatory**: No

---

## 5. Security and ACL Configurations

### Core ACL Properties

#### **yarn.scheduler.capacity.root.<queue-path>.acl_submit_applications**

- **Default**: \* (for root queue if not specified)
- **Format**: `user1,user2 space group1,group2`
- **Description**: Controls who can submit applications to queues
- **Mandatory**: No
- **Special Values**:
    - `*` = anyone
    - ` ` (space) = no one
- **Inheritance**: From parent if not specified
- **Validation**: Must follow user/group format

#### **yarn.scheduler.capacity.root.<queue-path>.acl_administer_queue**

- **Default**: \* (for root queue if not specified)
- **Format**: `user1,user2 space group1,group2`
- **Description**: Controls who can administer applications on queues
- **Mandatory**: No
- **Permissions**: Kill, view, modify applications

### Global ACL Settings

#### **yarn.acl.enable**

- **Default**: false
- **Data Type**: Boolean
- **Description**: Global ACL enablement flag
- **Mandatory**: No
- **Important**: Must be enabled for ACLs to work

#### **yarn.admin.acl**

- **Default**: \*
- **Format**: Same as queue ACLs
- **Description**: Cluster administration rights
- **Mandatory**: No
- **Warning**: Must not be left empty

---

## 6. Auto-Queue Creation Configurations

### Legacy Auto-Queue Creation

#### **yarn.scheduler.capacity.<queue-path>.auto-create-child-queue.enabled**

- **Default**: false
- **Data Type**: Boolean
- **Description**: Enable automatic leaf queue creation
- **Mandatory**: No
- **Constraint**: Parent cannot have pre-configured child queues

#### **yarn.scheduler.capacity.<queue-path>.leaf-queue-template.capacity**

- **Default**: None (mandatory when auto-creation enabled)
- **Format**: Percentage, weight (w suffix), or absolute
- **Description**: Template capacity for auto-created queues
- **Mandatory**: Yes when auto-creation enabled

### Flexible Auto-Queue Creation (v2)

#### **yarn.scheduler.capacity.<queue-path>.auto-queue-creation-v2.enabled**

- **Default**: false
- **Data Type**: Boolean
- **Description**: Enable flexible auto-creation (parent and leaf queues)
- **Mandatory**: No
- **Advantage**: Can coexist with static child queues

#### **yarn.scheduler.capacity.<queue-path>.auto-queue-creation-v2.max-queues**

- **Default**: 1000
- **Data Type**: Integer
- **Valid Range**: Positive integer
- **Description**: Maximum dynamic queues under parent
- **Mandatory**: No
- **Purpose**: Prevents unbounded queue creation

### Auto-Queue Templates

#### **yarn.scheduler.capacity.<queue-path>.auto-queue-creation-v2.template.<property>**

- **Description**: Template for all auto-created queues
- **Format**: Standard queue property values
- **Mandatory**: No
- **Inheritance**: Applied to all auto-created queues

#### **yarn.scheduler.capacity.<queue-path>.auto-queue-creation-v2.leaf-template.<property>**

- **Description**: Template specific to leaf queues
- **Mandatory**: No
- **Override**: Takes precedence over general template

#### **yarn.scheduler.capacity.<queue-path>.auto-queue-creation-v2.parent-template.<property>**

- **Description**: Template specific to parent queues
- **Mandatory**: No
- **Override**: Takes precedence over general template

---

## 7. Preemption Configurations

### Global Preemption Settings

#### **yarn.resourcemanager.scheduler.monitor.enable**

- **Default**: false
- **Data Type**: Boolean
- **Description**: Enable scheduler monitoring policies
- **Mandatory**: No
- **Requirement**: Must be true for preemption

#### **yarn.resourcemanager.scheduler.monitor.policies**

- **Default**: org.apache.hadoop.yarn.server.resourcemanager.monitor.capacity.ProportionalCapacityPreemptionPolicy
- **Data Type**: Comma-separated class names
- **Description**: Preemption policy implementations
- **Mandatory**: No
- **Validation**: Classes must implement SchedulingEditPolicy

### Preemption Timing

#### **yarn.resourcemanager.monitor.capacity.preemption.monitoring_interval**

- **Default**: 3000 (milliseconds)
- **Data Type**: Long
- **Valid Range**: Positive milliseconds
- **Description**: Frequency of preemption decisions
- **Mandatory**: No

#### **yarn.resourcemanager.monitor.capacity.preemption.max_wait_before_kill**

- **Default**: 15000 (milliseconds)
- **Data Type**: Long
- **Description**: Grace period before container termination
- **Mandatory**: No

### Preemption Thresholds

#### **yarn.resourcemanager.monitor.capacity.preemption.total_preemption_per_round**

- **Default**: 0.1 (10%)
- **Data Type**: Float
- **Valid Range**: 0.0 to 1.0
- **Description**: Maximum resources to preempt per round
- **Mandatory**: No
- **Purpose**: Prevents cluster thrashing

#### **yarn.resourcemanager.monitor.capacity.preemption.max_ignored_over_capacity**

- **Default**: 0.1 (10%)
- **Data Type**: Float
- **Description**: Deadzone around target capacity
- **Mandatory**: No
- **Purpose**: Prevents oscillation

#### **yarn.resourcemanager.monitor.capacity.preemption.natural_termination_factor**

- **Default**: 0.2 (20%)
- **Data Type**: Float
- **Description**: Expected natural container completion rate
- **Mandatory**: No

### Queue-Level Preemption Control

#### **yarn.scheduler.capacity.<queue-path>.disable_preemption**

- **Default**: false
- **Data Type**: Boolean
- **Description**: Disable preemption for specific queue
- **Mandatory**: No
- **Inheritance**: From parent if not specified

#### **yarn.scheduler.capacity.<queue-path>.intra-queue-preemption.disable_preemption**

- **Default**: false
- **Data Type**: Boolean
- **Description**: Disable preemption within queue
- **Mandatory**: No

---

## 8. Advanced Features and Monitoring

### Configuration Store

#### **yarn.scheduler.configuration.store.class**

- **Default**: file
- **Data Type**: String
- **Valid Values**: file, memory, leveldb, zk
- **Description**: Configuration persistence mechanism
- **Mandatory**: No
- **Impact**: Affects API-based config changes

#### **yarn.scheduler.configuration.mutation.acl-policy.class**

- **Default**: DefaultConfigurationMutationACLPolicy
- **Data Type**: Java class name
- **Description**: ACL policy for configuration mutations
- **Mandatory**: No

### Activities Monitoring

#### **yarn.resourcemanager.activities-manager.cleanup-interval-ms**

- **Default**: 5000
- **Data Type**: Integer
- **Description**: Cleanup interval for scheduler activities
- **Mandatory**: No

#### **yarn.resourcemanager.activities-manager.scheduler-activities.ttl-ms**

- **Default**: 600000 (10 minutes)
- **Data Type**: Integer
- **Description**: TTL for scheduler activities cache
- **Mandatory**: No

### Application Lifetime

#### **yarn.scheduler.capacity.<queue-path>.maximum-application-lifetime**

- **Default**: -1 (disabled)
- **Data Type**: Seconds (integer)
- **Description**: Hard limit on application lifetime
- **Mandatory**: No
- **Behavior**: Applications killed after exceeding

#### **yarn.scheduler.capacity.<queue-path>.default-application-lifetime**

- **Default**: -1 (disabled)
- **Data Type**: Seconds (integer)
- **Description**: Default application lifetime
- **Mandatory**: No
- **Constraint**: Cannot exceed maximum-application-lifetime

---

## 9. Configuration Validation Rules

### Critical Validation Rules

#### **100% Capacity Rule**

- **Rule**: In percentage mode, sum of child queue capacities must equal 100%
- **Error**: "queue-capacity at each level should be equal to 100%"
- **Validation Logic**:

```
totalCapacity = sum(childQueue.capacity)
if (abs(totalCapacity - 100.0) > EPSILON) {
    throw ValidationException
}
```

#### **Maximum Capacity Constraint**

- **Rule**: maximum-capacity >= capacity for all queues
- **Error**: "maximum capacity cannot be less than capacity"
- **Additional**: maximum-capacity <= parent.maximum-capacity

#### **Capacity Mode Consistency**

- **Rule**: All child queues under same parent must use same capacity mode
- **Exception**: Universal Capacity Vector (non-legacy mode) allows mixing
- **Error**: "Inconsistent capacity mode under parent queue"

#### **Resource Format Validation**

- **Percentage**: 0.0-100.0
- **Weight**: Positive number with 'w' suffix (e.g., "2w")
- **Absolute**: [memory=X,vcores=Y] format
- **Universal Vector**: [memory=50%,vcores=2w,gpu=1]

#### **Queue Name Validation**

- **Valid Characters**: Alphanumeric, hyphens, underscores
- **Invalid**: Spaces, dots (except in path), special characters
- **Case Sensitive**: Yes

#### **State Transition Rules**

- **Valid States**: RUNNING, STOPPED
- **Deletion Rule**: Queue must be STOPPED with no running/pending apps
- **Inheritance**: Child queues affected by parent state

#### **User Limit Validation**

- **minimum-user-limit-percent**: 0-100
- **user-limit-factor**: Positive float or -1
- **Effective limit calculation**:

```
effective_limit = min(
    queue_capacity * (user_limit_percent / 100) * user_limit_factor,
    maximum_applications_per_queue
)
```

### Interdependency Validation Matrix

| Configuration               | Depends On         | Affects           | Validation Rule              |
| --------------------------- | ------------------ | ----------------- | ---------------------------- |
| queue.capacity              | parent.capacity    | child allocations | Sum = 100% (percentage mode) |
| queue.maximum-capacity      | queue.capacity     | elastic capacity  | >= capacity                  |
| user-limit-factor           | queue.capacity     | user limits       | > 0 or -1                    |
| maximum-applications        | queue.capacity     | concurrency       | Proportional calculation     |
| maximum-am-resource-percent | queue resources    | AM capacity       | 0.0-1.0 range                |
| auto-queue templates        | auto-queue enabled | new queues        | Valid capacity format        |

---

## 10. Common Misconfigurations and Best Practices

### Top Configuration Mistakes

#### **1. Capacity Sum Errors**

```xml
<!-- WRONG: Sum != 100% -->
<property>
  <name>yarn.scheduler.capacity.root.dev.capacity</name>
  <value>60</value>
</property>
<property>
  <name>yarn.scheduler.capacity.root.prod.capacity</name>
  <value>30</value> <!-- Missing 10% -->
</property>
```

**Fix**: Ensure all sibling queues sum to exactly 100%

#### **2. Maximum Capacity Less Than Capacity**

```xml
<!-- WRONG -->
<property>
  <name>yarn.scheduler.capacity.root.queue1.capacity</name>
  <value>60</value>
</property>
<property>
  <name>yarn.scheduler.capacity.root.queue1.maximum-capacity</name>
  <value>40</value> <!-- Less than capacity! -->
</property>
```

**Fix**: Set maximum-capacity >= capacity

#### **3. Mixed Capacity Modes**

```xml
<!-- WRONG: Mixing modes under same parent -->
<property>
  <name>yarn.scheduler.capacity.root.queue1.capacity</name>
  <value>50.0</value> <!-- Percentage -->
</property>
<property>
  <name>yarn.scheduler.capacity.root.queue2.capacity</name>
  <value>2w</value> <!-- Weight - INVALID -->
</property>
```

**Fix**: Use consistent mode or enable Universal Capacity Vector

#### **4. Resource Calculator Mismatch**

```xml
<!-- WRONG: Using memory-only calculator with CPU requirements -->
<property>
  <name>yarn.scheduler.capacity.resource-calculator</name>
  <value>DefaultResourceCalculator</value>
</property>
```

**Fix**: Use DominantResourceCalculator for multi-resource scheduling

#### **5. ACL Format Errors**

```xml
<!-- WRONG: Missing space separator -->
<property>
  <name>yarn.scheduler.capacity.root.dev.acl_submit_applications</name>
  <value>user1,user2,group1</value>
</property>
<!-- CORRECT -->
<property>
  <name>yarn.scheduler.capacity.root.dev.acl_submit_applications</name>
  <value>user1,user2 group1,group2</value>
</property>
```

### Best Practices for UI Implementation

#### **Input Validation**

1. **Real-time capacity sum validation** - Show remaining percentage as user types
2. **Range validators** - Enforce min/max for all numeric inputs
3. **Format validators** - Check resource strings, queue names, ACL formats
4. **Dependency validation** - Update related fields automatically

#### **User Experience**

1. **Visual hierarchy** - Show queue tree with capacity allocations
2. **Validation feedback** - Immediate error highlighting
3. **Capacity calculator** - Auto-calculate percentages from weights
4. **Templates** - Provide common configuration patterns

#### **Error Prevention**

1. **Dropdown menus** - For valid states, policies, calculators
2. **Sliders** - For percentage values with visual feedback
3. **Format hints** - Show examples for complex formats
4. **Validation preview** - Test configuration before applying

#### **Configuration Management**

1. **Version control** - Track configuration changes
2. **Rollback capability** - Save previous valid configurations
3. **Dry run** - Validate without applying
4. **Export/Import** - Support configuration portability

### Validation Checklist for UI

- [ ] All queue capacities sum to 100% at each level
- [ ] Maximum capacity >= capacity for all queues
- [ ] Resource formats are valid ([memory=X,vcores=Y])
- [ ] Queue names contain only valid characters
- [ ] ACLs follow "users space groups" format
- [ ] User limits are within 0-100 range
- [ ] Application limits are positive integers
- [ ] Resource calculator matches resource requirements
- [ ] Auto-queue templates have valid capacity formats
- [ ] Preemption settings are consistent with monitoring enabled

This comprehensive guidebook provides all the necessary information to implement robust configuration validation for Apache Hadoop YARN Capacity Scheduler in a UI, helping prevent common misconfigurations and ensuring optimal cluster resource utilization.

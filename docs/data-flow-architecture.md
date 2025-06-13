# YARN Scheduler UI Data Flow Architecture

## Overview

This document describes the complete data flow in the YARN Scheduler UI, from API calls to visualization rendering, and how configuration changes are staged and applied.

## Table of Contents

1. [Data Sources](#data-sources)
2. [Data Flow from API to Visualization](#data-flow-from-api-to-visualization)
3. [Data Transformation Pipeline](#data-transformation-pipeline)
4. [Change Management System](#change-management-system)
5. [Examples](#examples)

## Data Sources

The YARN Scheduler UI uses two primary data sources:

### 1. Configuration Data (`/ws/v1/cluster/scheduler-conf`)

- **Purpose**: Provides the queue configuration (structure, capacity allocations, properties)
- **Format**: Flat key-value pairs representing hierarchical queue properties
- **Mock file**: `/mock/ws/v1/cluster/scheduler-conf.json`

### 2. Runtime Data (`/ws/v1/cluster/scheduler`)

- **Purpose**: Provides real-time metrics (usage, applications, resources)
- **Format**: Hierarchical JSON with nested queue information
- **Mock file**: `/mock/ws/v1/cluster/scheduler.json`

## Data Flow from API to Visualization

### Step 1: API Calls

```typescript
// In useConfiguration hook
const { data: configData } = useConfiguration();
// Fetches from: GET /ws/v1/cluster/scheduler-conf

// In useScheduler hook
const { data: schedulerData } = useScheduler();
// Fetches from: GET /ws/v1/cluster/scheduler
```

### Step 2: Configuration Data Parsing

The configuration data arrives as flat properties and needs to be transformed into a hierarchical structure:

```typescript
// Input: scheduler-conf.json
{
  "property": [
    {"name": "yarn.scheduler.capacity.root.queues", "value": "default,production,development"},
    {"name": "yarn.scheduler.capacity.root.default.capacity", "value": "20"},
    {"name": "yarn.scheduler.capacity.root.production.capacity", "value": "60"},
    {"name": "yarn.scheduler.capacity.root.development.capacity", "value": "20"}
  ]
}

// ConfigParser.parse() transforms this into:
const rootQueue: LayoutQueue = {
  id: "root",
  queueName: "root",
  queuePath: "root",
  capacity: 100,
  maxCapacity: 100,
  children: [
    {
      id: "root.default",
      queueName: "default",
      queuePath: "root.default",
      capacity: 20,
      maxCapacity: 100,
      children: []
    },
    // ... production, development
  ]
}
```

### Step 3: Tree Layout Calculation

The hierarchical queue structure is processed by D3TreeLayout:

```typescript
const layoutData = treeLayout.computeLayout(rootQueue);

// Result: Array of positioned nodes
[
    {
        id: 'root',
        x: 0,
        y: 200,
        width: 280,
        height: 180,
        data: {
            /* queue data */
        },
    },
    {
        id: 'root.default',
        x: 380,
        y: 50,
        width: 280,
        height: 180,
        data: {
            /* queue data */
        },
    },
    // ... more nodes
];
```

### Step 4: Runtime Data Merge

Runtime metrics from scheduler.json are merged with configuration data by matching the **queuePath** field:

```typescript
// scheduler.json provides runtime metrics with partition support
{
  "scheduler": {
    "schedulerInfo": {
      "queueName": "root",
      "queuePath": "root",  // ← This field is used for matching
      "numApplications": 25,
      "resourcesUsed": {"memory": 12288, "vCores": 12},
      "capacities": {
        "queueCapacitiesByPartition": [
          {
            "partitionName": "",  // Default partition (empty string)
            "capacity": 100.0,
            "usedCapacity": 42.5,
            "maxCapacity": 100.0,
            "absoluteCapacity": 100.0,
            "absoluteUsedCapacity": 42.5,
            "absoluteMaxCapacity": 100.0
          },
          {
            "partitionName": "gpu",  // GPU partition
            "capacity": 100.0,
            "usedCapacity": 25.8,
            "maxCapacity": 100.0,
            // ... more partition data
          }
        ]
      },
      "queues": {
        "queue": [
          {
            "queueName": "default",
            "queuePath": "root.default",  // ← Matches with node.id
            "numApplications": 2,
            "resourcesUsed": {"memory": 2048, "vCores": 2},
            "capacities": {
              "queueCapacitiesByPartition": [
                {
                  "partitionName": "",
                  "capacity": 20.0,
                  "usedCapacity": 5.3,
                  "maxCapacity": 100.0
                }
              ]
            }
          }
        ]
      }
    }
  }
}

// Merge process in QueueVisualization.tsx
layoutData.nodes.forEach(node => {
  // node.id contains the queue path (e.g., "root.default")
  const runtimeData = findQueueInSchedulerData(node.id, schedulerData);
  if (runtimeData) {
    node.data = mergeQueueData(node.data, runtimeData);
  }
});

// The mergeQueueData function handles partition data:
const mergeQueueData = (layoutQueue, runtimeQueue) => {
  // Extract default partition data (partitionName: "" or undefined)
  const defaultPartition = runtimeQueue?.capacities?.queueCapacitiesByPartition?.find(
    partition => !partition.partitionName || partition.partitionName === ""
  );

  return {
    ...layoutQueue,
    // Use default partition data for backward compatibility
    usedCapacity: defaultPartition?.usedCapacity || 0,
    absoluteCapacity: defaultPartition?.absoluteCapacity || layoutQueue.absoluteCapacity,
    absoluteUsedCapacity: defaultPartition?.absoluteUsedCapacity || 0,
    absoluteMaxCapacity: defaultPartition?.absoluteMaxCapacity || layoutQueue.absoluteMaxCapacity,
    // Direct queue-level properties
    numApplications: runtimeQueue?.numApplications || 0,
    resourcesUsed: runtimeQueue?.resourcesUsed || { memory: 0, vCores: 0 },
    // Store ALL partition data for future partition selector
    capacities: runtimeQueue?.capacities || undefined
  };
};

// Result: Complete queue data with config and runtime info
{
  id: "root.default",
  queueName: "default",
  capacity: 20,              // from config (for queue cards)
  maxCapacity: 100,          // from config (for queue cards)
  usedCapacity: 5.3,         // from default partition (for usage display)
  absoluteUsedCapacity: 1.2, // from default partition
  numApplications: 2,        // from runtime
  resourcesUsed: {...},      // from runtime
  capacities: {              // ALL partition data stored here (for info panel)
    queueCapacitiesByPartition: [
      {
        partitionName: "",
        capacity: 20.0,        // live capacity (may differ from config)
        usedCapacity: 5.3,
        maxCapacity: 100.0,    // live max capacity
        // ... more partition fields
      },
      {
        partitionName: "gpu",
        capacity: 15.0,
        usedCapacity: 8.2,
        // ... GPU partition data
      }
    ]
  }
}

// Data Usage:
// - Queue Cards: Use queue.capacity/maxCapacity (config values)
// - Info Panel: Use capacities.queueCapacitiesByPartition[] (live values)

// Capacity Types Explained:
// - capacity: % of parent queue's capacity
// - absoluteCapacity: % of total cluster capacity (root = 100%)
// - usedCapacity: % of this queue's allocated capacity currently in use
// - absoluteUsedCapacity: % of total cluster capacity currently used by this queue

// Example:
// root (100% of cluster)
// ├── production (60% of root = 60% absolute capacity)
// │   └── analytics (25% of production = 15% absolute capacity)
// └── development (40% of root = 40% absolute capacity)
```

### Step 5: Flow Path Calculation

The SankeyFlowCalculator creates visual flow paths between queues:

```typescript
const flowPaths = sankeyCalculator.calculateFlows(layoutData.nodes);

// Result: SVG path strings showing capacity flow
[
    {
        source: rootNode,
        target: defaultNode,
        path: 'M 280,200 C 330,200 330,140 380,140',
        width: 20, // Based on capacity percentage
    },
];
```

### Step 6: Canvas Rendering

The CanvasRenderer draws the final visualization:

```typescript
renderer.render(nodes, flows, transform);
// Draws queue cards, capacity bars, flow paths, etc.
```

## Data Transformation Pipeline

```
API Response → Parser → Layout Engine → Data Merger → Renderer
     ↓            ↓           ↓              ↓           ↓
Flat Props → Queue Tree → Positioned → Complete Data → Visual
```

## Change Management System

### Stage 1: User Edits Queue Properties

When a user modifies a queue property:

```typescript
// User changes default queue capacity from 20% to 30%
const change: ConfigChange = {
    id: 'change-001',
    timestamp: Date.now(),
    queuePath: 'root.default',
    property: 'capacity',
    oldValue: '20',
    newValue: '30',
    changeType: 'update',
};

// Stage the change
changeManager.stageChange(change);
```

### Stage 2: Validation

Changes are validated before being staged:

```typescript
// Validation checks:
1. Capacity sum of siblings = 100%
2. Max capacity >= capacity
3. No invalid characters in queue names
4. Resource limits are positive

// Example validation error:
{
  queuePath: "root",
  property: "capacity",
  error: "Child queue capacities must sum to 100%. Current: 110%"
}
```

### Stage 3: Preview Changes

Staged changes are shown in the UI with visual indicators:

```typescript
// Visual states for queues:
- Normal: Default blue border
- Modified: Orange border + "MODIFIED" badge
- New: Green border + "NEW" badge
- Deleted: Red border + "DELETED" badge
- Error: Red border + error icon
```

### Stage 4: Generate Configuration Diff

When ready to apply changes:

```typescript
const configDiff = changeManager.generateDiff();

// Result: XML mutation format for YARN
<configuration>
  <property>
    <name>yarn.scheduler.capacity.root.default.capacity</name>
    <value>30</value>
  </property>
  <property>
    <name>yarn.scheduler.capacity.root.production.capacity</name>
    <value>50</value>
  </property>
</configuration>
```

### Stage 5: Submit Changes to API

```typescript
// PUT request to /ws/v1/cluster/scheduler-conf
const response = await apiClient.put('/ws/v1/cluster/scheduler-conf', {
    headers: { 'Content-Type': 'application/xml' },
    body: configDiff,
});

// Success: Changes are applied to cluster
// Failure: Rollback staged changes, show error
```

## Examples

### Example 1: Creating a New Queue

```typescript
// 1. User action: Add queue "analytics" under "production"
const newQueue = {
    queueName: 'analytics',
    capacity: 20,
    maxCapacity: 50,
    state: 'RUNNING',
};

// 2. Stage changes
changeManager.stageChange({
    changeType: 'create',
    queuePath: 'root.production.analytics',
    properties: {
        'yarn.scheduler.capacity.root.production.analytics.capacity': '20',
        'yarn.scheduler.capacity.root.production.analytics.maximum-capacity': '50',
        'yarn.scheduler.capacity.root.production.analytics.state': 'RUNNING',
    },
});

// 3. Update parent's child list
changeManager.stageChange({
    changeType: 'update',
    queuePath: 'root.production',
    property: 'queues',
    oldValue: 'frontend,backend',
    newValue: 'frontend,backend,analytics',
});

// 4. Rebalance sibling capacities
// (Automatic or manual adjustment to ensure sum = 100%)
```

### Example 2: Modifying Queue Capacity

```typescript
// 1. Current state
{
  "root.default": { capacity: 20 },
  "root.production": { capacity: 60 },
  "root.development": { capacity: 20 }
}

// 2. User changes default from 20% to 10%
changeManager.stageChange({
  queuePath: "root.default",
  property: "capacity",
  oldValue: "20",
  newValue: "10"
});

// 3. System suggests rebalancing
suggestions = [
  { queue: "root.production", newCapacity: 70 },  // +10%
  { queue: "root.development", newCapacity: 20 }  // unchanged
];

// 4. Final configuration
<configuration>
  <property>
    <name>yarn.scheduler.capacity.root.default.capacity</name>
    <value>10</value>
  </property>
  <property>
    <name>yarn.scheduler.capacity.root.production.capacity</name>
    <value>70</value>
  </property>
</configuration>
```

### Example 3: Deleting a Queue

```typescript
// 1. Mark queue for deletion
changeManager.stageChange({
  changeType: "delete",
  queuePath: "root.development.experimental"
});

// 2. Validation
- Check: No running applications
- Check: No child queues
- Check: Capacity can be redistributed

// 3. Update parent
changeManager.stageChange({
  queuePath: "root.development",
  property: "queues",
  oldValue: "team1,team2,experimental",
  newValue: "team1,team2"
});

// 4. Redistribute capacity
// experimental had 10%, redistribute to siblings
```

## Error Handling

### API Errors

```typescript
try {
    const response = await apiClient.put('/scheduler-conf', changes);
} catch (error) {
    if (error.status === 400) {
        // Validation error from YARN
        showError('Invalid configuration: ' + error.message);
    } else if (error.status === 403) {
        // Permission denied
        showError("You don't have permission to modify scheduler configuration");
    }
}
```

### Validation Errors

```typescript
const validationResult = validator.validateChanges(stagedChanges);
if (!validationResult.isValid) {
    validationResult.errors.forEach((error) => {
        highlightQueue(error.queuePath, 'error');
        showTooltip(error.queuePath, error.message);
    });
}
```

## State Management

The application maintains several state layers:

1. **Original State**: Configuration as loaded from API
2. **Current State**: Original + staged changes
3. **Visual State**: Current + UI states (hover, selection)
4. **Validation State**: Errors and warnings for current changes

```typescript
interface AppState {
    original: QueueConfiguration;
    staged: ChangeSet;
    visual: {
        selected: string | null;
        hovered: string | null;
        expanded: Set<string>;
    };
    validation: ValidationResult;
}
```

## Performance Considerations

1. **Debounced Updates**: Property changes are debounced (300ms) before validation
2. **Incremental Rendering**: Only affected queues are re-rendered
3. **Virtual Scrolling**: Large queue hierarchies use viewport culling
4. **Memoized Calculations**: Layout calculations are cached until structure changes

## Security

1. **CSRF Protection**: All PUT requests include CSRF tokens
2. **Input Validation**: Queue names and values are sanitized
3. **Permission Checks**: UI respects user's YARN ACLs
4. **Audit Logging**: All configuration changes are logged with user info

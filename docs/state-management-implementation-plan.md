# Detailed Implementation Plan for YARN Scheduler Dynamic State Store

## Executive Summary

This implementation plan outlines the development of a Zustand-based state management system for the YARN Scheduler UI v3. The system will provide intelligent automation for queue management, real-time validation, and seamless persistence while maintaining simplicity and type safety.

## Technology Stack Confirmation

After reviewing the latest documentation:

- **Zustand** (v5): Excellent choice for lightweight state management with TypeScript
- **Zod** (v3): Perfect for runtime validation and schema definition
- **LocalStorage + Zustand Persist**: Proven solution for state persistence
- **TypeScript** (strict mode): Essential for type safety

## Implementation Phases

### Phase 1: Setup and Core Data Models

**Priority: High | Duration: 1-2 days**

#### Objectives

- Define all Zod schemas for core data types
- Establish type-safe foundation for the entire system
- Create reusable validation utilities

#### Key Deliverables

1. **Core Schema Definitions** (`src/store/schemas/`):

```typescript
// queueSchemas.ts
const QueueStateSchema = z.enum(['RUNNING', 'STOPPED']);

const ResourcesSchema = z.object({
    memory: z.number(),
    vCores: z.number(),
});

const QueueConfigSchema = z
    .object({
        capacity: z.string().optional(),
        'maximum-capacity': z.string().optional(),
        state: QueueStateSchema.optional(),
        'minimum-user-limit-percent': z.string().optional(),
        'user-limit-factor': z.string().optional(),
        'accessible-node-labels': z.string().optional(),
    })
    .catchall(z.string().optional());

const QueueMetricsSchema = z.object({
    usedCapacity: z.number(),
    absoluteCapacity: z.number(),
    absoluteUsedCapacity: z.number(),
    absoluteMaxCapacity: z.number(),
    numApplications: z.number(),
    resourcesUsed: ResourcesSchema,
});

const QueueNodeSchema: z.ZodType<QueueNode> = z.lazy(() =>
    z.object({
        path: z.string(),
        name: z.string(),
        children: z.array(QueueNodeSchema),
        config: QueueConfigSchema,
        metrics: QueueMetricsSchema.optional(),
        isNew: z.boolean().optional(),
        isDeleted: z.boolean().optional(),
        validationErrors: z.record(z.string()).optional(),
    })
);

// changeSchemas.ts
const PropertyChangeSchema = z.object({
    originalValue: z.any(),
    stagedValue: z.any(),
});

const NodeLabelAssignmentSchema = z.object({
    nodeId: z.string(),
    originalLabels: z.string().array(),
    stagedLabels: z.string().array(),
});

// propertyDefinitionSchemas.ts
const PropertyTypeSchema = z.enum(['string', 'number', 'percentage', 'boolean', 'select']);

const ValidationSchema = z.object({
    required: z.boolean().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    options: z.string().array().optional(),
});

const UIComponentSchema = z.enum(['input', 'slider', 'select', 'switch']);

const PropertyDefinitionSchema = z.object({
    key: z.string(),
    path: z.string(),
    label: z.string(),
    description: z.string(),
    type: PropertyTypeSchema,
    validation: ValidationSchema.optional(),
    ui: z.object({
        component: UIComponentSchema,
        suffix: z.string().optional(),
        step: z.number().optional(),
    }),
    defaultValue: z.any().optional(),
});
```

2. **Type Exports** (`src/store/types.ts`):

```typescript
export type QueueNode = z.infer<typeof QueueNodeSchema>;
export type PropertyChange = z.infer<typeof PropertyChangeSchema>;
export type PropertyDefinition = z.infer<typeof PropertyDefinitionSchema>;
// ... etc
```

#### Testing Requirements

- Unit tests for all schema validations
- Edge case testing for optional fields
- Type inference verification

### Phase 2: Zustand Store Foundation

**Priority: High | Duration: 1 day**

#### Objectives

- Set up Zustand store with TypeScript
- Configure persist middleware
- Establish store structure

#### Key Deliverables

1. **Store Setup** (`src/store/yarnSchedulerStore.ts`):

```typescript
interface YarnSchedulerStore {
    // State
    queueTree: QueueNode | null;
    originalConfig: Record<string, string>;
    propertyChanges: Map<string, PropertyChange>;
    propertyDefinitions: PropertyDefinition[];
    nodes: Map<string, NodeInfo>;
    nodeLabelChanges: Map<string, NodeLabelAssignment>;
    loading: boolean;
    error: string | null;
    commitStatus: 'idle' | 'committing' | 'success' | 'error';
    commitError: string | null;

    // Actions (to be implemented)
    loadInitialData: () => Promise<void>;
    updateProperty: (propertyPath: string, value: any) => void;
    addQueue: (parentPath: string, name: string, initialCapacity: number) => void;
    removeQueue: (queuePath: string) => void;
    commitChanges: () => Promise<void>;
    revertAllChanges: () => void;
    assignNodeLabel: (nodeId: string, label: string) => void;
    removeNodeLabel: (nodeId: string, label: string) => void;

    // Selectors (to be implemented)
    hasChanges: () => boolean;
    getQueueByPath: (path: string) => QueueNode | null;
    getPropertyValue: (path: string) => { original: any; staged: any; isDirty: boolean };
    getFilteredTreeByLabel: (label: string | null) => QueueNode | null;
}

export const useYarnSchedulerStore = create<YarnSchedulerStore>()(
    persist(
        (set, get) => ({
            // Initial state
            queueTree: null,
            originalConfig: {},
            propertyChanges: new Map(),
            propertyDefinitions: [],
            nodes: new Map(),
            nodeLabelChanges: new Map(),
            loading: false,
            error: null,
            commitStatus: 'idle',
            commitError: null,

            // Action stubs
            loadInitialData: async () => {
                // To be implemented
            },
            // ... other actions
        }),
        {
            name: 'yarn-scheduler-store',
            partialize: (state) => ({
                propertyChanges: state.propertyChanges,
                nodeLabelChanges: state.nodeLabelChanges,
            }),
            storage: createJSONStorage(() => localStorage, {
                reviver: (key, value) => {
                    if (key === 'propertyChanges' || key === 'nodeLabelChanges') {
                        return new Map(value);
                    }
                    return value;
                },
                replacer: (key, value) => {
                    if (value instanceof Map) {
                        return Array.from(value.entries());
                    }
                    return value;
                },
            }),
        }
    )
);
```

### Phase 3: Core Actions Implementation

**Priority: High | Duration: 2 days**

#### Objectives

- Implement data loading from APIs and JSON files
- Basic property update functionality
- Error handling and loading states

#### Key Deliverables

1. **API Service Layer** (`src/services/yarnApi.ts`):

```typescript
export const fetchSchedulerConfig = async (): Promise<Record<string, string>> => {
    // Fetch from /ws/v1/cluster/scheduler-conf
};

export const fetchSchedulerMetrics = async (): Promise<any> => {
    // Fetch from /ws/v1/cluster/scheduler
};

export const fetchNodes = async (): Promise<NodeInfo[]> => {
    // Fetch from /ws/v1/cluster/nodes
};

export const loadPropertyDefinitions = async (): Promise<PropertyDefinition[]> => {
    // Load from JSON files
};
```

2. **Data Transformation Utilities** (`src/store/utils/dataTransformers.ts`):

```typescript
export const buildQueueTree = (config: Record<string, string>, metrics: any): QueueNode => {
    // Parse flat config into hierarchical tree
    // Merge with metrics data
};

export const extractQueueConfig = (fullConfig: Record<string, string>, queuePath: string): QueueNode['config'] => {
    // Extract config for specific queue
};
```

3. **Action Implementations**:

```typescript
loadInitialData: async () => {
  set({ loading: true, error: null });

  try {
    const [definitions, config, metrics, nodes] = await Promise.all([
      loadPropertyDefinitions(),
      fetchSchedulerConfig(),
      fetchSchedulerMetrics(),
      fetchNodes()
    ]);

    const queueTree = buildQueueTree(config, metrics);

    set({
      propertyDefinitions: definitions,
      originalConfig: config,
      queueTree,
      nodes: new Map(nodes.map(n => [n.id, n])),
      loading: false
    });
  } catch (error) {
    set({
      error: error.message,
      loading: false
    });
  }
},

updateProperty: (propertyPath: string, value: any) => {
  const { originalConfig, propertyChanges } = get();

  const originalValue = originalConfig[propertyPath];

  if (value === originalValue) {
    propertyChanges.delete(propertyPath);
  } else {
    propertyChanges.set(propertyPath, {
      originalValue,
      stagedValue: value
    });
  }

  set({ propertyChanges: new Map(propertyChanges) });
}
```

### Phase 4: Queue Management with Automation

**Priority: High | Duration: 2-3 days**

#### Objectives

- Implement intelligent queue addition/removal
- Automatic capacity rebalancing
- State management for safe queue removal

#### Key Deliverables

1. **Capacity Management Utilities** (`src/store/utils/capacityManager.ts`):

```typescript
export const calculateSiblingRebalance = (siblings: QueueNode[], removedCapacity: number): Map<string, number> => {
    // Distribute removed capacity among active siblings
    const activeSiblings = siblings.filter((s) => !s.isDeleted && !s.isNew);
    const redistribution = removedCapacity / activeSiblings.length;

    return new Map(activeSiblings.map((s) => [s.path, parseFloat(s.config.capacity || '0') + redistribution]));
};

export const validateCapacitySum = (siblings: QueueNode[]): { valid: boolean; total: number } => {
    const total = siblings.reduce((sum, s) => {
        if (s.isDeleted) return sum;
        return sum + parseFloat(s.config.capacity || '0');
    }, 0);

    return {
        valid: Math.abs(total - 100) < 0.01,
        total,
    };
};
```

2. **Queue Action Implementations**:

```typescript
addQueue: (parentPath: string, name: string, initialCapacity: number) => {
  const { queueTree, propertyChanges } = get();

  // Create new queue node
  const newQueue: QueueNode = {
    path: `${parentPath}.${name}`,
    name,
    children: [],
    config: { capacity: String(initialCapacity) },
    isNew: true
  };

  // Add to tree
  const updatedTree = addNodeToTree(queueTree, parentPath, newQueue);

  // Stage capacity property
  propertyChanges.set(
    `yarn.scheduler.capacity.${newQueue.path}.capacity`,
    { originalValue: undefined, stagedValue: String(initialCapacity) }
  );

  // Rebalance siblings
  const siblings = getSiblings(updatedTree, newQueue.path);
  const rebalanced = calculateSiblingRebalance(
    siblings.filter(s => s.path !== newQueue.path),
    100 - initialCapacity
  );

  rebalanced.forEach((capacity, path) => {
    const propPath = `yarn.scheduler.capacity.${path}.capacity`;
    propertyChanges.set(propPath, {
      originalValue: get().originalConfig[propPath],
      stagedValue: String(capacity)
    });
  });

  set({
    queueTree: updatedTree,
    propertyChanges: new Map(propertyChanges)
  });
},

removeQueue: (queuePath: string) => {
  const { queueTree, propertyChanges } = get();

  const queue = findQueueByPath(queueTree, queuePath);
  if (!queue) return;

  // Auto-stop if running
  if (queue.config.state === 'RUNNING') {
    const statePath = `yarn.scheduler.capacity.${queuePath}.state`;
    propertyChanges.set(statePath, {
      originalValue: 'RUNNING',
      stagedValue: 'STOPPED'
    });
  }

  // Mark as deleted
  queue.isDeleted = true;

  // Rebalance siblings
  const siblings = getSiblings(queueTree, queuePath);
  const removedCapacity = parseFloat(queue.config.capacity || '0');
  const rebalanced = calculateSiblingRebalance(
    siblings.filter(s => s.path !== queuePath),
    removedCapacity
  );

  rebalanced.forEach((capacity, path) => {
    const propPath = `yarn.scheduler.capacity.${path}.capacity`;
    propertyChanges.set(propPath, {
      originalValue: get().originalConfig[propPath],
      stagedValue: String(capacity)
    });
  });

  set({
    queueTree: { ...queueTree },
    propertyChanges: new Map(propertyChanges)
  });
}
```

### Phase 5: Change Tracking and Persistence

**Priority: Medium | Duration: 1 day**

#### Objectives

- Robust change tracking
- LocalStorage persistence
- Revert functionality

#### Key Deliverables

1. **Change Management**:

```typescript
revertAllChanges: () => {
  set({
    propertyChanges: new Map(),
    nodeLabelChanges: new Map(),
    queueTree: buildQueueTree(get().originalConfig, null)
  });
},

hasChanges: () => {
  const { propertyChanges, nodeLabelChanges } = get();
  return propertyChanges.size > 0 || nodeLabelChanges.size > 0;
}
```

### Phase 6: API Integration and XML Generation

**Priority: Medium | Duration: 2 days**

#### Objectives

- XML payload generation for YARN API
- Commit functionality
- Error handling

#### Key Deliverables

1. **XML Generation** (`src/store/utils/xmlGenerator.ts`):

```typescript
export const generateUpdatePayload = (propertyChanges: Map<string, PropertyChange>, queueTree: QueueNode): string => {
    const operations = [];

    // Process new queues
    traverseTree(queueTree, (queue) => {
        if (queue.isNew) {
            operations.push(`
        <add-queue>
          <name>${queue.name}</name>
          <parent-queue>${getParentPath(queue.path)}</parent-queue>
          ${generateQueueParams(queue, propertyChanges)}
        </add-queue>
      `);
        }
    });

    // Process updates
    const updatesByQueue = groupChangesByQueue(propertyChanges);
    updatesByQueue.forEach((changes, queuePath) => {
        operations.push(`
      <update-queue>
        <queue-name>${queuePath}</queue-name>
        <params>${generateParams(changes)}</params>
      </update-queue>
    `);
    });

    // Process deletions
    traverseTree(queueTree, (queue) => {
        if (queue.isDeleted) {
            operations.push(`
        <remove-queue>
          <queue-name>${queue.path}</queue-name>
        </remove-queue>
      `);
        }
    });

    return wrapInSchedulerConf(operations);
};
```

2. **Commit Implementation**:

```typescript
commitChanges: async () => {
    const { propertyChanges, queueTree } = get();

    set({ commitStatus: 'committing', commitError: null });

    try {
        const payload = generateUpdatePayload(propertyChanges, queueTree);

        await fetch('/ws/v1/cluster/scheduler-conf', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/xml' },
            body: payload,
        });

        set({
            commitStatus: 'success',
            propertyChanges: new Map(),
            nodeLabelChanges: new Map(),
        });

        // Reload fresh data
        await get().loadInitialData();
    } catch (error) {
        set({
            commitStatus: 'error',
            commitError: error.message,
        });
    }
};
```

### Phase 7: Advanced Features

**Priority: Medium | Duration: 2 days**

#### Objectives

- Node label management
- Auto-queue template handling
- Dynamic property support

#### Key Deliverables

1. **Node Label Actions**:

```typescript
assignNodeLabel: (nodeId: string, label: string) => {
    const { nodes, nodeLabelChanges } = get();
    const node = nodes.get(nodeId);

    if (!node) return;

    const currentLabels = node.labels || [];
    if (!currentLabels.includes(label)) {
        nodeLabelChanges.set(nodeId, {
            nodeId,
            originalLabels: currentLabels,
            stagedLabels: [...currentLabels, label],
        });

        set({ nodeLabelChanges: new Map(nodeLabelChanges) });
    }
};
```

2. **Dynamic Property Handling**:

```typescript
// Support for properties like accessible-node-labels.gpu.capacity
const handleDynamicProperty = (basePath: string, label: string, property: string, value: any) => {
    const fullPath = `${basePath}.${label}.${property}`;
    get().updateProperty(fullPath, value);
};
```

### Phase 8: Selectors and Computed Values

**Priority: Low | Duration: 1-2 days**

#### Objectives

- Implement all selectors
- Label-based filtering with capacity overrides
- Performance optimization

#### Key Deliverables

1. **Selector Implementations**:

```typescript
getQueueByPath: (path: string) => {
  return findQueueByPath(get().queueTree, path);
},

getPropertyValue: (path: string) => {
  const { originalConfig, propertyChanges } = get();
  const change = propertyChanges.get(path);

  return {
    original: originalConfig[path],
    staged: change?.stagedValue ?? originalConfig[path],
    isDirty: propertyChanges.has(path)
  };
},

getFilteredTreeByLabel: (label: string | null) => {
  if (!label) return get().queueTree;

  const { queueTree, propertyChanges } = get();

  const filterTree = (node: QueueNode): QueueNode | null => {
    const hasLabel = node.config['accessible-node-labels']
      ?.split(',')
      .includes(label);

    const filteredChildren = node.children
      .map(child => filterTree(child))
      .filter(Boolean) as QueueNode[];

    if (!hasLabel && filteredChildren.length === 0) {
      return null;
    }

    // Override capacity with label-specific value
    let capacity = node.config.capacity;
    if (hasLabel) {
      const labelCapacityPath = `yarn.scheduler.capacity.${node.path}.accessible-node-labels.${label}.capacity`;
      const change = propertyChanges.get(labelCapacityPath);
      capacity = change?.stagedValue ??
        get().originalConfig[labelCapacityPath] ??
        capacity;
    }

    return {
      ...node,
      children: filteredChildren,
      config: {
        ...node.config,
        capacity
      }
    };
  };

  return filterTree(queueTree);
}
```

### Phase 9: Testing and Integration

**Priority: Low | Duration: 2-3 days**

#### Objectives

- Comprehensive test coverage
- Integration with existing UI
- Performance testing
- Migration guide

#### Key Deliverables

1. **Test Suites**:

    - Unit tests for all store actions
    - Integration tests for complex workflows
    - Performance tests for large queue hierarchies
    - Validation tests for business rules

2. **Migration Strategy**:
    - Adapter layer for existing components
    - Gradual migration path
    - Backward compatibility where needed

## Best Practices and Guidelines

### 1. Type Safety

- Use Zod schemas as single source of truth
- Derive TypeScript types from schemas
- No `any` types or type assertions

### 2. Immutability

- Always create new objects/maps when updating state
- Use spread operators and Map/Set constructors
- No direct mutations

### 3. Error Handling

- Validate all external data with Zod
- Provide meaningful error messages
- Graceful degradation

### 4. Performance

- Use selectors for computed values
- Minimize re-renders with precise subscriptions
- Batch related state updates

### 5. Testing

- TDD for all new features
- Test business logic, not implementation
- Focus on user-facing behavior

## Risk Mitigation

1. **Migration Risk**: Create adapter layer for gradual migration
2. **Performance Risk**: Implement virtual scrolling for large trees
3. **Data Loss Risk**: Robust persistence with versioning
4. **API Changes Risk**: Abstract API layer with adapters

## Success Metrics

- 100% type coverage
- <100ms response time for all user actions
- Zero data loss on browser refresh
- Successful integration with existing UI
- Reduced bug reports related to state management

## Conclusion

This implementation plan provides a clear roadmap for building a robust, type-safe, and user-friendly state management system for the YARN Scheduler UI. By following TDD principles and leveraging modern tools like Zustand and Zod, we'll create a maintainable solution that meets all PRD requirements while remaining simple and extensible.

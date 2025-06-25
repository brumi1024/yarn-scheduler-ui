# V3 Store Refactor Plan

## Overview

This document outlines a refactoring strategy for the V3 Yarn Scheduler Store to better leverage Zustand's features and follow React best practices.

## Current Implementation Issues

### 1. Manual State Synchronization

The current `updateProperty` action manually synchronizes two data structures:

- `propertyChanges` Map (for tracking changes)
- `queueTree` (for UI rendering)

```typescript
// Current approach - manual sync
if (queueTree && propertyPath.startsWith('yarn.scheduler.capacity.') && propertyPath.includes('.')) {
    const updateQueueConfig = (node: QueueNode): QueueNode => {
        // Complex tree traversal and update logic
    };
    set({ queueTree: updateQueueConfig(queueTree) });
}
```

### 2. Problems with Current Approach

- **Complexity**: Maintaining sync between two representations
- **Bug Risk**: Sync logic can fail or miss edge cases
- **Performance**: Unnecessary tree traversals on every update
- **Testing**: Hard to test sync logic separately
- **Not React-like**: Imperative updates instead of declarative derivation

## Proposed Solution: Selector-Based Approach

### Core Principle

Treat the store as the single source of truth and derive all other data through selectors.

### Implementation Strategy

#### 1. Simplified Store Actions

```typescript
updateProperty: (propertyPath: string, value: unknown) => {
    const { originalConfig, propertyChanges } = get();
    const originalValue = originalConfig[propertyPath];

    if (value === originalValue) {
        propertyChanges.delete(propertyPath);
    } else {
        propertyChanges.set(propertyPath, {
            originalValue,
            stagedValue: value,
        });
    }

    // Just update the changes map, no tree syncing
    set({ propertyChanges: new Map(propertyChanges) });
};
```

#### 2. Selector Functions

```typescript
// Compute effective configuration by merging original + changes
export const selectEffectiveConfig = (state: YarnSchedulerStore): Record<string, string> => {
    const config = { ...state.originalConfig };
    state.propertyChanges.forEach((change, path) => {
        config[path] = String(change.stagedValue);
    });
    return config;
};

// Derive queue tree from effective configuration
export const selectEffectiveQueueTree = (state: YarnSchedulerStore): QueueNode | null => {
    const config = selectEffectiveConfig(state);
    return buildQueueTree(config, state.metrics);
};

// Get specific queue property value
export const selectQueueProperty =
    (queuePath: string, property: string) =>
    (state: YarnSchedulerStore): string | undefined => {
        const config = selectEffectiveConfig(state);
        return config[`yarn.scheduler.capacity.${queuePath}.${property}`];
    };
```

#### 3. Component Usage

```typescript
// Components automatically re-render when derived data changes
const QueueVisualization = () => {
  const queueTree = useYarnSchedulerStore(selectEffectiveQueueTree);
  return <TreeView data={queueTree} />;
};

const QueueCapacityDisplay = ({ queuePath }: { queuePath: string }) => {
  const capacity = useYarnSchedulerStore(
    selectQueueProperty(queuePath, 'capacity')
  );
  return <div>Capacity: {capacity}%</div>;
};
```

#### 4. Performance Optimizations

```typescript
// Use useShallow for complex selections
import { useShallow } from 'zustand/react/shallow';

const QueueList = () => {
  const queues = useYarnSchedulerStore(
    useShallow(state => {
      const tree = selectEffectiveQueueTree(state);
      return tree ? flattenQueueTree(tree) : [];
    })
  );
  return queues.map(q => <QueueItem key={q.path} queue={q} />);
};
```

## Benefits

### 1. **Simplicity**

- No complex synchronization logic
- Store actions focus on their primary responsibility
- Clear data flow: store → selectors → components

### 2. **Correctness**

- Single source of truth eliminates sync bugs
- Derived data is always consistent
- Easier to reason about state changes

### 3. **Performance**

- Zustand automatically memoizes selector results
- Components only re-render when their data changes
- No unnecessary tree traversals

### 4. **Testability**

- Selectors are pure functions (easy to test)
- Store actions are simpler (less to test)
- Clear separation of concerns

### 5. **React Best Practices**

- Follows "UI as a function of state" principle
- Declarative instead of imperative
- Leverages React's reconciliation

## Migration Steps

### Phase 1: Add Selectors (No Breaking Changes)

1. Create selector functions in a separate file
2. Update components to use selectors
3. Keep existing tree sync logic temporarily

### Phase 2: Remove Tree Syncing

1. Remove tree update logic from store actions
2. Update any direct tree access to use selectors
3. Remove `queueTree` from store state

### Phase 3: Optimize

1. Add `useShallow` where beneficial
2. Create specialized selectors for common patterns
3. Add selector composition for complex queries

## Potential Challenges

### 1. **Performance Concerns**

- **Concern**: Rebuilding tree on every render
- **Solution**: Zustand memoizes selector results; only rebuilds when inputs change

### 2. **Complex Selectors**

- **Concern**: Some derived data might be expensive to compute
- **Solution**: Break into smaller selectors; use composition; consider external memoization

### 3. **Migration Effort**

- **Concern**: Many components might need updates
- **Solution**: Phased approach; can run both patterns temporarily

## Testing Strategy

### Behavior-Driven Tests

Focus on what users/components experience:

```typescript
it('should reflect property changes in derived queue tree', () => {
    // User changes a property
    store.updateProperty('yarn.scheduler.capacity.root.capacity', '80');

    // Component sees updated value through selector
    const tree = selectEffectiveQueueTree(store.getState());
    expect(tree.config.capacity).toBe('80');
});
```

### Selector Tests

Pure functions are easy to test:

```typescript
it('should merge changes into effective config', () => {
    const state = {
        originalConfig: { 'yarn.scheduler.capacity.root.capacity': '100' },
        propertyChanges: new Map([
            [
                'yarn.scheduler.capacity.root.capacity',
                {
                    originalValue: '100',
                    stagedValue: '80',
                },
            ],
        ]),
    };

    const config = selectEffectiveConfig(state);
    expect(config['yarn.scheduler.capacity.root.capacity']).toBe('80');
});
```

## Conclusion

This refactor aligns the store implementation with Zustand's strengths and React's declarative paradigm. By treating the queue tree as derived state rather than synchronized state, we achieve a simpler, more maintainable, and more correct implementation.

# V3 YarnSchedulerStore Fixes Summary

## Overview

This document summarizes the fixes made to the remaining store actions in `yarnSchedulerStore.ts` to properly handle queue management operations.

## Fixed Actions

### 1. `addQueue` Action

**Issues Fixed:**

- Queue path configuration keys were not using the proper `getQueuePrefix` utility
- Missing initial properties required by YARN (state, maximum-capacity)
- Parent queue's 'queues' property was not being updated

**Implementation:**

```typescript
addQueue: (parentPath: string, name: string, initialCapacity: number) => {
    // Creates new queue node with initial properties
    // Updates parent's 'queues' property to include the new child
    // Sets required properties: capacity, state, maximum-capacity
};
```

**Key Changes:**

- Uses `getQueuePrefix()` to generate proper configuration keys
- Adds new queue name to parent's comma-separated `queues` property
- Sets default `state: 'RUNNING'` and `maximum-capacity: '100'`

### 2. `removeQueue` Action

**Issues Fixed:**

- Only marked state for deletion, not all queue properties
- Didn't handle removal from parent's 'queues' list
- Incomplete recursive deletion of child queues

**Implementation:**

```typescript
removeQueue: (queuePath: string) => {
    // Marks all queue properties for deletion
    // Recursively marks child queue properties for deletion
    // Updates parent's 'queues' property to remove the deleted queue
    // Ensures running queues are stopped before deletion
};
```

**Key Changes:**

- Iterates through all properties with the queue prefix for deletion
- Recursively processes children to mark their properties for deletion
- Updates parent queue's `queues` property to remove the deleted queue name
- Sets `stagedValue: undefined` to indicate deletion

### 3. `commitChanges` Action

**Issues Fixed:**

- Changes were not prepared in YARN API format
- No distinction between add/update/remove operations

**Implementation:**

```typescript
commitChanges: async () => {
    // Groups changes by operation type (add-queue, update-queue, remove-queue)
    // Formats changes according to YARN API requirements
    // Filters properties to only include direct queue properties
};
```

**Key Changes:**

- Creates proper API payload structure with `add-queue`, `update-queue`, and `remove-queue` arrays
- Processes queue tree to identify new, deleted, and updated queues
- Filters properties to avoid including child queue properties in parent updates
- Logs the prepared payload for debugging (actual API call remains mocked)

### 4. `updateProperty` Action

**Issues Fixed:**

- Didn't handle nested property paths correctly
- Queue tree wasn't updated to reflect property changes

**Implementation:**

```typescript
updateProperty: (propertyPath: string, value: unknown) => {
    // Handles both direct property paths and queue-specific paths
    // Updates the queue tree configuration to reflect changes
};
```

**Key Changes:**

- Simplified to handle property paths as provided (no automatic prefixing)
- Updates queue tree nodes when queue properties change
- Maintains consistency between propertyChanges map and queue tree

## Data Format Examples

### Parent Queue's 'queues' Property

```javascript
// Format: comma-separated list of child queue names
'yarn.scheduler.capacity.root.queues': 'default,production,test'
'yarn.scheduler.capacity.root.production.queues': 'high,low,analytics'
```

### Queue Property Keys

```javascript
// Format: yarn.scheduler.capacity.<queuePath>.<property>
'yarn.scheduler.capacity.root.default.capacity': '50'
'yarn.scheduler.capacity.root.production.analytics.state': 'RUNNING'
'yarn.scheduler.capacity.root.test.maximum-capacity': '100'
```

### API Payload Structure

```javascript
{
  'add-queue': [
    {
      'queue-name': 'root.test',
      params: {
        capacity: '30',
        state: 'RUNNING',
        'maximum-capacity': '100'
      }
    }
  ],
  'update-queue': [
    {
      'queue-name': 'root.default',
      params: {
        capacity: '40'
      }
    }
  ],
  'remove-queue': ['root.production.temp']
}
```

## Testing

Comprehensive integration tests were added to verify:

- Queue addition with all required properties and parent update
- Queue removal with property deletion and parent update
- Recursive deletion of child queues
- Proper API payload formatting
- Property update behavior

All existing tests continue to pass, ensuring backward compatibility.

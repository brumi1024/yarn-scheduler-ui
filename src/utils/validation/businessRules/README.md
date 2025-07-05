# Business Rules Validation System

This validation system complements Zod schema validation by handling complex, context-aware business rules for the YARN Capacity Scheduler.

## Architecture

The system follows a clear separation of concerns:

- **Zod Schemas**: Handle all format and syntax validation (e.g., valid percentages, number ranges, ACL formats)
- **Business Rules**: Handle cross-field validation, state transitions, and YARN-specific rules

## Usage

### Basic Field Validation

```typescript
import { businessValidation } from './service';

const context: QueueValidationContext = {
  queuePath: 'root.production',
  legacyModeEnabled: true,
  configData: new Map([['yarn.scheduler.capacity.root.production.capacity', '50%']]),
  schedulerData: schedulerInfo,
};

// Validate a single field
const result = businessValidation.validateField('maximum-capacity', '30%', context);
if (!result.valid) {
  console.error(result.errors);
}
```

### Queue Validation

```typescript
// Validate all properties for a queue
const properties = {
  capacity: '50%',
  'maximum-capacity': '75%',
  state: 'RUNNING',
};

const result = businessValidation.validateQueue('root.production', properties, context);
```

### Operation Validation

```typescript
// Check if a queue can be deleted
const result = businessValidation.validateOperation('delete', context);
if (!result.valid) {
  // Show errors to user
}
```

## Validation Rules

### Capacity Rules

1. **Capacity Type Consistency** (Legacy Mode)
   - All sibling queues must use the same capacity type (percentage, weight, or absolute)
2. **Child Capacity Sum** (Legacy Mode)
   - Child queue capacities must sum to 100% when using percentage mode
3. **Maximum Capacity Relationship**
   - Maximum capacity must be >= capacity
   - Must use the same format as capacity

4. **Parent-Child Constraints**
   - Child capacity should not exceed parent capacity (warning)

### State Rules

1. **State Transitions**
   - Cannot set queue to RUNNING if parent is STOPPED
   - Cannot stop queue with running children
2. **Queue Deletion**
   - Queue must be STOPPED
   - Queue must have no applications
   - Queue must have no children
3. **Queue Conversion**
   - Queue must be STOPPED
   - Queue must have no applications

### Application Lifetime Rules

1. **Lifetime Relationships**
   - Default lifetime cannot exceed maximum lifetime
   - Maximum lifetime must be >= default lifetime

### User Limit Rules

1. **User Limit Factor**
   - Must be non-negative
   - Zero value triggers warning

2. **Minimum User Limit Percent**
   - Cannot exceed 100%
   - 100% value triggers warning

## Error Types

Errors have two severity levels:

- **error**: Prevents operation, must be fixed
- **warning**: Informational, operation can proceed

## Integration with React Components

Use the `useQueueValidation` hook to integrate both Zod and business validation:

```typescript
const { form, businessErrors, handleBlur, getFieldErrors, getFieldWarnings, validateAll } =
  useQueueValidation({
    queuePath: 'root.production',
    schema: queuePropertiesSchema,
  });
```

The hook automatically:

- Combines Zod format errors with business rule errors
- Provides field-level error and warning lists
- Handles validation on blur
- Validates all fields before submission

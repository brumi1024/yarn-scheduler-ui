# YARN Scheduler UI - Comprehensive File Analysis

This document provides a thorough analysis of every file in the YARN Scheduler UI project, evaluating its purpose, location appropriateness, necessity, and integration requirements with the new Zustand-based state management system described in `docs/state-management-implementation-plan.md`.

## Table of Contents

1. [Store Files Analysis](#store-files-analysis)
2. [Component Files Analysis](#component-files-analysis)
3. [Feature Files Analysis](#feature-files-analysis)
4. [Hook Files Analysis](#hook-files-analysis)
5. [Utility Files Analysis](#utility-files-analysis)
6. [Validation Files Analysis](#validation-files-analysis)
7. [Test Files Analysis](#test-files-analysis)
8. [Integration Roadmap](#integration-roadmap)

## Store Files Analysis

### ✅ New Store Architecture (Keep and Enhance)

#### `src/store/configStore.ts`

- **What it does**: Manages editable configuration state with staging, validation, and change tracking
- **Location**: ✅ Correct - appropriate for store directory
- **Needed**: ✅ Yes - core part of new architecture
- **Integration steps**:
    1. Add unified `QueueNode` model as defined in PRD
    2. Implement automatic capacity rebalancing when adding/removing queues
    3. Add queue state management (auto-stop before deletion)
    4. Integrate property definitions loading from JSON files
    5. Add support for node label-specific capacities
    6. Implement `getFilteredTreeByLabel` selector

#### `src/store/runtimeStore.ts`

- **What it does**: Manages read-only runtime data (scheduler info, metrics, nodes, labels)
- **Location**: ✅ Correct
- **Needed**: ✅ Yes - provides runtime context
- **Integration steps**:
    1. Add data transformation to unified `QueueNode` model
    2. Implement error recovery mechanisms
    3. Add periodic refresh capability
    4. Ensure proper TypeScript types from Zod schemas

#### `src/store/uiStore.ts`

- **What it does**: Manages UI state (selected queue, theme, view preferences)
- **Location**: ✅ Correct
- **Needed**: ✅ Yes - separates UI concerns
- **Integration steps**: None required - already properly isolated

#### `src/store/activityStore.ts`

- **What it does**: Tracks user activities and operation history
- **Location**: ✅ Correct
- **Needed**: ✅ Yes - useful for audit trail
- **Integration steps**: None required

#### `src/store/nodeLabelStore.ts`

- **What it does**: Manages node label assignments separately
- **Location**: ⚠️ Should be merged into configStore
- **Needed**: ❌ Functionality should be in configStore
- **Integration steps**:
    1. Move node label change tracking to configStore
    2. Implement as part of staged changes
    3. Remove this separate store

### ❌ Old Store Architecture (Remove)

#### `src/store/dataStore.ts` (marked for deletion)

- **What it does**: Old implementation for managing queue data
- **Location**: N/A - to be removed
- **Needed**: ❌ No - replaced by new architecture
- **Integration steps**: Delete file

#### `src/store/changesStore.ts` (marked for deletion)

- **What it does**: Old implementation for change tracking
- **Location**: N/A - to be removed
- **Needed**: ❌ No - replaced by configStore
- **Integration steps**: Delete file

## Component Files Analysis

### Core Components

#### `src/components/CapacityEditor.tsx`

- **What it does**: Complex editor supporting percentage, weight, and absolute capacity modes
- **Location**: ✅ Correct
- **Needed**: ✅ Yes - critical UI component
- **Integration steps**:
    1. Replace direct `onChange` with `configStore.stageChange()`
    2. Connect to validation state from store
    3. Show automatic rebalancing preview for siblings
    4. Use computed values from store selectors

#### `src/components/forms/PropertyFormField.tsx`

- **What it does**: Generic form field renderer based on property metadata
- **Location**: ✅ Correct
- **Needed**: ✅ Yes - enables metadata-driven UI
- **Integration steps**:
    1. Use new `useConfigField` hook for value binding
    2. Display validation errors from configStore
    3. Support dynamic property definitions

#### `src/components/forms/NodeLabelsSection.tsx`

- **What it does**: Manages node label assignments and per-label capacities
- **Location**: ✅ Correct
- **Needed**: ✅ Yes - already updated for new stores
- **Integration steps**:
    1. Add dynamic capacity fields for each label
    2. Support label-specific property paths

#### `src/components/validation/ValidationPreview.tsx`

- **What it does**: Displays validation status and errors
- **Location**: ✅ Correct
- **Needed**: ✅ Yes - already using configStore
- **Integration steps**: None - working correctly

#### `src/components/StatusBar.tsx`

- **What it does**: Shows current state summary
- **Location**: ✅ Correct
- **Needed**: ✅ Yes
- **Integration steps**: Update queue counting logic if needed

### Layout Components (No changes needed)

- `src/components/MainLayout.tsx` - App structure
- `src/components/TabNavigation.tsx` - Tab UI
- `src/components/ErrorBoundary.tsx` - Error handling

### Shared Components (No changes needed)

All components in `src/components/shared/` are pure UI components without store dependencies.

## Feature Files Analysis

### Queue Editor Feature

#### `src/features/queue-editor/QueueEditor.tsx`

- **What it does**: Main queue management interface
- **Location**: ✅ Correct
- **Needed**: ✅ Yes - core feature
- **Integration steps**:
    1. Update to use unified `QueueNode` model
    2. Connect add/remove operations to configStore methods
    3. Implement label-based filtering
    4. Update queue tree visualization

#### `src/features/queue-editor/components/AddQueueModal.tsx`

- **What it does**: Modal dialog for adding new queues
- **Location**: ✅ Correct
- **Needed**: ✅ Yes
- **Integration steps**:
    1. Use `configStore.addQueue()` method
    2. Show automatic capacity calculation
    3. Update test mocks to new store

#### `src/features/queue-editor/components/QueueInfoPanel.tsx`

- **What it does**: Displays and edits queue properties
- **Location**: ✅ Correct
- **Needed**: ✅ Yes
- **Integration steps**:
    1. Use property definitions for dynamic forms
    2. Connect all fields to staged values
    3. Show validation inline

#### `src/features/queue-editor/components/StagedChangesPanel.tsx`

- **What it does**: Shows pending changes
- **Location**: ✅ Correct
- **Needed**: ✅ Yes - already updated
- **Integration steps**: None

#### `src/features/queue-editor/hooks/useQueueDataProcessor.ts`

- **What it does**: Processes queue data for visualization
- **Location**: ✅ Correct
- **Needed**: ✅ Yes
- **Integration steps**:
    1. Update to work with `QueueNode` model
    2. Use store's computed state

#### `src/features/queue-editor/hooks/useQueueConfiguration.ts`

- **What it does**: Manages queue configuration state
- **Location**: ✅ Correct
- **Needed**: ⚠️ Review - may be redundant with configStore
- **Integration steps**: Evaluate if still needed

#### `src/features/queue-editor/hooks/useQueueMetrics.ts`

- **What it does**: Processes queue metrics
- **Location**: ✅ Correct
- **Needed**: ✅ Yes
- **Integration steps**: Update to use runtimeStore data

### Other Features (Already updated)

- `src/features/GlobalSettings.tsx` - ✅ Using new stores
- `src/features/Diagnostics.tsx` - ✅ Using new stores
- `src/features/NodeLabels.tsx` - ✅ Using new stores

## Hook Files Analysis

#### `src/hooks/useConfigField.ts`

- **What it does**: Simplifies form field binding to configStore
- **Location**: ✅ Correct
- **Needed**: ✅ Yes - new addition
- **Integration steps**: None - already implements PRD pattern

#### `src/hooks/usePropertyValidation.ts`

- **What it does**: Validates property values
- **Location**: ✅ Correct
- **Needed**: ⚠️ Should use store validation
- **Integration steps**:
    1. Return validation from configStore
    2. Don't run validation independently

#### `src/hooks/useValidationStatus.ts`

- **What it does**: Tracks overall validation state
- **Location**: ✅ Correct
- **Needed**: ✅ Yes
- **Integration steps**: Use configStore's validation status

## Utility Files Analysis

### Parser Utilities

#### `src/utils/configurationParser.ts`

- **What it does**: Parses YARN configuration format
- **Location**: ✅ Correct
- **Needed**: ✅ Yes
- **Integration steps**:
    1. Update to produce `QueueNode` format
    2. Add support for all queue properties

#### `src/utils/schedulerResponseParser.ts`

- **What it does**: Parses scheduler API responses
- **Location**: ✅ Correct
- **Needed**: ✅ Yes
- **Integration steps**:
    1. Transform to unified `QueueNode` model
    2. Extract metrics correctly

#### `src/utils/configFormUtils.ts`

- **What it does**: Form utility functions
- **Location**: ✅ Correct
- **Needed**: ✅ Yes
- **Integration steps**: None - pure utilities

### Other Utilities (No changes needed)

- `src/utils/capacityParser.ts` - Parsing capacity values
- `src/utils/TreeBuilder.ts` - Tree structure utilities
- `src/utils/configurationUtils.ts` - Configuration helpers
- `src/utils/queueHierarchyUtils.ts` - Queue tree operations

## Validation Files Analysis

### Current Validation System

#### `src/validation/ValidationEngine.ts`

- **What it does**: Core validation orchestrator
- **Location**: ✅ Correct
- **Needed**: ⚠️ Temporary - will be replaced by Zod
- **Integration steps**:
    1. Keep during transition
    2. Gradually replace with Zod schemas
    3. Remove once migration complete

### Validation Rules (To be migrated to Zod)

Each rule should be converted to Zod schema with refinements:

1. **`CapacitySumRule.ts`** → Zod refinement on parent nodes
2. **`MaxCapacityRule.ts`** → Zod refinement comparing fields
3. **`QueueNameRule.ts`** → Zod regex pattern
4. **`NodeLabelCapacityRule.ts`** → Zod refinement for label capacities
5. **`UserLimitRule.ts`** → Zod number validation
6. **`AclFormatRule.ts`** → Zod string pattern
7. **`ResourceAllocationRule.ts`** → Zod object validation

### Migration Example

```typescript
// Current rule-based approach
class CapacitySumRule implements ValidationRule {
    validate(context) {
        /* complex logic */
    }
}

// New Zod approach
const QueueNodeSchema = z
    .object({
        children: z.array(QueueNodeSchema),
    })
    .refine((data) => {
        const sum = data.children.reduce((acc, child) => acc + parseFloat(child.config.capacity || '0'), 0);
        return Math.abs(sum - 100) < 0.01;
    }, 'Child queue capacities must sum to 100%');
```

## Test Files Analysis

### Tests Requiring Updates

All test files using old stores need updates:

1. **`src/store/__tests__/changesStore.test.ts`** - Delete
2. **`src/store/__tests__/dataStore.test.ts`** - Delete
3. **`src/features/queue-editor/components/__tests__/AddQueueModal.test.tsx`** - Update mocks
4. **`src/App.test.tsx`** - Update store providers

### Test Update Pattern

```typescript
// Old pattern
jest.mock('@/store/dataStore');

// New pattern
jest.mock('@/store/configStore');
jest.mock('@/store/runtimeStore');
```

## Integration Roadmap

### Phase 1: Complete Core Store Implementation (2-3 days)

1. **Add unified QueueNode model** to stores
2. **Implement automatic operations**:
    - Capacity rebalancing
    - Queue state management
    - Property definitions loading
3. **Add missing selectors**:
    - `getFilteredTreeByLabel`
    - `getQueueByPath`

### Phase 2: Update Core Components (2 days)

1. **Update CapacityEditor** for staging workflow
2. **Update PropertyFormField** for new data flow
3. **Fix all component test mocks**

### Phase 3: Feature Integration (3-4 days)

1. **Update QueueEditor** and sub-components
2. **Implement label-based filtering**
3. **Connect all CRUD operations** to store
4. **Update data processing hooks**

### Phase 4: Validation Migration (2-3 days)

1. **Create Zod schemas** for all data types
2. **Implement custom refinements** for business rules
3. **Replace ValidationEngine** gradually
4. **Update validation-dependent components**

### Phase 5: Cleanup and Testing (1-2 days)

1. **Remove old store files**
2. **Remove deprecated code**
3. **Update all tests**
4. **Performance optimization**

## Key Integration Patterns

### 1. Component Integration Pattern

```typescript
// Old pattern
const { data, updateQueue } = useDataStore();

// New pattern
const stagedValue = useConfigStore((state) => state.getPropertyValue('yarn.scheduler.capacity.root.default.capacity'));
const stageChange = useConfigStore((state) => state.stageChange);
```

### 2. Form Field Pattern

```typescript
// Using the new useConfigField hook
const capacityField = useConfigField({
  path: 'yarn.scheduler.capacity.root.default.capacity',
  defaultValue: '100'
});

<TextField {...capacityField} />
```

### 3. Validation Pattern

```typescript
// Zod schema with business rules
const QueueConfigSchema = z
    .object({
        capacity: z.string(),
        'maximum-capacity': z.string(),
    })
    .refine((data) => {
        const capacity = parseFloat(data.capacity);
        const maxCapacity = parseFloat(data['maximum-capacity']);
        return maxCapacity >= capacity;
    }, 'Maximum capacity must be >= capacity');
```

## Conclusion

The project is well-structured and the migration to the new Zustand-based architecture is already underway. The main work involves:

1. Completing the store implementation according to the PRD
2. Updating components to use the unified data model
3. Migrating validation to Zod schemas
4. Removing old code and updating tests

The architecture supports a gradual migration, allowing the system to remain functional throughout the transition.

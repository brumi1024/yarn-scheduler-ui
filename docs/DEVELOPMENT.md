# YARN Scheduler UI - Development Guide

This document provides comprehensive guidance for developers working on the YARN Scheduler UI, including architecture overview, extension points, and best practices.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Data Model](#core-data-model)
- [Key Services](#key-services)
- [Adding New Properties](#adding-new-properties)
- [Configuration Metadata System](#configuration-metadata-system)
- [API Integration](#api-integration)
- [UI Components](#ui-components)
- [Node Labels System](#node-labels-system)
- [Validation Strategy](#validation-strategy)
- [UI Event Orchestration](#ui-event-orchestration)
- [Validation Framework](#validation-framework)
- [Development Workflow](#development-workflow)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

The application follows a clean architecture pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────┐
│              MainController                 │ ← System-level coordinator
└─────────────────────────────────────────────┘
                     │
              System Operations
                     ↓
┌─────────────────────────────────────────────┐
│             Service Layer                   │
├─────────────────────────────────────────────┤
│ • ConfigurationOrchestrator                 │ ← Workflow coordination
│ • UIStateManager                            │ ← UI event coordinator
│ • ChangeManager                             │ ← Pure staging service
│ • ViewDataFormatterService                  │ ← Data transformation
│ • QueueValidator                            │ ← Holistic validation
│ • NodeLabelService                          │ ← Node label handling
│ • AutoCreationService                       │ ← Auto-creation logic
└─────────────────────────────────────────────┘
                     │
                     │ Uses
                     ↓
┌─────────────────────────────────────────────┐
│              Data Layer                     │
├─────────────────────────────────────────────┤
│ • QueueConfigurationManager                 │ ← Single source of truth
│ • SchedulerInfoModel                        │ ← Live runtime data
│ • NodesInfoModel                            │ ← Cluster nodes data
│ • AppStateModel                             │ ← UI state
└─────────────────────────────────────────────┘
                     │
                     │ Renders
                     ↓
┌─────────────────────────────────────────────┐
│              View Layer                     │
├─────────────────────────────────────────────┤
│ • QueueTreeView                             │ ← Queue hierarchy
│ • EditQueueModalView                        │ ← Queue editing
│ • GlobalConfigView                          │ ← Global settings
│ • ControlsView                              │ ← UI controls
└─────────────────────────────────────────────┘
                     │
              UI Events (editQueueClicked, etc.)
                     ↓
               UIStateManager
```

### Key Principles

1. **Single Source of Truth**: `QueueConfigurationManager` maintains all queue state
2. **Event-Driven**: Components communicate via `EventEmitter` pattern
3. **Metadata-Driven**: Properties defined in metadata files, not hardcoded
4. **Service Coordinators**: Complex workflows handled by dedicated services
5. **Immutable Operations**: All changes are staged before applying

## Core Data Model

### QueueConfigurationManager

The unified data model for queue configuration and change management:

```javascript
class QueueNode {
  // Identity
  segment: string              // Queue name (e.g., "default")
  fullPath: string             // Full path (e.g., "root.default")
  isQueue: boolean             // True if actual queue, false if placeholder

  // State Management
  baseProperties: Map          // Original properties from server
  pendingOperation: string     // 'add', 'update', 'delete', or null
  pendingProperties: Map       // Staged changes
  oldProperties: Map           // For rollback

  // Hierarchy
  parent: QueueNode
  children: Map<string, QueueNode>

  // Key Methods
  getEffectiveProperties()     // Returns merged base + pending
  isNew()                      // pendingOperation === 'add'
  isDeleted()                  // pendingOperation === 'delete'
  hasPendingChanges()          // Has any pending changes
}
```

### Important: Queue Path Parsing

The system correctly parses queue paths by:

1. First parsing all `.queues` properties to build hierarchy
2. Using actual queue structure to determine valid paths
3. Finding longest valid queue path for multi-part properties

**Never hardcode queue paths or property lists!**

## Key Services

### ConfigurationOrchestrator

Manages configuration workflows:

- Loading and refreshing configurations
- Applying changes with validation
- Coordinating API mutations
- Handling mode transitions (legacy ↔ non-legacy)

### UIStateManager

Coordinates UI components:

- Modal lifecycle management
- View rendering coordination
- Bulk operations visibility
- State synchronization

### ChangeManager

Handles staging operations:

- Queue add/update/delete operations
- Accessible labels changes
- Custom property management
- Partition-aware updates

### ViewDataFormatterService

Transforms data for display:

- Queue hierarchy formatting
- Capacity value formatting
- UI label generation
- Partition filtering

## Adding New Properties

### Step 1: Define in Metadata

Add to `js/config/config-metadata-queue.js`:

```javascript
[`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.my-new-property`]: {
  key: 'my-new-property',
  displayName: 'My New Property',
  description: 'Detailed description for tooltip',
  type: 'string',              // 'string', 'number', 'boolean', 'enum'
  defaultValue: 'default',
  placeholder: 'Default: default',

  // Optional fields
  availableInTemplate: true,   // Include in auto-creation templates
  v2Property: true,            // Mark as v2-only feature
  semanticRole: 'special-key', // For programmatic lookup

  // For enum types
  options: ['option1', 'option2'],

  // For number types
  min: 0,
  max: 100,
  step: 0.1,
  unit: '%'
}
```

### Step 2: Automatic Integration

The system automatically:

- Generates form fields in edit modal
- Handles staging and validation
- Creates API payloads
- Shows default value indicators
- Includes in templates (if `availableInTemplate: true`)

### Step 3: No Code Changes Required!

The metadata-driven architecture means no additional code is needed for basic properties.

## Configuration Metadata System

### Metadata Files

- `config-metadata-queue.js`: Queue-specific properties
- `config-metadata-global.js`: Global scheduler properties
- `config-metadata-auto-creation.js`: Auto-creation properties
- `config-metadata-node-labels.js`: Node label properties

### Metadata Structure

```javascript
{
  key: 'property-name',           // Simple key without queue path
  displayName: 'Display Name',    // Shown in UI
  description: 'Tooltip text',    // Help text
  type: 'string',                 // Data type
  defaultValue: '',               // Default if not set
  placeholder: 'Helpful hint',    // Input placeholder
  availableInTemplate: true,      // Auto-creation template inclusion
  semanticRole: 'role-name'       // For service lookups
}
```

### Semantic Roles

Used by services to find properties without hardcoding:

```javascript
// Example from NodeLabelService
static getAccessibleNodeLabelsKey(queuePath) {
  for (const [placeholderKey, meta] of Object.entries(NODE_LABEL_CONFIG_METADATA)) {
    if (meta.semanticRole === 'accessible-node-labels-key') {
      return placeholderKey.replace(Q_PATH_PLACEHOLDER, queuePath);
    }
  }
}
```

## API Integration

### YARN Scheduler Mutation API

Endpoint: `/ws/v1/cluster/scheduler-conf`

### Payload Format

**Queue Operations**: Use simple keys

```json
{
    "queue-name": "root.default",
    "params": {
        "capacity": "50",
        "maximum-capacity": "100"
    }
}
```

**Global Operations**: Use full property names

```json
{
    "global-updates": {
        "yarn.scheduler.capacity.legacy-queue-mode.enabled": "false"
    }
}
```

### Value Processing

The system automatically:

- Removes `%` from percentage values
- Preserves `w` suffix for weights
- Keeps vector format `[memory=50%,vcores=2]`
- Handles boolean conversion

## UI Components

### Modal System

All modals extend `BaseModalView`:

- Automatic event cleanup
- Consistent lifecycle management
- Tooltip integration
- Memory leak prevention
- **Modal reusability** - modals are designed to be opened multiple times without recreation

#### Modal Lifecycle Management

The `UIStateManager` handles modal lifecycle with a reusability pattern:

```javascript
// ✅ Correct: Hide modal without destroying base functionality
hideModal(modalName) {
    const modal = this.views[modalName];
    if (modal) {
        modal.hide();
        // Don't call destroy() - modals need to be reusable
    }
}

// ❌ Incorrect: Destroying modal breaks reusability
hideModal(modalName) {
    const modal = this.views[modalName];
    if (modal) {
        modal.hide();
        modal.destroy(); // This removes base event listeners permanently
    }
}
```

**Key Principle**: `destroy()` should only be called when the application shuts down, not on every modal hide. This ensures that base modal functionality (close button, overlay click) remains intact for reuse.

### Key Modal Features

#### EditQueueModalView

- Tabbed interfaces for complex configurations
- Dynamic capacity mode switching
- Custom property support
- Node label configuration
- Auto-creation templates

#### Event Cleanup Pattern

Modals use selective cleanup to preserve reusability:

```javascript
class EditQueueModalView extends BaseModalView {
    constructor() {
        super(); // BaseModalView sets up close button and overlay listeners
        this.eventCleanupCallbacks = []; // For form-specific events only
    }

    _bindFormEvents() {
        const handler = () => {
            /* ... */
        };
        element.addEventListener('click', handler);
        // Only cleanup form-specific events, not base modal events
        this.eventCleanupCallbacks.push(() => element.removeEventListener('click', handler));
    }

    _cleanupEventListeners() {
        // Clean up only form-specific events
        for (const cleanup of this.eventCleanupCallbacks) {
            cleanup();
        }
        this.eventCleanupCallbacks = [];
        // Base modal events (close button, overlay) are preserved
    }

    hide(result) {
        this._cleanupEventListeners(); // Clean form events
        super.hide(result); // BaseModalView handles core hiding
        // Don't call destroy() here - breaks reusability
    }
}
```

**Two-Level Cleanup Strategy**:
1. **Form-level cleanup**: Remove form-specific event listeners on modal hide
2. **Base-level preservation**: Keep core modal functionality (close button, overlay click) intact for reuse

### Queue Tree Display

Features:

- Hierarchical rendering with indentation
- Sankey diagram connectors
- Status labels and indicators
- Bulk selection support
- Partition filtering
- Horizontal scrolling for deep hierarchies

## Node Labels System

### Data Sources

Merged from two APIs:

1. `/ws/v1/cluster/scheduler` - Queue configurations
2. `/ws/v1/cluster/nodes` - Actual cluster state

### Key Components

- **NodesInfoModel**: Processes cluster nodes data
- **NodeLabelService**: Merges and manages labels
- **Partition Filtering**: Shows only accessible queues

### Label-Specific Capacities

When a partition is selected:

- Capacity fields map to partition-specific properties
- Example: `capacity` → `accessible-node-labels.gpu.capacity`
- Automatic in edit modal

## Validation Strategy

The application implements a **two-tiered validation system** that provides excellent real-time user feedback while ensuring overall configuration integrity:

### Form-Level Validation (in Modals)

**Purpose**: Immediate UX feedback on syntax and format errors

**Implementation**:

- `AddQueueModalView._validateAndGetFormData()`
- `EditQueueModalView._validateAndCollectChanges()`

**Responsibilities**:

- Field format validation (capacity syntax, queue names, etc.)
- Real-time feedback as users type
- Prevents submission of malformed data
- Uses `ValidationService` for stateless checks

**Example**: Validating that capacity values match the selected mode (percentage, weight, absolute).

### System-Level Validation (QueueValidator)

**Purpose**: Holistic checks on the effective configuration

**Implementation**: `QueueValidator.validate()` with mode-specific logic

**Responsibilities**:

- Queue hierarchy validation
- Capacity sum validation (mode-aware)
- Cross-queue relationship checks
- Legacy vs non-legacy mode enforcement

**Feedback**: Provided via the batch controls bar with detailed error messages in preview window

**Mode-Specific Rules**:

- **Legacy Mode**:
    - Sibling queues under the same parent must use the same capacity mode (percentage OR weight, not mixed)
    - Absolute capacity cannot be mixed with any other mode anywhere in the entire hierarchy
- **Non-Legacy Mode**: Mixed capacity modes allowed, percentage sums validated only when all children use percentages

**Error Message Format**:

- **Concise messages** in batch controls for quick identification
- **Detailed messages** in preview window with specific queue lists and fix suggestions
- **Visual indicators** mark affected queues in the tree view

## UI Event Orchestration

The application uses `UIStateManager` as the primary coordinator for UI events, with `MainController` focusing on system-level operations.

### Event Flow Pattern

```
View → UIStateManager → Service/Model
```

### Edit Queue Flow Example

1. `QueueTreeView` emits `editQueueClicked`
2. `UIStateManager.handleEditQueueRequest()` processes event directly
3. UIStateManager coordinates modal display and data preparation

### UIStateManager Responsibilities

- Modal lifecycle management
- UI state coordination
- View rendering coordination
- Event routing for UI interactions

### MainController Responsibilities

- System initialization
- High-level workflow coordination (Apply All, Discard All)
- API communication orchestration
- Model event handling

## Validation Framework

### Validation Levels

The validation system operates at multiple levels:

1. **Field Level**: Immediate feedback in forms
2. **Modal Level**: Form validation before submission
3. **System Level**: Holistic validation before applying changes

### QueueValidator

Performs comprehensive validation including:

- Queue name uniqueness and format
- Capacity sum validation (mode-aware)
- Queue state validation
- Hierarchy-wide capacity mode validation (legacy mode)
- Sibling capacity mode validation (legacy mode)
- Pending changes integration (checks `_ui_capacityMode`)

### Validation Results

```javascript
Result.success(value); // Success with value
Result.error(message, details); // Error with details
```

## Development Workflow

### Local Development

**Enable mock mode:**

```javascript
CONFIG.USE_MOCKS = true;
```

**Start local server:**

```bash
python3 -m http.server 8080
```

**Access at:** `http://localhost:8080`

### Adding Features

1. **New Property**: Add to metadata → Automatic integration
2. **New Service**: Create in `js/services/` → Wire in MainController
3. **New View**: Extend BaseModalView → Register with UIStateManager
4. **New Validation**: Add to QueueValidator

### Testing Checklist

- [ ] Property appears in edit modal
- [ ] Default indicators work correctly
- [ ] Staging creates correct changes
- [ ] API payload has full property names
- [ ] Validation provides helpful errors
- [ ] Templates include new property (if applicable)
- [ ] Legacy mode validation catches hierarchy-wide conflicts
- [ ] Preview window shows detailed error explanations
- [ ] Queue tree marks validation errors visually

## Common Patterns

### Event Communication

```javascript
// Emit event
this._emit('eventName', data);

// Subscribe
model.subscribe('eventName', (data) => {
    // Handle event
});
```

### Property Key Mapping

```javascript
// Full key → Simple key
PropertyKeyMapper.toSimpleKey('yarn.scheduler.capacity.root.capacity');
// Returns: 'capacity'

// Simple key → Full key
PropertyKeyMapper.createFullKey('root', 'capacity');
// Returns: 'yarn.scheduler.capacity.root.capacity'
```

### Capacity Value Parsing

```javascript
const parsed = CapacityValueParser.parse('50%');
// Returns: { value: 50, type: 'percentage', isValid: true }
```

## Troubleshooting

### Common Issues

1. **Property not appearing**: Check metadata key format
2. **Validation errors**: Check QueueValidator rules
3. **API errors**: Verify payload format (simple vs full keys)
4. **Modal not closing after reopen**: Ensure `UIStateManager.hideModal()` doesn't call `destroy()`
5. **Changes not staging**: Verify ChangeManager flow
6. **Event listeners not working**: Check if modal `destroy()` was called prematurely

### Debug Tools

- Browser DevTools Network tab for API calls
- Console for validation errors
- NotificationView for user-facing errors
- CONFIG.DEBUG for verbose logging

### Performance Tips

- Use SchedulerDataCache for expensive operations
- Batch DOM updates in views
- Leverage single-pass validation
- Avoid deep property lookups in loops

## Best Practices

1. **Follow Metadata Pattern**: Define properties in metadata, not code
2. **Use Services**: Complex logic belongs in services, not views
3. **Emit Semantic Events**: Use meaningful event names
4. **Handle Errors**: Use Result pattern for operations
5. **Clean Up Resources**: Prevent memory leaks with proper cleanup
6. **Test Edge Cases**: Empty values, special characters, deep hierarchies
7. **Document Complex Logic**: Add JSDoc for non-obvious code
8. **Preserve Immutability**: Don't modify base properties directly

This guide provides the foundation for extending and maintaining the YARN Scheduler UI. The metadata-driven architecture makes adding new features straightforward while maintaining consistency across the application.

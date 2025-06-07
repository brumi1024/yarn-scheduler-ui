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
- [Validation Framework](#validation-framework)
- [Development Workflow](#development-workflow)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

The application follows a clean architecture pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────┐
│              MainController                 │ ← Lightweight coordinator
└─────────────────────────────────────────────┘
                     │
                     │ Coordinates
                     ↓
┌─────────────────────────────────────────────┐
│             Service Layer                   │
├─────────────────────────────────────────────┤
│ • ConfigurationOrchestrator                 │ ← Workflow coordination
│ • UIStateManager                            │ ← View state management
│ • ChangeManager                             │ ← Change operations
│ • ViewDataFormatterService                  │ ← Data transformation
│ • ValidationService                         │ ← Validation logic
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
```

### Key Principles

1. **Single Source of Truth**: `QueueConfigurationManager` maintains all queue state
2. **Event-Driven**: Components communicate via `EventEmitter` pattern
3. **Metadata-Driven**: Properties defined in metadata files, not hardcoded
4. **Service Coordinators**: Complex workflows handled by dedicated services
5. **Immutable Operations**: All changes are staged before applying

## Core Data Model

### QueueConfigurationManager

The unified data model that replaced the previous dual-system approach:

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
- Queue add/update/delete with validation
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

### Key Modal Features

#### EditQueueModalView
- Tabbed interfaces for complex configurations
- Dynamic capacity mode switching
- Custom property support
- Node label configuration
- Auto-creation templates

#### Event Cleanup Pattern
```javascript
class EditQueueModalView extends BaseModalView {
  constructor() {
    this.eventCleanupCallbacks = [];
  }
  
  _bindEvents() {
    const handler = () => { /* ... */ };
    element.addEventListener('click', handler);
    this.eventCleanupCallbacks.push(() => 
      element.removeEventListener('click', handler)
    );
  }
  
  _cleanupEventListeners() {
    for (const cleanup of this.eventCleanupCallbacks) {
      cleanup();
    }
    this.eventCleanupCallbacks = [];
  }
}
```

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

## Validation Framework

### Three-Level Validation

1. **Field Level**: Immediate feedback in forms
2. **Model Level**: Structural validation before staging
3. **Pre-Apply**: Final validation before API submission

### QueueValidator

Single-pass validation for:
- Queue name uniqueness and format
- Capacity sum validation (percentage mode)
- Queue state validation
- Parent-child relationships

### Validation Results

```javascript
Result.success(value)           // Success with value
Result.error(message, details)  // Error with details
```

## Development Workflow

### Local Development

1. Enable mock mode:
```javascript
CONFIG.USE_MOCKS = true
```

2. Start local server:
```bash
python3 -m http.server 8080
```

3. Access at `http://localhost:8080`

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
PropertyKeyMapper.toSimpleKey('yarn.scheduler.capacity.root.capacity')
// Returns: 'capacity'

// Simple key → Full key
PropertyKeyMapper.createFullKey('root', 'capacity')
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
4. **Modal not closing**: Check event cleanup
5. **Changes not staging**: Verify ChangeManager flow

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
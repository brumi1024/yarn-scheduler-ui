# YARN Scheduler UI - Developer Guide

This document provides an overview of the YARN Scheduler UI architecture, component responsibilities, and guidance for extending the application.

## 1. Architecture Overview

The application follows a clean MVC architecture with specialized service coordinators:

```
┌─ Models ─────────────────────────────────┐
│ QueueConfigurationManager (unified)      │ ← Single source of truth
│ AppStateModel, SchedulerInfoModel        │
└───────────────────────────────────────────┘
              │
┌─ Services ──────────────────────────────┐
│ ConfigurationOrchestrator               │ ← Config workflows
│ UIStateManager                          │ ← View coordination  
│ ChangeManager                           │ ← Change operations
│ ApiService, ValidationService           │
│ ViewDataFormatterService                │
└─────────────────────────────────────────┘
              │
┌─ Views ─────────────────────────────────┐
│ QueueTreeView, Modal Views              │
│ ControlsView, BatchControlsView         │
└─────────────────────────────────────────┘
              │
┌─ Controller ────────────────────────────┐
│ MainController (lightweight coordinator)│
└─────────────────────────────────────────┘
```

### Key Components:

- **Models (`js/models/`)**:
  - `QueueConfigurationManager`: Unified queue configuration and change management
  - `AppStateModel`: UI state (tabs, search, partition selection)
  - `SchedulerConfigModel`: Facade over QueueConfigurationManager
  - `SchedulerInfoModel`: Live runtime data from YARN

- **Services (`js/services/`)**:
  - `ConfigurationOrchestrator`: Coordinates config loading, validation, API mutations
  - `UIStateManager`: Manages view state, modal coordination, bulk operations UI
  - `ChangeManager`: Handles queue staging operations with validation
  - `ApiService`: REST API communication with YARN ResourceManager
  - `ValidationService`: Stateless validation utilities
  - `ViewDataFormatterService`: Transforms data for view consumption

- **Views (`js/views/`)**:
  - Presentation layer components that emit semantic events
  - `QueueTreeView`: Hierarchical queue display with Sankey connectors
  - Modal views for add/edit/info operations
  - Controls and batch operation views

- **Controller (`js/controllers/`)**:
  - `MainController`: Lightweight coordinator that delegates to services

## 2. Core Data Model: QueueConfigurationManager

**Revolutionary Change**: The previous dual-system (SchedulerConfigTrie + ChangeLog) has been unified into a single, coherent data structure.

### QueueNode Structure:
```javascript
class QueueNode {
  // Identity
  segment: string          // Queue name segment
  fullPath: string         // Full path (e.g., "root.default")
  isQueue: boolean         // Whether this represents an actual queue

  // Current state
  baseProperties: Map      // Original properties from server

  // Pending changes (unified with current state)
  pendingOperation: 'add'|'update'|'delete'|null
  pendingProperties: Map   // Staged property changes
  oldProperties: Map       // Original values for rollback

  // Tree structure
  children: Map<string, QueueNode>
  parent: QueueNode

  // Methods
  getEffectiveProperties() // Returns base + pending changes
  isNew(), isDeleted(), hasPendingChanges()
}
```

### Benefits:
- **Single source of truth**: No more merging separate data structures
- **Immutable operations**: Clean staging and rollback
- **Performance**: Eliminated multi-pass operations
- **Maintainability**: One coherent data model

## 3. Service Coordinators (New)

### ConfigurationOrchestrator
Handles configuration workflows:
```javascript
// Loading and refreshing
initializeConfiguration()
refreshConfiguration(hasPendingChanges)

// Applying changes with validation
applyPendingChanges(formatter, appState)
discardPendingChanges()

// Global configuration
stageGlobalConfigUpdate(formData)
```

### UIStateManager  
Manages view coordination:
```javascript
// Rendering coordination
renderInitialUI(dataModels)
renderQueueTreeView(dataModels, formatter, bulkOps)

// Modal management
showAddQueueModal(configModel, parentPath)
showEditQueueModal(queuePath, dataModels, formatter)

// State management
handleBulkOperationsVisibilityChange(isVisible)
```

### ChangeManager
Handles change operations:
```javascript
// Queue operations with validation
stageAddQueue(formData, formatter, dataModels)
stageUpdateQueue(queuePath, formData, formatter)
stageDeleteQueue(queuePath, formatter, dataModels)

// Advanced operations
handleAccessibleLabelsChange(eventData, ...)
```

## 4. How to Add a New Editable Property

**Example**: Adding `yarn.scheduler.capacity.<queue>.some-new-property`

### 1. Define Metadata (`js/config/config-metadata-queue.js`):
```javascript
[`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.some-new-property`]: {
  key: 'some-new-property',
  displayName: 'My New Property',
  description: 'This property does something amazing.',
  type: 'string', // 'number', 'boolean', 'enum'
  defaultValue: 'defaultValue',
  placeholder: 'Default: defaultValue', // Optional helpful placeholder
  availableInTemplate: true, // Optional: make available in auto-creation templates
  // For enum types:
  // options: ['option1', 'option2'],
  // For number types:
  // step: '0.1', min: '0', max: '100'
}
```

### 2. Enhanced Metadata Fields:
- **`availableInTemplate`**: Set to `true` to automatically include in auto-creation templates
- **`placeholder`**: Helpful text shown in empty fields (e.g., "Default: 10%")
- **`v2Property`**: For auto-creation specific properties, marks as v2-only features

### 3. Automatic Integration:
The system automatically handles new properties through:
- `ViewDataFormatterService._populateConfiguredProperties()`: Auto-populates from metadata
- `ViewDataFormatterService.formatQueueDataForEditModal()`: Tracks default values in `propertyDefaults`
- `EditQueueModalView._buildHtml()`: Auto-generates form fields with default indicators
- `QueueConfigurationManager`: Handles staging and API payload generation
- **Auto-creation templates**: Properties with `availableInTemplate: true` automatically appear in template sections

### 4. Default Value Detection:
New properties automatically get default value indicators when:
- Property value is `undefined` (using system default)
- Blue badge appears next to property name in edit modal
- Input field shows empty with helpful placeholder text
- Tooltip indicates "This field is using the default value"

### 5. Template Integration:
If `availableInTemplate: true`:
- Property automatically appears in v1 templates: `leaf-queue-template.<property>`
- Property automatically appears in v2 templates: `auto-queue-creation-v2.{template,parent-template,leaf-template}.<property>`
- No additional code required for template support

### 6. Testing:
- Verify field appears in edit modal with appropriate default indicator
- Test staging and API payload generation with full YARN property names
- Confirm XML includes complete property path (not simple key)
- Verify default indicator toggles correctly when value is modified
- If `availableInTemplate: true`, verify property appears in auto-creation template sections

## 5. Key Architectural Changes (2024)

### PropertyKeyMapper Enhancement
The `PropertyKeyMapper.toSimpleKey()` method has been enhanced to handle complex auto-creation property structures:
- **Before**: `yarn.scheduler.capacity.root.test.auto-create-child-queue.enabled` → `enabled`
- **After**: `yarn.scheduler.capacity.root.test.auto-create-child-queue.enabled` → `auto-create-child-queue.enabled`
- **Preserves full property context** for auto-creation and template properties
- **Maintains backward compatibility** for regular queue properties

### API Submission Improvements
Fixed critical issues in API payload generation:
- **Full YARN Property Names**: API now receives complete property paths instead of simple keys
- **Percentage Value Cleaning**: Automatic `%` removal from percentage values (YARN expects numeric values)
- **Value Processing**: `_cleanValueForApi()` method handles different capacity formats correctly

### Template Property System
Revolutionary auto-creation template system:
- **No Duplication**: Template properties are dynamically generated from queue metadata
- **Extensible**: Adding `availableInTemplate: true` to any queue property automatically makes it available in templates
- **Mode-Aware**: Different template structures for v1 vs v2 auto-creation modes
- **Inheritance**: Template properties inherit all metadata (types, validation, descriptions) from queue properties

## 6. Recent Improvements

### Scrolling and Layout Fixes
- **Multiple Horizontal Scrollbars**: Fixed dual scrollbar issue in queue tree
- **Horizontal Scrolling**: Proper support for deep queue hierarchies
- **Header Scrolling**: Fixed header/controls scrolling out of view
- **Queue Tree Layout**: Improved space utilization and scrollbar visibility

### Change Preview System
- **Preview Changes**: Fixed empty preview when changes exist
- **Detailed Changes**: Resolved issues with old values showing as null
- **Capacity Change Detection**: Fixed false positive capacity changes
- **Change Tracking**: Improved accuracy of change detection

### Virtual Scrolling Removal
- **Performance**: Removed virtual scrolling for better performance with 500+ queues
- **Simplified Rendering**: Direct DOM rendering without virtualization complexity
- **Better UX**: More predictable scrolling behavior

## 6. Validation System

### Unified QueueValidator (`js/utils/validators/QueueValidator.js`):
Single-pass validation replacing multiple validator files:
```javascript
validate(configModel, formattedHierarchy, schedulerInfo, appState) {
  // Single traversal validates:
  // - Queue names, capacity sums
  // - Node labels, queue states  
  // - Parent-child relationships
}
```

### Validation Pipeline:
1. **Form-level**: `ValidationService` for immediate feedback
2. **Model-level**: `SchedulerConfigModel.performStatefulValidation()`
3. **Pre-apply**: `ConfigurationOrchestrator.applyPendingChanges()`

## 7. Error Handling

### Unified Error Hierarchy:
```javascript
YarnSchedulerError (base)
├── ValidationError (config/validation issues)
└── ApiError (network/API issues)
```

### ErrorHandler:
- Centralized error processing with retry logic
- Type-specific error formatting
- User-friendly notification generation

## 8. Adding New Functionality

### New Queue Property:
1. Add to `config-metadata-queue.js`
2. System auto-integrates

### New Modal/View:
1. Extend `BaseModalView`
2. Add to `UIStateManager.views`
3. Update `MainController` event bindings

### New API Endpoint:
1. Add to `ApiService`
2. Update `ConfigurationOrchestrator` if config-related

### New Tab:
1. Create view class
2. Add to `UIStateManager`
3. Update `MainController._handleTabChange()`

## 9. UI Features

### Default Value Indicators
The edit modal includes visual indicators for properties using default values:
- Blue badges with gear icons appear next to property names when using defaults
- Empty input fields for unconfigured properties with helpful placeholders
- Helps users distinguish between configured and default values
- Implementation in `ViewDataFormatterService` tracks defaults via `propertyDefaults` object
- CSS styling in `modals.css` with `.default-indicator` class

### New Features (2024 Implementation)

#### Resource Vector Capacity Mode
- **Available in non-legacy mode only**: When `legacy-queue-mode.enabled = false`
- **Mixed resource types**: Support for `[memory=50%,vcores=2,gpu=1w]` format
- **Dynamic dropdown**: Vector option only appears when legacy mode is disabled
- **Validation**: Let YARN validate complex vector formats
- **Implementation**: Added to `CapacityValueParser` and capacity mode dropdown

#### Custom Properties (Advanced Users)
- **Collapsible section**: ⚠️ Custom Properties (Advanced) in edit modal
- **Dynamic property addition**: Add any YARN property with `yarn.scheduler.capacity.<queue>.` prefix
- **No validation**: Warning displayed that properties are not validated by UI
- **Implementation**: Separate collection and submission pipeline for custom properties

#### Auto Queue Creation Configuration
- **Mode-aware configuration**: Different properties for v1 (Legacy) vs v2 (Flexible) modes
- **Child queue validation**: Legacy auto-creation disabled for queues with existing children
- **Template property inheritance**: Auto-generated from `QUEUE_CONFIG_METADATA` with `availableInTemplate: true`
- **v1 Templates**: `yarn.scheduler.capacity.<queue>.leaf-queue-template.<property>`
- **v2 Templates**: Multiple scopes:
  - `auto-queue-creation-v2.template.<property>` (all children)
  - `auto-queue-creation-v2.parent-template.<property>` (parent children only)
  - `auto-queue-creation-v2.leaf-template.<property>` (leaf children only)
- **Dynamic property structure**: Template properties automatically inherit from queue metadata

#### Legacy vs Non-Legacy Queue Modes
- **Legacy Mode Detection**: `AppStateModel.isLegacyModeEnabled()` checks global config
- **UI Adaptation**: Different capacity options and validation rules based on mode
- **Global Configuration**: `yarn.scheduler.capacity.legacy-queue-mode.enabled` in global config
- **Mode-specific Features**:
  - Legacy: Traditional percentage/weight/absolute modes
  - Non-legacy: All modes plus Resource Vector support

### Queue Tree Display
- **Horizontal Scrolling**: Supports deep queue hierarchies with proper scrolling
- **Sankey Connectors**: Visual hierarchy representation
- **Status Indicators**: Visual tags for queue states, capacity modes, and auto-creation
- **Bulk Operations**: Multi-queue selection and operations

### Change Management
- **Preview Changes**: Detailed view of pending modifications with old/new value comparison
- **Staging System**: Stage changes before applying to YARN
- **Validation Pipeline**: Real-time validation with error reporting
- **Value Cleaning**: Automatic % removal from percentage values for YARN API

## 10. Performance Features

- **Caching**: `SchedulerDataCache` for expensive operations
- **Bulk Operations**: Efficient multi-queue operations
- **Single-pass Processing**: Unified data model eliminates multiple traversals

## 11. Development Tips

### Debugging:
- Use browser DevTools with `CONFIG.DEBUG = true`
- Check `NotificationView` for validation errors
- Monitor `EventEmitter` subscriptions

### Testing Changes:
- Use `CONFIG.USE_MOCKS = true` for offline development
- Test with mock data in `/mock/ws/v1/cluster/`
- Validate XML payloads in browser network tab

### Code Organization:
- Follow Single Responsibility Principle
- Use service coordinators for complex workflows
- Keep views "dumb" - emit events, don't contain business logic
- Leverage the unified `QueueConfigurationManager` for all queue operations

This architecture provides a clean, maintainable foundation for YARN scheduler configuration management.
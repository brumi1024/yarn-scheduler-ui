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
  defaultValue: 'defaultValue'
}
```

### 2. Automatic Integration:
The system automatically handles new properties through:
- `ViewDataFormatterService._populateConfiguredProperties()`: Auto-populates from metadata
- `EditQueueModalView._buildHtml()`: Auto-generates form fields
- `QueueConfigurationManager`: Handles staging and API payload generation

### 3. Testing:
- Verify field appears in edit modal
- Test staging and API payload generation
- Confirm XML includes new property

## 5. Validation System

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

## 6. Error Handling

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

## 7. Adding New Functionality

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

## 8. Performance Features

- **Virtual Scrolling**: `VirtualQueueTree` for large hierarchies
- **Caching**: `SchedulerDataCache` for expensive operations
- **Bulk Operations**: Efficient multi-queue operations
- **Single-pass Processing**: Unified data model eliminates multiple traversals

## 9. Development Tips

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
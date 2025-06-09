# YARN Capacity Scheduler Configuration UI - Technical Specification

## 1. Overview

### 1.1 Purpose
Create a web-based UI for editing YARN Capacity Scheduler configuration using the scheduler mutation API. The application will replace limited external UIs and manual XML editing, providing cluster administrators with an intuitive interface for queue management.

### 1.2 Target Users
- **Primary**: Cluster administrators with limited YARN internal knowledge
- **Usage Pattern**: Initial setup with fine-tuning, then occasional edits for new teams/apps or issue resolution
- **Common Tasks**: Editing queue capacities/limits, adding new queues

### 1.3 Key Features
- Visual queue tree editor with zoom and navigation
- Metadata-driven property configuration
- Change management with staging, validation, and undo/redo
- Node label management
- Global settings configuration
- Activity logging and diagnostics

## 2. Technical Architecture

### 2.1 Technology Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3 (no external frameworks)
- **Hosting**: Served directly by YARN ResourceManager on separate endpoint
- **API Communication**: REST APIs via relative paths
- **Browser Support**: Modern browsers only (Chrome, Firefox, Safari, Edge)

### 2.2 Build and Deployment
- Multiple files served from ResourceManager directory
- Separate development repository with build process
- Code minification/optimization required
- Support for API mocking during development
- Minimal external dependencies (licensing and CVE concerns)

### 2.3 Performance Requirements
- Handle 1000+ queues without crashes
- Acceptable frame rate dips but maintain usability
- Virtualization and progressive rendering configurable based on benchmarks
- Client-side configuration parsing and caching

## 3. Application Layout

### 3.1 Main Navigation
- Top tabs: **Queues** | **Global Settings** | **Node Labels** | **Diagnostics**
- Status bar showing: legacy mode status, total queue count, last refresh time
- Search box in top-right corner

### 3.2 Layout Components
- **Main Content Area**: Changes based on active tab
- **Staged Changes Panel**: Floating bottom panel
- **Notifications**: Toast-style, macOS-like notifications
- **Modals**: Queue property editor, confirmation dialogs

## 4. Queue Editor Tab

### 4.1 Queue Tree Canvas
- **Layout**: Left-to-right hierarchical tree
- **Visual Elements**:
  - Queue cards showing: name, capacity, maximum capacity, state, capacity mode, auto-creation status
  - Sankey connectors with width based on capacity
  - Color coding: capacity mode differentiation, red for stopped queues
  - Animated transitions for capacity changes
  - Selection indication for active queues

### 4.2 Canvas Interactions
- **Pan and Zoom**: Mouse/trackpad controls
- **Queue Selection**: Click to select, show properties
- **Expand/Collapse**: Parent queue controls
- **Drag and Drop**: Move queues between parents
- **Context Actions**: Toolbar buttons and keyboard shortcuts

### 4.3 Canvas Features
- **Performance Modes**:
  - Detailed view for editing
  - Simplified view for navigation (when zoomed out)
- **Search and Filter**: Show filtered tree based on search
- **Node Label View**: Dropdown to filter queues by label access

### 4.4 Queue Operations
- **Add Queue**: Toolbar button on selected parent
- **Edit Properties**: Click queue to open modal
- **Delete Queue**: Only when stopped, toolbar button
- **Stop/Start Queue**: State toggle in properties

## 5. Queue Property Modal

### 5.1 Modal Structure
- Large modal with multiple tabs
- Sections within tabs for property groups
- Save/Cancel buttons
- Support for multiple simultaneous modals

### 5.2 Property Categories
1. **Core Properties**
  - capacity (with mode selector: %, w, absolute)
  - maximum-capacity
  - state (RUNNING/STOPPED)

2. **Resource Limits & Management**
  - user-limit-factor
  - maximum-am-resource-percent
  - max-parallel-apps

3. **Advanced Settings**
  - ordering-policy
  - disable_preemption
  - Custom properties (key-value pairs with warning)

4. **Auto Queue Creation**
  - Mode detection based on legacy-queue-mode.enabled
  - Template properties (subset of regular queue properties)
  - Legacy: auto-create-child-queue.enabled, leaf-queue-template.*
  - Flexible: auto-queue-creation-v2.enabled, auto-queue-creation-v2.template.*

5. **Node Labels**
  - accessible-node-labels
  - accessible-node-labels.<label>.capacity
  - default-node-label-expression

### 5.3 Capacity Editing
- Mode selector next to capacity field (%, w, absolute)
- Single text field for absolute resources: `[memory=1024,vcores=1]`
- Slide-out sibling editor for maintaining parent capacity sum
- Bulk conversion tools (legacy mode: absolute ↔ percentage)

## 6. Global Settings Tab

### 6.1 Settings Organization
- **Legacy Mode Toggle** (prominent, highlighted at top)
- **Categories**:
  - Queue Mappings
  - Resource Configuration
  - Scheduling Policies
  - Global Application Management
  - Global Queue Defaults

### 6.2 Key Global Settings
```
yarn.scheduler.capacity.legacy-queue-mode.enabled (boolean) - HIGHLIGHTED
yarn.scheduler.capacity.schedule-asynchronously.enable (boolean)
yarn.scheduler.capacity.node-locality-delay (number)
yarn.scheduler.capacity.maximum-am-resource-percent (number)
yarn.scheduler.capacity.maximum-applications (number)
yarn.scheduler.capacity.user-limit-factor (number)
yarn.scheduler.capacity.queue-mappings (special table UI)
yarn.scheduler.capacity.queue-mappings-override.enable (boolean)
```

### 6.3 Features
- Reorganizable table for queue mappings
- Tips and descriptions for each setting
- Advanced custom properties section
- Warning when changing legacy-queue-mode with auto-staging option

## 7. Node Labels Tab

### 7.1 Label Management
- Add/remove cluster node labels
- Set label exclusivity
- View label partition resources

### 7.2 Node Assignment
- List all cluster nodes with current state
- Bulk assign labels to nodes
- View current node-to-label mappings
- Filter nodes by state

### 7.3 Integration
- Node label changes apply immediately (separate API)
- Queue label configurations part of staged changes

## 8. Change Management System

### 8.1 Staging
- All changes staged before applying
- Changes persisted in UI during session
- No browser storage (reload loses staged changes)
- Group related changes (e.g., "Updated capacity for queue X")

### 8.2 Validation
- **Real-time**: Basic input validation (type checking)
- **On-stage**: Complex validation rules
- **Legacy mode rules**:
  - Sibling capacities sum to 100%
  - No mixing absolute/percentage in hierarchy
  - Weight mode restrictions
- **Non-legacy mode**: Mixed capacity modes allowed
- **Common rules**: Unique paths, stopped before delete

### 8.3 Conflict Resolution
- Check configuration version before apply
- Re-stage changes on newer configuration
- Highlight conflicts for user resolution

### 8.4 Change Operations
- **Undo/Redo**: Grouped change tracking
- **Diff View**: Before/after comparison
- **Apply**: Batch update to YARN
- **Clear**: Remove all staged changes

## 9. Diagnostics Tab

### 9.1 Activity Log
- Timestamp and user information
- API calls and responses
- Configuration change attempts (success/failure)
- Retry failed operations
- Session-only retention

### 9.2 Export Diagnostics
- Selectable export items:
  - Current configuration
  - API endpoint responses
  - API call history
  - Activity log
- Download as structured file

## 10. Data Flow

### 10.1 Initial Load
1. Fetch configuration via `GET /scheduler-conf`
2. Parse flat XML structure:
  - Identify queues by `root.` prefix after `yarn.scheduler.capacity.`
  - Build hierarchy using parent `.queues` properties
3. Fetch queue statistics via `GET /scheduler`
4. Load node labels via `GET /get-node-labels`

### 10.2 Configuration Updates
1. Stage changes in UI
2. Validate staged changes
3. Check configuration version
4. Apply via `PUT /scheduler-conf`
5. Refresh to confirm changes

### 10.3 API Error Handling
- Retry mechanism for transient failures
- Toast notifications for errors
- Out-of-sync warnings with reload prompt
- Detailed error messages in activity log

## 11. Metadata Structure

### 11.1 Queue Properties Metadata
```json
{
  "queueProperties": {
    "groups": [
      {
        "id": "core",
        "name": "Core Properties",
        "properties": [
          {
            "key": "capacity",
            "displayName": "Capacity",
            "type": "capacity", // special type for mode support
            "validation": {
              "modes": ["percentage", "weight", "absolute"],
              "percentage": { "min": 0, "max": 100 },
              "weight": { "pattern": "^\\d+w$" },
              "absolute": { "pattern": "^\\[.*\\]$" }
            },
            "tooltip": "Queue capacity relative to parent",
            "required": true
          },
          {
            "key": "maximum-capacity",
            "displayName": "Maximum Capacity",
            "type": "capacity",
            "tooltip": "Maximum queue capacity",
            "dependsOn": "capacity" // determines valid modes
          }
        ]
      }
    ],
    "templateCompatible": ["capacity", "maximum-capacity", "user-limit-factor", ...]
  }
}
```

### 11.2 Global Settings Metadata
```json
{
  "globalSettings": {
    "groups": [
      {
        "id": "system",
        "name": "System Configuration",
        "properties": [
          {
            "key": "yarn.scheduler.capacity.legacy-queue-mode.enabled",
            "displayName": "Legacy Queue Mode",
            "type": "boolean",
            "default": true,
            "highlighted": true,
            "tooltip": "Enables legacy queue capacity mode restrictions",
            "warning": "Changing this affects capacity mode mixing rules"
          }
        ]
      }
    ]
  }
}
```

## 12. Extensibility

### 12.1 Metadata-Driven UI
- Property definitions in external JSON files
- Easy addition of new properties by editing metadata
- Support for custom validation rules
- Tooltip and help text configuration

### 12.2 Future Considerations
- Template support for common operations
- API for external tool integration
- Advanced queue metrics and monitoring
- Capacity planning and simulation tools

## 13. Development Guidelines

### 13.1 Code Organization
```
/src
  /api         - API communication layer
  /components  - UI components (modal, tree, etc.)
  /canvas      - Queue tree visualization
  /validation  - Configuration validation rules
  /metadata    - Property definitions
  /utils       - Helper functions
```

### 13.2 Key Implementation Notes
- Use Canvas API for tree rendering (performance)
- Implement virtual scrolling for large queue lists
- Debounce search and validation operations
- Cache parsed configuration for performance
- Use Web Workers for heavy computations if needed

### 13.3 Testing Considerations
- Mock API responses for development
- Test with 1000+ queue configurations
- Validate all capacity mode combinations
- Test conflict resolution scenarios
- Cross-browser compatibility testing

## 14. Security Considerations
- Rely on YARN authentication/authorization
- No client-side credential storage
- Validate all inputs before API submission
- Escape user inputs in UI rendering
- Audit log all configuration changes
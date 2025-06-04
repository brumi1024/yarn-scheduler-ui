# YARN Scheduler UI - Developer Guide (MVC Refactor)

This document provides an overview of the YARN Scheduler UI. It outlines the structure, component responsibilities, and guidance for extending the application.

## 1. Architecture Overview

The application is structured into three main layers: Model, View, and Controller, along with Services and Utility components.

- **Model (`js/model/`)**:
    - Manages all application data (scheduler configuration, scheduler runtime info, UI state).
    - Contains business logic related to data manipulation and consistency.
    - Handles staging of pending configuration changes.
    - Uses an `EventEmitter` to notify other components of data changes.
- **View (`js/views/`)**:
    - Responsible for rendering the UI based on data provided (typically via the Controller).
    - Captures user interactions (clicks, input changes) and emits semantic events.
    - Designed to be as "dumb" as possible, focusing on presentation.
- **Controller (`js/controller/MainController.js`)**:
    - Acts as the orchestrator between Models and Views.
    - Responds to View events (user actions).
    - Interacts with Models to update state or retrieve data.
    - Utilizes Services for tasks like API communication and data formatting.
    - Updates Views when underlying data or application state changes.
- **Services (`js/services/`)**:
    - Provide specialized functionalities used by the Controller or other components.
    - `ApiService.js`: Handles all communication with the YARN ResourceManager REST APIs.
    - `ValidationService.js`: Provides stateless validation utility functions.
    - `ViewDataFormatterService.js`: Transforms raw data from Models into richly formatted objects tailored for consumption by View components.
- **Utilities (`js/utils/`)**:
    - `EventEmitter.js`: A simple publish/subscribe mechanism used by Models.
    - `DomUtils.js`: Helper functions for common DOM manipulations.
    - `SchedulerConfigTrie.js`: The data structure used by `SchedulerConfigModel` to store hierarchical queue configurations.
- **Configuration (`js/config/`)**:
    - `config.js`: Global application constants (API endpoints, mock settings, etc.).
    - `config-metadata-*.js`: Files defining the structure, display names, types, and defaults for editable configurations (global, queue-specific, node labels) and for displaying scheduler info.

## 2. Component Responsibilities

### Models:

- **`AppStateModel.js`**: Manages UI-centric state like the current active tab, search term, sort criteria, selected partition, and global config edit mode. Emits events when these states change.
- **`SchedulerConfigModel.js`**:
    - The core model for `scheduler-conf` data.
    - Uses `SchedulerConfigTrie.js` to parse and store the hierarchical queue configurations and global scheduler settings.
    - Manages the `_pendingChanges` object (additions, updates, deletions, global updates).
    - Provides methods to stage changes, clear changes, and retrieve pending changes.
    - Includes `performStatefulValidation()` to check the validity of the current configuration state (base + pending changes), often using `ViewDataFormatterService` to get an effective view of the data.
    - Emits `configLoaded` and `pendingChangesUpdated` events.
- **`SchedulerInfoModel.js`**:
    - Stores and manages data fetched from the `/ws/v1/cluster/scheduler` API (live runtime information).
    - Extracts and provides the list of available partitions (node labels).
    - Provides methods to retrieve runtime info for specific queues.
    - Emits `infoLoaded` event.

### Services:

- **`ApiService.js`**:
    - Fetches initial `scheduler-conf` and `scheduler-info`.
    - Builds the XML payload for `PUT /ws/v1/cluster/scheduler-conf` to apply batched changes.
    - Handles mock data loading if configured.
    - Parses API responses, including YARN error messages.
- **`ValidationService.js`**:
    - Provides _stateless_ validation functions (e.g., queue name character checks, basic capacity string format checks). These can be used by Views for immediate feedback or by the Controller.
- **`ViewDataFormatterService.js`**:
    - Crucial for decoupling Models from Views.
    - Takes data from `SchedulerConfigModel`, `SchedulerInfoModel`, and `AppStateModel`.
    - Produces richly formatted data objects specifically structured for easy consumption by:
        - `QueueTreeView.js` (the entire effective hierarchy).
        - `EditQueueModalView.js` (detailed data for a specific queue, including handling of pending changes and node label structures).
        - `InfoQueueModalView.js` (combined configured and live data).

### Views:

- **Base Views (`LoadingView`, `NotificationView`, `BaseModalView`, `TabView`):** Provide foundational UI functionalities.
- **`ControlsView.js`**: Manages the header controls (partition selector, search, sort, "Add Queue" button, refresh button). Emits user interaction events.
- **`BatchControlsView.js`**: Displays the "pending changes" bar, shows validation status, and provides "Apply" / "Discard" actions.
- **`GlobalConfigView.js`**: Renders the "Scheduler Configuration" tab, allowing viewing and editing of global settings based on `GLOBAL_CONFIG_METADATA`.
- **`QueueTreeView.js`**: Renders the hierarchical queue display.
    - Uses `QueueCardView.js` (helper) to render individual queue cards.
    - Manages column layout and draws Sankey-like connectors between cards.
    - Emits events for card interactions (edit, add child, delete, info).
- **Modal Views (`AddQueueModalView`, `EditQueueModalView`, `InfoQueueModalView`):**
    - Extend `BaseModalView`.
    - Each renders its specific form/content.
    - `EditQueueModalView` includes logic for dynamically displaying and managing node label configurations.
    - Emit `submit...` events with form data.

### Controller (`MainController.js`):

- Initializes all Models, Services, and Views.
- Sets up comprehensive event bindings (View -> Controller, Model -> Controller).
- Orchestrates initial data loading using `ApiService` and populates Models.
- Handles all user action events from Views:
    - Validates input (using `ValidationService` for simple checks).
    - Updates Models (e.g., staging changes in `SchedulerConfigModel`, updating UI state in `AppStateModel`).
    - Invokes `ApiService` to apply changes to the backend.
    - Uses `ViewDataFormatterService` to prepare data for Views.
    - Instructs Views to re-render or update when necessary.
- Manages the overall application flow and state transitions.

## 3. How to Add a New Editable Property to a Queue

Let's say you want to add a new editable property, for example, `yarn.scheduler.capacity.<queue-path>.some-new-property` to the "Edit Queue" modal.

1.  **Define Metadata (`js/config/config-metadata-queue.js`):**

    - Find or add an appropriate category in `QUEUE_CONFIG_METADATA`.
    - Add an entry for the new property:
        ```javascript
        // Example within a category's 'properties' object:
        [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.some-new-property`]: {
            key: 'some-new-property', // Simple key used in forms and params
            displayName: 'My New Awesome Property',
            description: 'This property does something amazing.',
            type: 'string', // Or 'number', 'boolean', 'enum'
            defaultValue: 'defaultAmazingValue',
            // options: ['option1', 'option2'], // If type is 'enum'
            // step: '1', // If type is 'number'
            // min: '0', // If type is 'number'
            // max: '100' // If type is 'number'
        }
        ```

2.  **Update `ViewDataFormatterService.js`:**

    - **`_populateConfiguredProperties` (called by `_formatSingleQueueNode`):** The generic loop in this method should automatically pick up the new property using its `meta.key` from `QUEUE_CONFIG_METADATA` and populate it on the `formattedNode` object. The value will be sourced from `effectiveProperties` or the `meta.defaultValue`.
    - **`formatQueueDataForEditModal`:** This method also iterates through `QUEUE_CONFIG_METADATA` to populate `dataForModal.properties`. The new property should be automatically included with its simple key.

3.  **Update `EditQueueModalView.js`:**

    - **`_buildHtml`**: The loop that iterates over `QUEUE_CONFIG_METADATA` (passed via `data.properties` which was prepared by `ViewDataFormatterService`) to generate form fields should automatically include the new property. The `_buildPropertyInputHtml` helper handles rendering different input types based on `meta.type`.

4.  **Update `SchedulerConfigModel.js` (Typically No Change Needed for Standard Properties):**

    - **`stageUpdateQueue` / `stageAddQueue`**: The `params` object collected by `EditQueueModalView._collectFormData` (which uses simple keys like `meta.key`) will now include the new property if it's changed or part of a new queue's defaults. `SchedulerConfigModel` already handles generic simple-keyed params.
    - The `ApiService._buildBatchMutationXML` also uses these simple keys from `params` and should include the new property automatically in the XML.

5.  **Testing:**
    - Verify the new field appears in the "Edit Queue" modal with its correct display name, description, and default/current value.
    - Test editing and staging the change.
    - Verify the `PUT` request to the `/ws/v1/cluster/scheduler-conf` API includes the new property with its simple key within the `<params>` for the correct `<update-queue>` or `<add-queue>` element:
        ```xml
        <update-queue>
          <queue-name>root.yourqueue</queue-name>
          <params>
            <!-- ... other params ... -->
            <entry>
              <key>some-new-property</key>
              <value>itsNewValue</value>
            </entry>
          </params>
        </update-queue>
        ```

## 4. Implementing New Tabs ("Placement Rules", "Node Labels" main tab)

The "Placement Rules" and "Node Labels" tabs are currently placeholders. To implement them:

1.  **Define Data Structures (Model):**

    - If these tabs manage data from `/ws/v1/cluster/scheduler-conf` (e.g., for `yarn.scheduler.placement-rules`), enhance `SchedulerConfigModel.js` with methods to parse, store, and stage changes for these specific global configurations.
    - If they use entirely different API endpoints (e.g., for cluster-wide node label management like `yarn rmadmin -getClusterNodeLabels`), create new Model classes (e.g., `PlacementRulesModel.js`, `NodeLabelClusterModel.js`).
    - Update `AppStateModel.js` if any UI state specific to these tabs is needed (e.g., edit modes for these tabs).

2.  **Define Metadata (`js/config/`):**

    - Create new metadata files (e.g., `config-metadata-placement-rules.js`, `config-metadata-cluster-node-labels.js`) defining the properties to be displayed and edited for these new sections.

3.  **Create or Update Services (`js/services/`):**

    - Extend `ApiService.js` if new YARN RM REST endpoints are needed.
    - Update `ViewDataFormatterService.js` to prepare data specifically for these new views if their data structure is complex or requires merging from multiple sources.

4.  **Create View Components (`js/views/`):**

    - Create new View classes for each tab (e.g., `PlacementRulesView.js`, `NodeLabelsTabView.js`).
    - These views will be responsible for rendering the HTML content for their respective tab panes (`#placement-rules-content`, `#node-labels-content`).
    - They will use their specific metadata to display forms or information.
    - They will emit events for user interactions (e.g., `savePlacementRule`, `addClusterLabel`).

5.  **Update `MainController.js`:**

    - Instantiate the new View (and Model/Service if applicable) components in the constructor.
    - Bind to events from the new Views in `_bindAppEvents()`.
    - Implement event handlers in `MainController` to manage data flow for these new tabs (fetching data, staging changes via models, updating views).
    - In `_handleTabChange`, add cases for the new `tabId`s to call the `render()` method of the active tab's View component.

6.  **Update `index.html`:** Add `<script>` tags for any new JavaScript files, ensuring correct loading order.

**Example: Implementing "Placement Rules" Tab (if it uses `scheduler-conf` for storage)**

- **Metadata:** Create `js/config/config-metadata-placement-rules.js` defining how `yarn.scheduler.placement-rules` (or similar properties) should be displayed and edited (e.g., as a raw text area, or a structured form if the rules have a known format).
- **Model (`SchedulerConfigModel.js`):**
    - Ensure `loadSchedulerConfig` correctly parses and stores placement rule properties into `_globalConfig` or a dedicated map.
    - The `_pendingChanges.globalUpdates` mechanism can be used to stage changes to placement rule properties.
- **View (`PlacementRulesView.js`):**
    - Renders an editable area (e.g., a textarea or a more structured component) for placement rules.
    - Gets current rules from `SchedulerConfigModel` (via Controller).
    - Emits `savePlacementRulesClicked` with the new rules content.
- **Controller (`MainController.js`):**
    - `handleSavePlacementRules(newRulesContent)`: Stages the update to `SchedulerConfigModel` via `stageGlobalUpdate`.
    - When the tab is active, it calls `placementRulesView.render(schedulerConfigModel.getPlacementRules())`.

This guide should provide a clear path for future development and maintenance of the YARN Scheduler UI.

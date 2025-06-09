# YARN Capacity Scheduler UI: Final Developer Specification (v2)

## 1. Overview & Project Goal

The goal is to create a web-based UI application for editing the YARN Capacity Scheduler configuration. The application will provide a rich, interactive visualization of the queue hierarchy and a robust change management system, enabling administrators to modify, validate, and apply configuration changes safely and intuitively. This specification is based on the REST APIs detailed in the `capacity-scheduler-configuration-reference.md` document.

---

## 2. Core Architecture & Data Handling

### 2.1. Data Fetching (Hybrid Approach)
The application will load its initial state using a hybrid approach to ensure both structural integrity and configuration accuracy:
* **Step 1: Fetch Structure**: Make a `GET /scheduler` request to fetch the complete queue hierarchy as a pre-parsed JSON tree. This provides the parent-child relationships for all queues.
* **Step 2: Fetch Raw Configuration**: Make a `GET /scheduler-conf` request to fetch the raw, as-configured key-value pairs. This is the source of truth for all editable values.
* **Step 3: Hydrate the Tree**: Traverse the raw key-value pairs from `GET /scheduler-conf` and populate, or "hydrate," the queue tree structure obtained from `GET /scheduler` with these precise, editable values.
* **Node Label Data**: The global list of defined node labels will be fetched from `GET /get-node-labels`. The mapping of nodes to labels will be fetched from `GET /get-node-to-labels`.

### 2.2. Data Parsing & Modeling
* **Metadata-Driven Parsing**: The parsing logic will use a developer-maintained metadata file to distinguish between "known" and "unknown" properties.
* **Queue Object Model**: Each `Queue` object in memory will contain:
  * `path`: The unique full path of the queue (e.g., `root.production`).
  * `parent`, `children`: References to parent and child `Queue` objects.
  * `properties`: A `Map` to store parsed values for "known" properties as defined in the metadata file.
  * `custom_properties`: A flexible key-value map to store all configuration properties found for this queue that are *not* defined as "known" in the metadata file.

### 2.3. Change Management System
* This system applies to the **Queue Editor**, **Global Settings**, and **Placement Rules** tabs.
* **Staging**: All modifications are first "staged" within the application's state and are not sent to the server immediately.
* **Bottom Bar UI**: A persistent bar at the bottom of the screen will appear when changes are staged, displaying the change count, validation status, and buttons to "Review Changes" and "Apply Changes".
* **Undo/Redo**: The system will support both global, chronological undo/redo and the ability to revert individual changes from the review modal.

### 2.4. API Submission (JSON Payload)
* When "Apply Changes" is clicked, the application will generate a single JSON object payload.
* This object will be sent via a `PUT /scheduler-conf` request.
* The JSON object will contain up to four top-level keys, populated based on the staged changes: `add-queue`, `update-queue`, `remove-queue`, and `global-updates`.

---

## 3. Component Specification

### 3.1. Tab 1: Queue Editor
* **Canvas**: A left-to-right, pannable, and zoomable interactive tree. Features will include node collapse/expand, a minimap, and optional virtual rendering for performance.
* **Interaction**: Queues are added/deleted via a right-click context menu or a button on the queue-card. Cards will have visual indicators for "dirty" (staged changes) and "error" (validation failed) states.
* **Global Node Label Filter**: A dropdown menu above the canvas will allow the user to view the queue tree through the context of a specific node label partition, filtering the tree and re-mapping the displayed capacities on each card to the label-specific values.

### 3.2. Tab 2: Queue Edit Modal
* **Structure**: A modal window with dedicated tabs for `General Properties`, `Node Labels`, and `Auto Queue Creation`.
* **Metadata-Driven Forms**: The input fields displayed in the `General Properties` tab will be dynamically generated based on a developer-maintained metadata file. This file will define each property's key, data type (for rendering toggles/dropdowns), and tooltip description.
* **Advanced Properties Section**: The modal will include a separate area for "Advanced Properties". This section will display all key-value pairs from the queue's `custom_properties` map, allowing users to add, update, or remove them directly.
* **Node Labels Tab**: Provides a specialized UI for assigning labels to the queue (e.g., `accessible-node-labels`) and setting their per-label capacities (e.g., `accessible-node-labels.gpu.capacity`).
* **Auto Queue Creation Tab**: A context-aware UI that presents the correct auto-creation options (Legacy vs. Flexible V2) based on the global `legacy-queue-mode` setting and the queue's capacity type.

### 3.3. Tab 3: Global Settings Editor
* Presents non-queue-specific scheduler properties (e.g., `yarn.scheduler.capacity.maximum-applications`), grouped logically. The visibility and editor type for these properties will also be driven by a developer-maintained metadata file.
* Fully integrated with the main change management system.

### 3.4. Tab 4: Placement Rules Editor
* Provides a JSON editor with syntax highlighting to edit `yarn.scheduler.capacity.queue-mappings` or other placement rule properties, submitted via the `global-updates` key.
* Fully integrated with the main change management system.

### 3.5. Tab 5: Node Management Tab
* **Standalone Utility**: This tab functions independently and does **not** use the main change management system. Actions are immediate and atomic.
* **Section 1: Cluster Label Management**:
  * **UI**: A table listing all labels in the cluster, fetched from `GET /get-node-labels`.
  * **Actions**: "Add" and "Remove" buttons that trigger `POST /add-node-labels` and `POST /remove-node-labels` respectively. Removal will be prevented by a client-side check if the label is in use by any queue.
* **Section 2: Node-to-Label Assignments**:
  * **UI**: A table listing all cluster nodes and their currently assigned labels, fetched from `GET /get-node-to-labels`.
  * **Actions**: An "Edit" button on each node's row will open a dialog with a checklist of all available cluster labels. Saving will trigger a `POST /nodes/{nodeId}/replace-labels` API call.

---

## 4. Error Handling

* **Client-Side Validation**: A real-time validation engine will run on staged changes, checking against rules derived from the specification (e.g., sum of capacities must be 100%, queue must be `STOPPED` before removal).
* **Error Presentation**: Validation failures will be indicated by red highlights on queue-cards, a summary message in the bottom bar, and detailed tooltips on the specific invalid fields in the "Review Changes" modal.
* **API Error Handling**: If the `PUT /scheduler-conf` or any other API call fails (e.g., HTTP 400 Bad Request), the application will display the specific error message from the API's JSON error response body to the user. For batched changes, the user's staged changes will remain so they can correct the issue.

---

## 5. Testing Plan

* **Unit Testing**:
  * Test the data hydration logic that combines the outputs of `/scheduler` and `/scheduler-conf`.
  * Test the JSON payload generator for the `PUT /scheduler-conf` endpoint.
  * Write isolated tests for all client-side validation rules.
* **Integration Testing**:
  * Test the full hybrid data loading flow.
  * Test the metadata-driven UI by adding a new property to the metadata file and verifying that the correct UI input appears in the edit modal without code changes.
  * Test the interaction between the Global Settings tab and the conditional UI in the Queue Edit Modal.
  * Verify that the change management system correctly stages and batches changes into the final JSON payload.
* **End-to-End Testing**:
  * Simulate full user workflows: loading, modifying queues, changing global settings, seeing validation errors, fixing them, reviewing, and applying successfully.
  * Test the API failure path to ensure server error messages are displayed correctly and staged changes are preserved.
  * Test the immediate add/remove actions in the standalone Node Management tab, including the validation check for removing an in-use label.
* **Performance Testing**:
  * Benchmark canvas rendering performance with a configuration of 1000+ queues, measuring the impact of the optional virtual rendering feature.
Product Requirements Document: YARN Scheduler Dynamic State Store1.0 Overview and Guiding PrinciplesThis document outlines the requirements for a client-side state management system for a React-based UI designed to manage the Apache Hadoop YARN Capacity Scheduler. This system, referred to as the "State Store," will be the single source of truth for all scheduler configuration, metrics, and node information.The design is guided by the following core principles:Simplicity and Directness: The architecture will prioritize minimal abstraction and a clean, intuitive API, avoiding unnecessary boilerplate. We will adhere to KISS (Keep It Simple, Stupid) and YAGNI (You Ain't Gonna Need It) principles.Single Source of Truth: A single, centralized Zustand store will manage the entire application state, providing a predictable and unidirectional data flow.Intelligent Automation: The store will automatically handle complex, dependent operations. This includes rebalancing sibling queue capacities to meet the 100% rule 1 and ensuring queues are in a STOPPED state before removal 1, thus preventing common API errors and simplifying the user experience.Configuration-Driven UI: The UI will be dynamically rendered based on external JSON configuration files. These files will define which YARN properties are editable, their data types, validation rules, and UI representation, decoupling the UI from hardcoded configuration keys.2.0 System Architecture2.1 Technology StackComponentTechnologyRationaleState ManagementZustandA lightweight, hook-based state management library that offers a simple API without the boilerplate of alternatives like Redux.Schema & ValidationZodA TypeScript-first schema declaration and validation library. It provides excellent type inference and a fluent API for defining complex validation rules.Data PersistenceBrowser LocalStorageZustand's persist middleware will be used to save staged changes, allowing users to resume their work across sessions.Property DefinitionsJSON FilesExternal JSON files will define the schema for editable properties, enabling a fully dynamic and maintainable UI.2.2 Data FlowThe system will follow a standard, unidirectional data flow, enhanced with automated side effects and persistence:User Action: The user interacts with a React component (e.g., edits a form field).Store Method Invocation: The component calls a method on the Zustand store (e.g., updateProperty('path.to.capacity', 40)).State Update & Side Effects: The store method updates the state. This may trigger automated side effects, such as validating sibling capacities or staging a dependent property change.Persistence: The persist middleware automatically saves the relevant parts of the updated state (the staged changes) to LocalStorage.React Re-render: Components subscribed to the changed state automatically re-render to reflect the updates.3.0 Core Data Models (TypeScript)3.1 Unified Queue ModelThe QueueNode interface is the primary data structure, merging editable configuration, read-only metrics, and UI state flags into a single, hierarchical model.TypeScriptinterface QueueNode {
// Structural Properties
path: string; // e.g., "root.engineering.dev"
name: string; // e.g., "dev"
children: QueueNode;

// From /scheduler-conf (Editable) [1]
config: {
capacity?: string;
'maximum-capacity'?: string;
state?: 'RUNNING' | 'STOPPED';
'minimum-user-limit-percent'?: string;
'user-limit-factor'?: string;
'accessible-node-labels'?: string;
[key: string]: string | undefined; // For other dynamic properties
};

// From /scheduler (Read-Only) [1]
metrics?: {
usedCapacity: number;
absoluteCapacity: number;
absoluteUsedCapacity: number;
absoluteMaxCapacity: number;
numApplications: number;
resourcesUsed: { memory: number; vCores: number };
};

// UI State Flags
isNew?: boolean;
isDeleted?: boolean;
validationErrors?: Record<string, string>; // Map of property key to error message
}
3.2 Change Tracking ModelsInstead of tracking operations, the store will track individual property changes and node label assignments, providing granular control.TypeScript// Represents a change to a single configuration property
interface PropertyChange {
originalValue: any;
stagedValue: any;
}

// Represents a change to the labels assigned to a cluster node
interface NodeLabelAssignment {
nodeId: string;
originalLabels: string;
stagedLabels: string;
}
3.3 Dynamic Property Definition ModelThis interface defines the structure of the JSON files that drive the UI's form generation.TypeScriptinterface PropertyDefinition {
key: string; // e.g., "capacity"
path: string; // e.g., "yarn.scheduler.capacity.<queue-path>.capacity"
label: string; // e.g., "Queue Capacity"
description: string; // Help text for the UI
type: 'string' | 'number' | 'percentage' | 'boolean' | 'select';

// Zod-compatible validation rules
validation?: {
required?: boolean;
min?: number;
max?: number;
pattern?: string; // Regex for strings
options?: string; // For 'select' type
};

// Hints for the UI rendering layer
ui: {
component: 'input' | 'slider' | 'select' | 'switch';
suffix?: string; // e.g., "%" or "MB"
step?: number; // For sliders
};

defaultValue?: any;
}
4.0 State Store API and ImplementationThe following defines the public interface and core logic of the useYarnSchedulerStore Zustand store.4.1 Store InterfaceTypeScriptinterface YarnSchedulerStore {
// === STATE ===
queueTree: QueueNode | null;
originalConfig: Record<string, string>; // Flat map of original config from /scheduler-conf
propertyChanges: Map<string, PropertyChange>; // Map<full.property.path, change>
propertyDefinitions: PropertyDefinition;
nodes: Map<string, NodeInfo>; // From /nodes API
nodeLabelChanges: Map<string, NodeLabelAssignment>; // Map<nodeId, assignment>
loading: boolean;
error: string | null;
commitStatus: 'idle' | 'committing' | 'success' | 'error';
commitError: string | null;

// === ACTIONS ===
loadInitialData: () => Promise<void>;
updateProperty: (propertyPath: string, value: any) => void;
addQueue: (parentPath: string, name: string, initialCapacity: number) => void;
removeQueue: (queuePath: string) => void;
commitChanges: () => Promise<void>;
revertAllChanges: () => void;
assignNodeLabel: (nodeId: string, label: string) => void;
removeNodeLabel: (nodeId: string, label: string) => void;

// === COMPUTED SELECTORS ===
hasChanges: () => boolean;
getQueueByPath: (path: string) => QueueNode | null;
getPropertyValue: (path: string) => { original: any; staged: any; isDirty: boolean };
getFilteredTreeByLabel: (label: string | null) => QueueNode | null;
}
4.2 Core Action LogicloadInitialData(): Sets loading to true. Fetches property definitions from JSON files, then fetches /scheduler-conf, /scheduler, and /nodes information in parallel. On success, it parses the data, builds the unified queueTree, and populates the state. On failure, it sets the error message.addQueue(parentPath, name, initialCapacity):Creates a new QueueNode with isNew: true.Adds the new node to its parent's children array in the queueTree.Stages the new queue's properties (e.g., capacity) in the propertyChanges map.Automatic Rebalancing: Calculates the remaining capacity for sibling queues and automatically stages updateProperty changes for them to ensure the sum remains 100%, as required by the API. 1removeQueue(queuePath):Finds the target QueueNode in the queueTree.Automatic State Change: Checks if queue.config.state is RUNNING. If so, it automatically stages a property change to set the state to STOPPED, fulfilling the API precondition for removal. 1Sets the isDeleted: true flag on the queue node.Automatic Rebalancing: Re-calculates and stages capacity updates for the remaining active siblings to reclaim the deleted queue's capacity.commitChanges():Sets commitStatus to 'committing'.Calls a generateUpdatePayload() utility function. This function iterates through the propertyChanges map and traverses the queueTree to find isNew and isDeleted nodes.It constructs the final XML payload with the appropriate <add-queue>, <update-queue>, and <remove-queue> elements as defined in the mutation API. 1Sends the payload via a PUT request to /ws/v1/cluster/scheduler-conf. 1On success, it clears propertyChanges and triggers loadInitialData() to refresh the state.On failure (e.g., HTTP 400), it sets commitStatus to 'error' and stores the error message from the server, preserving the staged changes for user correction. 15.0 Advanced Features and Selectors5.1 Handling Auto-Queue Creation TemplatesThe system is designed to handle dynamic template properties for auto-created queues without requiring special logic in the store.Mechanism: YARN configures auto-created queues via properties on a parent queue, such as yarn.scheduler.capacity.<queue-path>.leaf-queue-template.capacity.Implementation:These template properties are defined in the external PropertyDefinition JSON files.The UI renders the appropriate editor fields for these properties when viewing a parent queue.Any changes are staged using the generic updateProperty action.The generateUpdatePayload function includes these as standard key-value pairs in the parent queue's <update-queue> parameters, which is the exact format the YARN API expects. 15.2 Handling Node Labels and CapacitiesThe store manages the two-part process of assigning node labels to queues and configuring their specific capacities.Mechanism: A queue is granted access to a label via the accessible-node-labels property. Its capacity for that label is then set with a dynamic key like accessible-node-labels.gpu.capacity. 1Implementation:The accessible-node-labels property is defined in the PropertyDefinition files, likely rendered as a multi-select input.The UI will monitor the staged value of this property. When a new label (e.g., "gpu") is added, the UI will dynamically render a new input field for "GPU Label Capacity".This new field is bound to the dynamic property path (...accessible-node-labels.gpu.capacity), and changes are staged using the same generic updateProperty action.The commitChanges action bundles all these related properties into a single, transactionally-safe <update-queue> request. 15.3 Selector for Label-Based FilteringTo provide the UI with a filtered view based on a selected node label, a specialized selector will be implemented.Selector: getFilteredTreeByLabel(selectedLabel: string | null)Logic: This function will compute a new, temporary queue tree for display purposes without altering the original state.It takes a label (e.g., "gpu") as input. If the label is null, it returns the default, unfiltered tree.It recursively traverses the main queueTree.For each queue, it checks if the queue's accessible-node-labels property contains the selectedLabel.It filters out any node that does not have access to the label, unless it is a parent to a descendant that does.Capacity Override: For each queue in the returned filtered tree that has direct access to the label, the selector will override its config.capacity value with the label-specific capacity (e.g., the value from ...accessible-node-labels.gpu.capacity). 1Result: The UI can call this selector to get a view of the queue hierarchy that is relevant to a specific node label, with all capacity values correctly reflecting the label-specific configurations. This provides a powerful and intuitive way for administrators to manage labeled resources.

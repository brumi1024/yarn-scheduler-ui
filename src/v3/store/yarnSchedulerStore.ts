import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { buildQueueTree, getQueuePrefix } from './utils/dataTransformers';
import type { SchedulerResponse, ConfigurationResponse } from './schemas/apiSchemas';
import { SchedulerResponseSchema, ConfigurationResponseSchema } from './schemas/apiSchemas';
import type {
    QueueNode,
    PropertyChange,
    NodeLabelAssignment,
    PropertyDefinition,
    NodeInfo,
    CommitStatus,
} from './types';

export interface YarnSchedulerStore {
    // Core state - no queueTree as it's now derived
    originalConfig: Record<string, string>;
    propertyChanges: Map<string, PropertyChange>;
    propertyDefinitions: PropertyDefinition[];
    nodes: Map<string, NodeInfo>;
    nodeLabelChanges: Map<string, NodeLabelAssignment>;
    loading: boolean;
    error: string | null;
    commitStatus: CommitStatus;
    commitError: string | null;
    metrics?: SchedulerResponse;

    // Actions
    loadInitialData: (params: {
        configEndpoint: string | (() => Promise<Record<string, string>>);
        metricsEndpoint?: string | (() => Promise<SchedulerResponse>);
        nodesEndpoint?: string | (() => Promise<NodeInfo[]>);
    }) => Promise<void>;
    updateProperty: (propertyPath: string, value: unknown) => void;
    addQueue: (parentPath: string, name: string, initialCapacity: number) => void;
    removeQueue: (queuePath: string) => void;
    commitChanges: () => Promise<void>;
    revertAllChanges: () => void;
    assignNodeLabel: (nodeId: string, label: string) => void;
    removeNodeLabel: (nodeId: string, label: string) => void;

    // Queries
    hasChanges: () => boolean;
    getQueueByPath: (path: string) => QueueNode | null;
    getPropertyValue: (path: string) => { original: unknown; staged: unknown; isDirty: boolean };

    // State setters
    setOriginalConfig: (config: Record<string, string>) => void;
    setNodes: (nodes: Map<string, NodeInfo>) => void;
    reset: () => void;
}

const getInitialState = () => ({
    originalConfig: {},
    propertyChanges: new Map(),
    propertyDefinitions: [],
    nodes: new Map(),
    nodeLabelChanges: new Map(),
    loading: false,
    error: null,
    commitStatus: 'idle' as CommitStatus,
    commitError: null,
    metrics: undefined,
});

export const useYarnSchedulerStore = create<YarnSchedulerStore>()(
    devtools(
        subscribeWithSelector((set, get) => ({
            ...getInitialState(),

            loadInitialData: async (params) => {
                const { configEndpoint, metricsEndpoint, nodesEndpoint } = params;

                set({ loading: true, error: null });

                try {
                    // Fetch configuration
                    let config: Record<string, string> = {};
                    if (typeof configEndpoint === 'string') {
                        const response = await fetch(configEndpoint);
                        if (!response.ok) {
                            throw new Error(`Failed to fetch configuration: ${response.statusText}`);
                        }
                        const data: ConfigurationResponse = await response.json();

                        // Validate response
                        const validatedData = ConfigurationResponseSchema.parse(data);

                        // Convert from array format to flat object
                        config = validatedData.property.reduce(
                            (acc, prop) => {
                                acc[prop.name] = prop.value;
                                return acc;
                            },
                            {} as Record<string, string>
                        );
                    } else {
                        config = await configEndpoint();
                    }

                    // Fetch metrics if provided
                    let metrics: SchedulerResponse | undefined;
                    if (metricsEndpoint) {
                        if (typeof metricsEndpoint === 'string') {
                            const response = await fetch(metricsEndpoint);
                            if (!response.ok) {
                                throw new Error(`Failed to fetch metrics: ${response.statusText}`);
                            }
                            const data = await response.json();
                            metrics = SchedulerResponseSchema.parse(data);
                        } else {
                            metrics = await metricsEndpoint();
                        }
                    }

                    // Fetch nodes if provided
                    let nodeMap = new Map<string, NodeInfo>();
                    if (nodesEndpoint) {
                        if (typeof nodesEndpoint === 'string') {
                            const response = await fetch(nodesEndpoint);
                            if (!response.ok) {
                                throw new Error(`Failed to fetch nodes: ${response.statusText}`);
                            }
                            const nodes: NodeInfo[] = await response.json();
                            nodeMap = new Map(nodes.map((node) => [node.id, node]));
                        } else {
                            const nodes = await nodesEndpoint();
                            nodeMap = new Map(nodes.map((node) => [node.id, node]));
                        }
                    }

                    // Update store state
                    set({
                        originalConfig: config,
                        metrics,
                        nodes: nodeMap,
                        loading: false,
                        error: null,
                        propertyChanges: new Map(),
                        nodeLabelChanges: new Map(),
                    });
                } catch (error) {
                    set({
                        loading: false,
                        error: error instanceof Error ? error.message : 'An unknown error occurred',
                        originalConfig: {},
                        nodes: new Map(),
                        metrics: undefined,
                    });
                    throw error;
                }
            },

            updateProperty: (propertyPath: string, value: unknown) => {
                const { originalConfig, propertyChanges } = get();
                const originalValue = originalConfig[propertyPath];

                if (value === originalValue) {
                    propertyChanges.delete(propertyPath);
                } else {
                    propertyChanges.set(propertyPath, {
                        originalValue,
                        stagedValue: value,
                    });
                }

                set({ propertyChanges: new Map(propertyChanges) });
            },

            addQueue: (parentPath: string, name: string, initialCapacity: number) => {
                const { propertyChanges, originalConfig } = get();

                const queuePath = `${parentPath}.${name}`;
                const queuePrefix = getQueuePrefix(queuePath);

                // Update the parent's 'queues' property to include the new child
                const parentQueuesPath = `${getQueuePrefix(parentPath)}.queues`;
                const currentQueues = originalConfig[parentQueuesPath] || '';
                const childNames = currentQueues ? currentQueues.split(',').map((q) => q.trim()) : [];

                if (!childNames.includes(name)) {
                    childNames.push(name);
                    propertyChanges.set(parentQueuesPath, {
                        originalValue: originalConfig[parentQueuesPath] || currentQueues,
                        stagedValue: childNames.join(','),
                    });
                }

                // Add all necessary initial properties for the new queue
                // Set capacity
                propertyChanges.set(`${queuePrefix}.capacity`, {
                    originalValue: undefined,
                    stagedValue: String(initialCapacity),
                });

                // Set default state
                propertyChanges.set(`${queuePrefix}.state`, { originalValue: undefined, stagedValue: 'RUNNING' });

                // Set other default properties that YARN expects
                propertyChanges.set(`${queuePrefix}.maximum-capacity`, {
                    originalValue: undefined,
                    stagedValue: '100',
                });

                set({ propertyChanges: new Map(propertyChanges) });
            },

            removeQueue: (queuePath: string) => {
                const { propertyChanges, originalConfig } = get();

                // Find parent path to update parent's queues property
                const parentPath = queuePath.includes('.') ? queuePath.substring(0, queuePath.lastIndexOf('.')) : null;
                const queueName = queuePath.substring(queuePath.lastIndexOf('.') + 1);

                // Mark all queue properties for deletion
                const queuePrefix = getQueuePrefix(queuePath);

                // Helper to mark queue and children for deletion
                const markQueueForDeletion = (prefix: string) => {
                    Object.keys(originalConfig).forEach((key) => {
                        if (key.startsWith(prefix + '.')) {
                            // If property belongs to this queue or its children
                            const relativePath = key.substring(prefix.length + 1);
                            const isDirectProperty = !relativePath.includes('.') || relativePath.startsWith('queues');

                            if (isDirectProperty || key.includes(`${prefix}.`)) {
                                propertyChanges.set(key, {
                                    originalValue: originalConfig[key],
                                    stagedValue: undefined, // Mark for deletion
                                });
                            }
                        }
                    });
                };

                // Mark the queue and all its children for deletion
                markQueueForDeletion(queuePrefix);

                // For each potential child queue, mark it for deletion too
                const queuesStr = originalConfig[`${queuePrefix}.queues`];
                if (queuesStr) {
                    const childQueues = queuesStr.split(',').map((s) => s.trim());
                    childQueues.forEach((childName) => {
                        const childPath = `${queuePath}.${childName}`;
                        const childPrefix = getQueuePrefix(childPath);
                        markQueueForDeletion(childPrefix);
                    });
                }

                // If queue is running, ensure it's stopped first
                const statePath = `${queuePrefix}.state`;
                const currentState = originalConfig[statePath] || 'RUNNING';
                if (currentState === 'RUNNING') {
                    propertyChanges.set(statePath, {
                        originalValue: currentState,
                        stagedValue: 'STOPPED',
                    });
                }

                // Update parent's queues property to remove this queue
                if (parentPath) {
                    const parentQueuesPath = `${getQueuePrefix(parentPath)}.queues`;
                    const currentQueues = originalConfig[parentQueuesPath] || '';
                    const childNames = currentQueues
                        .split(',')
                        .map((q) => q.trim())
                        .filter((q) => q && q !== queueName);

                    propertyChanges.set(parentQueuesPath, {
                        originalValue: currentQueues,
                        stagedValue: childNames.join(','),
                    });
                }

                set({ propertyChanges: new Map(propertyChanges) });
            },

            commitChanges: async () => {
                const { propertyChanges, originalConfig } = get();

                set({ commitStatus: 'committing', commitError: null });

                try {
                    // Group changes by queue path
                    const queueChanges = new Map<
                        string,
                        {
                            isNew: boolean;
                            isDeleted: boolean;
                            properties: Map<string, string | undefined>;
                        }
                    >();

                    // Analyze changes
                    propertyChanges.forEach((change, path) => {
                        const match = path.match(/^yarn\.scheduler\.capacity\.([^.]+(?:\.[^.]+)*?)\.([^.]+)$/);
                        if (match) {
                            const [, queuePath, property] = match;

                            if (!queueChanges.has(queuePath)) {
                                // Determine if this is a new queue (no original properties exist)
                                const queuePrefix = getQueuePrefix(queuePath);
                                const hasOriginalProperties = Object.keys(originalConfig).some((key) =>
                                    key.startsWith(queuePrefix + '.')
                                );

                                queueChanges.set(queuePath, {
                                    isNew: !hasOriginalProperties,
                                    isDeleted: false,
                                    properties: new Map(),
                                });
                            }

                            const queueChange = queueChanges.get(queuePath)!;
                            queueChange.properties.set(property, change.stagedValue);

                            // Check if queue is marked for deletion (all properties undefined)
                            if (change.stagedValue === undefined) {
                                const allPropertiesDeleted = Array.from(queueChange.properties.values()).every(
                                    (value) => value === undefined
                                );
                                if (allPropertiesDeleted) {
                                    queueChange.isDeleted = true;
                                }
                            }
                        }
                    });

                    // Build API payload
                    const apiPayload = {
                        'update-queue': [] as Array<{ 'queue-name': string; params: Record<string, string> }>,
                        'add-queue': [] as Array<{ 'queue-name': string; params: Record<string, string> }>,
                        'remove-queue': [] as string[],
                    };

                    queueChanges.forEach((queueChange, queuePath) => {
                        if (queueChange.isDeleted) {
                            apiPayload['remove-queue'].push(queuePath);
                        } else {
                            const params: Record<string, string> = {};
                            queueChange.properties.forEach((value, property) => {
                                if (value !== undefined) {
                                    params[property] = value;
                                }
                            });

                            if (Object.keys(params).length > 0) {
                                if (queueChange.isNew) {
                                    apiPayload['add-queue'].push({
                                        'queue-name': queuePath,
                                        params,
                                    });
                                } else {
                                    apiPayload['update-queue'].push({
                                        'queue-name': queuePath,
                                        params,
                                    });
                                }
                            }
                        }
                    });

                    // Remove empty arrays from payload
                    const cleanPayload: Record<string, unknown> = {};
                    Object.entries(apiPayload).forEach(([key, value]) => {
                        if (Array.isArray(value) && value.length > 0) {
                            cleanPayload[key] = value;
                        }
                    });

                    // TODO: Make actual API call here
                    // console.log('Committing changes:', cleanPayload);
                    await new Promise((resolve) => setTimeout(resolve, 100));

                    // Clear changes on success
                    set({
                        commitStatus: 'success',
                        propertyChanges: new Map(),
                        nodeLabelChanges: new Map(),
                    });
                } catch (error) {
                    set({
                        commitStatus: 'error',
                        commitError: error instanceof Error ? error.message : 'Failed to commit changes',
                    });
                }
            },

            revertAllChanges: () => {
                set({
                    propertyChanges: new Map(),
                    nodeLabelChanges: new Map(),
                });
            },

            assignNodeLabel: (nodeId: string, label: string) => {
                const { nodes, nodeLabelChanges } = get();
                const node = nodes.get(nodeId);

                if (!node) return;

                const originalLabels = node.nodeLabels || [];
                const existingChange = nodeLabelChanges.get(nodeId);
                const currentLabels = existingChange?.stagedLabels || originalLabels;

                if (!currentLabels.includes(label)) {
                    nodeLabelChanges.set(nodeId, {
                        nodeId,
                        originalLabels,
                        stagedLabels: [...currentLabels, label],
                    });

                    set({ nodeLabelChanges: new Map(nodeLabelChanges) });
                }
            },

            removeNodeLabel: (nodeId: string, label: string) => {
                const { nodes, nodeLabelChanges } = get();
                const node = nodes.get(nodeId);

                if (!node) return;

                const currentLabels = node.nodeLabels || [];
                const stagedLabels = currentLabels.filter((l) => l !== label);

                if (stagedLabels.length !== currentLabels.length) {
                    nodeLabelChanges.set(nodeId, {
                        nodeId,
                        originalLabels: currentLabels,
                        stagedLabels,
                    });

                    set({ nodeLabelChanges: new Map(nodeLabelChanges) });
                }
            },

            hasChanges: () => {
                const { propertyChanges, nodeLabelChanges } = get();
                return propertyChanges.size > 0 || nodeLabelChanges.size > 0;
            },

            getQueueByPath: (path: string) => {
                // Build the effective tree from current config + changes
                const config = { ...get().originalConfig };
                get().propertyChanges.forEach((change, propPath) => {
                    if (change.stagedValue !== undefined) {
                        config[propPath] = String(change.stagedValue);
                    }
                });

                const tree = buildQueueTree(config, get().metrics);

                const findQueue = (node: QueueNode | null, targetPath: string): QueueNode | null => {
                    if (!node) return null;
                    if (node.path === targetPath) return node;

                    for (const child of node.children) {
                        const found = findQueue(child, targetPath);
                        if (found) return found;
                    }

                    return null;
                };

                return findQueue(tree, path);
            },

            getPropertyValue: (path: string) => {
                const { originalConfig, propertyChanges } = get();
                const change = propertyChanges.get(path);
                const original = originalConfig[path];

                return {
                    original,
                    staged: change?.stagedValue ?? original,
                    isDirty: propertyChanges.has(path),
                };
            },

            setOriginalConfig: (config: Record<string, string>) => set({ originalConfig: config }),
            setNodes: (nodes: Map<string, NodeInfo>) => set({ nodes }),

            reset: () => set(getInitialState()),
        })),
        {
            name: 'yarn-scheduler-store',
        }
    )
);

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { nanoid } from 'nanoid';

enableMapSet();
import type {
    SchedulerInfo,
    QueueInfo,
    ConfigProperty,
    StagedChange,
    SchedConfUpdateInfo,
    NodeLabel,
    NodeInfo,
    NodeToLabelMapping,
    VersionResponse,
} from '../types';
import {
    buildPropertyKey,
    buildGlobalPropertyKey,
    buildNodeLabelPropertyKey,
} from '../utils/propertyUtils';
import { buildMutationRequest } from '../utils/mutationBuilder';
import { YarnApiClient } from '../api/YarnApiClient';
import {
    createStoreError,
    ERROR_CODES,
    extractErrorMessage,
    isNetworkError,
    createDetailedErrorMessage
} from '../utils/errorUtils';
import { isValidQueueName } from '../types/guards';
export type SchedulerStore = {
    apiClient: YarnApiClient;

    schedulerData: SchedulerInfo | null;
    configData: Map<string, string>;

    nodeLabels: NodeLabel[];
    nodes: NodeInfo[];
    nodeToLabels: NodeToLabelMapping[];
    stagedChanges: StagedChange[];
    selectedNodeLabel: string | null;
    selectedQueuePath: string | null;
    comparisonQueues: string[];
    configVersion: number;
    isLoading: boolean;
    error: string | null;

    isPropertyPanelOpen: boolean;

    loadInitialData: () => Promise<void>;
    refreshSchedulerData: () => Promise<void>;
    stageQueueChange: (queuePath: string, property: string, value: string) => void;
    stageGlobalChange: (property: string, value: string) => void;
    stageQueueAddition: (parentPath: string, queueName: string, config: Record<string, string>) => void;
    stageQueueRemoval: (queuePath: string) => void;
    stageLabelQueueChange: (queuePath: string, label: string, property: string, value: string) => void;
    applyChanges: () => Promise<void>;
    revertChange: (changeId: string) => void;
    clearAllChanges: () => void;
    selectNodeLabel: (label: string | null) => void;
    selectQueue: (queuePath: string | null) => void;
    toggleComparisonQueue: (queuePath: string) => void;
    setPropertyPanelOpen: (isOpen: boolean) => void;

    // Direct node label operations (not staged)
    addNodeLabel: (name: string, exclusivity: boolean) => Promise<void>;
    removeNodeLabel: (name: string) => Promise<void>;
    assignNodeToLabel: (nodeId: string, labelName: string | null) => Promise<void>;

    getQueueConfiguredCapacity: (queuePath: string) => string;
    // TODO rename these
    getQueueDisplayValue: (queuePath: string, property: string) => { value: string; isStaged: boolean };
    getGlobalDisplayValue: (property: string) => { value: string; isStaged: boolean };
    getLabelChangesForQueue: (queuePath: string, label: string) => StagedChange[];
    getQueueByPath: (queuePath: string) => QueueInfo | null;
    getChildQueues: (parentPath: string) => QueueInfo[];
    hasUnsavedChanges: () => boolean;
    getChangesForQueue: (queuePath: string) => StagedChange[];
    getStagedChangeById: (changeId: string) => StagedChange | undefined;
};


/**
 * Helper function to normalize node labels from API response
 * Ensures exclusivity defaults to true if not specified (YARN default)
 */
function normalizeNodeLabels(nodeLabelsInfo?: { name: string; exclusivity?: boolean; partitionName?: string }[]): NodeLabel[] {
    return (nodeLabelsInfo || []).map(label => ({
        ...label,
        exclusivity: label.exclusivity ?? true // Default to exclusive if not specified
    }));
}

export function traverseQueueTree(
    queueInfo: QueueInfo,
    configData: Map<string, string>,
    visitor: (queue: QueueInfo & { configured: Record<string, string> }) => void
): void {
    const configured: Record<string, string> = {};

    const prefix = `yarn.scheduler.capacity.${queueInfo.queuePath}.`;
    for (const [key, value] of configData.entries()) {
        if (key.startsWith(prefix)) {
            const property = key.substring(prefix.length);
            configured[property] = value;
        }
    }

    const combinedQueue = {
        ...queueInfo,
        configured,
    };

    visitor(combinedQueue);

    if (queueInfo.queues?.queue) {
        const children = Array.isArray(queueInfo.queues.queue)
            ? queueInfo.queues.queue
            : [queueInfo.queues.queue];

        for (const child of children) {
            traverseQueueTree(child, configData, visitor);
        }
    }
}


const createStoreImplementation = (apiClient: YarnApiClient) =>
    immer<SchedulerStore>((set, get) => ({
            apiClient,

            schedulerData: null,
            configData: new Map(),

            nodeLabels: [],
            nodes: [],
            nodeToLabels: [],
            stagedChanges: [],
            selectedNodeLabel: null,
            selectedQueuePath: null,
            comparisonQueues: [],
            configVersion: 0,
            isLoading: false,
            error: null,
            isPropertyPanelOpen: false,

            loadInitialData: async () => {
                set((state) => {
                    state.isLoading = true;
                    state.error = null;
                });

                try {
                    const [scheduler, config, labels, nodes, nodeToLabels, version] = await Promise.all([
                        get().apiClient.getScheduler(),
                        get().apiClient.getSchedulerConf(),
                        get().apiClient.getNodeLabels(),
                        get().apiClient.getNodes(),
                        get().apiClient.getNodeToLabels(),
                        get().apiClient.getSchedulerConfVersion(),
                    ]);

                    set((state) => {
                        state.schedulerData = scheduler.scheduler.schedulerInfo;

                        state.configData = new Map(
                            config.property.map((p: ConfigProperty) => [p.name, p.value])
                        );

                        state.nodeLabels = normalizeNodeLabels(labels.nodeLabelsInfo?.nodeLabelInfo);
                        state.nodes = nodes.nodes?.node || [];
                        state.nodeToLabels = nodeToLabels.nodeToLabelsInfo?.nodeToLabels || [];
                        state.configVersion = version.versionID;
                        state.isLoading = false;
                    });
                } catch (error) {
                    const errorMessage = createDetailedErrorMessage('load initial data', error);

                    set((state) => {
                        state.error = errorMessage;
                        state.isLoading = false;
                    });

                    throw createStoreError(
                        isNetworkError(error) ? ERROR_CODES.NETWORK_ERROR : ERROR_CODES.LOAD_INITIAL_DATA_FAILED,
                        errorMessage,
                        error
                    );
                }
            },

            refreshSchedulerData: async () => {
                set((state) => {
                    state.isLoading = true;
                    state.error = null;
                });

                try {
                    const scheduler = await get().apiClient.getScheduler();

                    set((state) => {
                        state.schedulerData = scheduler.scheduler.schedulerInfo;

                        state.isLoading = false;
                    });
                } catch (error) {
                    const errorMessage = createDetailedErrorMessage('refresh scheduler data', error);

                    set((state) => {
                        state.error = errorMessage;
                        state.isLoading = false;
                    });

                    throw createStoreError(
                        isNetworkError(error) ? ERROR_CODES.NETWORK_ERROR : ERROR_CODES.REFRESH_SCHEDULER_FAILED,
                        errorMessage,
                        error
                    );
                }
            },

            stageQueueChange: (queuePath, property, value) => {
                if (!queuePath || !queuePath.startsWith('root')) {
                    throw createStoreError(
                        ERROR_CODES.INVALID_QUEUE_PATH,
                        `Invalid queue path: ${queuePath}. Queue paths must start with 'root'`
                    );
                }

                if (!property || property.trim() === '') {
                    throw createStoreError(
                        ERROR_CODES.INVALID_PROPERTY_NAME,
                        'Property name cannot be empty'
                    );
                }

                set((state) => {
                    const propertyKey = buildPropertyKey(queuePath, property);

                    const existingIndex = state.stagedChanges.findIndex(
                        (c) => c.queuePath === queuePath && c.property === property
                    );

                    if (existingIndex >= 0) {
                        state.stagedChanges[existingIndex].newValue = value;
                    } else {
                        const change: StagedChange = {
                            id: nanoid(),
                            type: 'update',
                            queuePath,
                            property,
                            oldValue: state.configData.get(propertyKey),
                            newValue: value,
                            timestamp: Date.now(),
                        };
                        state.stagedChanges.push(change);
                    }
                });
            },

            stageGlobalChange: (property, value) => {
                set((state) => {
                    const propertyKey = buildGlobalPropertyKey(property);

                    const existingIndex = state.stagedChanges.findIndex(
                        (c) => c.queuePath === 'global' && c.property === property
                    );

                    if (existingIndex >= 0) {
                        state.stagedChanges[existingIndex].newValue = value;
                    } else {
                        const change: StagedChange = {
                            id: nanoid(),
                            type: 'update',
                            queuePath: 'global',
                            property,
                            oldValue: state.configData.get(propertyKey),
                            newValue: value,
                            timestamp: Date.now(),
                        };
                        state.stagedChanges.push(change);
                    }
                });
            },

            stageQueueAddition: (parentPath, queueName, config) => {
                if (!parentPath || !parentPath.startsWith('root')) {
                    throw createStoreError(
                        ERROR_CODES.INVALID_QUEUE_PATH,
                        `Invalid parent path: ${parentPath}. Queue paths must start with 'root'`
                    );
                }

                if (!isValidQueueName(queueName)) {
                    throw createStoreError(
                        ERROR_CODES.INVALID_QUEUE_NAME,
                        `Invalid queue name: ${queueName}. Queue names must be alphanumeric with hyphens or underscores only, and cannot contain dots.`
                    );
                }

                if (!config || Object.keys(config).length === 0) {
                    throw createStoreError(
                        ERROR_CODES.VALIDATION_ERROR,
                        'Queue configuration cannot be empty'
                    );
                }

                if (!config.capacity) {
                    throw createStoreError(
                        ERROR_CODES.VALIDATION_ERROR,
                        'New queues must have a capacity property'
                    );
                }

                set((state) => {
                    const queuePath = `${parentPath}.${queueName}`;

                    for (const [property, value] of Object.entries(config)) {
                        const change: StagedChange = {
                            id: nanoid(),
                            type: 'add',
                            queuePath,
                            property,
                            oldValue: undefined,
                            newValue: value,
                            timestamp: Date.now(),
                        };
                        state.stagedChanges.push(change);
                    }
                });
            },

            stageQueueRemoval: (queuePath) => {
                set((state) => {
                    const change: StagedChange = {
                        id: nanoid(),
                        type: 'remove',
                        queuePath,
                        property: undefined,
                        oldValue: undefined,
                        newValue: undefined,
                        timestamp: Date.now(),
                    };
                    state.stagedChanges.push(change);
                });
            },

            stageLabelQueueChange: (queuePath, label, property, value) => {
                set((state) => {
                    const fullProperty = `accessible-node-labels.${label}.${property}`;
                    const propertyKey = buildNodeLabelPropertyKey(queuePath, label, property);

                    const existingIndex = state.stagedChanges.findIndex(
                        (c) => c.queuePath === queuePath && c.property === fullProperty
                    );

                    if (existingIndex >= 0) {
                        state.stagedChanges[existingIndex].newValue = value;
                    } else {
                        const change: StagedChange = {
                            id: nanoid(),
                            type: 'update',
                            queuePath,
                            property: fullProperty,
                            oldValue: state.configData.get(propertyKey),
                            newValue: value,
                            timestamp: Date.now(),
                            label,
                        };
                        state.stagedChanges.push(change);
                    }
                });
            },

            applyChanges: async () => {
                const changes = get().stagedChanges;
                if (changes.length === 0) {
                    throw createStoreError(
                        ERROR_CODES.EMPTY_STAGED_CHANGES,
                        'No staged changes to apply'
                    );
                }

                set((state) => {
                    state.isLoading = true;
                    state.error = null;
                });

                try {
                    const request = buildMutationRequest(changes);

                    await get().apiClient.updateSchedulerConf(request);

                    set((state) => {
                        state.stagedChanges = [];
                        state.configVersion = state.configVersion + 1;
                    });

                    await get().loadInitialData();
                } catch (error) {
                    const errorMessage = createDetailedErrorMessage(
                        'apply changes',
                        error,
                        { changeCount: changes.length }
                    );

                    set((state) => {
                        state.error = extractErrorMessage(error);
                        state.isLoading = false;
                    });

                    throw createStoreError(
                        ERROR_CODES.APPLY_CHANGES_FAILED,
                        errorMessage,
                        error
                    );
                }
            },

            revertChange: (changeId) => {
                set((state) => {
                    state.stagedChanges = state.stagedChanges.filter((c) => c.id !== changeId);
                });
            },

            clearAllChanges: () => {
                set((state) => {
                    state.stagedChanges = [];
                });
            },

            selectNodeLabel: (label) => {
                set((state) => {
                    state.selectedNodeLabel = label;
                });
            },

            selectQueue: (queuePath) => {
                set((state) => {
                    if (queuePath !== null) {
                        const queue = get().getQueueByPath(queuePath);
                        if (!queue) {
                            return;
                        }
                    }
                    state.selectedQueuePath = queuePath;
                });
            },

            toggleComparisonQueue: (queuePath) => {
                set((state) => {
                    const index = state.comparisonQueues.indexOf(queuePath);
                    if (index === -1) {
                        state.comparisonQueues.push(queuePath);
                    } else {
                        state.comparisonQueues.splice(index, 1);
                    }
                });
            },

            setPropertyPanelOpen: (isOpen) => {
                set((state) => {
                    state.isPropertyPanelOpen = isOpen;
                });
            },

            // Direct node label operations (immediate API calls, not staged)
            addNodeLabel: async (name, exclusivity) => {
                try {
                    set((state) => {
                        state.isLoading = true;
                        state.error = null;
                    });

                    await get().apiClient.addNodeLabels([{ name, exclusivity }]);

                    // Refresh node labels data to reflect the new label
                    const nodeLabelsResponse = await get().apiClient.getNodeLabels();
                    
                    set((state) => {
                        state.nodeLabels = normalizeNodeLabels(nodeLabelsResponse.nodeLabelsInfo?.nodeLabelInfo);
                        state.isLoading = false;
                    });
                } catch (error) {
                    const errorMessage = extractErrorMessage(error);
                    set((state) => {
                        state.error = `Failed to add node label: ${errorMessage}`;
                        state.isLoading = false;
                    });
                    throw createStoreError(
                        ERROR_CODES.API_ERROR,
                        `Failed to add node label: ${errorMessage}`,
                        error
                    );
                }
            },

            removeNodeLabel: async (name) => {
                try {
                    set((state) => {
                        state.isLoading = true;
                        state.error = null;
                    });

                    await get().apiClient.removeNodeLabels([name]);

                    // Refresh node labels data to reflect the removal
                    const nodeLabelsResponse = await get().apiClient.getNodeLabels();
                    
                    set((state) => {
                        state.nodeLabels = normalizeNodeLabels(nodeLabelsResponse.nodeLabelsInfo?.nodeLabelInfo);
                        state.isLoading = false;
                        
                        // Clear selection if the removed label was selected
                        if (state.selectedNodeLabel === name) {
                            state.selectedNodeLabel = null;
                        }
                    });
                } catch (error) {
                    const errorMessage = extractErrorMessage(error);
                    set((state) => {
                        state.error = `Failed to remove node label: ${errorMessage}`;
                        state.isLoading = false;
                    });
                    throw createStoreError(
                        ERROR_CODES.API_ERROR,
                        `Failed to remove node label: ${errorMessage}`,
                        error
                    );
                }
            },

            assignNodeToLabel: async (nodeId, labelName) => {
                try {
                    set((state) => {
                        state.isLoading = true;
                        state.error = null;
                    });

                    // Get current node-to-label mappings
                    const currentMappings = await get().apiClient.getNodeToLabels();
                    
                    // Convert current mappings to array format and update the specific node
                    const existingMappings = currentMappings.nodeToLabelsInfo?.nodeToLabels || [];
                    const updatedMappings = existingMappings.map((mapping) => {
                        if (mapping.nodeId === nodeId) {
                            return {
                                nodeId,
                                labels: labelName === null ? [] : [labelName]
                            };
                        }
                        return {
                            nodeId: mapping.nodeId,
                            labels: mapping.nodeLabels || []
                        };
                    });
                    
                    // If this is a new node, add it to the mappings
                    if (!existingMappings.some(mapping => mapping.nodeId === nodeId)) {
                        updatedMappings.push({
                            nodeId,
                            labels: labelName === null ? [] : [labelName]
                        });
                    }

                    await get().apiClient.replaceNodeToLabels(updatedMappings);

                    // Refresh node-to-label mappings to reflect the change
                    const refreshedMappings = await get().apiClient.getNodeToLabels();

                    set((state) => {
                        state.nodeToLabels = refreshedMappings.nodeToLabelsInfo?.nodeToLabels || [];
                        state.isLoading = false;
                    });
                } catch (error) {
                    const errorMessage = extractErrorMessage(error);
                    set((state) => {
                        state.error = `Failed to assign node to label: ${errorMessage}`;
                        state.isLoading = false;
                    });
                    throw createStoreError(
                        ERROR_CODES.API_ERROR,
                        `Failed to assign node to label: ${errorMessage}`,
                        error
                    );
                }
            },
            // TODO can be removed
            getQueueConfiguredCapacity: (queuePath) => {
                const state = get();
                const propertyKey = buildPropertyKey(queuePath, 'capacity');

                const stagedChange = state.stagedChanges.find(
                    (c) => c.queuePath === queuePath && c.property === 'capacity'
                );

                if (stagedChange?.newValue !== undefined) {
                    return stagedChange.newValue;
                }

                return state.configData.get(propertyKey) || '0';
            },

            getQueueDisplayValue: (queuePath, property) => {
                const state = get();
                const propertyKey = buildPropertyKey(queuePath, property);

                const stagedChange = state.stagedChanges.find(
                    (c) => c.queuePath === queuePath && c.property === property
                );

                if (stagedChange?.newValue !== undefined) {
                    return {
                        value: stagedChange.newValue,
                        isStaged: true,
                    };
                }

                return {
                    value: state.configData.get(propertyKey) || '',
                    isStaged: false,
                };
            },

            getGlobalDisplayValue: (property) => {
                const state = get();
                const propertyKey = buildGlobalPropertyKey(property);

                const stagedChange = state.stagedChanges.find(
                    (c) => c.queuePath === 'global' && c.property === property
                );

                if (stagedChange?.newValue !== undefined) {
                    return {
                        value: stagedChange.newValue,
                        isStaged: true,
                    };
                }

                return {
                    value: state.configData.get(propertyKey) || '',
                    isStaged: false,
                };
            },

            getLabelChangesForQueue: (queuePath, label) => {
                const state = get();
                return state.stagedChanges.filter(
                    (c) => c.queuePath === queuePath && c.property?.includes(`accessible-node-labels.${label}.`)
                );
            },

            getQueueByPath: (queuePath) => {
                const state = get();
                if (!state.schedulerData) return null;

                const findQueue = (queue: QueueInfo): QueueInfo | null => {
                    if (queue.queuePath === queuePath) {
                        return queue;
                    }

                    if (queue.queues?.queue) {
                        const children = Array.isArray(queue.queues.queue)
                            ? queue.queues.queue
                            : [queue.queues.queue];

                        for (const child of children) {
                            const found = findQueue(child);
                            if (found) return found;
                        }
                    }

                    return null;
                };

                return findQueue(state.schedulerData);
            },

            getChildQueues: (parentPath) => {
                const state = get();
                const parentQueue = state.getQueueByPath(parentPath);

                if (!parentQueue || !parentQueue.queues?.queue) {
                    return [];
                }

                return Array.isArray(parentQueue.queues.queue)
                    ? parentQueue.queues.queue
                    : [parentQueue.queues.queue];
            },

            hasUnsavedChanges: () => {
                return get().stagedChanges.length > 0;
            },

            getChangesForQueue: (queuePath) => {
                return get().stagedChanges.filter(c => c.queuePath === queuePath);
            },

            getStagedChangeById: (changeId) => {
                return get().stagedChanges.find(c => c.id === changeId);
            },
}));

export const createSchedulerStore = (apiClient: YarnApiClient): ReturnType<typeof create<SchedulerStore>> =>
    create<SchedulerStore>()(createStoreImplementation(apiClient));

const defaultApiClient = new YarnApiClient('/ws/v1/cluster');

export const useSchedulerStore = createSchedulerStore(defaultApiClient);
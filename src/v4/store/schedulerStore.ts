import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { nanoid } from 'nanoid';

// Enable MapSet plugin for immer to work with Maps
enableMapSet();
import type {
    SchedulerInfo,
    QueueInfo,
    QueueNode,
    ConfigProperty,
    StagedChange,
    SchedConfUpdateInfo,
    NodeLabel,
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
import { transformQueueInfoToQueueNode } from './transformQueueInfoToQueueNode';

export type SchedulerStore = {
    // API Client
    apiClient: YarnApiClient;
    
    // Dual data sources
    schedulerData: SchedulerInfo | null;
    configData: Map<string, string>;
    
    // Computed data
    queueTree: QueueNode | null;
    
    // Other state
    nodeLabels: NodeLabel[];
    stagedChanges: StagedChange[];
    selectedNodeLabel: string | null;
    selectedQueuePath: string | null;
    comparisonQueues: string[];
    configVersion: number;
    isLoading: boolean;
    error: string | null;
    
    // Property panel state
    isPropertyPanelOpen: boolean;
    
    // Actions
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
    
    // Computed values
    getQueueConfiguredCapacity: (queuePath: string) => string;
    getQueueDisplayValue: (queuePath: string, property: string) => { value: string; isStaged: boolean };
    getLabelChangesForQueue: (queuePath: string, label: string) => StagedChange[];
    getQueueByPath: (queuePath: string) => QueueInfo | null;
    getChildQueues: (parentPath: string) => QueueInfo[];
    hasUnsavedChanges: () => boolean;
    getChangesForQueue: (queuePath: string) => StagedChange[];
    getStagedChangeById: (changeId: string) => StagedChange | undefined;
};

// Utility function to traverse queue tree and combine with config data
export function traverseQueueTree(
    queueInfo: QueueInfo,
    configData: Map<string, string>,
    visitor: (queue: QueueInfo & { configured: Record<string, string> }) => void
): void {
    // Create a combined queue object with configured properties
    const configured: Record<string, string> = {};
    
    // Find all properties for this queue
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
    
    // Recursively visit children
    if (queueInfo.queues?.queue) {
        const children = Array.isArray(queueInfo.queues.queue) 
            ? queueInfo.queues.queue 
            : [queueInfo.queues.queue];
            
        for (const child of children) {
            traverseQueueTree(child, configData, visitor);
        }
    }
}


// Store implementation using immer middleware
const createStoreImplementation = (apiClient: YarnApiClient) => 
    immer<SchedulerStore>((set, get) => ({
            // API Client
            apiClient,
            
            // Initial state
            schedulerData: null,
            configData: new Map(),
            queueTree: null,
            nodeLabels: [],
            stagedChanges: [],
            selectedNodeLabel: null,
            selectedQueuePath: null,
            comparisonQueues: [],
            configVersion: 0,
            isLoading: false,
            error: null,
            isPropertyPanelOpen: false,
            
            // Actions
            loadInitialData: async () => {
                set((state) => {
                    state.isLoading = true;
                    state.error = null;
                });
                
                try {
                    // Load all data sources in parallel using API client
                    const [scheduler, config, labels, version] = await Promise.all([
                        get().apiClient.getScheduler(),
                        get().apiClient.getSchedulerConf(),
                        get().apiClient.getNodeLabels(),
                        get().apiClient.getSchedulerConfVersion(),
                    ]);
                    
                    set((state) => {
                        // Use scheduler data directly - no parsing needed!
                        state.schedulerData = scheduler.scheduler.schedulerInfo;
                        
                        // Convert config to map for easy lookup
                        state.configData = new Map(
                            config.property.map((p: ConfigProperty) => [p.name, p.value])
                        );
                        
                        // Transform scheduler data to queue tree
                        state.queueTree = state.schedulerData 
                            ? transformQueueInfoToQueueNode(state.schedulerData, state.configData)
                            : null;
                        
                        state.nodeLabels = labels.nodeLabelsInfo?.nodeLabelInfo || [];
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
                    // Refresh only the scheduler data (live metrics) using API client
                    const scheduler = await get().apiClient.getScheduler();
                    
                    set((state) => {
                        state.schedulerData = scheduler.scheduler.schedulerInfo;
                        
                        // Update queue tree with new scheduler data
                        state.queueTree = state.schedulerData 
                            ? transformQueueInfoToQueueNode(state.schedulerData, state.configData)
                            : null;
                        
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
                // Validate inputs
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
                    
                    // Check if we already have a staged change for this property
                    const existingIndex = state.stagedChanges.findIndex(
                        (c) => c.queuePath === queuePath && c.property === property
                    );
                    
                    if (existingIndex >= 0) {
                        // Update existing change
                        state.stagedChanges[existingIndex].newValue = value;
                    } else {
                        // Add new change
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
                    
                    // Check if we already have a staged change for this property
                    const existingIndex = state.stagedChanges.findIndex(
                        (c) => c.queuePath === 'global' && c.property === property
                    );
                    
                    if (existingIndex >= 0) {
                        // Update existing change
                        state.stagedChanges[existingIndex].newValue = value;
                    } else {
                        // Add new change
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
                // Validate inputs
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
                
                // Validate required properties
                if (!config.capacity) {
                    throw createStoreError(
                        ERROR_CODES.VALIDATION_ERROR,
                        'New queues must have a capacity property'
                    );
                }
                
                set((state) => {
                    const queuePath = `${parentPath}.${queueName}`;
                    
                    // Add a change for each property
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
                    
                    // Check if we already have a staged change for this property
                    const existingIndex = state.stagedChanges.findIndex(
                        (c) => c.queuePath === queuePath && c.property === fullProperty
                    );
                    
                    if (existingIndex >= 0) {
                        // Update existing change
                        state.stagedChanges[existingIndex].newValue = value;
                    } else {
                        // Add new change
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
                    
                    // Use API client to update configuration
                    await get().apiClient.updateSchedulerConf(request);
                    
                    set((state) => {
                        state.stagedChanges = [];
                        state.configVersion = state.configVersion + 1;
                    });
                    
                    // Reload both data sources
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
                    // Validate queue exists if path is provided
                    if (queuePath !== null) {
                        const queue = get().getQueueByPath(queuePath);
                        if (!queue) {
                            // Don't select non-existent queue
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
            
            // Computed values
            getQueueConfiguredCapacity: (queuePath) => {
                const state = get();
                const propertyKey = buildPropertyKey(queuePath, 'capacity');
                
                // Check staged changes first
                const stagedChange = state.stagedChanges.find(
                    (c) => c.queuePath === queuePath && c.property === 'capacity'
                );
                
                if (stagedChange?.newValue !== undefined) {
                    return stagedChange.newValue;
                }
                
                // Return configured value
                return state.configData.get(propertyKey) || '0';
            },
            
            getQueueDisplayValue: (queuePath, property) => {
                const state = get();
                const propertyKey = buildPropertyKey(queuePath, property);
                
                // Check staged changes first
                const stagedChange = state.stagedChanges.find(
                    (c) => c.queuePath === queuePath && c.property === property
                );
                
                if (stagedChange?.newValue !== undefined) {
                    return {
                        value: stagedChange.newValue,
                        isStaged: true,
                    };
                }
                
                // Return configured value
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
                
                // Helper function to find queue in tree
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

// Store creator function - returns a new store instance
export const createSchedulerStore = (apiClient: YarnApiClient) => 
    create<SchedulerStore>()(createStoreImplementation(apiClient));

// Default API client for singleton instance
const defaultApiClient = new YarnApiClient('/ws/v1/cluster');

// Export the hook for use in components - this creates a singleton instance
export const useSchedulerStore = createSchedulerStore(defaultApiClient);
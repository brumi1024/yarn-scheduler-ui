import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { nanoid } from 'nanoid';

// Enable MapSet plugin for immer to work with Maps
enableMapSet();
import type {
    SchedulerInfo,
    QueueInfo,
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

export interface SchedulerStore {
    // Dual data sources
    schedulerData: SchedulerInfo | null;
    configData: Map<string, string>;
    
    // Other state
    nodeLabels: NodeLabel[];
    stagedChanges: StagedChange[];
    selectedNodeLabel: string | null;
    configVersion: number;
    isLoading: boolean;
    error: string | null;
    
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
    
    // Computed values
    getQueueConfiguredCapacity: (queuePath: string) => string;
    getQueueDisplayValue: (queuePath: string, property: string) => { value: string; isStaged: boolean };
    getLabelChangesForQueue: (queuePath: string, label: string) => StagedChange[];
}

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

// Utility function to build mutation request from staged changes
export function buildMutationRequest(stagedChanges: StagedChange[]): SchedConfUpdateInfo {
    const request: SchedConfUpdateInfo = {};
    
    // Group changes by type and queue
    const updatesByQueue = new Map<string, Record<string, string>>();
    const addsByQueue = new Map<string, Record<string, string>>();
    const removals: string[] = [];
    const globalUpdates: Record<string, string> = {};
    
    for (const change of stagedChanges) {
        if (change.queuePath === 'global') {
            // Global property
            if (change.property && change.newValue !== undefined) {
                globalUpdates[change.property] = change.newValue;
            }
        } else {
            switch (change.type) {
                case 'update': {
                    if (!change.property || change.newValue === undefined) continue;
                    
                    const updates = updatesByQueue.get(change.queuePath) || {};
                    updates[change.property] = change.newValue;
                    updatesByQueue.set(change.queuePath, updates);
                    break;
                }
                case 'add': {
                    if (!change.property || change.newValue === undefined) continue;
                    
                    const adds = addsByQueue.get(change.queuePath) || {};
                    adds[change.property] = change.newValue;
                    addsByQueue.set(change.queuePath, adds);
                    break;
                }
                case 'remove': {
                    removals.push(change.queuePath);
                    break;
                }
            }
        }
    }
    
    // Build request object
    if (updatesByQueue.size > 0) {
        request['update-queue'] = Array.from(updatesByQueue.entries()).map(([queuePath, params]) => ({
            'queue-name': queuePath,
            params,
        }));
    }
    
    if (addsByQueue.size > 0) {
        request['add-queue'] = Array.from(addsByQueue.entries()).map(([queuePath, params]) => ({
            'queue-name': queuePath,
            params,
        }));
    }
    
    if (removals.length > 0) {
        request['remove-queue'] = removals;
    }
    
    if (Object.keys(globalUpdates).length > 0) {
        request['global-updates'] = globalUpdates;
    }
    
    return request;
}

// Store implementation using immer middleware
const storeImplementation = immer<SchedulerStore>((set, get) => ({
            // Initial state
            schedulerData: null,
            configData: new Map(),
            nodeLabels: [],
            stagedChanges: [],
            selectedNodeLabel: null,
            configVersion: 0,
            isLoading: false,
            error: null,
            
            // Actions
            loadInitialData: async () => {
                set((state) => {
                    state.isLoading = true;
                    state.error = null;
                });
                
                try {
                    // Load all data sources in parallel
                    const [schedulerResponse, configResponse, labelsResponse, versionResponse] = await Promise.all([
                        fetch('/ws/v1/cluster/scheduler', {
                            headers: { Accept: 'application/json' },
                        }),
                        fetch('/ws/v1/cluster/scheduler-conf', {
                            headers: { Accept: 'application/json' },
                        }),
                        fetch('/ws/v1/cluster/get-node-labels', {
                            headers: { Accept: 'application/json' },
                        }),
                        fetch('/ws/v1/cluster/scheduler-conf/version', {
                            headers: { Accept: 'application/json' },
                        }),
                    ]);
                    
                    // Check for HTTP errors
                    if (!schedulerResponse.ok) {
                        const errorText = await schedulerResponse.text();
                        throw new Error(`Failed to load scheduler data: HTTP ${schedulerResponse.status}: ${errorText}`);
                    }
                    if (!configResponse.ok) {
                        const errorText = await configResponse.text();
                        throw new Error(`Failed to load config data: HTTP ${configResponse.status}: ${errorText}`);
                    }
                    if (!labelsResponse.ok) {
                        const errorText = await labelsResponse.text();
                        throw new Error(`Failed to load node labels: HTTP ${labelsResponse.status}: ${errorText}`);
                    }
                    if (!versionResponse.ok) {
                        const errorText = await versionResponse.text();
                        throw new Error(`Failed to load version: HTTP ${versionResponse.status}: ${errorText}`);
                    }
                    
                    const scheduler = await schedulerResponse.json();
                    const config = await configResponse.json();
                    const labels = await labelsResponse.json();
                    const version = await versionResponse.json();
                    
                    set((state) => {
                        // Use scheduler data directly - no parsing needed!
                        state.schedulerData = scheduler.scheduler.schedulerInfo;
                        
                        // Convert config to map for easy lookup
                        state.configData = new Map(
                            config.property.map((p: ConfigProperty) => [p.name, p.value])
                        );
                        
                        state.nodeLabels = labels.nodeLabelsInfo?.nodeLabelInfo || [];
                        state.configVersion = version.versionID;
                        state.isLoading = false;
                    });
                } catch (error) {
                    set((state) => {
                        state.error = `Failed to load initial data: ${error instanceof Error ? error.message : String(error)}`;
                        state.isLoading = false;
                    });
                    throw error;
                }
            },
            
            refreshSchedulerData: async () => {
                set((state) => {
                    state.isLoading = true;
                    state.error = null;
                });
                
                try {
                    // Refresh only the scheduler data (live metrics)
                    const response = await fetch('/ws/v1/cluster/scheduler', {
                        headers: { Accept: 'application/json' },
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Failed to refresh scheduler data: HTTP ${response.status}: ${errorText}`);
                    }
                    
                    const scheduler = await response.json();
                    
                    set((state) => {
                        state.schedulerData = scheduler.scheduler.schedulerInfo;
                        state.isLoading = false;
                    });
                } catch (error) {
                    set((state) => {
                        state.error = `Failed to refresh scheduler data: ${error instanceof Error ? error.message : String(error)}`;
                        state.isLoading = false;
                    });
                    throw error;
                }
            },
            
            stageQueueChange: (queuePath, property, value) => {
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
                if (changes.length === 0) return;
                
                set((state) => {
                    state.isLoading = true;
                    state.error = null;
                });
                
                try {
                    const request = buildMutationRequest(changes);
                    
                    const response = await fetch('/ws/v1/cluster/scheduler-conf', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(request),
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Failed to apply changes: HTTP ${response.status}: ${errorText}`);
                    }
                    
                    set((state) => {
                        state.stagedChanges = [];
                        state.configVersion = state.configVersion + 1;
                    });
                    
                    // Reload both data sources
                    await get().loadInitialData();
                } catch (error) {
                    set((state) => {
                        state.error = error instanceof Error ? error.message : String(error);
                        state.isLoading = false;
                    });
                    throw error;
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
}));

// Store creator function - returns a new store instance
export const createSchedulerStore = () => 
    create<SchedulerStore>()(storeImplementation);

// Export the hook for use in components - this creates a singleton instance
export const useSchedulerStore = createSchedulerStore();
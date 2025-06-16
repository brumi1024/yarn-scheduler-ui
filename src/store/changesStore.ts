import { create } from 'zustand';
import { apiService } from '../api/ApiService';
import type { ChangeSet } from '../types/Configuration';
import { useDataStore } from './dataStore';
import { convertChangesToApiRequest } from '../utils/configurationUtils';

interface ConflictInfo {
    changeId: string;
    type: 'validation' | 'dependency' | 'server';
    message: string;
}

interface ChangesStore {
    stagedChanges: ChangeSet[];
    applyingChanges: boolean;
    applyError: Error | null;
    lastApplied?: number;
    conflicts: ConflictInfo[];

    // Actions
    stageChange: (change: ChangeSet) => void;
    unstageChange: (changeId: string) => void;
    clearStagedChanges: () => void;
    applyChanges: () => Promise<void>;
    hasUnsavedChanges: () => boolean;
    getChangesByQueue: (queuePath: string) => ChangeSet[];
}

export const useChangesStore = create<ChangesStore>((set, get) => ({
    // Initial state
    stagedChanges: [],
    applyingChanges: false,
    applyError: null,
    lastApplied: undefined,
    conflicts: [],

    // Change management actions
    stageChange: (change) => {
        set((state) => {
            // Replace existing change for the same property on the same queue, or add new
            const otherChanges = state.stagedChanges.filter(
                (c) => !(c.queuePath === change.queuePath && c.property === change.property)
            );
            const newStagedChanges = [...otherChanges, change];
            return {
                stagedChanges: newStagedChanges,
            };
        });
    },

    unstageChange: (changeId) =>
        set((state) => ({
            stagedChanges: state.stagedChanges.filter((c) => c.id !== changeId),
            conflicts: state.conflicts.filter((c) => c.changeId !== changeId),
        })),

    clearStagedChanges: () =>
        set({
            stagedChanges: [],
            conflicts: [],
        }),

    applyChanges: async () => {
        const { stagedChanges } = get();
        if (stagedChanges.length === 0) return;

        set({ applyingChanges: true, applyError: null });
        try {
            const updateRequest = convertChangesToApiRequest(stagedChanges);
            await apiService.updateConfiguration(updateRequest);

            set({
                applyingChanges: false,
                lastApplied: Date.now(),
                stagedChanges: [],
                conflicts: [],
            });
            // Refresh data in the main dataStore after successful update
            await useDataStore.getState().refresh();
        } catch (error) {
            set({
                applyingChanges: false,
                applyError: error instanceof Error ? error : new Error('Failed to apply changes'),
            });
            // Re-throw the error so the UI can catch it
            throw error;
        }
    },

    hasUnsavedChanges: () => get().stagedChanges.length > 0,

    getChangesByQueue: (queuePath) => get().stagedChanges.filter((change) => change.queuePath === queuePath),
}));

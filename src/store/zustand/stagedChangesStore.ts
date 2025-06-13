import { create } from 'zustand';
import type { ChangeSet } from '../../types/Configuration';
import type { StagedChangesState, ConflictInfo } from './types';

interface StagedChangesStore extends StagedChangesState {
    // Change management actions
    stageChange: (change: ChangeSet) => void;
    unstageChange: (changeId: string) => void;
    clearAllChanges: () => void;
    
    // Apply changes actions
    applyChangesStart: () => void;
    applyChangesSuccess: () => void;
    applyChangesError: () => void;
    
    // Conflict management actions
    addConflict: (conflict: ConflictInfo) => void;
    removeConflict: (changeId: string) => void;
    clearConflicts: () => void;
    
    // Utility actions
    hasUnsavedChanges: () => boolean;
    getChangesByQueue: (queuePath: string) => ChangeSet[];
    getConflictsByChange: (changeId: string) => ConflictInfo[];
}

export const useStagedChangesStore = create<StagedChangesStore>()((set, get) => ({
    // Initial state
    changes: [],
    applying: false,
    lastApplied: undefined,
    conflicts: [],

    // Change management actions
    stageChange: (change) => set((state) => ({
        changes: [...state.changes.filter(c => c.id !== change.id), change]
    })),

    unstageChange: (changeId) => set((state) => ({
        changes: state.changes.filter(c => c.id !== changeId),
        conflicts: state.conflicts.filter(c => c.changeId !== changeId)
    })),

    clearAllChanges: () => set({
        changes: [],
        conflicts: []
    }),

    // Apply changes actions
    applyChangesStart: () => set({ applying: true }),

    applyChangesSuccess: () => set({
        applying: false,
        lastApplied: Date.now(),
        changes: [],
        conflicts: []
    }),

    applyChangesError: () => set({ applying: false }),

    // Conflict management actions
    addConflict: (conflict) => set((state) => ({
        conflicts: [
            ...state.conflicts.filter(c => 
                !(c.changeId === conflict.changeId && c.type === conflict.type)
            ),
            conflict
        ]
    })),

    removeConflict: (changeId) => set((state) => ({
        conflicts: state.conflicts.filter(c => c.changeId !== changeId)
    })),

    clearConflicts: () => set({ conflicts: [] }),

    // Utility actions
    hasUnsavedChanges: () => get().changes.length > 0,

    getChangesByQueue: (queuePath) => get().changes.filter(change => change.queueName === queuePath),

    getConflictsByChange: (changeId) => get().conflicts.filter(conflict => conflict.changeId === changeId),
}));
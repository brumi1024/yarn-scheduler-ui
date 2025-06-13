import { describe, it, expect, beforeEach } from 'vitest';
import { useStagedChangesStore } from '../stagedChangesStore';
import type { ChangeSet } from '../../../types/Configuration';
import type { ConflictInfo } from '../types';

// Helper to get a fresh store instance for each test
const createStore = () => {
    // Reset to initial state
    useStagedChangesStore.setState({
        changes: [],
        applying: false,
        lastApplied: undefined,
        conflicts: [],
    });
    return useStagedChangesStore;
};

// Mock change data
const mockChange1: ChangeSet = {
    id: 'change-1',
    queueName: 'root.production',
    property: 'capacity',
    oldValue: '50%',
    newValue: '60%',
    timestamp: Date.now(),
    type: 'update',
};

const mockChange2: ChangeSet = {
    id: 'change-2',
    queueName: 'root.development',
    property: 'maxCapacity',
    oldValue: '80%',
    newValue: '90%',
    timestamp: Date.now(),
    type: 'update',
};

const mockChange3: ChangeSet = {
    id: 'change-3',
    queueName: 'root.production',
    property: 'state',
    oldValue: 'RUNNING',
    newValue: 'STOPPED',
    timestamp: Date.now(),
    type: 'update',
};

const mockConflict1: ConflictInfo = {
    changeId: 'change-1',
    type: 'validation',
    message: 'Capacity exceeds maximum allowed',
    severity: 'error',
};

const mockConflict2: ConflictInfo = {
    changeId: 'change-2',
    type: 'dependency',
    message: 'Change affects child queues',
    severity: 'warning',
};

describe('StagedChangesStore', () => {
    beforeEach(() => {
        createStore();
    });

    describe('Change Management', () => {
        it('should stage a new change', () => {
            const store = useStagedChangesStore.getState();

            store.stageChange(mockChange1);

            const state = useStagedChangesStore.getState();
            expect(state.changes).toHaveLength(1);
            expect(state.changes[0]).toEqual(mockChange1);
        });

        it('should stage multiple changes', () => {
            const store = useStagedChangesStore.getState();

            store.stageChange(mockChange1);
            store.stageChange(mockChange2);

            const state = useStagedChangesStore.getState();
            expect(state.changes).toHaveLength(2);
            expect(state.changes.find((c) => c.id === 'change-1')).toEqual(mockChange1);
            expect(state.changes.find((c) => c.id === 'change-2')).toEqual(mockChange2);
        });

        it('should replace existing change with same ID', () => {
            const store = useStagedChangesStore.getState();

            // Stage initial change
            store.stageChange(mockChange1);
            expect(useStagedChangesStore.getState().changes).toHaveLength(1);

            // Stage updated change with same ID
            const updatedChange = { ...mockChange1, newValue: '70%' };
            store.stageChange(updatedChange);

            const state = useStagedChangesStore.getState();
            expect(state.changes).toHaveLength(1);
            expect(state.changes[0].newValue).toBe('70%');
        });

        it('should unstage a change by ID', () => {
            const store = useStagedChangesStore.getState();

            store.stageChange(mockChange1);
            store.stageChange(mockChange2);
            expect(useStagedChangesStore.getState().changes).toHaveLength(2);

            store.unstageChange('change-1');

            const state = useStagedChangesStore.getState();
            expect(state.changes).toHaveLength(1);
            expect(state.changes[0].id).toBe('change-2');
        });

        it('should clear all changes', () => {
            const store = useStagedChangesStore.getState();

            store.stageChange(mockChange1);
            store.stageChange(mockChange2);
            expect(useStagedChangesStore.getState().changes).toHaveLength(2);

            store.clearAllChanges();

            const state = useStagedChangesStore.getState();
            expect(state.changes).toHaveLength(0);
            expect(state.conflicts).toHaveLength(0);
        });
    });

    describe('Apply Changes Flow', () => {
        it('should set applying state when starting to apply changes', () => {
            const store = useStagedChangesStore.getState();

            store.applyChangesStart();

            const state = useStagedChangesStore.getState();
            expect(state.applying).toBe(true);
        });

        it('should clear changes and conflicts on successful apply', () => {
            const store = useStagedChangesStore.getState();

            // Stage some changes and conflicts
            store.stageChange(mockChange1);
            store.addConflict(mockConflict1);
            expect(useStagedChangesStore.getState().changes).toHaveLength(1);
            expect(useStagedChangesStore.getState().conflicts).toHaveLength(1);

            store.applyChangesStart();
            store.applyChangesSuccess();

            const state = useStagedChangesStore.getState();
            expect(state.applying).toBe(false);
            expect(state.changes).toHaveLength(0);
            expect(state.conflicts).toHaveLength(0);
            expect(state.lastApplied).toBeTypeOf('number');
            expect(state.lastApplied).toBeGreaterThan(0);
        });

        it('should stop applying on error but keep changes', () => {
            const store = useStagedChangesStore.getState();

            store.stageChange(mockChange1);
            store.applyChangesStart();
            store.applyChangesError();

            const state = useStagedChangesStore.getState();
            expect(state.applying).toBe(false);
            expect(state.changes).toHaveLength(1); // Changes should remain
        });
    });

    describe('Conflict Management', () => {
        it('should add a conflict', () => {
            const store = useStagedChangesStore.getState();

            store.addConflict(mockConflict1);

            const state = useStagedChangesStore.getState();
            expect(state.conflicts).toHaveLength(1);
            expect(state.conflicts[0]).toEqual(mockConflict1);
        });

        it('should add multiple conflicts', () => {
            const store = useStagedChangesStore.getState();

            store.addConflict(mockConflict1);
            store.addConflict(mockConflict2);

            const state = useStagedChangesStore.getState();
            expect(state.conflicts).toHaveLength(2);
        });

        it('should replace conflict with same changeId and type', () => {
            const store = useStagedChangesStore.getState();

            store.addConflict(mockConflict1);
            expect(useStagedChangesStore.getState().conflicts).toHaveLength(1);

            // Add updated conflict with same changeId and type
            const updatedConflict = { ...mockConflict1, message: 'Updated error message' };
            store.addConflict(updatedConflict);

            const state = useStagedChangesStore.getState();
            expect(state.conflicts).toHaveLength(1);
            expect(state.conflicts[0].message).toBe('Updated error message');
        });

        it('should allow multiple conflicts for same changeId with different types', () => {
            const store = useStagedChangesStore.getState();

            const validationConflict = { ...mockConflict1, type: 'validation' as const };
            const dependencyConflict = { ...mockConflict1, type: 'dependency' as const };

            store.addConflict(validationConflict);
            store.addConflict(dependencyConflict);

            const state = useStagedChangesStore.getState();
            expect(state.conflicts).toHaveLength(2);
        });

        it('should remove conflicts by changeId', () => {
            const store = useStagedChangesStore.getState();

            store.addConflict(mockConflict1);
            store.addConflict(mockConflict2);
            expect(useStagedChangesStore.getState().conflicts).toHaveLength(2);

            store.removeConflict('change-1');

            const state = useStagedChangesStore.getState();
            expect(state.conflicts).toHaveLength(1);
            expect(state.conflicts[0].changeId).toBe('change-2');
        });

        it('should clear all conflicts', () => {
            const store = useStagedChangesStore.getState();

            store.addConflict(mockConflict1);
            store.addConflict(mockConflict2);
            expect(useStagedChangesStore.getState().conflicts).toHaveLength(2);

            store.clearConflicts();

            const state = useStagedChangesStore.getState();
            expect(state.conflicts).toHaveLength(0);
        });

        it('should remove conflicts when unstaging a change', () => {
            const store = useStagedChangesStore.getState();

            store.stageChange(mockChange1);
            store.addConflict(mockConflict1);
            expect(useStagedChangesStore.getState().conflicts).toHaveLength(1);

            store.unstageChange('change-1');

            const state = useStagedChangesStore.getState();
            expect(state.changes).toHaveLength(0);
            expect(state.conflicts).toHaveLength(0);
        });
    });

    describe('Utility Functions', () => {
        it('should return true when there are unsaved changes', () => {
            const store = useStagedChangesStore.getState();

            expect(store.hasUnsavedChanges()).toBe(false);

            store.stageChange(mockChange1);
            expect(store.hasUnsavedChanges()).toBe(true);
        });

        it('should return false when there are no unsaved changes', () => {
            const store = useStagedChangesStore.getState();

            store.stageChange(mockChange1);
            store.clearAllChanges();

            expect(store.hasUnsavedChanges()).toBe(false);
        });

        it('should get changes by queue path', () => {
            const store = useStagedChangesStore.getState();

            store.stageChange(mockChange1); // root.production
            store.stageChange(mockChange2); // root.development
            store.stageChange(mockChange3); // root.production

            const productionChanges = store.getChangesByQueue('root.production');
            const developmentChanges = store.getChangesByQueue('root.development');
            const testingChanges = store.getChangesByQueue('root.testing');

            expect(productionChanges).toHaveLength(2);
            expect(productionChanges.map((c) => c.id)).toEqual(['change-1', 'change-3']);
            expect(developmentChanges).toHaveLength(1);
            expect(developmentChanges[0].id).toBe('change-2');
            expect(testingChanges).toHaveLength(0);
        });

        it('should get conflicts by change ID', () => {
            const store = useStagedChangesStore.getState();

            const conflict1 = { ...mockConflict1, changeId: 'change-1', type: 'validation' as const };
            const conflict2 = { ...mockConflict1, changeId: 'change-1', type: 'dependency' as const };
            const conflict3 = { ...mockConflict1, changeId: 'change-2', type: 'validation' as const };

            store.addConflict(conflict1);
            store.addConflict(conflict2);
            store.addConflict(conflict3);

            const change1Conflicts = store.getConflictsByChange('change-1');
            const change2Conflicts = store.getConflictsByChange('change-2');
            const change3Conflicts = store.getConflictsByChange('change-3');

            expect(change1Conflicts).toHaveLength(2);
            expect(change2Conflicts).toHaveLength(1);
            expect(change3Conflicts).toHaveLength(0);
        });
    });

    describe('State Integration', () => {
        it('should handle complex workflow with changes and conflicts', () => {
            const store = useStagedChangesStore.getState();

            // Stage changes
            store.stageChange(mockChange1);
            store.stageChange(mockChange2);

            // Add conflicts
            store.addConflict(mockConflict1);
            store.addConflict(mockConflict2);

            // Check state
            expect(store.hasUnsavedChanges()).toBe(true);
            expect(useStagedChangesStore.getState().changes).toHaveLength(2);
            expect(useStagedChangesStore.getState().conflicts).toHaveLength(2);

            // Remove one change (should also remove its conflict)
            store.unstageChange('change-1');

            expect(useStagedChangesStore.getState().changes).toHaveLength(1);
            expect(useStagedChangesStore.getState().conflicts).toHaveLength(1);
            expect(useStagedChangesStore.getState().conflicts[0].changeId).toBe('change-2');

            // Apply remaining changes
            store.applyChangesStart();
            store.applyChangesSuccess();

            expect(store.hasUnsavedChanges()).toBe(false);
            expect(useStagedChangesStore.getState().changes).toHaveLength(0);
            expect(useStagedChangesStore.getState().conflicts).toHaveLength(0);
            expect(useStagedChangesStore.getState().applying).toBe(false);
        });
    });
});

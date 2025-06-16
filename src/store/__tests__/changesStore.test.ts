import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChangesStore } from '../changesStore';
import { useDataStore } from '../dataStore';
import { apiService } from '../../api/ApiService';
import { convertChangesToApiRequest } from '../../utils/configurationUtils';
import type { ChangeSet, ConfigurationUpdateRequest } from '../../types/Configuration';

// Mock dependencies
vi.mock('../../api/ApiService', () => ({
    apiService: {
        updateConfiguration: vi.fn(),
    },
}));

vi.mock('../../utils/configurationUtils', () => ({
    convertChangesToApiRequest: vi.fn(),
}));

// Create a mock refresh function that we can control
const mockRefresh = vi.fn();

vi.mock('../dataStore', () => ({
    useDataStore: {
        getState: vi.fn(() => ({
            refresh: mockRefresh,
        })),
    },
}));

const mockApiService = apiService as jest.Mocked<typeof apiService>;
const mockConvertChangesToApiRequest = convertChangesToApiRequest as jest.MockedFunction<
    typeof convertChangesToApiRequest
>;
const mockDataStore = useDataStore as jest.Mocked<typeof useDataStore>;

describe('changesStore', () => {
    const mockChange1: ChangeSet = {
        id: 'change-1',
        queuePath: 'root.queue1',
        property: 'capacity',
        oldValue: '50',
        newValue: '60',
        timestamp: new Date('2023-01-01'),
    };

    const mockChange2: ChangeSet = {
        id: 'change-2',
        queuePath: 'root.queue2',
        property: 'maxCapacity',
        oldValue: '80',
        newValue: '90',
        timestamp: new Date('2023-01-02'),
    };

    const mockChange3: ChangeSet = {
        id: 'change-3',
        queuePath: 'root.queue1',
        property: 'capacity', // Same queue and property as mockChange1
        oldValue: '60',
        newValue: '70',
        timestamp: new Date('2023-01-03'),
    };

    beforeEach(() => {
        // Reset store state
        useChangesStore.setState({
            stagedChanges: [],
            applyingChanges: false,
            applyError: null,
            lastApplied: undefined,
            conflicts: [],
        });

        // Reset mocks
        vi.clearAllMocks();

        // Reset the mock refresh function
        mockRefresh.mockClear();
    });

    describe('initial state', () => {
        it('should have correct initial state', () => {
            const state = useChangesStore.getState();

            expect(state.stagedChanges).toEqual([]);
            expect(state.applyingChanges).toBe(false);
            expect(state.applyError).toBeNull();
            expect(state.lastApplied).toBeUndefined();
            expect(state.conflicts).toEqual([]);
        });
    });

    describe('stageChange', () => {
        it('should add a new change to staged changes', () => {
            const { stageChange } = useChangesStore.getState();

            stageChange(mockChange1);

            const state = useChangesStore.getState();
            expect(state.stagedChanges).toEqual([mockChange1]);
        });

        it('should add multiple changes', () => {
            const { stageChange } = useChangesStore.getState();

            stageChange(mockChange1);
            stageChange(mockChange2);

            const state = useChangesStore.getState();
            expect(state.stagedChanges).toEqual([mockChange1, mockChange2]);
        });

        it('should replace existing change for same queue and property', () => {
            const { stageChange } = useChangesStore.getState();

            // Stage first change
            stageChange(mockChange1);
            let state = useChangesStore.getState();
            expect(state.stagedChanges).toEqual([mockChange1]);

            // Stage change for same queue and property (should replace)
            stageChange(mockChange3);
            state = useChangesStore.getState();
            expect(state.stagedChanges).toEqual([mockChange3]);
            expect(state.stagedChanges).toHaveLength(1);
        });

        it('should keep changes for different queues or properties', () => {
            const { stageChange } = useChangesStore.getState();

            stageChange(mockChange1); // root.queue1, capacity
            stageChange(mockChange2); // root.queue2, maxCapacity

            const state = useChangesStore.getState();
            expect(state.stagedChanges).toContain(mockChange1);
            expect(state.stagedChanges).toContain(mockChange2);
            expect(state.stagedChanges).toHaveLength(2);
        });
    });

    describe('unstageChange', () => {
        it('should remove a staged change by id', () => {
            const { stageChange, unstageChange } = useChangesStore.getState();

            // Stage changes
            stageChange(mockChange1);
            stageChange(mockChange2);

            // Unstage one change
            unstageChange(mockChange1.id);

            const state = useChangesStore.getState();
            expect(state.stagedChanges).toEqual([mockChange2]);
        });

        it('should remove associated conflicts when unstaging a change', () => {
            const conflict = {
                changeId: mockChange1.id,
                type: 'validation' as const,
                message: 'Invalid value',
            };

            // Set up state with change and conflict
            useChangesStore.setState({
                stagedChanges: [mockChange1, mockChange2],
                conflicts: [conflict],
            });

            const { unstageChange } = useChangesStore.getState();
            unstageChange(mockChange1.id);

            const state = useChangesStore.getState();
            expect(state.stagedChanges).toEqual([mockChange2]);
            expect(state.conflicts).toEqual([]);
        });

        it('should do nothing if change id does not exist', () => {
            const { stageChange, unstageChange } = useChangesStore.getState();

            stageChange(mockChange1);
            unstageChange('non-existent-id');

            const state = useChangesStore.getState();
            expect(state.stagedChanges).toEqual([mockChange1]);
        });
    });

    describe('clearStagedChanges', () => {
        it('should clear all staged changes and conflicts', () => {
            const conflict = {
                changeId: mockChange1.id,
                type: 'validation' as const,
                message: 'Invalid value',
            };

            // Set up state with changes and conflicts
            useChangesStore.setState({
                stagedChanges: [mockChange1, mockChange2],
                conflicts: [conflict],
            });

            const { clearStagedChanges } = useChangesStore.getState();
            clearStagedChanges();

            const state = useChangesStore.getState();
            expect(state.stagedChanges).toEqual([]);
            expect(state.conflicts).toEqual([]);
        });
    });

    describe('applyChanges', () => {
        const mockUpdateRequest: ConfigurationUpdateRequest = {
            'update-queue': [
                {
                    'queue-name': 'root.queue1',
                    params: { capacity: '60' },
                },
            ],
        };

        it('should do nothing if no changes are staged', async () => {
            const { applyChanges } = useChangesStore.getState();

            await applyChanges();

            // Verify no API calls were made
            expect(mockConvertChangesToApiRequest).not.toHaveBeenCalled();
            expect(mockApiService.updateConfiguration).not.toHaveBeenCalled();

            const state = useChangesStore.getState();
            expect(state.applyingChanges).toBe(false);
        });
    });

    describe('hasUnsavedChanges', () => {
        it('should return false when no changes are staged', () => {
            const { hasUnsavedChanges } = useChangesStore.getState();
            expect(hasUnsavedChanges()).toBe(false);
        });

        it('should return true when changes are staged', () => {
            const { stageChange, hasUnsavedChanges } = useChangesStore.getState();

            stageChange(mockChange1);
            expect(hasUnsavedChanges()).toBe(true);
        });
    });

    describe('getChangesByQueue', () => {
        it('should return changes for a specific queue', () => {
            const { stageChange, getChangesByQueue } = useChangesStore.getState();

            stageChange(mockChange1); // root.queue1
            stageChange(mockChange2); // root.queue2
            stageChange(mockChange3); // root.queue1

            const queue1Changes = getChangesByQueue('root.queue1');
            const queue2Changes = getChangesByQueue('root.queue2');
            const queue3Changes = getChangesByQueue('root.queue3');

            expect(queue1Changes).toEqual([mockChange3]); // Should only have the latest change for queue1
            expect(queue2Changes).toEqual([mockChange2]);
            expect(queue3Changes).toEqual([]);
        });

        it('should return empty array for non-existent queue', () => {
            const { getChangesByQueue } = useChangesStore.getState();

            const changes = getChangesByQueue('non.existent.queue');
            expect(changes).toEqual([]);
        });
    });
});

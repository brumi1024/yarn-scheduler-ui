import { describe, it, expect } from 'vitest';
import {
    buildMutationRequest,
    buildQueueMutation,
    buildGlobalMutation,
    buildAddQueueMutation,
    buildRemoveQueueMutation,
    groupChangesByQueue,
    validateMutationRequest,
    SchedConfUpdateInfo,
} from './mutationBuilder';
import type { StagedChange } from '~/types';

describe('mutationBuilder', () => {
    describe('buildMutationRequest', () => {
        it('should build complete mutation request with all change types', () => {
            const stagedChanges: StagedChange[] = [
                {
                    id: '1',
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'capacity',
                    oldValue: '50',
                    newValue: '60',
                },
                {
                    id: '2',
                    type: 'update',
                    queuePath: 'root.production',
                    property: 'maximum-capacity',
                    oldValue: '100',
                    newValue: '80',
                },
                {
                    id: '3',
                    type: 'update',
                    queuePath: 'global',
                    property: 'maximum-applications',
                    oldValue: '10000',
                    newValue: '15000',
                },
                {
                    id: '4',
                    type: 'add',
                    queuePath: 'root.test',
                    property: 'capacity',
                    oldValue: undefined,
                    newValue: '20',
                },
                {
                    id: '5',
                    type: 'add',
                    queuePath: 'root.test',
                    property: 'state',
                    oldValue: undefined,
                    newValue: 'RUNNING',
                },
                {
                    id: '6',
                    type: 'remove',
                    queuePath: 'root.old',
                    property: undefined,
                    oldValue: undefined,
                    newValue: undefined,
                },
            ];

            const request = buildMutationRequest(stagedChanges);

            expect(request).toEqual({
                'update-queue': [
                    {
                        'queue-name': 'root.default',
                        params: {
                            capacity: '60',
                        },
                    },
                    {
                        'queue-name': 'root.production',
                        params: {
                            'maximum-capacity': '80',
                        },
                    },
                ],
                'add-queue': [
                    {
                        'queue-name': 'root.test',
                        params: {
                            capacity: '20',
                            state: 'RUNNING',
                        },
                    },
                ],
                'remove-queue': ['root.old'],
                'global-updates': {
                    'maximum-applications': '15000',
                },
            });
        });

        it('should handle empty staged changes', () => {
            const request = buildMutationRequest([]);

            expect(request).toEqual({
                'update-queue': [],
                'add-queue': [],
                'remove-queue': [],
                'global-updates': {},
            });
        });

        it('should group multiple properties for same queue', () => {
            const stagedChanges: StagedChange[] = [
                {
                    id: '1',
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'capacity',
                    oldValue: '50',
                    newValue: '60',
                },
                {
                    id: '2',
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'maximum-capacity',
                    oldValue: '100',
                    newValue: '90',
                },
                {
                    id: '3',
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'state',
                    oldValue: 'RUNNING',
                    newValue: 'STOPPED',
                },
            ];

            const request = buildMutationRequest(stagedChanges);

            expect(request['update-queue']).toHaveLength(1);
            expect(request['update-queue']![0]).toEqual({
                'queue-name': 'root.default',
                params: {
                    capacity: '60',
                    'maximum-capacity': '90',
                    state: 'STOPPED',
                },
            });
        });

        it('should handle node label properties correctly', () => {
            const stagedChanges: StagedChange[] = [
                {
                    id: '1',
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'accessible-node-labels.gpu.capacity',
                    oldValue: '30',
                    newValue: '40',
                },
                {
                    id: '2',
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'accessible-node-labels.gpu.maximum-capacity',
                    oldValue: '50',
                    newValue: '60',
                },
                {
                    id: '3',
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'accessible-node-labels.ssd.capacity',
                    oldValue: '20',
                    newValue: '25',
                },
            ];

            const request = buildMutationRequest(stagedChanges);

            expect(request['update-queue']).toHaveLength(1);
            expect(request['update-queue']![0]).toEqual({
                'queue-name': 'root.default',
                params: {
                    'accessible-node-labels.gpu.capacity': '40',
                    'accessible-node-labels.gpu.maximum-capacity': '60',
                    'accessible-node-labels.ssd.capacity': '25',
                },
            });
        });

        it('should handle multiple global properties', () => {
            const stagedChanges: StagedChange[] = [
                {
                    id: '1',
                    type: 'update',
                    queuePath: 'global',
                    property: 'maximum-applications',
                    oldValue: '10000',
                    newValue: '15000',
                },
                {
                    id: '2',
                    type: 'update',
                    queuePath: 'global',
                    property: 'resource-calculator',
                    oldValue: 'org.apache.hadoop.yarn.util.resource.DefaultResourceCalculator',
                    newValue: 'org.apache.hadoop.yarn.util.resource.DominantResourceCalculator',
                },
                {
                    id: '3',
                    type: 'update',
                    queuePath: 'global',
                    property: 'user-metrics.enable',
                    oldValue: 'false',
                    newValue: 'true',
                },
            ];

            const request = buildMutationRequest(stagedChanges);

            expect(request['global-updates']).toEqual({
                'maximum-applications': '15000',
                'resource-calculator': 'org.apache.hadoop.yarn.util.resource.DominantResourceCalculator',
                'user-metrics.enable': 'true',
            });
        });
    });

    describe('buildQueueMutation', () => {
        it('should build update queue mutation with single property', () => {
            const changes: StagedChange[] = [
                {
                    id: '1',
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'capacity',
                    oldValue: '50',
                    newValue: '60',
                },
            ];

            const mutation = buildQueueMutation('root.default', changes);

            expect(mutation).toEqual({
                'queue-name': 'root.default',
                params: {
                    capacity: '60',
                },
            });
        });

        it('should build update queue mutation with multiple properties', () => {
            const changes: StagedChange[] = [
                {
                    id: '1',
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'capacity',
                    oldValue: '50',
                    newValue: '60',
                },
                {
                    id: '2',
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'maximum-capacity',
                    oldValue: '100',
                    newValue: '90',
                },
                {
                    id: '3',
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'user-limit-factor',
                    oldValue: '1',
                    newValue: '2',
                },
            ];

            const mutation = buildQueueMutation('root.default', changes);

            expect(mutation).toEqual({
                'queue-name': 'root.default',
                params: {
                    capacity: '60',
                    'maximum-capacity': '90',
                    'user-limit-factor': '2',
                },
            });
        });

        it('should handle complex property names in queue mutations', () => {
            const changes: StagedChange[] = [
                {
                    id: '1',
                    type: 'update',
                    queuePath: 'root.production',
                    property: 'maximum-am-resource-percent',
                    oldValue: '0.1',
                    newValue: '0.2',
                },
                {
                    id: '2',
                    type: 'update',
                    queuePath: 'root.production',
                    property: 'minimum-user-limit-percent',
                    oldValue: '100',
                    newValue: '50',
                },
            ];

            const mutation = buildQueueMutation('root.production', changes);

            expect(mutation).toEqual({
                'queue-name': 'root.production',
                params: {
                    'maximum-am-resource-percent': '0.2',
                    'minimum-user-limit-percent': '50',
                },
            });
        });
    });

    describe('buildGlobalMutation', () => {
        it('should extract global properties from changes', () => {
            const changes: StagedChange[] = [
                {
                    id: '1',
                    type: 'update',
                    queuePath: 'global',
                    property: 'maximum-applications',
                    oldValue: '10000',
                    newValue: '15000',
                },
                {
                    id: '2',
                    type: 'update',
                    queuePath: 'global',
                    property: 'resource-calculator',
                    oldValue: 'DefaultResourceCalculator',
                    newValue: 'DominantResourceCalculator',
                },
            ];

            const globalUpdates = buildGlobalMutation(changes);

            expect(globalUpdates).toEqual({
                'maximum-applications': '15000',
                'resource-calculator': 'DominantResourceCalculator',
            });
        });

        it('should return empty object when no global changes', () => {
            const changes: StagedChange[] = [
                {
                    id: '1',
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'capacity',
                    oldValue: '50',
                    newValue: '60',
                },
            ];

            const globalUpdates = buildGlobalMutation(changes);

            expect(globalUpdates).toEqual({});
        });

        it('should handle global properties with dots in names', () => {
            const changes: StagedChange[] = [
                {
                    id: '1',
                    type: 'update',
                    queuePath: 'global',
                    property: 'user-metrics.enable',
                    oldValue: 'false',
                    newValue: 'true',
                },
                {
                    id: '2',
                    type: 'update',
                    queuePath: 'global',
                    property: 'node-locality.enable',
                    oldValue: 'true',
                    newValue: 'false',
                },
            ];

            const globalUpdates = buildGlobalMutation(changes);

            expect(globalUpdates).toEqual({
                'user-metrics.enable': 'true',
                'node-locality.enable': 'false',
            });
        });
    });

    describe('buildAddQueueMutation', () => {
        it('should build add queue mutation with single property', () => {
            const changes: StagedChange[] = [
                {
                    id: '1',
                    type: 'add',
                    queuePath: 'root.test',
                    property: 'capacity',
                    oldValue: undefined,
                    newValue: '20',
                },
            ];

            const mutation = buildAddQueueMutation('root.test', changes);

            expect(mutation).toEqual({
                'queue-name': 'root.test',
                params: {
                    capacity: '20',
                },
            });
        });

        it('should build add queue mutation with multiple properties', () => {
            const changes: StagedChange[] = [
                {
                    id: '1',
                    type: 'add',
                    queuePath: 'root.team2',
                    property: 'capacity',
                    oldValue: undefined,
                    newValue: '30',
                },
                {
                    id: '2',
                    type: 'add',
                    queuePath: 'root.team2',
                    property: 'maximum-capacity',
                    oldValue: undefined,
                    newValue: '50',
                },
                {
                    id: '3',
                    type: 'add',
                    queuePath: 'root.team2',
                    property: 'state',
                    oldValue: undefined,
                    newValue: 'RUNNING',
                },
            ];

            const mutation = buildAddQueueMutation('root.team2', changes);

            expect(mutation).toEqual({
                'queue-name': 'root.team2',
                params: {
                    capacity: '30',
                    'maximum-capacity': '50',
                    state: 'RUNNING',
                },
            });
        });

        it('should handle add queue with node label properties', () => {
            const changes: StagedChange[] = [
                {
                    id: '1',
                    type: 'add',
                    queuePath: 'root.ml',
                    property: 'capacity',
                    oldValue: undefined,
                    newValue: '25',
                },
                {
                    id: '2',
                    type: 'add',
                    queuePath: 'root.ml',
                    property: 'accessible-node-labels.gpu.capacity',
                    oldValue: undefined,
                    newValue: '100',
                },
            ];

            const mutation = buildAddQueueMutation('root.ml', changes);

            expect(mutation).toEqual({
                'queue-name': 'root.ml',
                params: {
                    capacity: '25',
                    'accessible-node-labels.gpu.capacity': '100',
                },
            });
        });
    });

    describe('buildRemoveQueueMutation', () => {
        it('should extract queue paths from remove changes', () => {
            const changes: StagedChange[] = [
                {
                    id: '1',
                    type: 'remove',
                    queuePath: 'root.old',
                    property: undefined,
                    oldValue: undefined,
                    newValue: undefined,
                },
                {
                    id: '2',
                    type: 'remove',
                    queuePath: 'root.deprecated',
                    property: undefined,
                    oldValue: undefined,
                    newValue: undefined,
                },
                {
                    id: '3',
                    type: 'remove',
                    queuePath: 'root.production.legacy',
                    property: undefined,
                    oldValue: undefined,
                    newValue: undefined,
                },
            ];

            const queuePaths = buildRemoveQueueMutation(changes);

            expect(queuePaths).toEqual(['root.old', 'root.deprecated', 'root.production.legacy']);
        });

        it('should return empty array when no remove changes', () => {
            const changes: StagedChange[] = [
                {
                    id: '1',
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'capacity',
                    oldValue: '50',
                    newValue: '60',
                },
            ];

            const queuePaths = buildRemoveQueueMutation(changes);

            expect(queuePaths).toEqual([]);
        });

        it('should deduplicate queue paths', () => {
            const changes: StagedChange[] = [
                {
                    id: '1',
                    type: 'remove',
                    queuePath: 'root.duplicate',
                    property: undefined,
                    oldValue: undefined,
                    newValue: undefined,
                },
                {
                    id: '2',
                    type: 'remove',
                    queuePath: 'root.duplicate',
                    property: undefined,
                    oldValue: undefined,
                    newValue: undefined,
                },
            ];

            const queuePaths = buildRemoveQueueMutation(changes);

            expect(queuePaths).toEqual(['root.duplicate']);
        });
    });

    describe('groupChangesByQueue', () => {
        it('should group changes by queue path', () => {
            const changes: StagedChange[] = [
                {
                    id: '1',
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'capacity',
                    oldValue: '50',
                    newValue: '60',
                },
                {
                    id: '2',
                    type: 'update',
                    queuePath: 'root.production',
                    property: 'capacity',
                    oldValue: '50',
                    newValue: '40',
                },
                {
                    id: '3',
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'maximum-capacity',
                    oldValue: '100',
                    newValue: '90',
                },
                {
                    id: '4',
                    type: 'update',
                    queuePath: 'global',
                    property: 'maximum-applications',
                    oldValue: '10000',
                    newValue: '15000',
                },
            ];

            const grouped = groupChangesByQueue(changes);

            expect(grouped.size).toBe(3);
            expect(grouped.get('root.default')).toHaveLength(2);
            expect(grouped.get('root.production')).toHaveLength(1);
            expect(grouped.get('global')).toHaveLength(1);
        });

        it('should handle empty changes array', () => {
            const grouped = groupChangesByQueue([]);
            expect(grouped.size).toBe(0);
        });

        it('should handle single change', () => {
            const changes: StagedChange[] = [
                {
                    id: '1',
                    type: 'update',
                    queuePath: 'root.only',
                    property: 'capacity',
                    oldValue: '50',
                    newValue: '60',
                },
            ];

            const grouped = groupChangesByQueue(changes);

            expect(grouped.size).toBe(1);
            expect(grouped.get('root.only')).toHaveLength(1);
        });
    });

    describe('validateMutationRequest', () => {
        it('should validate well-formed mutation request', () => {
            const request: SchedConfUpdateInfo = {
                'update-queue': [
                    {
                        'queue-name': 'root.default',
                        params: {
                            capacity: '60',
                            'maximum-capacity': '90',
                        },
                    },
                ],
                'add-queue': [
                    {
                        'queue-name': 'root.test',
                        params: {
                            capacity: '20',
                            state: 'RUNNING',
                        },
                    },
                ],
                'remove-queue': ['root.old'],
                'global-updates': {
                    'maximum-applications': '15000',
                },
            };

            const result = validateMutationRequest(request);

            expect(result).toEqual({ valid: true });
        });

        it('should validate minimal mutation request', () => {
            const request: SchedConfUpdateInfo = {
                'update-queue': [],
                'add-queue': [],
                'remove-queue': [],
                'global-updates': {},
            };

            const result = validateMutationRequest(request);

            expect(result).toEqual({ valid: true });
        });

        it('should reject request with invalid queue names', () => {
            const request: SchedConfUpdateInfo = {
                'update-queue': [
                    {
                        'queue-name': '',
                        params: {
                            capacity: '60',
                        },
                    },
                ],
                'add-queue': [],
                'remove-queue': [],
                'global-updates': {},
            };

            const result = validateMutationRequest(request);

            expect(result).toEqual({
                valid: false,
                message: 'Queue name cannot be empty',
            });
        });

        it('should reject request with empty property values', () => {
            const request: SchedConfUpdateInfo = {
                'update-queue': [
                    {
                        'queue-name': 'root.test',
                        params: {
                            capacity: '',
                        },
                    },
                ],
                'add-queue': [],
                'remove-queue': [],
                'global-updates': {},
            };

            const result = validateMutationRequest(request);

            expect(result).toEqual({
                valid: false,
                message: 'Property value cannot be empty',
            });
        });

        it('should reject request with invalid capacity values', () => {
            const request: SchedConfUpdateInfo = {
                'update-queue': [
                    {
                        'queue-name': 'root.test',
                        params: {
                            capacity: 'invalid',
                        },
                    },
                ],
                'add-queue': [],
                'remove-queue': [],
                'global-updates': {},
            };

            const result = validateMutationRequest(request);

            expect(result).toEqual({
                valid: false,
                message: 'Capacity must be a valid number',
            });
        });

        it('should reject request with capacity values out of range', () => {
            const request: SchedConfUpdateInfo = {
                'update-queue': [
                    {
                        'queue-name': 'root.test',
                        params: {
                            capacity: '150',
                        },
                    },
                ],
                'add-queue': [],
                'remove-queue': [],
                'global-updates': {},
            };

            const result = validateMutationRequest(request);

            expect(result).toEqual({
                valid: false,
                message: 'Capacity must be between 0 and 100',
            });
        });

        it('should reject request with missing required properties for add-queue', () => {
            const request: SchedConfUpdateInfo = {
                'update-queue': [],
                'add-queue': [
                    {
                        'queue-name': 'root.test',
                        params: {
                            // Missing capacity - required for new queues
                            state: 'RUNNING',
                        },
                    },
                ],
                'remove-queue': [],
                'global-updates': {},
            };

            const result = validateMutationRequest(request);

            expect(result).toEqual({
                valid: false,
                message: 'New queues must have capacity property',
            });
        });

        it('should handle remove-queue with empty array', () => {
            const request: SchedConfUpdateInfo = {
                'update-queue': [],
                'add-queue': [],
                'remove-queue': [],
                'global-updates': {},
            };

            const result = validateMutationRequest(request);

            expect(result).toEqual({ valid: true });
        });

        it('should reject request with empty queue path in remove-queue', () => {
            const request: SchedConfUpdateInfo = {
                'update-queue': [],
                'add-queue': [],
                'remove-queue': [''],
                'global-updates': {},
            };

            const result = validateMutationRequest(request);

            expect(result).toEqual({
                valid: false,
                message: 'Queue path cannot be empty',
            });
        });
    });

    describe('integration scenarios', () => {
        it('should handle complex real-world mutation scenario', () => {
            const stagedChanges: StagedChange[] = [
                // Update existing queue capacities
                {
                    id: '1',
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'capacity',
                    oldValue: '40',
                    newValue: '30',
                },
                {
                    id: '2',
                    type: 'update',
                    queuePath: 'root.production',
                    property: 'capacity',
                    oldValue: '40',
                    newValue: '50',
                },
                {
                    id: '3',
                    type: 'update',
                    queuePath: 'root.production',
                    property: 'maximum-capacity',
                    oldValue: '60',
                    newValue: '80',
                },
                // Add new queue with node label support
                {
                    id: '4',
                    type: 'add',
                    queuePath: 'root.ml',
                    property: 'capacity',
                    oldValue: undefined,
                    newValue: '20',
                },
                {
                    id: '5',
                    type: 'add',
                    queuePath: 'root.ml',
                    property: 'state',
                    oldValue: undefined,
                    newValue: 'RUNNING',
                },
                {
                    id: '6',
                    type: 'add',
                    queuePath: 'root.ml',
                    property: 'accessible-node-labels.gpu.capacity',
                    oldValue: undefined,
                    newValue: '100',
                },
                // Remove deprecated queue
                {
                    id: '7',
                    type: 'remove',
                    queuePath: 'root.deprecated',
                    property: undefined,
                    oldValue: undefined,
                    newValue: undefined,
                },
                // Update global settings
                {
                    id: '8',
                    type: 'update',
                    queuePath: 'global',
                    property: 'maximum-applications',
                    oldValue: '10000',
                    newValue: '20000',
                },
                {
                    id: '9',
                    type: 'update',
                    queuePath: 'global',
                    property: 'resource-calculator',
                    oldValue: 'DefaultResourceCalculator',
                    newValue: 'DominantResourceCalculator',
                },
            ];

            const request = buildMutationRequest(stagedChanges);

            expect(request).toEqual({
                'update-queue': [
                    {
                        'queue-name': 'root.default',
                        params: {
                            capacity: '30',
                        },
                    },
                    {
                        'queue-name': 'root.production',
                        params: {
                            capacity: '50',
                            'maximum-capacity': '80',
                        },
                    },
                ],
                'add-queue': [
                    {
                        'queue-name': 'root.ml',
                        params: {
                            capacity: '20',
                            state: 'RUNNING',
                            'accessible-node-labels.gpu.capacity': '100',
                        },
                    },
                ],
                'remove-queue': ['root.deprecated'],
                'global-updates': {
                    'maximum-applications': '20000',
                    'resource-calculator': 'DominantResourceCalculator',
                },
            });

            // Validate the generated request
            const validation = validateMutationRequest(request);
            expect(validation.valid).toBe(true);
        });

        it('should handle edge case with only global changes', () => {
            const stagedChanges: StagedChange[] = [
                {
                    id: '1',
                    type: 'update',
                    queuePath: 'global',
                    property: 'maximum-applications',
                    oldValue: '10000',
                    newValue: '15000',
                },
            ];

            const request = buildMutationRequest(stagedChanges);

            expect(request).toEqual({
                'update-queue': [],
                'add-queue': [],
                'remove-queue': [],
                'global-updates': {
                    'maximum-applications': '15000',
                },
            });
        });

        it('should handle edge case with only queue removals', () => {
            const stagedChanges: StagedChange[] = [
                {
                    id: '1',
                    type: 'remove',
                    queuePath: 'root.old1',
                    property: undefined,
                    oldValue: undefined,
                    newValue: undefined,
                },
                {
                    id: '2',
                    type: 'remove',
                    queuePath: 'root.old2',
                    property: undefined,
                    oldValue: undefined,
                    newValue: undefined,
                },
            ];

            const request = buildMutationRequest(stagedChanges);

            expect(request).toEqual({
                'update-queue': [],
                'add-queue': [],
                'remove-queue': ['root.old1', 'root.old2'],
                'global-updates': {},
            });
        });
    });
});
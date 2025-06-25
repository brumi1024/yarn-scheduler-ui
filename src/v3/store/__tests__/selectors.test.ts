import { describe, it, expect } from 'vitest';
import type { YarnSchedulerStore } from '../types';
import {
    selectEffectiveConfig,
    selectEffectiveQueueTree,
    selectQueueProperty,
    selectQueueProperties,
    selectAllQueues,
    selectQueuesByNodeLabel,
    selectPropertyIsDirty,
    selectChangeCount,
    selectChangesByQueue,
} from '../selectors';

describe('Store Selectors', () => {
    const createMockState = (overrides?: Partial<YarnSchedulerStore>): YarnSchedulerStore =>
        ({
            queueTree: null,
            originalConfig: {},
            propertyChanges: new Map(),
            propertyDefinitions: [],
            nodes: new Map(),
            nodeLabelChanges: new Map(),
            loading: false,
            error: null,
            commitStatus: 'idle',
            commitError: null,
            ...overrides,
        }) as YarnSchedulerStore;

    describe('selectEffectiveConfig', () => {
        it('should return original config when no changes', () => {
            const state = createMockState({
                originalConfig: {
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.queues': 'default',
                },
            });

            const config = selectEffectiveConfig(state);
            expect(config).toEqual(state.originalConfig);
        });

        it('should merge staged changes into config', () => {
            const state = createMockState({
                originalConfig: {
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.production.capacity': '70',
                },
                propertyChanges: new Map([
                    [
                        'yarn.scheduler.capacity.root.production.capacity',
                        {
                            originalValue: '70',
                            stagedValue: '60',
                        },
                    ],
                    [
                        'yarn.scheduler.capacity.root.development.capacity',
                        {
                            originalValue: undefined,
                            stagedValue: '40',
                        },
                    ],
                ]),
            });

            const config = selectEffectiveConfig(state);
            expect(config['yarn.scheduler.capacity.root.capacity']).toBe('100');
            expect(config['yarn.scheduler.capacity.root.production.capacity']).toBe('60');
            expect(config['yarn.scheduler.capacity.root.development.capacity']).toBe('40');
        });
    });

    describe('selectEffectiveQueueTree', () => {
        it('should build tree from effective config', () => {
            const state = createMockState({
                originalConfig: {
                    'yarn.scheduler.capacity.root.queues': 'production,development',
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.production.capacity': '70',
                    'yarn.scheduler.capacity.root.development.capacity': '30',
                },
                propertyChanges: new Map([
                    [
                        'yarn.scheduler.capacity.root.production.capacity',
                        {
                            originalValue: '70',
                            stagedValue: '60',
                        },
                    ],
                    [
                        'yarn.scheduler.capacity.root.development.capacity',
                        {
                            originalValue: '30',
                            stagedValue: '40',
                        },
                    ],
                ]),
            });

            const tree = selectEffectiveQueueTree(state);
            expect(tree).not.toBeNull();
            expect(tree!.children).toHaveLength(2);
            expect(tree!.children[0].config.capacity).toBe('60');
            expect(tree!.children[1].config.capacity).toBe('40');
        });

        it('should return null when no root config', () => {
            const state = createMockState({
                originalConfig: {
                    'some.other.config': 'value',
                },
            });

            const tree = selectEffectiveQueueTree(state);
            expect(tree).toBeNull();
        });
    });

    describe('selectQueueProperty', () => {
        it('should get specific queue property from effective config', () => {
            const state = createMockState({
                originalConfig: {
                    'yarn.scheduler.capacity.root.production.capacity': '70',
                    'yarn.scheduler.capacity.root.production.maximum-capacity': '100',
                },
                propertyChanges: new Map([
                    [
                        'yarn.scheduler.capacity.root.production.capacity',
                        {
                            originalValue: '70',
                            stagedValue: '80',
                        },
                    ],
                ]),
            });

            const selector = selectQueueProperty('root.production', 'capacity');
            expect(selector(state)).toBe('80');

            const selector2 = selectQueueProperty('root.production', 'maximum-capacity');
            expect(selector2(state)).toBe('100');
        });

        it('should return undefined for non-existent property', () => {
            const state = createMockState();
            const selector = selectQueueProperty('root.production', 'capacity');
            expect(selector(state)).toBeUndefined();
        });
    });

    describe('selectQueueProperties', () => {
        it('should get all direct properties for a queue', () => {
            const state = createMockState({
                originalConfig: {
                    'yarn.scheduler.capacity.root.production.capacity': '70',
                    'yarn.scheduler.capacity.root.production.maximum-capacity': '100',
                    'yarn.scheduler.capacity.root.production.state': 'RUNNING',
                    'yarn.scheduler.capacity.root.production.queues': 'frontend,backend',
                    'yarn.scheduler.capacity.root.production.frontend.capacity': '30',
                },
            });

            const selector = selectQueueProperties('root.production');
            const props = selector(state);

            expect(props).toEqual({
                capacity: '70',
                'maximum-capacity': '100',
                state: 'RUNNING',
                queues: 'frontend,backend',
            });

            // Should not include child queue properties
            expect(props['frontend.capacity']).toBeUndefined();
        });
    });

    describe('selectAllQueues', () => {
        it('should return flattened array of all queues', () => {
            const state = createMockState({
                originalConfig: {
                    'yarn.scheduler.capacity.root.queues': 'production,development',
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.production.capacity': '70',
                    'yarn.scheduler.capacity.root.production.queues': 'frontend,backend',
                    'yarn.scheduler.capacity.root.production.frontend.capacity': '40',
                    'yarn.scheduler.capacity.root.production.backend.capacity': '30',
                    'yarn.scheduler.capacity.root.development.capacity': '30',
                },
            });

            const queues = selectAllQueues(state);
            expect(queues).toHaveLength(5); // root + production + frontend + backend + development
            expect(queues.map((q) => q.path)).toEqual([
                'root',
                'root.production',
                'root.production.frontend',
                'root.production.backend',
                'root.development',
            ]);
        });
    });

    describe('selectQueuesByNodeLabel', () => {
        it('should filter queues by node label', () => {
            const state = createMockState({
                originalConfig: {
                    'yarn.scheduler.capacity.root.queues': 'production,development',
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.production.capacity': '70',
                    'yarn.scheduler.capacity.root.production.accessible-node-labels': 'gpu,cpu',
                    'yarn.scheduler.capacity.root.development.capacity': '30',
                    'yarn.scheduler.capacity.root.development.accessible-node-labels': 'cpu',
                },
            });

            const selector = selectQueuesByNodeLabel('gpu');
            const tree = selector(state);

            expect(tree).not.toBeNull();
            expect(tree!.children).toHaveLength(1);
            expect(tree!.children[0].name).toBe('production');
        });

        it('should include parent if child has label', () => {
            const state = createMockState({
                originalConfig: {
                    'yarn.scheduler.capacity.root.queues': 'production',
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.production.capacity': '100',
                    'yarn.scheduler.capacity.root.production.queues': 'frontend',
                    'yarn.scheduler.capacity.root.production.frontend.capacity': '100',
                    'yarn.scheduler.capacity.root.production.frontend.accessible-node-labels': 'special',
                },
            });

            const selector = selectQueuesByNodeLabel('special');
            const tree = selector(state);

            expect(tree).not.toBeNull();
            expect(tree!.children).toHaveLength(1); // production
            expect(tree!.children[0].children).toHaveLength(1); // frontend
        });
    });

    describe('selectPropertyIsDirty', () => {
        it('should return true for changed properties', () => {
            const state = createMockState({
                propertyChanges: new Map([
                    [
                        'yarn.scheduler.capacity.root.production.capacity',
                        {
                            originalValue: '70',
                            stagedValue: '60',
                        },
                    ],
                ]),
            });

            const selector = selectPropertyIsDirty('yarn.scheduler.capacity.root.production.capacity');
            expect(selector(state)).toBe(true);
        });

        it('should return false for unchanged properties', () => {
            const state = createMockState();
            const selector = selectPropertyIsDirty('yarn.scheduler.capacity.root.production.capacity');
            expect(selector(state)).toBe(false);
        });
    });

    describe('selectChangeCount', () => {
        it('should count both property and node label changes', () => {
            const state = createMockState({
                propertyChanges: new Map([
                    ['prop1', { originalValue: '1', stagedValue: '2' }],
                    ['prop2', { originalValue: '3', stagedValue: '4' }],
                ]),
                nodeLabelChanges: new Map([['node1', { nodeId: 'node1', originalLabels: [], stagedLabels: ['gpu'] }]]),
            });

            expect(selectChangeCount(state)).toBe(3);
        });
    });

    describe('selectChangesByQueue', () => {
        it('should group property changes by queue path', () => {
            const state = createMockState({
                propertyChanges: new Map([
                    [
                        'yarn.scheduler.capacity.root.production.capacity',
                        {
                            originalValue: '70',
                            stagedValue: '60',
                        },
                    ],
                    [
                        'yarn.scheduler.capacity.root.production.maximum-capacity',
                        {
                            originalValue: '100',
                            stagedValue: '80',
                        },
                    ],
                    [
                        'yarn.scheduler.capacity.root.development.capacity',
                        {
                            originalValue: '30',
                            stagedValue: '40',
                        },
                    ],
                ]),
            });

            const changesByQueue = selectChangesByQueue(state);

            expect(changesByQueue.size).toBe(2);
            expect(changesByQueue.get('root.production')).toHaveLength(2);
            expect(changesByQueue.get('root.development')).toHaveLength(1);

            const prodChanges = changesByQueue.get('root.production')!;
            expect(prodChanges).toContainEqual({
                property: 'capacity',
                originalValue: '70',
                stagedValue: '60',
            });
        });
    });
});

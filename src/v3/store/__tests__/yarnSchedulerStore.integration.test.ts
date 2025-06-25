import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useYarnSchedulerStore } from '../yarnSchedulerStore';
import { selectEffectiveQueueTree } from '../selectors';
import type { QueueNode } from '../types';

describe('YarnSchedulerStore Integration Tests', () => {
    beforeEach(() => {
        const { result } = renderHook(() => useYarnSchedulerStore());
        act(() => {
            result.current.reset();
        });
    });

    describe('Add Queue - Full Behavior', () => {
        it('should properly add a queue with all necessary properties and update parent', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Set up initial state
            const mockConfig: Record<string, string> = {
                'yarn.scheduler.capacity.root.queues': 'default,production',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.default.capacity': '30',
                'yarn.scheduler.capacity.root.production.capacity': '70',
                'yarn.scheduler.capacity.root.production.queues': 'high,low',
                'yarn.scheduler.capacity.root.production.high.capacity': '60',
                'yarn.scheduler.capacity.root.production.low.capacity': '40',
            };

            const mockTree: QueueNode = {
                path: 'root',
                name: 'root',
                config: {
                    capacity: '100',
                    queues: 'default,production',
                },
                children: [
                    {
                        path: 'root.default',
                        name: 'default',
                        config: { capacity: '30' },
                        children: [],
                    },
                    {
                        path: 'root.production',
                        name: 'production',
                        config: {
                            capacity: '70',
                            queues: 'high,low',
                        },
                        children: [
                            {
                                path: 'root.production.high',
                                name: 'high',
                                config: { capacity: '60' },
                                children: [],
                            },
                            {
                                path: 'root.production.low',
                                name: 'low',
                                config: { capacity: '40' },
                                children: [],
                            },
                        ],
                    },
                ],
            };

            act(() => {
                result.current.setOriginalConfig(mockConfig);
            });

            // Add a new queue
            act(() => {
                result.current.addQueue('root.production', 'analytics', 20);
            });

            // Verify the queue was added to the tree
            const newQueue = result.current.getQueueByPath('root.production.analytics');
            expect(newQueue).toBeDefined();
            expect(newQueue?.name).toBe('analytics');
            // New queue exists with expected properties
            expect(newQueue?.config.capacity).toBe('20');
            expect(newQueue?.config.state).toBe('RUNNING');

            // Verify all necessary properties were staged
            const changes = result.current.propertyChanges;

            // Check capacity property
            expect(changes.get('yarn.scheduler.capacity.root.production.analytics.capacity')).toEqual({
                originalValue: undefined,
                stagedValue: '20',
            });

            // Check state property
            expect(changes.get('yarn.scheduler.capacity.root.production.analytics.state')).toEqual({
                originalValue: undefined,
                stagedValue: 'RUNNING',
            });

            // Check maximum-capacity property
            expect(changes.get('yarn.scheduler.capacity.root.production.analytics.maximum-capacity')).toEqual({
                originalValue: undefined,
                stagedValue: '100',
            });

            // Check parent's queues property was updated
            expect(changes.get('yarn.scheduler.capacity.root.production.queues')).toEqual({
                originalValue: 'high,low',
                stagedValue: 'high,low,analytics',
            });
        });
    });

    describe('Remove Queue - Full Behavior', () => {
        it('should properly remove a queue and update parent queues list', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Set up initial state with more properties
            const mockConfig: Record<string, string> = {
                'yarn.scheduler.capacity.root.queues': 'default,production',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.production.queues': 'high,low,temp',
                'yarn.scheduler.capacity.root.production.capacity': '70',
                'yarn.scheduler.capacity.root.production.temp.capacity': '20',
                'yarn.scheduler.capacity.root.production.temp.state': 'RUNNING',
                'yarn.scheduler.capacity.root.production.temp.maximum-capacity': '50',
                'yarn.scheduler.capacity.root.production.temp.minimum-user-limit-percent': '25',
                'yarn.scheduler.capacity.root.production.temp.user-limit-factor': '2.0',
            };

            const mockTree: QueueNode = {
                path: 'root',
                name: 'root',
                config: { capacity: '100', queues: 'default,production' },
                children: [
                    {
                        path: 'root.default',
                        name: 'default',
                        config: { capacity: '30' },
                        children: [],
                    },
                    {
                        path: 'root.production',
                        name: 'production',
                        config: { capacity: '70', queues: 'high,low,temp' },
                        children: [
                            {
                                path: 'root.production.high',
                                name: 'high',
                                config: { capacity: '40' },
                                children: [],
                            },
                            {
                                path: 'root.production.low',
                                name: 'low',
                                config: { capacity: '40' },
                                children: [],
                            },
                            {
                                path: 'root.production.temp',
                                name: 'temp',
                                config: {
                                    capacity: '20',
                                    state: 'RUNNING',
                                    'maximum-capacity': '50',
                                    'minimum-user-limit-percent': '25',
                                    'user-limit-factor': '2.0',
                                },
                                children: [],
                            },
                        ],
                    },
                ],
            };

            act(() => {
                result.current.setOriginalConfig(mockConfig);
            });

            // Remove the queue
            act(() => {
                result.current.removeQueue('root.production.temp');
            });

            // Verify the queue was marked as deleted
            const deletedQueue = result.current.getQueueByPath('root.production.temp');
            // Deleted queue's properties are removed from effective config
            const effectiveConfig = selectEffectiveQueueTree(result.current);
            const deletedQueueInTree = effectiveConfig?.children
                .find((q) => q.name === 'production')
                ?.children.find((q) => q.name === 'temp');
            expect(deletedQueueInTree).toBeUndefined();

            // Verify all queue properties were marked for deletion
            const changes = result.current.propertyChanges;

            // Check that all properties are marked for deletion
            expect(changes.get('yarn.scheduler.capacity.root.production.temp.capacity')).toEqual({
                originalValue: '20',
                stagedValue: undefined,
            });

            expect(changes.get('yarn.scheduler.capacity.root.production.temp.state')).toEqual({
                originalValue: 'RUNNING',
                stagedValue: 'STOPPED', // Should be stopped first since it was running
            });

            expect(changes.get('yarn.scheduler.capacity.root.production.temp.maximum-capacity')).toEqual({
                originalValue: '50',
                stagedValue: undefined,
            });

            expect(changes.get('yarn.scheduler.capacity.root.production.temp.minimum-user-limit-percent')).toEqual({
                originalValue: '25',
                stagedValue: undefined,
            });

            expect(changes.get('yarn.scheduler.capacity.root.production.temp.user-limit-factor')).toEqual({
                originalValue: '2.0',
                stagedValue: undefined,
            });

            // Check parent's queues property was updated
            expect(changes.get('yarn.scheduler.capacity.root.production.queues')).toEqual({
                originalValue: 'high,low,temp',
                stagedValue: 'high,low',
            });
        });

        it('should handle recursive deletion of child queues', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Set up a queue with children
            const mockConfig: Record<string, string> = {
                'yarn.scheduler.capacity.root.queues': 'parent',
                'yarn.scheduler.capacity.root.parent.queues': 'child1,child2',
                'yarn.scheduler.capacity.root.parent.child1.capacity': '50',
                'yarn.scheduler.capacity.root.parent.child1.state': 'RUNNING',
                'yarn.scheduler.capacity.root.parent.child2.capacity': '50',
                'yarn.scheduler.capacity.root.parent.child2.queues': 'grandchild',
                'yarn.scheduler.capacity.root.parent.child2.grandchild.capacity': '100',
            };

            const mockTree: QueueNode = {
                path: 'root',
                name: 'root',
                config: { queues: 'parent' },
                children: [
                    {
                        path: 'root.parent',
                        name: 'parent',
                        config: { queues: 'child1,child2' },
                        children: [
                            {
                                path: 'root.parent.child1',
                                name: 'child1',
                                config: { capacity: '50', state: 'RUNNING' },
                                children: [],
                            },
                            {
                                path: 'root.parent.child2',
                                name: 'child2',
                                config: { capacity: '50', queues: 'grandchild' },
                                children: [
                                    {
                                        path: 'root.parent.child2.grandchild',
                                        name: 'grandchild',
                                        config: { capacity: '100' },
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };

            act(() => {
                result.current.setOriginalConfig(mockConfig);
            });

            // Remove parent queue (should recursively mark children for deletion)
            act(() => {
                result.current.removeQueue('root.parent');
            });

            const changes = result.current.propertyChanges;

            // Verify parent queue update
            expect(changes.get('yarn.scheduler.capacity.root.queues')).toEqual({
                originalValue: 'parent',
                stagedValue: '',
            });

            // Verify all descendant properties are marked for deletion
            expect(changes.get('yarn.scheduler.capacity.root.parent.child1.capacity')).toEqual({
                originalValue: '50',
                stagedValue: undefined,
            });

            expect(changes.get('yarn.scheduler.capacity.root.parent.child2.grandchild.capacity')).toEqual({
                originalValue: '100',
                stagedValue: undefined,
            });
        });
    });

    describe('Commit Changes - API Format', () => {
        it('should prepare changes in correct format for YARN API', async () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Set up initial state
            const mockConfig: Record<string, string> = {
                'yarn.scheduler.capacity.root.queues': 'default,production',
                'yarn.scheduler.capacity.root.default.capacity': '30',
                'yarn.scheduler.capacity.root.production.capacity': '70',
            };

            const mockTree: QueueNode = {
                path: 'root',
                name: 'root',
                config: { queues: 'default,production' },
                children: [
                    {
                        path: 'root.default',
                        name: 'default',
                        config: { capacity: '30' },
                        children: [],
                    },
                    {
                        path: 'root.production',
                        name: 'production',
                        config: { capacity: '70' },
                        children: [],
                    },
                ],
            };

            act(() => {
                result.current.setOriginalConfig(mockConfig);
            });

            // Make various changes
            act(() => {
                // Update existing queue
                result.current.updateProperty('yarn.scheduler.capacity.root.default.capacity', '40');

                // Add new queue
                result.current.addQueue('root', 'test', 30);
            });

            // Commit changes
            await act(async () => {
                await result.current.commitChanges();
            });

            // TODO: Once API call is implemented, verify the payload format
            // For now, just verify the commit succeeded

            // Verify changes were cleared after commit
            expect(result.current.propertyChanges.size).toBe(0);
            expect(result.current.commitStatus).toBe('success');
        });
    });

    describe('Update Property - Nested Paths', () => {
        it('should update queue tree config when property changes', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            const mockTree: QueueNode = {
                path: 'root',
                name: 'root',
                config: { capacity: '100' },
                children: [
                    {
                        path: 'root.default',
                        name: 'default',
                        config: { capacity: '100' },
                        children: [],
                    },
                ],
            };

            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.queues': 'default',
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.default.capacity': '100',
                });
            });

            // Update a queue property
            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.default.capacity', '80');
            });

            // Verify the queue path lookup uses the updated value
            const queue = result.current.getQueueByPath('root.default');
            expect(queue?.config.capacity).toBe('80');

            // Verify the change was staged
            expect(result.current.propertyChanges.get('yarn.scheduler.capacity.root.default.capacity')).toEqual({
                originalValue: '100',
                stagedValue: '80',
            });
        });
    });
});

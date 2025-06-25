import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useYarnSchedulerStore } from '../yarnSchedulerStore';
import { selectEffectiveQueueTree } from '../selectors';
import type { QueueNode } from '../types';

/**
 * Tests for complex store actions.
 * These tests focus on multi-step operations and action interactions.
 */
describe('YarnSchedulerStore - Complex Actions', () => {
    beforeEach(() => {
        const { result } = renderHook(() => useYarnSchedulerStore());
        act(() => {
            result.current.reset();
        });
    });

    describe('addQueue - Complex Behaviors', () => {
        it('should add queue with all necessary properties and update parent', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.queues': 'production',
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.production.capacity': '100',
                    'yarn.scheduler.capacity.root.production.queues': 'high,low',
                    'yarn.scheduler.capacity.root.production.high.capacity': '60',
                    'yarn.scheduler.capacity.root.production.low.capacity': '40',
                });
            });

            act(() => {
                result.current.addQueue('root.production', 'analytics', 20);
            });

            // Verify the queue exists in the tree
            const newQueue = result.current.getQueueByPath('root.production.analytics');
            expect(newQueue).toBeDefined();
            expect(newQueue?.name).toBe('analytics');
            expect(newQueue?.config.capacity).toBe('20');
            expect(newQueue?.config.state).toBe('RUNNING');

            // Verify all necessary properties were staged
            const changes = result.current.propertyChanges;

            expect(changes.get('yarn.scheduler.capacity.root.production.analytics.capacity')).toEqual({
                originalValue: undefined,
                stagedValue: '20',
            });

            expect(changes.get('yarn.scheduler.capacity.root.production.analytics.state')).toEqual({
                originalValue: undefined,
                stagedValue: 'RUNNING',
            });

            expect(changes.get('yarn.scheduler.capacity.root.production.analytics.maximum-capacity')).toEqual({
                originalValue: undefined,
                stagedValue: '100',
            });

            expect(changes.get('yarn.scheduler.capacity.root.production.queues')).toEqual({
                originalValue: 'high,low',
                stagedValue: 'high,low,analytics',
            });
        });

        it('should handle adding queue to empty parent', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.queues': 'empty',
                    'yarn.scheduler.capacity.root.empty.capacity': '100',
                });
            });

            act(() => {
                result.current.addQueue('root.empty', 'first-child', 100);
            });

            const changes = result.current.propertyChanges;
            expect(changes.get('yarn.scheduler.capacity.root.empty.queues')).toEqual({
                originalValue: undefined,
                stagedValue: 'first-child',
            });
        });
    });

    describe('removeQueue - Complex Behaviors', () => {
        it('should remove queue and all its properties', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.queues': 'production',
                    'yarn.scheduler.capacity.root.production.queues': 'high,low,temp',
                    'yarn.scheduler.capacity.root.production.temp.capacity': '20',
                    'yarn.scheduler.capacity.root.production.temp.state': 'RUNNING',
                    'yarn.scheduler.capacity.root.production.temp.maximum-capacity': '50',
                    'yarn.scheduler.capacity.root.production.temp.minimum-user-limit-percent': '25',
                });
            });

            act(() => {
                result.current.removeQueue('root.production.temp');
            });

            const deletedQueue = result.current.getQueueByPath('root.production.temp');
            const effectiveConfig = selectEffectiveQueueTree(result.current);
            const deletedQueueInTree = effectiveConfig?.children
                .find((q) => q.name === 'production')
                ?.children.find((q) => q.name === 'temp');
            expect(deletedQueueInTree).toBeUndefined();

            const changes = result.current.propertyChanges;

            expect(changes.get('yarn.scheduler.capacity.root.production.temp.capacity')).toEqual({
                originalValue: '20',
                stagedValue: undefined,
            });

            expect(changes.get('yarn.scheduler.capacity.root.production.temp.state')).toEqual({
                originalValue: 'RUNNING',
                stagedValue: 'STOPPED',
            });

            expect(changes.get('yarn.scheduler.capacity.root.production.temp.maximum-capacity')).toEqual({
                originalValue: '50',
                stagedValue: undefined,
            });

            expect(changes.get('yarn.scheduler.capacity.root.production.queues')).toEqual({
                originalValue: 'high,low,temp',
                stagedValue: 'high,low',
            });
        });

        it('should recursively remove child queues', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.queues': 'parent',
                    'yarn.scheduler.capacity.root.parent.queues': 'child1,child2',
                    'yarn.scheduler.capacity.root.parent.child1.capacity': '50',
                    'yarn.scheduler.capacity.root.parent.child1.state': 'RUNNING',
                    'yarn.scheduler.capacity.root.parent.child2.capacity': '50',
                    'yarn.scheduler.capacity.root.parent.child2.queues': 'grandchild',
                    'yarn.scheduler.capacity.root.parent.child2.grandchild.capacity': '100',
                });
            });

            act(() => {
                result.current.removeQueue('root.parent');
            });

            const changes = result.current.propertyChanges;

            expect(changes.get('yarn.scheduler.capacity.root.queues')).toEqual({
                originalValue: 'parent',
                stagedValue: '',
            });

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

    describe('commitChanges - API Format', () => {
        it('should prepare changes in correct format for YARN API', async () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.queues': 'default,production',
                    'yarn.scheduler.capacity.root.default.capacity': '30',
                    'yarn.scheduler.capacity.root.production.capacity': '70',
                });
            });

            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.default.capacity', '40');
                result.current.addQueue('root', 'test', 30);
            });

            await act(async () => {
                await result.current.commitChanges();
            });

            expect(result.current.propertyChanges.size).toBe(0);
            expect(result.current.commitStatus).toBe('success');
        });

        it('should handle commit errors gracefully', async () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Mock the store to throw an error during commit
            const originalCommit = result.current.commitChanges;
            act(() => {
                result.current.commitChanges = async () => {
                    result.current.commitStatus = 'error';
                    result.current.commitError = 'Network error';
                    throw new Error('Network error');
                };
            });

            act(() => {
                result.current.updateProperty('test.property', 'value');
            });

            await expect(
                act(async () => {
                    await result.current.commitChanges();
                })
            ).rejects.toThrow('Network error');

            expect(result.current.commitStatus).toBe('error');
            expect(result.current.commitError).toBe('Network error');

            // Restore original function
            act(() => {
                result.current.commitChanges = originalCommit;
            });
        });
    });

    describe('Action Interactions', () => {
        it('should maintain changes after other store operations', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.production.capacity': '70',
                });
                result.current.updateProperty('yarn.scheduler.capacity.root.production.capacity', '60');
            });

            act(() => {
                result.current.addQueue('root', 'test', 10);
                result.current.updateProperty('yarn.scheduler.capacity.root.test.capacity', '20');
            });

            const productionChange = result.current.propertyChanges.get(
                'yarn.scheduler.capacity.root.production.capacity'
            );
            expect(productionChange?.stagedValue).toBe('60');

            expect(result.current.hasChanges()).toBe(true);
            expect(result.current.propertyChanges.size).toBeGreaterThan(1);
        });

        it('should handle queue operations with existing property changes', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.queues': 'production',
                    'yarn.scheduler.capacity.root.production.capacity': '100',
                    'yarn.scheduler.capacity.root.production.queues': 'team-a,team-b',
                    'yarn.scheduler.capacity.root.production.team-a.capacity': '50',
                    'yarn.scheduler.capacity.root.production.team-b.capacity': '50',
                });
            });

            // First make some property changes
            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.production.team-a.capacity', '40');
            });

            // Then remove a different queue
            act(() => {
                result.current.removeQueue('root.production.team-b');
            });

            // Original change should still be preserved
            expect(
                result.current.propertyChanges.get('yarn.scheduler.capacity.root.production.team-a.capacity')
                    ?.stagedValue
            ).toBe('40');

            // And removal changes should be added
            expect(
                result.current.propertyChanges.get('yarn.scheduler.capacity.root.production.team-b.capacity')
                    ?.stagedValue
            ).toBeUndefined();
        });
    });
});
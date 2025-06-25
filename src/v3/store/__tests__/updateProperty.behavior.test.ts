import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useYarnSchedulerStore } from '../yarnSchedulerStore';
import { buildQueueTree } from '../utils/dataTransformers';
import type { QueueNode } from '../types';

/**
 * Behavior-driven tests for updateProperty action.
 * These tests focus on what users and components should experience,
 * not on implementation details.
 */
describe('updateProperty behavior', () => {
    beforeEach(() => {
        const store = useYarnSchedulerStore.getState();
        store.reset();
    });

    describe('User updates a queue property', () => {
        it('should allow users to change queue capacity and see the new value', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Given: Initial configuration loaded
            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.queues': 'production,development',
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.production.capacity': '70',
                    'yarn.scheduler.capacity.root.development.capacity': '30',
                });
            });

            // When: User changes production capacity to 60
            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.production.capacity', '60');
            });

            // Then: The change should be tracked
            expect(result.current.hasChanges()).toBe(true);

            // And: The property value getter should return the new value
            const propertyValue = result.current.getPropertyValue('yarn.scheduler.capacity.root.production.capacity');
            expect(propertyValue).toEqual({
                original: '70',
                staged: '60',
                isDirty: true,
            });
        });

        it('should allow users to add properties for new queues', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Given: Basic configuration
            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.queues': 'production',
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.production.capacity': '100',
                });
            });

            // When: User adds a new queue by updating queues list and setting capacity
            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.queues', 'production,development');
                result.current.updateProperty('yarn.scheduler.capacity.root.development.capacity', '30');
                result.current.updateProperty('yarn.scheduler.capacity.root.production.capacity', '70');
            });

            // Then: All changes should be tracked
            expect(result.current.propertyChanges.size).toBe(3);

            // And: New queue property should be accessible
            const newQueueCapacity = result.current.getPropertyValue(
                'yarn.scheduler.capacity.root.development.capacity'
            );
            expect(newQueueCapacity).toEqual({
                original: undefined,
                staged: '30',
                isDirty: true,
            });
        });

        it('should allow users to revert individual property changes', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Given: Configuration with staged changes
            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.production.capacity': '70',
                    'yarn.scheduler.capacity.root.development.capacity': '30',
                });
                result.current.updateProperty('yarn.scheduler.capacity.root.production.capacity', '60');
                result.current.updateProperty('yarn.scheduler.capacity.root.development.capacity', '40');
            });

            expect(result.current.propertyChanges.size).toBe(2);

            // When: User reverts one property by setting it back to original
            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.production.capacity', '70');
            });

            // Then: Only the reverted property should be removed from changes
            expect(result.current.propertyChanges.size).toBe(1);
            expect(result.current.propertyChanges.has('yarn.scheduler.capacity.root.production.capacity')).toBe(false);
            expect(result.current.propertyChanges.has('yarn.scheduler.capacity.root.development.capacity')).toBe(true);
        });
    });

    describe('Components observe property changes', () => {
        it('should provide effective configuration reflecting all staged changes', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Given: Original configuration
            const originalConfig = {
                'yarn.scheduler.capacity.root.queues': 'production,development',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.production.capacity': '70',
                'yarn.scheduler.capacity.root.development.capacity': '30',
                'yarn.scheduler.capacity.root.production.maximum-capacity': '100',
            };

            act(() => {
                result.current.setOriginalConfig(originalConfig);
            });

            // When: Multiple properties are changed
            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.production.capacity', '50');
                result.current.updateProperty('yarn.scheduler.capacity.root.development.capacity', '50');
                result.current.updateProperty('yarn.scheduler.capacity.root.production.maximum-capacity', '80');
            });

            // Then: Effective configuration should merge original + changes
            const effectiveConfig = (() => {
                const config = { ...result.current.originalConfig };
                result.current.propertyChanges.forEach((change, path) => {
                    config[path] = String(change.stagedValue);
                });
                return config;
            })();

            expect(effectiveConfig['yarn.scheduler.capacity.root.production.capacity']).toBe('50');
            expect(effectiveConfig['yarn.scheduler.capacity.root.development.capacity']).toBe('50');
            expect(effectiveConfig['yarn.scheduler.capacity.root.production.maximum-capacity']).toBe('80');
            expect(effectiveConfig['yarn.scheduler.capacity.root.queues']).toBe('production,development');
        });

        it('should reflect changes in queue tree structure when built from effective config', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Given: Configuration with queue hierarchy
            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.queues': 'production',
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.production.capacity': '100',
                    'yarn.scheduler.capacity.root.production.state': 'RUNNING',
                });
            });

            // When: Queue properties are changed
            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.production.capacity', '80');
                result.current.updateProperty('yarn.scheduler.capacity.root.production.state', 'STOPPED');
            });

            // Then: Queue tree built from effective config should reflect changes
            const effectiveConfig = (() => {
                const config = { ...result.current.originalConfig };
                result.current.propertyChanges.forEach((change, path) => {
                    config[path] = String(change.stagedValue);
                });
                return config;
            })();

            const queueTree = buildQueueTree(effectiveConfig);
            expect(queueTree).not.toBeNull();
            expect(queueTree!.children[0].config.capacity).toBe('80');
            expect(queueTree!.children[0].config.state).toBe('STOPPED');
        });
    });

    describe('Property validation scenarios', () => {
        it('should track changes regardless of value validity for later validation', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Given: Basic configuration
            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.production.capacity': '70',
                });
            });

            // When: User enters invalid values (validation happens elsewhere)
            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.production.capacity', '150'); // Over 100%
                result.current.updateProperty('yarn.scheduler.capacity.root.production.maximum-capacity', '-10'); // Negative
            });

            // Then: Changes should still be tracked (validation is a separate concern)
            expect(result.current.propertyChanges.size).toBe(2);
            expect(result.current.getPropertyValue('yarn.scheduler.capacity.root.production.capacity').staged).toBe(
                '150'
            );
            expect(
                result.current.getPropertyValue('yarn.scheduler.capacity.root.production.maximum-capacity').staged
            ).toBe('-10');
        });
    });

    describe('Complex update scenarios', () => {
        it('should handle rapid successive updates to the same property', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Given: Initial configuration
            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.production.capacity': '70',
                });
            });

            // When: User types rapidly (simulating form input)
            const updates = ['7', '75', '7', '78', '780', '78', '80'];
            updates.forEach((value) => {
                act(() => {
                    result.current.updateProperty('yarn.scheduler.capacity.root.production.capacity', value);
                });
            });

            // Then: Only the final value should be staged
            const change = result.current.propertyChanges.get('yarn.scheduler.capacity.root.production.capacity');
            expect(change?.stagedValue).toBe('80');
            expect(result.current.propertyChanges.size).toBe(1);
        });

        it('should maintain changes after other store operations', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Given: Configuration with staged changes
            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.production.capacity': '70',
                });
                result.current.updateProperty('yarn.scheduler.capacity.root.production.capacity', '60');
            });

            // When: Other store operations occur
            act(() => {
                // Add a new queue (different operation)
                result.current.addQueue('root', 'test', 10);

                // Update a different property
                result.current.updateProperty('yarn.scheduler.capacity.root.test.capacity', '20');
            });

            // Then: Original change should still be preserved
            const productionChange = result.current.propertyChanges.get(
                'yarn.scheduler.capacity.root.production.capacity'
            );
            expect(productionChange?.stagedValue).toBe('60');

            // And: All changes should be tracked
            expect(result.current.hasChanges()).toBe(true);
            expect(result.current.propertyChanges.size).toBeGreaterThan(1);
        });
    });

    describe('User experience flows', () => {
        it('should support a complete queue reconfiguration workflow', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Given: Initial simple configuration
            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.queues': 'default',
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.default.capacity': '100',
                    'yarn.scheduler.capacity.root.default.state': 'RUNNING',
                });
            });

            // When: User reconfigures to multi-queue setup
            act(() => {
                // 1. Update root queues list
                result.current.updateProperty('yarn.scheduler.capacity.root.queues', 'production,development,default');

                // 2. Redistribute capacities
                result.current.updateProperty('yarn.scheduler.capacity.root.production.capacity', '50');
                result.current.updateProperty('yarn.scheduler.capacity.root.development.capacity', '30');
                result.current.updateProperty('yarn.scheduler.capacity.root.default.capacity', '20');

                // 3. Set states for new queues
                result.current.updateProperty('yarn.scheduler.capacity.root.production.state', 'RUNNING');
                result.current.updateProperty('yarn.scheduler.capacity.root.development.state', 'RUNNING');

                // 4. Add maximum capacities
                result.current.updateProperty('yarn.scheduler.capacity.root.production.maximum-capacity', '80');
                result.current.updateProperty('yarn.scheduler.capacity.root.development.maximum-capacity', '50');
            });

            // Then: All changes should be properly tracked
            expect(result.current.propertyChanges.size).toBe(8);

            // And: Changes should be distinguishable by type
            const changes = Array.from(result.current.propertyChanges.entries());
            const newProperties = changes.filter(([_, change]) => change.originalValue === undefined);
            const modifiedProperties = changes.filter(([_, change]) => change.originalValue !== undefined);

            expect(newProperties.length).toBeGreaterThan(0); // New queue properties
            expect(modifiedProperties.length).toBeGreaterThan(0); // Modified existing properties

            // And: User can verify total capacity still equals 100
            const capacities = ['production', 'development', 'default']
                .map(
                    (queue) => result.current.getPropertyValue(`yarn.scheduler.capacity.root.${queue}.capacity`).staged
                )
                .map((v) => parseInt((v as string) || '0'))
                .reduce((sum, val) => sum + val, 0);

            expect(capacities).toBe(100);
        });
    });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useYarnSchedulerStore } from '../yarnSchedulerStore';
import { selectEffectiveQueueTree, selectEffectiveConfig } from '../selectors';

/**
 * Integration tests for YarnSchedulerStore.
 * These tests focus on complex workflows that involve multiple store actions
 * and verify the interactions between different parts of the system.
 */
describe('YarnSchedulerStore - Integration Tests', () => {
    beforeEach(() => {
        const { result } = renderHook(() => useYarnSchedulerStore());
        act(() => {
            result.current.reset();
        });
    });

    describe('Complex Queue Hierarchy Operations', () => {
        it('should handle adding, modifying, and removing queues in a complex hierarchy', async () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Step 1: Load initial configuration
            const initialConfig = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'production',
                'yarn.scheduler.capacity.root.production.capacity': '100',
                'yarn.scheduler.capacity.root.production.queues': 'critical,standard',
                'yarn.scheduler.capacity.root.production.critical.capacity': '70',
                'yarn.scheduler.capacity.root.production.standard.capacity': '30',
            };

            await act(async () => {
                await result.current.loadInitialData({
                    configEndpoint: async () => initialConfig,
                });
            });

            // Step 2: Add a new queue at root level
            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.queues', 'production,development');
                result.current.addQueue('root', 'development', 30);
                result.current.updateProperty('yarn.scheduler.capacity.root.production.capacity', '70');
            });

            // Step 3: Add sub-queues to the new queue
            act(() => {
                result.current.addQueue('root.development', 'frontend', 60);
                result.current.addQueue('root.development', 'backend', 40);
            });

            // Step 4: Modify existing queue properties
            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.production.critical.capacity', '50');
                result.current.updateProperty('yarn.scheduler.capacity.root.production.standard.capacity', '50');
                result.current.updateProperty('yarn.scheduler.capacity.root.production.critical.maximum-capacity', '80');
            });

            // Step 5: Remove a queue
            act(() => {
                result.current.removeQueue('root.production.standard');
            });

            // Verify final state
            const effectiveConfig = selectEffectiveConfig(result.current);
            const tree = selectEffectiveQueueTree(result.current);

            // Root should have two children
            expect(tree?.children.length).toBe(2);

            // Production queue should have only critical (standard was removed)
            const productionQueue = tree?.children.find((q) => q.name === 'production');
            expect(productionQueue?.children.length).toBe(1);
            expect(productionQueue?.children[0].name).toBe('critical');

            // Development queue should have two children
            const developmentQueue = tree?.children.find((q) => q.name === 'development');
            expect(developmentQueue?.children.length).toBe(2);

            // Verify capacity changes
            expect(effectiveConfig['yarn.scheduler.capacity.root.production.capacity']).toBe('70');
            expect(effectiveConfig['yarn.scheduler.capacity.root.development.capacity']).toBe('30');
            expect(effectiveConfig['yarn.scheduler.capacity.root.production.critical.capacity']).toBe('50');

            // Verify property deletion
            expect(effectiveConfig['yarn.scheduler.capacity.root.production.standard.capacity']).toBeUndefined();

            // Verify changes count
            expect(result.current.propertyChanges.size).toBeGreaterThan(10);
        });
    });

    describe('Queue State Transitions', () => {
        it('should handle queue lifecycle from creation to deletion', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Start with simple config
            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.queues': 'default',
                    'yarn.scheduler.capacity.root.default.capacity': '100',
                });
            });

            // Phase 1: Add new queue
            act(() => {
                result.current.addQueue('root', 'temp-queue', 50);
                result.current.updateProperty('yarn.scheduler.capacity.root.default.capacity', '50');
            });

            let queue = result.current.getQueueByPath('root.temp-queue');
            expect(queue).toBeDefined();
            expect(queue?.config.state).toBe('RUNNING');

            // Phase 2: Configure the queue
            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.temp-queue.maximum-capacity', '75');
                result.current.updateProperty('yarn.scheduler.capacity.root.temp-queue.minimum-user-limit-percent', '50');
                result.current.updateProperty('yarn.scheduler.capacity.root.temp-queue.user-limit-factor', '2.0');
            });

            // Phase 3: Stop the queue
            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.temp-queue.state', 'STOPPED');
            });

            queue = result.current.getQueueByPath('root.temp-queue');
            expect(queue?.config.state).toBe('STOPPED');

            // Phase 4: Remove the queue
            act(() => {
                result.current.removeQueue('root.temp-queue');
            });

            // Verify queue is gone from effective config
            const tree = selectEffectiveQueueTree(result.current);
            const removedQueue = tree?.children.find((q) => q.name === 'temp-queue');
            expect(removedQueue).toBeUndefined();

            // Verify all properties are marked for deletion
            const changes = Array.from(result.current.propertyChanges.entries());
            const tempQueueChanges = changes.filter(([key]) => key.includes('temp-queue'));
            
            tempQueueChanges.forEach(([key, change]) => {
                if (!key.endsWith('.state')) {
                    expect(change.stagedValue).toBeUndefined();
                }
            });
        });
    });

    describe('Concurrent Operations', () => {
        it('should handle multiple users making different changes', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.queues': 'team-a,team-b,shared',
                    'yarn.scheduler.capacity.root.team-a.capacity': '40',
                    'yarn.scheduler.capacity.root.team-b.capacity': '40',
                    'yarn.scheduler.capacity.root.shared.capacity': '20',
                });
            });

            // User A: Modifying team-a queue
            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.team-a.capacity', '35');
                result.current.addQueue('root.team-a', 'project-x', 50);
                result.current.addQueue('root.team-a', 'project-y', 50);
            });

            // User B: Modifying team-b queue
            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.team-b.capacity', '35');
                result.current.updateProperty('yarn.scheduler.capacity.root.team-b.maximum-capacity', '50');
            });

            // User C: Modifying shared resources
            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.shared.capacity', '30');
                result.current.addQueue('root.shared', 'batch-jobs', 60);
                result.current.addQueue('root.shared', 'adhoc', 40);
            });

            // Verify all changes coexist
            const effectiveConfig = selectEffectiveConfig(result.current);
            
            expect(effectiveConfig['yarn.scheduler.capacity.root.team-a.capacity']).toBe('35');
            expect(effectiveConfig['yarn.scheduler.capacity.root.team-b.capacity']).toBe('35');
            expect(effectiveConfig['yarn.scheduler.capacity.root.shared.capacity']).toBe('30');
            expect(effectiveConfig['yarn.scheduler.capacity.root.team-a.queues']).toBe('project-x,project-y');
            expect(effectiveConfig['yarn.scheduler.capacity.root.shared.queues']).toBe('batch-jobs,adhoc');

            // Verify total of 100 is maintained
            const rootCapacities = [
                parseInt(effectiveConfig['yarn.scheduler.capacity.root.team-a.capacity']),
                parseInt(effectiveConfig['yarn.scheduler.capacity.root.team-b.capacity']),
                parseInt(effectiveConfig['yarn.scheduler.capacity.root.shared.capacity']),
            ];
            expect(rootCapacities.reduce((a, b) => a + b, 0)).toBe(100);
        });
    });

    describe('Error Recovery Scenarios', () => {
        it('should allow partial revert of changes', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.queues': 'stable',
                    'yarn.scheduler.capacity.root.stable.capacity': '100',
                });
            });

            // Make several changes
            act(() => {
                // Good changes
                result.current.updateProperty('yarn.scheduler.capacity.root.stable.maximum-capacity', '100');
                
                // Problematic changes (user realizes these break constraints)
                result.current.addQueue('root', 'experimental', 50);
                result.current.updateProperty('yarn.scheduler.capacity.root.stable.capacity', '50');
                result.current.addQueue('root.experimental', 'test1', 60);
                result.current.addQueue('root.experimental', 'test2', 60); // Oops, this would exceed 100%
            });

            // User decides to revert the experimental queue but keep the maximum-capacity change
            act(() => {
                // Manually revert experimental queue changes
                result.current.removeQueue('root.experimental');
                result.current.updateProperty('yarn.scheduler.capacity.root.stable.capacity', '100');
            });

            // Verify selective revert
            const effectiveConfig = selectEffectiveConfig(result.current);
            expect(effectiveConfig['yarn.scheduler.capacity.root.stable.maximum-capacity']).toBe('100'); // Kept
            expect(effectiveConfig['yarn.scheduler.capacity.root.stable.capacity']).toBe('100'); // Reverted
            expect(effectiveConfig['yarn.scheduler.capacity.root.queues']).toBe('stable'); // Reverted

            // Should only have the maximum-capacity change
            expect(result.current.propertyChanges.size).toBe(1);
        });
    });

    describe('Node Label Integration', () => {
        it('should handle queue and node label changes together', async () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            const mockConfig = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'gpu-jobs,cpu-jobs',
                'yarn.scheduler.capacity.root.gpu-jobs.capacity': '30',
                'yarn.scheduler.capacity.root.gpu-jobs.accessible-node-labels': 'gpu',
                'yarn.scheduler.capacity.root.cpu-jobs.capacity': '70',
                'yarn.scheduler.capacity.root.cpu-jobs.accessible-node-labels': 'cpu',
            };

            const mockNodes = [
                { id: 'node-1', nodeLabels: ['cpu'] },
                { id: 'node-2', nodeLabels: ['cpu'] },
                { id: 'node-3', nodeLabels: ['gpu'] },
            ];

            await act(async () => {
                await result.current.loadInitialData({
                    configEndpoint: async () => mockConfig,
                    nodesEndpoint: async () => mockNodes,
                });
            });

            // Reconfigure queues and reassign node labels
            act(() => {
                // Add a new mixed queue
                result.current.addQueue('root', 'mixed', 20);
                result.current.updateProperty('yarn.scheduler.capacity.root.mixed.accessible-node-labels', 'cpu,gpu');
                
                // Adjust existing capacities
                result.current.updateProperty('yarn.scheduler.capacity.root.gpu-jobs.capacity', '25');
                result.current.updateProperty('yarn.scheduler.capacity.root.cpu-jobs.capacity', '55');
                
                // Reassign a node
                result.current.assignNodeLabel('node-2', 'gpu');
            });

            // Verify integrated state
            const tree = selectEffectiveQueueTree(result.current);
            expect(tree?.children.length).toBe(3);

            const mixedQueue = tree?.children.find((q) => q.name === 'mixed');
            expect(mixedQueue?.config['accessible-node-labels']).toBe('cpu,gpu');

            const nodeLabelChange = result.current.nodeLabelChanges.get('node-2');
            expect(nodeLabelChange?.stagedLabels).toContain('gpu');
            expect(nodeLabelChange?.stagedLabels).toContain('cpu');

            // Both queue and node changes should be tracked
            expect(result.current.hasChanges()).toBe(true);
            expect(result.current.propertyChanges.size).toBeGreaterThan(5);
            expect(result.current.nodeLabelChanges.size).toBe(1);
        });
    });

    describe('Full Configuration Workflow', () => {
        it('should support a complete reconfiguration workflow from load to commit', async () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Step 1: Load existing configuration
            await act(async () => {
                await result.current.loadInitialData({
                    configEndpoint: async () => ({
                        'yarn.scheduler.capacity.root.capacity': '100',
                        'yarn.scheduler.capacity.root.queues': 'default',
                        'yarn.scheduler.capacity.root.default.capacity': '100',
                    }),
                });
            });

            // Step 2: Completely reconfigure the scheduler
            act(() => {
                // Change from single queue to multi-tenant
                result.current.updateProperty('yarn.scheduler.capacity.root.queues', 'production,development,research');
                
                // Remove default queue
                result.current.removeQueue('root.default');
                
                // Add and configure production
                result.current.addQueue('root', 'production', 50);
                result.current.updateProperty('yarn.scheduler.capacity.root.production.maximum-capacity', '70');
                result.current.updateProperty('yarn.scheduler.capacity.root.production.queues', 'critical,regular');
                result.current.addQueue('root.production', 'critical', 70);
                result.current.addQueue('root.production', 'regular', 30);
                
                // Add and configure development
                result.current.addQueue('root', 'development', 30);
                result.current.updateProperty('yarn.scheduler.capacity.root.development.maximum-capacity', '50');
                
                // Add and configure research
                result.current.addQueue('root', 'research', 20);
                result.current.updateProperty('yarn.scheduler.capacity.root.research.state', 'STOPPED');
            });

            // Step 3: Verify the configuration before commit
            const tree = selectEffectiveQueueTree(result.current);
            expect(tree?.children.length).toBe(3);
            expect(tree?.children[0].children.length).toBe(2); // production has 2 children

            // Step 4: Commit changes
            await act(async () => {
                await result.current.commitChanges();
            });

            // Step 5: Verify post-commit state
            expect(result.current.commitStatus).toBe('success');
            expect(result.current.propertyChanges.size).toBe(0);
            expect(result.current.hasChanges()).toBe(false);
        });
    });
});
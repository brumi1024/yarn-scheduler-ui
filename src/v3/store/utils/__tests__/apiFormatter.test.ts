import { describe, it, expect } from 'vitest';
import type { PropertyChange } from '../../../types/types';

/**
 * Behavior-driven tests for YARN API JSON formatter.
 * These tests define how the system should format changes
 * for the YARN Capacity Scheduler Mutation API.
 */
describe('API Formatter', () => {
    describe('User updates queue properties', () => {
        it('should format single property update', async () => {
            const { formatChangesForAPI } = await import('../apiFormatter');
            
            const changes = new Map<string, PropertyChange>([
                ['yarn.scheduler.capacity.root.production.capacity', {
                    key: 'yarn.scheduler.capacity.root.production.capacity',
                    oldValue: '60',
                    newValue: '70',
                    queuePath: 'root.production'
                }]
            ]);

            const result = formatChangesForAPI(changes);
            
            expect(result).toEqual({
                'update-queue': [{
                    'queue-name': 'root.production',
                    'params': {
                        'capacity': '70'
                    }
                }]
            });
        });

        it('should format multiple property updates for same queue', async () => {
            const { formatChangesForAPI } = await import('../apiFormatter');
            
            const changes = new Map<string, PropertyChange>([
                ['yarn.scheduler.capacity.root.production.capacity', {
                    key: 'yarn.scheduler.capacity.root.production.capacity',
                    oldValue: '60',
                    newValue: '70',
                    queuePath: 'root.production'
                }],
                ['yarn.scheduler.capacity.root.production.maximum-capacity', {
                    key: 'yarn.scheduler.capacity.root.production.maximum-capacity',
                    oldValue: '80',
                    newValue: '100',
                    queuePath: 'root.production'
                }]
            ]);

            const result = formatChangesForAPI(changes);
            
            expect(result).toEqual({
                'update-queue': [{
                    'queue-name': 'root.production',
                    'params': {
                        'capacity': '70',
                        'maximum-capacity': '100'
                    }
                }]
            });
        });

        it('should format updates for multiple queues', async () => {
            const { formatChangesForAPI } = await import('../apiFormatter');
            
            const changes = new Map<string, PropertyChange>([
                ['yarn.scheduler.capacity.root.production.capacity', {
                    key: 'yarn.scheduler.capacity.root.production.capacity',
                    oldValue: '60',
                    newValue: '70',
                    queuePath: 'root.production'
                }],
                ['yarn.scheduler.capacity.root.development.capacity', {
                    key: 'yarn.scheduler.capacity.root.development.capacity',
                    oldValue: '40',
                    newValue: '30',
                    queuePath: 'root.development'
                }]
            ]);

            const result = formatChangesForAPI(changes);
            
            expect(result).toEqual({
                'update-queue': [
                    {
                        'queue-name': 'root.production',
                        'params': {
                            'capacity': '70'
                        }
                    },
                    {
                        'queue-name': 'root.development',
                        'params': {
                            'capacity': '30'
                        }
                    }
                ]
            });
        });

        it('should handle absolute resource format', async () => {
            const { formatChangesForAPI } = await import('../apiFormatter');
            
            const changes = new Map<string, PropertyChange>([
                ['yarn.scheduler.capacity.root.production.capacity', {
                    key: 'yarn.scheduler.capacity.root.production.capacity',
                    oldValue: '60',
                    newValue: '[memory=8Gi, vcores=16]',
                    queuePath: 'root.production'
                }]
            ]);

            const result = formatChangesForAPI(changes);
            
            expect(result).toEqual({
                'update-queue': [{
                    'queue-name': 'root.production',
                    'params': {
                        'capacity': '[memory=8Gi, vcores=16]'
                    }
                }]
            });
        });

        it('should handle weight format', async () => {
            const { formatChangesForAPI } = await import('../apiFormatter');
            
            const changes = new Map<string, PropertyChange>([
                ['yarn.scheduler.capacity.root.production.capacity', {
                    key: 'yarn.scheduler.capacity.root.production.capacity',
                    oldValue: '60',
                    newValue: '10w',
                    queuePath: 'root.production'
                }]
            ]);

            const result = formatChangesForAPI(changes);
            
            expect(result).toEqual({
                'update-queue': [{
                    'queue-name': 'root.production',
                    'params': {
                        'capacity': '10w'
                    }
                }]
            });
        });
    });

    describe('User adds new queues', () => {
        it('should format new queue addition', async () => {
            const { formatChangesForAPI } = await import('../apiFormatter');
            
            const changes = new Map<string, PropertyChange>([
                ['yarn.scheduler.capacity.root.production.queues', {
                    key: 'yarn.scheduler.capacity.root.production.queues',
                    oldValue: 'critical,standard',
                    newValue: 'critical,standard,batch',
                    queuePath: 'root.production'
                }],
                ['yarn.scheduler.capacity.root.production.batch.capacity', {
                    key: 'yarn.scheduler.capacity.root.production.batch.capacity',
                    oldValue: undefined,
                    newValue: '20',
                    queuePath: 'root.production.batch'
                }]
            ]);

            const result = formatChangesForAPI(changes);
            
            expect(result).toEqual({
                'add-queue': [{
                    'queue-name': 'root.production.batch',
                    'params': {
                        'capacity': '20'
                    }
                }]
            });
        });

        it('should format new queue with multiple properties', async () => {
            const { formatChangesForAPI } = await import('../apiFormatter');
            
            const changes = new Map<string, PropertyChange>([
                ['yarn.scheduler.capacity.root.production.queues', {
                    key: 'yarn.scheduler.capacity.root.production.queues',
                    oldValue: 'critical,standard',
                    newValue: 'critical,standard,batch',
                    queuePath: 'root.production'
                }],
                ['yarn.scheduler.capacity.root.production.batch.capacity', {
                    key: 'yarn.scheduler.capacity.root.production.batch.capacity',
                    oldValue: undefined,
                    newValue: '20',
                    queuePath: 'root.production.batch'
                }],
                ['yarn.scheduler.capacity.root.production.batch.maximum-capacity', {
                    key: 'yarn.scheduler.capacity.root.production.batch.maximum-capacity',
                    oldValue: undefined,
                    newValue: '50',
                    queuePath: 'root.production.batch'
                }],
                ['yarn.scheduler.capacity.root.production.batch.state', {
                    key: 'yarn.scheduler.capacity.root.production.batch.state',
                    oldValue: undefined,
                    newValue: 'RUNNING',
                    queuePath: 'root.production.batch'
                }]
            ]);

            const result = formatChangesForAPI(changes);
            
            expect(result).toEqual({
                'add-queue': [{
                    'queue-name': 'root.production.batch',
                    'params': {
                        'capacity': '20',
                        'maximum-capacity': '50',
                        'state': 'RUNNING'
                    }
                }]
            });
        });
    });

    describe('User removes queues', () => {
        it('should format queue removal', async () => {
            const { formatChangesForAPI } = await import('../apiFormatter');
            
            const changes = new Map<string, PropertyChange>([
                ['yarn.scheduler.capacity.root.production.queues', {
                    key: 'yarn.scheduler.capacity.root.production.queues',
                    oldValue: 'critical,standard,batch',
                    newValue: 'critical,standard',
                    queuePath: 'root.production'
                }]
            ]);

            const result = formatChangesForAPI(changes);
            
            expect(result).toEqual({
                'remove-queue': ['root.production.batch']
            });
        });

        it('should format multiple queue removals', async () => {
            const { formatChangesForAPI } = await import('../apiFormatter');
            
            const changes = new Map<string, PropertyChange>([
                ['yarn.scheduler.capacity.root.queues', {
                    key: 'yarn.scheduler.capacity.root.queues',
                    oldValue: 'production,development,testing',
                    newValue: 'production',
                    queuePath: 'root'
                }]
            ]);

            const result = formatChangesForAPI(changes);
            
            expect(result).toEqual({
                'remove-queue': ['root.development', 'root.testing']
            });
        });
    });

    describe('User updates node label capacities', () => {
        it('should format node label capacity update', async () => {
            const { formatChangesForAPI } = await import('../apiFormatter');
            
            const changes = new Map<string, PropertyChange>([
                ['yarn.scheduler.capacity.root.production.accessible-node-labels.gpu.capacity', {
                    key: 'yarn.scheduler.capacity.root.production.accessible-node-labels.gpu.capacity',
                    oldValue: '[memory=8Gi, vcores=8]',
                    newValue: '[memory=16Gi, vcores=16, yarn.io/gpu=4]',
                    queuePath: 'root.production'
                }]
            ]);

            const result = formatChangesForAPI(changes);
            
            expect(result).toEqual({
                'update-queue': [{
                    'queue-name': 'root.production',
                    'params': {
                        'accessible-node-labels.gpu.capacity': '[memory=16Gi, vcores=16, yarn.io/gpu=4]'
                    }
                }]
            });
        });
    });

    describe('Mixed operations', () => {
        it('should handle adds, updates, and removals in single request', async () => {
            const { formatChangesForAPI } = await import('../apiFormatter');
            
            const changes = new Map<string, PropertyChange>([
                // Update existing queue
                ['yarn.scheduler.capacity.root.production.capacity', {
                    key: 'yarn.scheduler.capacity.root.production.capacity',
                    oldValue: '60',
                    newValue: '50',
                    queuePath: 'root.production'
                }],
                // Add new queue
                ['yarn.scheduler.capacity.root.queues', {
                    key: 'yarn.scheduler.capacity.root.queues',
                    oldValue: 'production,development',
                    newValue: 'production,research',
                    queuePath: 'root'
                }],
                ['yarn.scheduler.capacity.root.research.capacity', {
                    key: 'yarn.scheduler.capacity.root.research.capacity',
                    oldValue: undefined,
                    newValue: '50',
                    queuePath: 'root.research'
                }]
            ]);

            const result = formatChangesForAPI(changes);
            
            expect(result).toEqual({
                'update-queue': [{
                    'queue-name': 'root.production',
                    'params': {
                        'capacity': '50'
                    }
                }],
                'add-queue': [{
                    'queue-name': 'root.research',
                    'params': {
                        'capacity': '50'
                    }
                }],
                'remove-queue': ['root.development']
            });
        });
    });

    describe('User updates global configuration', () => {
        it('should format single global property update', async () => {
            const { formatChangesForAPI } = await import('../apiFormatter');
            
            const changes = new Map<string, PropertyChange>([
                ['yarn.scheduler.capacity.schedule-asynchronously.enable', {
                    key: 'yarn.scheduler.capacity.schedule-asynchronously.enable',
                    oldValue: 'false',
                    newValue: 'true',
                    queuePath: ''
                }]
            ]);

            const result = formatChangesForAPI(changes);
            
            expect(result).toEqual({
                'global-updates': {
                    'yarn.scheduler.capacity.schedule-asynchronously.enable': 'true'
                }
            });
        });

        it('should format multiple global property updates', async () => {
            const { formatChangesForAPI } = await import('../apiFormatter');
            
            const changes = new Map<string, PropertyChange>([
                ['yarn.scheduler.capacity.maximum-applications', {
                    key: 'yarn.scheduler.capacity.maximum-applications',
                    oldValue: '5000',
                    newValue: '10000',
                    queuePath: ''
                }],
                ['yarn.scheduler.capacity.maximum-am-resource-percent', {
                    key: 'yarn.scheduler.capacity.maximum-am-resource-percent',
                    oldValue: '0.1',
                    newValue: '0.2',
                    queuePath: ''
                }],
                ['yarn.scheduler.capacity.resource-calculator', {
                    key: 'yarn.scheduler.capacity.resource-calculator',
                    oldValue: 'org.apache.hadoop.yarn.util.resource.DefaultResourceCalculator',
                    newValue: 'org.apache.hadoop.yarn.util.resource.DominantResourceCalculator',
                    queuePath: ''
                }]
            ]);

            const result = formatChangesForAPI(changes);
            
            expect(result).toEqual({
                'global-updates': {
                    'yarn.scheduler.capacity.maximum-applications': '10000',
                    'yarn.scheduler.capacity.maximum-am-resource-percent': '0.2',
                    'yarn.scheduler.capacity.resource-calculator': 'org.apache.hadoop.yarn.util.resource.DominantResourceCalculator'
                }
            });
        });

        it('should handle queue mappings configuration', async () => {
            const { formatChangesForAPI } = await import('../apiFormatter');
            
            const changes = new Map<string, PropertyChange>([
                ['yarn.scheduler.capacity.queue-mappings', {
                    key: 'yarn.scheduler.capacity.queue-mappings',
                    oldValue: '',
                    newValue: 'u:alice:root.production,u:bob:root.development',
                    queuePath: ''
                }],
                ['yarn.scheduler.capacity.queue-mappings-override.enable', {
                    key: 'yarn.scheduler.capacity.queue-mappings-override.enable',
                    oldValue: 'false',
                    newValue: 'true',
                    queuePath: ''
                }]
            ]);

            const result = formatChangesForAPI(changes);
            
            expect(result).toEqual({
                'global-updates': {
                    'yarn.scheduler.capacity.queue-mappings': 'u:alice:root.production,u:bob:root.development',
                    'yarn.scheduler.capacity.queue-mappings-override.enable': 'true'
                }
            });
        });
    });

    describe('Mixed operations', () => {
        it('should handle adds, updates, and removals in single request', async () => {
            const { formatChangesForAPI } = await import('../apiFormatter');
            
            const changes = new Map<string, PropertyChange>([
                // Update existing queue
                ['yarn.scheduler.capacity.root.production.capacity', {
                    key: 'yarn.scheduler.capacity.root.production.capacity',
                    oldValue: '60',
                    newValue: '50',
                    queuePath: 'root.production'
                }],
                // Add new queue
                ['yarn.scheduler.capacity.root.queues', {
                    key: 'yarn.scheduler.capacity.root.queues',
                    oldValue: 'production,development',
                    newValue: 'production,research',
                    queuePath: 'root'
                }],
                ['yarn.scheduler.capacity.root.research.capacity', {
                    key: 'yarn.scheduler.capacity.root.research.capacity',
                    oldValue: undefined,
                    newValue: '50',
                    queuePath: 'root.research'
                }]
            ]);

            const result = formatChangesForAPI(changes);
            
            expect(result).toEqual({
                'update-queue': [{
                    'queue-name': 'root.production',
                    'params': {
                        'capacity': '50'
                    }
                }],
                'add-queue': [{
                    'queue-name': 'root.research',
                    'params': {
                        'capacity': '50'
                    }
                }],
                'remove-queue': ['root.development']
            });
        });

        it('should handle adds, updates, removals, and global changes in single request', async () => {
            const { formatChangesForAPI } = await import('../apiFormatter');
            
            const changes = new Map<string, PropertyChange>([
                // Global update
                ['yarn.scheduler.capacity.maximum-applications', {
                    key: 'yarn.scheduler.capacity.maximum-applications',
                    oldValue: '5000',
                    newValue: '10000',
                    queuePath: ''
                }],
                // Update existing queue
                ['yarn.scheduler.capacity.root.production.capacity', {
                    key: 'yarn.scheduler.capacity.root.production.capacity',
                    oldValue: '60',
                    newValue: '50',
                    queuePath: 'root.production'
                }],
                // Add new queue
                ['yarn.scheduler.capacity.root.queues', {
                    key: 'yarn.scheduler.capacity.root.queues',
                    oldValue: 'production,development',
                    newValue: 'production,research',
                    queuePath: 'root'
                }],
                ['yarn.scheduler.capacity.root.research.capacity', {
                    key: 'yarn.scheduler.capacity.root.research.capacity',
                    oldValue: undefined,
                    newValue: '50',
                    queuePath: 'root.research'
                }]
            ]);

            const result = formatChangesForAPI(changes);
            
            expect(result).toEqual({
                'global-updates': {
                    'yarn.scheduler.capacity.maximum-applications': '10000'
                },
                'update-queue': [{
                    'queue-name': 'root.production',
                    'params': {
                        'capacity': '50'
                    }
                }],
                'add-queue': [{
                    'queue-name': 'root.research',
                    'params': {
                        'capacity': '50'
                    }
                }],
                'remove-queue': ['root.development']
            });
        });
    });

    describe('Edge cases', () => {
        it('should handle empty changes', async () => {
            const { formatChangesForAPI } = await import('../apiFormatter');
            
            const changes = new Map<string, PropertyChange>();
            const result = formatChangesForAPI(changes);
            
            expect(result).toEqual({});
        });

        it('should extract property name from full key', async () => {
            const { formatChangesForAPI } = await import('../apiFormatter');
            
            const changes = new Map<string, PropertyChange>([
                ['yarn.scheduler.capacity.root.production.minimum-user-limit-percent', {
                    key: 'yarn.scheduler.capacity.root.production.minimum-user-limit-percent',
                    oldValue: '100',
                    newValue: '50',
                    queuePath: 'root.production'
                }]
            ]);

            const result = formatChangesForAPI(changes);
            
            expect(result).toEqual({
                'update-queue': [{
                    'queue-name': 'root.production',
                    'params': {
                        'minimum-user-limit-percent': '50'
                    }
                }]
            });
        });

        it('should treat undefined queuePath as global property', async () => {
            const { formatChangesForAPI } = await import('../apiFormatter');
            
            const changes = new Map<string, PropertyChange>([
                ['yarn.scheduler.capacity.schedule-asynchronously.enable', {
                    key: 'yarn.scheduler.capacity.schedule-asynchronously.enable',
                    oldValue: 'false',
                    newValue: 'true',
                    queuePath: undefined as any
                }]
            ]);

            const result = formatChangesForAPI(changes);
            
            expect(result).toEqual({
                'global-updates': {
                    'yarn.scheduler.capacity.schedule-asynchronously.enable': 'true'
                }
            });
        });
    });
});
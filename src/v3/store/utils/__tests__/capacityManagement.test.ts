import { describe, it, expect } from 'vitest';
import type { ParsedCapacity, CapacityValidationResult } from '../capacityManagement';

/**
 * Behavior-driven tests for capacity management utilities.
 * These tests define how the system should handle various capacity formats
 * according to the YARN Capacity Scheduler Mutation API.
 */
describe('Capacity Management', () => {
    describe('User parses capacity values', () => {
        describe('Percentage format', () => {
            it('should parse numeric value as percentage', async () => {
                const { parseCapacityValue } = await import('../capacityManagement');
                
                const result = parseCapacityValue('50');
                expect(result).toEqual({
                    type: 'percentage',
                    value: 50
                });
            });

            it('$1', async () => {
                const { parseCapacityValue } = await import('../capacityManagement');
                
                const result = parseCapacityValue('75%');
                expect(result).toEqual({
                    type: 'percentage',
                    value: 75
                });
            });

            it('$1', async () => {
                const { parseCapacityValue } = await import('../capacityManagement');
                
                const result = parseCapacityValue('33.33');
                expect(result).toEqual({
                    type: 'percentage',
                    value: 33.33
                });
            });

            it('$1', async () => {
                const { parseCapacityValue } = await import('../capacityManagement');
                
                const result = parseCapacityValue('0');
                expect(result).toEqual({
                    type: 'percentage',
                    value: 0
                });
            });

            it('$1', async () => {
                const { parseCapacityValue } = await import('../capacityManagement');
                
                const result = parseCapacityValue('100%');
                expect(result).toEqual({
                    type: 'percentage',
                    value: 100
                });
            });
        });

        describe('Weight format', () => {
            it('$1', async () => {
                const { parseCapacityValue } = await import('../capacityManagement');
                
                const result = parseCapacityValue('5w');
                expect(result).toEqual({
                    type: 'weight',
                    value: 5
                });
            });

            it('$1', async () => {
                const { parseCapacityValue } = await import('../capacityManagement');
                
                const result = parseCapacityValue('10.5w');
                expect(result).toEqual({
                    type: 'weight',
                    value: 10.5
                });
            });

            it('$1', async () => {
                const { parseCapacityValue } = await import('../capacityManagement');
                
                const result = parseCapacityValue('1000w');
                expect(result).toEqual({
                    type: 'weight',
                    value: 1000
                });
            });
        });

        describe('Absolute resource format', () => {
            it('$1', async () => {
                const { parseCapacityValue } = await import('../capacityManagement');
                
                const result = parseCapacityValue('[memory=1024, vcores=4]');
                expect(result).toEqual({
                    type: 'absolute',
                    resources: {
                        memory: '1024',
                        vcores: '4'
                    }
                });
            });

            it('$1', async () => {
                const { parseCapacityValue } = await import('../capacityManagement');
                
                const result = parseCapacityValue('[memory=2048Mi, vcores=8]');
                expect(result).toEqual({
                    type: 'absolute',
                    resources: {
                        memory: '2048Mi',
                        vcores: '8'
                    }
                });
            });

            it('$1', async () => {
                const { parseCapacityValue } = await import('../capacityManagement');
                
                const result = parseCapacityValue('[memory=8Gi, vcores=16]');
                expect(result).toEqual({
                    type: 'absolute',
                    resources: {
                        memory: '8Gi',
                        vcores: '16'
                    }
                });
            });

            it('$1', async () => {
                const { parseCapacityValue } = await import('../capacityManagement');
                
                const result = parseCapacityValue('[memory=1Ti, vcores=32]');
                expect(result).toEqual({
                    type: 'absolute',
                    resources: {
                        memory: '1Ti',
                        vcores: '32'
                    }
                });
            });

            it('$1', async () => {
                const { parseCapacityValue } = await import('../capacityManagement');
                
                const result = parseCapacityValue('[memory=16Gi, vcores=16, yarn.io/gpu=4]');
                expect(result).toEqual({
                    type: 'absolute',
                    resources: {
                        memory: '16Gi',
                        vcores: '16',
                        'yarn.io/gpu': '4'
                    }
                });
            });

            it('$1', async () => {
                const { parseCapacityValue } = await import('../capacityManagement');
                
                const result = parseCapacityValue('[memory=1024, vcores=50%, yarn.io/gpu=6w]');
                expect(result).toEqual({
                    type: 'absolute',
                    resources: {
                        memory: '1024',
                        vcores: '50%',
                        'yarn.io/gpu': '6w'
                    }
                });
            });
        });

        describe('Invalid formats', () => {
            it('$1', async () => {
                const { parseCapacityValue } = await import('../capacityManagement');
                
                const result = parseCapacityValue('');
                expect(result).toEqual({
                    type: 'invalid',
                    error: 'Empty capacity value'
                });
            });

            it('$1', async () => {
                const { parseCapacityValue } = await import('../capacityManagement');
                
                const result = parseCapacityValue('abc');
                expect(result).toEqual({
                    type: 'invalid',
                    error: 'Invalid capacity format: abc'
                });
            });

            it('$1', async () => {
                const { parseCapacityValue } = await import('../capacityManagement');
                
                const result = parseCapacityValue('-50');
                expect(result).toEqual({
                    type: 'invalid',
                    error: 'Capacity cannot be negative'
                });
            });

            it('$1', async () => {
                const { parseCapacityValue } = await import('../capacityManagement');
                
                const result = parseCapacityValue('150%');
                expect(result).toEqual({
                    type: 'invalid',
                    error: 'Percentage cannot exceed 100'
                });
            });

            it('$1', async () => {
                const { parseCapacityValue } = await import('../capacityManagement');
                
                const result = parseCapacityValue('[memory=1024');
                expect(result).toEqual({
                    type: 'invalid',
                    error: 'Invalid absolute resource format'
                });
            });
        });
    });

    describe('User validates capacity constraints', () => {
        describe('Percentage mode validation', () => {
            it('$1', async () => {
                const { validateCapacityConstraints } = await import('../capacityManagement');
                
                const config = {
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.queues': 'production,development',
                    'yarn.scheduler.capacity.root.production.capacity': '70',
                    'yarn.scheduler.capacity.root.development.capacity': '30'
                };

                const result = validateCapacityConstraints(config, 'root');
                expect(result).toEqual({
                    valid: true
                });
            });

            it('$1', async () => {
                const { validateCapacityConstraints } = await import('../capacityManagement');
                
                const config = {
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.queues': 'production,development',
                    'yarn.scheduler.capacity.root.production.capacity': '80',
                    'yarn.scheduler.capacity.root.development.capacity': '30'
                };

                const result = validateCapacityConstraints(config, 'root');
                expect(result).toEqual({
                    valid: false,
                    errors: ['Child queue capacities (110%) exceed parent capacity (100%)']
                });
            });

            it('$1', async () => {
                const { validateCapacityConstraints } = await import('../capacityManagement');
                
                const config = {
                    'yarn.scheduler.capacity.root.production.capacity': '70',
                    'yarn.scheduler.capacity.root.production.maximum-capacity': '60'
                };

                const result = validateCapacityConstraints(config, 'root.production');
                expect(result).toEqual({
                    valid: false,
                    errors: ['Maximum capacity (60%) cannot be less than capacity (70%)']
                });
            });

            it('$1', async () => {
                const { validateCapacityConstraints } = await import('../capacityManagement');
                
                const config = {
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.queues': 'a,b,c',
                    'yarn.scheduler.capacity.root.a.capacity': '33.33',
                    'yarn.scheduler.capacity.root.b.capacity': '33.33',
                    'yarn.scheduler.capacity.root.c.capacity': '33.34'
                };

                const result = validateCapacityConstraints(config, 'root');
                expect(result).toEqual({
                    valid: true
                });
            });
        });

        describe('Weight mode validation', () => {
            it('$1', async () => {
                const { validateCapacityConstraints } = await import('../capacityManagement');
                
                const config = {
                    'yarn.scheduler.capacity.root.queues': 'production,development',
                    'yarn.scheduler.capacity.root.production.capacity': '10w',
                    'yarn.scheduler.capacity.root.development.capacity': '5w'
                };

                const result = validateCapacityConstraints(config, 'root');
                expect(result).toEqual({
                    valid: true
                });
            });

            it('$1', async () => {
                const { validateCapacityConstraints } = await import('../capacityManagement');
                
                const config = {
                    'yarn.scheduler.capacity.root.production.capacity': '-5w'
                };

                const result = validateCapacityConstraints(config, 'root.production');
                expect(result).toEqual({
                    valid: false,
                    errors: ['Weight must be positive']
                });
            });
        });

        describe('Absolute mode validation', () => {
            it('$1', async () => {
                const { validateCapacityConstraints } = await import('../capacityManagement');
                
                const config = {
                    'yarn.scheduler.capacity.root.production.capacity': '[memory=8192Mi, vcores=8]'
                };

                const result = validateCapacityConstraints(config, 'root.production');
                expect(result).toEqual({
                    valid: true
                });
            });

            it('$1', async () => {
                const { validateCapacityConstraints } = await import('../capacityManagement');
                
                const config = {
                    'yarn.scheduler.capacity.root.production.capacity': '[vcores=8]'
                };

                const result = validateCapacityConstraints(config, 'root.production');
                expect(result).toEqual({
                    valid: false,
                    errors: ['Memory must be specified in absolute resource format']
                });
            });
        });

        describe('Mixed mode validation', () => {
            it('$1', async () => {
                const { validateCapacityConstraints } = await import('../capacityManagement');
                
                const config = {
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.queues': 'percentage-queue,weight-queue,absolute-queue',
                    'yarn.scheduler.capacity.root.percentage-queue.capacity': '40',
                    'yarn.scheduler.capacity.root.weight-queue.capacity': '10w',
                    'yarn.scheduler.capacity.root.absolute-queue.capacity': '[memory=16Gi, vcores=16]'
                };

                // When modes are mixed, percentage validation is skipped
                const result = validateCapacityConstraints(config, 'root');
                expect(result).toEqual({
                    valid: true,
                    warnings: ['Mixed capacity modes detected - percentage validation skipped']
                });
            });
        });
    });


    describe('Integration scenarios', () => {
        it('$1', async () => {
            const { validateCapacityConstraints } = await import('../capacityManagement');
            
            // Initial valid state
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'production,development',
                'yarn.scheduler.capacity.root.production.capacity': '60',
                'yarn.scheduler.capacity.root.development.capacity': '40'
            };

            // Change production to 70%, development still at 40%
            config['yarn.scheduler.capacity.root.production.capacity'] = '70';
            
            const result = validateCapacityConstraints(config, 'root');
            expect(result).toEqual({
                valid: false,
                errors: ['Child queue capacities (110%) exceed parent capacity (100%)']
            });
        });

        it('$1', async () => {
            const { validateCapacityConstraints } = await import('../capacityManagement');
            
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'production,development,research',
                'yarn.scheduler.capacity.root.production.capacity': '50',
                'yarn.scheduler.capacity.root.development.capacity': '30',
                'yarn.scheduler.capacity.root.research.capacity': '20'
            };

            const result = validateCapacityConstraints(config, 'root');
            expect(result).toEqual({
                valid: true
            });
        });

        it('$1', async () => {
            const { validateCapacityConstraints } = await import('../capacityManagement');
            
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'production,development',
                'yarn.scheduler.capacity.root.production.capacity': '100',
                'yarn.scheduler.capacity.root.development.capacity': '0'
            };

            const result = validateCapacityConstraints(config, 'root');
            expect(result).toEqual({
                valid: true
            });
        });
    });
});
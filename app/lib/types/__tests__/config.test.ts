import { describe, it, expect } from 'vitest';
import type { ConfigData, ConfigProperty, SchedConfUpdateInfo, QueueUpdateParams, GlobalUpdateParams } from '../config';

describe('ConfigData interface', () => {
    it('should accept valid scheduler configuration response', () => {
        const configData: ConfigData = {
            property: [
                {
                    name: 'yarn.scheduler.capacity.root.capacity',
                    value: '100',
                },
                {
                    name: 'yarn.scheduler.capacity.root.production.capacity',
                    value: '70',
                },
                {
                    name: 'yarn.scheduler.capacity.root.development.capacity',
                    value: '30',
                },
            ],
        };

        expect(configData.property).toHaveLength(3);
        expect(configData.property[0].name).toBe('yarn.scheduler.capacity.root.capacity');
        expect(configData.property[0].value).toBe('100');
    });

    it('should handle empty configuration', () => {
        const emptyConfig: ConfigData = {
            property: [],
        };

        expect(emptyConfig.property).toHaveLength(0);
    });
});

describe('ConfigProperty interface', () => {
    it('should accept standard queue properties', () => {
        const queueProperty: ConfigProperty = {
            name: 'yarn.scheduler.capacity.root.production.maximum-capacity',
            value: '100',
        };

        expect(queueProperty.name).toContain('maximum-capacity');
        expect(queueProperty.value).toBe('100');
    });

    it('should accept node label properties', () => {
        const labelProperty: ConfigProperty = {
            name: 'yarn.scheduler.capacity.root.production.accessible-node-labels.gpu.capacity',
            value: '80',
        };

        expect(labelProperty.name).toContain('accessible-node-labels');
        expect(labelProperty.name).toContain('gpu');
        expect(labelProperty.value).toBe('80');
    });

    it('should accept global scheduler properties', () => {
        const globalProperty: ConfigProperty = {
            name: 'yarn.scheduler.capacity.maximum-applications',
            value: '10000',
        };

        expect(globalProperty.name).toBe('yarn.scheduler.capacity.maximum-applications');
        expect(globalProperty.value).toBe('10000');
    });
});

describe('SchedConfUpdateInfo interface', () => {
    it('should accept add queue mutation', () => {
        const addQueueMutation: SchedConfUpdateInfo = {
            'add-queue': [
                {
                    'queue-name': 'root.production.batch',
                    params: {
                        capacity: '60',
                        'maximum-capacity': '100',
                    },
                },
            ],
        };

        expect(addQueueMutation['add-queue']).toHaveLength(1);
        expect(addQueueMutation['add-queue']?.[0]['queue-name']).toBe('root.production.batch');
        expect(addQueueMutation['add-queue']?.[0].params.capacity).toBe('60');
    });

    it('should accept update queue mutation', () => {
        const updateQueueMutation: SchedConfUpdateInfo = {
            'update-queue': [
                {
                    'queue-name': 'root.production',
                    params: {
                        capacity: '80',
                        'user-limit-factor': '2',
                    },
                },
            ],
        };

        expect(updateQueueMutation['update-queue']).toHaveLength(1);
        expect(updateQueueMutation['update-queue']?.[0].params.capacity).toBe('80');
    });

    it('should accept remove queue mutation', () => {
        const removeQueueMutation: SchedConfUpdateInfo = {
            'remove-queue': ['root.development.experimental'],
        };

        expect(removeQueueMutation['remove-queue']).toHaveLength(1);
        expect(removeQueueMutation['remove-queue']?.[0]).toBe('root.development.experimental');
    });

    it('should accept global updates', () => {
        const globalUpdateMutation: SchedConfUpdateInfo = {
            'global-updates': {
                'yarn.scheduler.capacity.maximum-applications': '20000',
                'yarn.scheduler.capacity.maximum-am-resource-percent': '0.3',
            },
        };

        expect(globalUpdateMutation['global-updates']).toBeDefined();
        expect(globalUpdateMutation['global-updates']?.['yarn.scheduler.capacity.maximum-applications']).toBe('20000');
    });

    it('should accept combined mutations', () => {
        const combinedMutation: SchedConfUpdateInfo = {
            'add-queue': [
                {
                    'queue-name': 'root.production.interactive',
                    params: {
                        capacity: '40',
                    },
                },
            ],
            'update-queue': [
                {
                    'queue-name': 'root.production.batch',
                    params: {
                        capacity: '60',
                    },
                },
            ],
            'remove-queue': ['root.production.old-queue'],
            'global-updates': {
                'yarn.scheduler.capacity.resource-calculator': 'org.apache.hadoop.yarn.util.resource.DominantResourceCalculator',
            },
        };

        expect(combinedMutation['add-queue']).toHaveLength(1);
        expect(combinedMutation['update-queue']).toHaveLength(1);
        expect(combinedMutation['remove-queue']).toHaveLength(1);
        expect(combinedMutation['global-updates']).toBeDefined();
    });
});

describe('QueueUpdateParams interface', () => {
    it('should accept queue-specific parameters', () => {
        const params: QueueUpdateParams = {
            'queue-name': 'root.production',
            params: {
                capacity: '70',
                'maximum-capacity': '100',
                'user-limit-factor': '1.5',
                state: 'RUNNING',
                queues: 'batch,interactive',
                'accessible-node-labels': 'gpu,fpga',
                'default-node-label-expression': 'gpu',
                'maximum-am-resource-percent': '0.2',
                'minimum-user-limit-percent': '10',
                'maximum-applications': '1000',
                'acl-submit-applications': 'user1,user2',
                'acl-administer-queue': 'admin1,admin2',
            },
        };

        expect(params['queue-name']).toBe('root.production');
        expect(params.params.capacity).toBe('70');
        expect(params.params.queues).toBe('batch,interactive');
        expect(params.params['accessible-node-labels']).toBe('gpu,fpga');
    });

    it('should accept node label specific capacity', () => {
        const labelParams: QueueUpdateParams = {
            'queue-name': 'root.production',
            params: {
                'accessible-node-labels.gpu.capacity': '80',
                'accessible-node-labels.gpu.maximum-capacity': '100',
                'accessible-node-labels.fpga.capacity': '50',
            },
        };

        expect(labelParams.params['accessible-node-labels.gpu.capacity']).toBe('80');
        expect(labelParams.params['accessible-node-labels.fpga.capacity']).toBe('50');
    });
});

describe('GlobalUpdateParams interface', () => {
    it('should accept global scheduler parameters', () => {
        const globalParams: GlobalUpdateParams = {
            'yarn.scheduler.capacity.maximum-applications': '10000',
            'yarn.scheduler.capacity.maximum-am-resource-percent': '0.1',
            'yarn.scheduler.capacity.resource-calculator': 'org.apache.hadoop.yarn.util.resource.DefaultResourceCalculator',
            'yarn.scheduler.capacity.root.queues': 'production,development,marketing',
            'yarn.scheduler.capacity.queue-mappings-override.enable': 'true',
            'yarn.scheduler.capacity.per-node-heartbeat.maximum-offswitch-assignments': '1',
        };

        expect(globalParams['yarn.scheduler.capacity.maximum-applications']).toBe('10000');
        expect(globalParams['yarn.scheduler.capacity.root.queues']).toBe('production,development,marketing');
    });
});
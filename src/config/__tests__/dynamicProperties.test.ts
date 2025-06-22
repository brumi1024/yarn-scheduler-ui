// src/config/__tests__/dynamicProperties.test.ts
import { describe, it, expect } from 'vitest';
import { DynamicPropertyResolver } from '../dynamicProperties';
import { QUEUE_PROPERTIES } from '../queueProperties';

describe('DynamicPropertyResolver', () => {
    describe('resolveNodeLabelProperties', () => {
        it('should create capacity properties for each node label', () => {
            const nodeLabels = ['gpu', 'ssd'];
            const properties = DynamicPropertyResolver.resolveNodeLabelProperties(nodeLabels);

            // Should create 2 properties per label (capacity and max-capacity)
            expect(Object.keys(properties)).toHaveLength(4);
            
            expect(properties['accessible-node-labels.gpu.capacity']).toBeDefined();
            expect(properties['accessible-node-labels.gpu.maximum-capacity']).toBeDefined();
            expect(properties['accessible-node-labels.ssd.capacity']).toBeDefined();
            expect(properties['accessible-node-labels.ssd.maximum-capacity']).toBeDefined();
        });

        it('should set correct property attributes', () => {
            const properties = DynamicPropertyResolver.resolveNodeLabelProperties(['gpu']);
            const capacityProp = properties['accessible-node-labels.gpu.capacity'];

            expect(capacityProp.type).toBe('capacity');
            expect(capacityProp.defaultValue).toBe('0%');
            expect(capacityProp.group).toBe('resource');
            expect(capacityProp.label).toContain('gpu');
        });
    });

    describe('resolveTemplateProperties', () => {
        it('should create template versions of queue properties', () => {
            const properties = DynamicPropertyResolver.resolveTemplateProperties('root.parent', 'template');
            
            // Should create template versions of most properties
            const templateKeys = Object.keys(properties);
            expect(templateKeys.length).toBeGreaterThan(10);
            
            // Check a specific property
            expect(properties['auto-queue-creation-v2.template.capacity']).toBeDefined();
            expect(properties['auto-queue-creation-v2.template.capacity'].group).toBe('auto-creation');
        });

        it('should skip properties that dont make sense for templates', () => {
            const properties = DynamicPropertyResolver.resolveTemplateProperties('root.parent', 'template');
            
            // Should not include 'queues' or 'state'
            expect(properties['auto-queue-creation-v2.template.queues']).toBeUndefined();
            expect(properties['auto-queue-creation-v2.template.state']).toBeUndefined();
        });
    });

    describe('getAllPropertiesForQueue', () => {
        it('should combine static and dynamic properties', () => {
            const queue = {
                path: 'root.test',
                name: 'test',
                accessibleNodeLabels: ['gpu'],
                rawConfig: {
                    'auto-queue-creation-v2.enabled': 'true'
                },
                children: []
            };

            const properties = DynamicPropertyResolver.getAllPropertiesForQueue(queue);
            
            // Should include static properties
            expect(properties['capacity']).toBeDefined();
            
            // Should include node label properties
            expect(properties['accessible-node-labels.gpu.capacity']).toBeDefined();
            
            // Should include template properties
            expect(properties['auto-queue-creation-v2.template.capacity']).toBeDefined();
        });
    });
});
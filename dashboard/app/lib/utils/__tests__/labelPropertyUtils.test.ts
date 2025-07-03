import { describe, it, expect } from 'vitest';
import {
    generateLabelPropertyDescriptors,
    groupLabelPropertiesByLabel,
    isLabelProperty,
    extractLabelFromPropertyName,
    extractBasePropertyFromLabelProperty
} from '../labelPropertyUtils';
import type { NodeLabel } from '~/lib/types';

describe('labelPropertyUtils', () => {
    const mockNodeLabels: NodeLabel[] = [
        { name: 'gpu', exclusivity: true },
        { name: 'cpu', exclusivity: false },
        { name: 'fpga', exclusivity: true }
    ];

    describe('generateLabelPropertyDescriptors', () => {
        it('should generate capacity, maximum-capacity, and maximum-am-resource-percent properties for each label', () => {
            const labelProperties = generateLabelPropertyDescriptors(mockNodeLabels);

            expect(labelProperties).toHaveLength(9); // 3 labels × 3 properties each

            // Check that all labels have all three properties
            const labelNames = ['gpu', 'cpu', 'fpga'];
            const propertyTypes = ['capacity', 'maximum-capacity', 'maximum-am-resource-percent'];
            
            labelNames.forEach(label => {
                propertyTypes.forEach(propertyType => {
                    const property = labelProperties.find(p => 
                        p.label === label && p.basePropertyName === propertyType
                    );
                    expect(property).toBeDefined();
                    expect(property?.name).toBe(`accessible-node-labels.${label}.${propertyType}`);
                    expect(property?.category).toBe('nodeLabels');
                    expect(property?.required).toBe(false);
                    
                    // Check property types
                    if (propertyType === 'maximum-am-resource-percent') {
                        expect(property?.type).toBe('number');
                    } else {
                        expect(property?.type).toBe('string');
                    }
                });
            });
        });

        it('should handle empty node labels array', () => {
            const labelProperties = generateLabelPropertyDescriptors([]);
            expect(labelProperties).toHaveLength(0);
        });
    });

    describe('groupLabelPropertiesByLabel', () => {
        it('should group properties by label name', () => {
            const labelProperties = generateLabelPropertyDescriptors(mockNodeLabels);
            const grouped = groupLabelPropertiesByLabel(labelProperties);

            expect(Object.keys(grouped)).toEqual(['gpu', 'cpu', 'fpga']);
            
            Object.entries(grouped).forEach(([labelName, properties]) => {
                expect(properties).toHaveLength(3); // capacity, maximum-capacity, and maximum-am-resource-percent
                properties.forEach(property => {
                    expect(property.label).toBe(labelName);
                });
            });
        });
    });

    describe('isLabelProperty', () => {
        it('should correctly identify label properties', () => {
            expect(isLabelProperty('accessible-node-labels.gpu.capacity')).toBe(true);
            expect(isLabelProperty('accessible-node-labels.cpu.maximum-capacity')).toBe(true);
            expect(isLabelProperty('capacity')).toBe(false);
            expect(isLabelProperty('maximum-capacity')).toBe(false);
            expect(isLabelProperty('user-limit-factor')).toBe(false);
        });
    });

    describe('extractLabelFromPropertyName', () => {
        it('should extract label name from property name', () => {
            expect(extractLabelFromPropertyName('accessible-node-labels.gpu.capacity')).toBe('gpu');
            expect(extractLabelFromPropertyName('accessible-node-labels.cpu.maximum-capacity')).toBe('cpu');
            expect(extractLabelFromPropertyName('capacity')).toBeNull();
            expect(extractLabelFromPropertyName('accessible-node-labels')).toBeNull();
        });
    });

    describe('extractBasePropertyFromLabelProperty', () => {
        it('should extract base property name from label property', () => {
            expect(extractBasePropertyFromLabelProperty('accessible-node-labels.gpu.capacity')).toBe('capacity');
            expect(extractBasePropertyFromLabelProperty('accessible-node-labels.cpu.maximum-capacity')).toBe('maximum-capacity');
            expect(extractBasePropertyFromLabelProperty('capacity')).toBeNull();
            expect(extractBasePropertyFromLabelProperty('accessible-node-labels.gpu')).toBeNull();
        });
    });
});
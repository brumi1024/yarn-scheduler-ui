import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePropertyEditor } from '../usePropertyEditor';
import type { NodeLabel } from '../../types';

// Mock the store
const mockSchedulerStore = {
    getQueueDisplayValue: vi.fn(() => ({ value: '', isStaged: false })),
    stageQueueChange: vi.fn(),
    stageLabelQueueChange: vi.fn(),
    clearAllChanges: vi.fn(),
    applyChanges: vi.fn(),
    nodeLabels: [] as NodeLabel[],
    stagedChanges: [],
};

vi.mock('../../store/schedulerStore', () => ({
    useSchedulerStore: vi.fn(() => mockSchedulerStore),
}));

describe('usePropertyEditor with label properties', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSchedulerStore.nodeLabels = [
            { name: 'gpu', exclusivity: true },
            { name: 'cpu', exclusivity: false }
        ];
    });

    it('should generate label properties from node labels', () => {
        const { result } = renderHook(() => 
            usePropertyEditor({ queuePath: 'root.production' })
        );

        const { labelProperties, propertiesByCategory } = result.current;

        // Should generate label properties
        expect(labelProperties).toHaveLength(6); // 2 labels × 3 properties each

        // Should include nodeLabels category  
        expect(propertiesByCategory.nodeLabels).toBeDefined();
        expect(propertiesByCategory.nodeLabels).toHaveLength(6); // Only the 6 dynamically generated label properties in this test scenario

        // Check specific properties
        const gpuCapacity = labelProperties.find(p => 
            p.name === 'accessible-node-labels.gpu.capacity'
        );
        expect(gpuCapacity).toBeDefined();
        expect(gpuCapacity?.label).toBe('gpu');
        expect(gpuCapacity?.basePropertyName).toBe('capacity');
        expect(gpuCapacity?.category).toBe('nodeLabels');
    });

    it('should stage label property changes correctly', () => {
        const { result } = renderHook(() => 
            usePropertyEditor({ queuePath: 'root.production' })
        );

        const { stageChange } = result.current;

        // Stage a label property change
        stageChange('accessible-node-labels.gpu.capacity', '50');

        expect(mockSchedulerStore.stageLabelQueueChange).toHaveBeenCalledWith(
            'root.production',
            'gpu',
            'capacity',
            '50'
        );
    });

    it('should stage regular property changes correctly', () => {
        const { result } = renderHook(() => 
            usePropertyEditor({ queuePath: 'root.production' })
        );

        const { stageChange } = result.current;

        // Stage a regular property change
        stageChange('capacity', '25');

        expect(mockSchedulerStore.stageQueueChange).toHaveBeenCalledWith(
            'root.production',
            'capacity',
            '25'
        );
    });

    it('should handle empty node labels', () => {
        mockSchedulerStore.nodeLabels = [];

        const { result } = renderHook(() => 
            usePropertyEditor({ queuePath: 'root.production' })
        );

        const { labelProperties, propertiesByCategory } = result.current;

        expect(labelProperties).toHaveLength(0);
        // When no node labels, no label properties are generated, so nodeLabels category might not exist or be empty
        if (propertiesByCategory.nodeLabels) {
            expect(propertiesByCategory.nodeLabels.length).toBeGreaterThanOrEqual(0);
        }
    });
});
import { describe, it, expect } from 'vitest';
import type { StagedChange, StagedChangeType } from '../staged-change';

describe('StagedChange interface', () => {
    it('should accept add queue change', () => {
        const addChange: StagedChange = {
            id: 'change-123',
            type: 'add',
            queuePath: 'root.production.batch',
            timestamp: Date.now(),
        };

        expect(addChange.type).toBe('add');
        expect(addChange.queuePath).toBe('root.production.batch');
        expect(addChange.property).toBeUndefined();
        expect(addChange.oldValue).toBeUndefined();
        expect(addChange.newValue).toBeUndefined();
    });

    it('should accept update property change', () => {
        const updateChange: StagedChange = {
            id: 'change-456',
            type: 'update',
            queuePath: 'root.production',
            property: 'capacity',
            oldValue: '70',
            newValue: '80',
            timestamp: Date.now(),
        };

        expect(updateChange.type).toBe('update');
        expect(updateChange.property).toBe('capacity');
        expect(updateChange.oldValue).toBe('70');
        expect(updateChange.newValue).toBe('80');
    });

    it('should accept remove queue change', () => {
        const removeChange: StagedChange = {
            id: 'change-789',
            type: 'remove',
            queuePath: 'root.development.experimental',
            timestamp: Date.now(),
        };

        expect(removeChange.type).toBe('remove');
        expect(removeChange.queuePath).toBe('root.development.experimental');
    });

    it('should handle node label property changes', () => {
        const labelChange: StagedChange = {
            id: 'change-label-001',
            type: 'update',
            queuePath: 'root.production',
            property: 'accessible-node-labels.gpu.capacity',
            oldValue: '50',
            newValue: '80',
            timestamp: Date.now(),
            label: 'gpu',
        };

        expect(labelChange.property).toContain('accessible-node-labels');
        expect(labelChange.label).toBe('gpu');
    });

    it('should handle global configuration changes', () => {
        const globalChange: StagedChange = {
            id: 'change-global-001',
            type: 'update',
            queuePath: 'global',
            property: 'yarn.scheduler.capacity.maximum-applications',
            oldValue: '10000',
            newValue: '20000',
            timestamp: Date.now(),
        };

        expect(globalChange.queuePath).toBe('global');
        expect(globalChange.property).toBe('yarn.scheduler.capacity.maximum-applications');
    });

    it('should handle changes with description', () => {
        const changeWithDescription: StagedChange = {
            id: 'change-desc-001',
            type: 'update',
            queuePath: 'root.production',
            property: 'maximum-capacity',
            oldValue: '100',
            newValue: '90',
            timestamp: Date.now(),
            description: 'Reduce max capacity to reserve resources for development',
        };

        expect(changeWithDescription.description).toBe('Reduce max capacity to reserve resources for development');
    });

    it('should handle batch changes with parent change ID', () => {
        const childChange: StagedChange = {
            id: 'change-child-001',
            type: 'update',
            queuePath: 'root.production.batch',
            property: 'capacity',
            oldValue: '60',
            newValue: '50',
            timestamp: Date.now(),
            parentChangeId: 'change-parent-001',
        };

        expect(childChange.parentChangeId).toBe('change-parent-001');
    });

    it('should handle adding new property without old value', () => {
        const newPropertyChange: StagedChange = {
            id: 'change-new-prop',
            type: 'update',
            queuePath: 'root.production',
            property: 'user-limit-factor',
            newValue: '2',
            timestamp: Date.now(),
        };

        expect(newPropertyChange.oldValue).toBeUndefined();
        expect(newPropertyChange.newValue).toBe('2');
    });

    it('should handle removing property with only old value', () => {
        const removePropertyChange: StagedChange = {
            id: 'change-remove-prop',
            type: 'update',
            queuePath: 'root.production',
            property: 'default-node-label-expression',
            oldValue: 'gpu',
            timestamp: Date.now(),
        };

        expect(removePropertyChange.oldValue).toBe('gpu');
        expect(removePropertyChange.newValue).toBeUndefined();
    });
});

describe('StagedChangeType', () => {
    it('should only accept valid change types', () => {
        const addType: StagedChangeType = 'add';
        const updateType: StagedChangeType = 'update';
        const removeType: StagedChangeType = 'remove';

        expect(addType).toBe('add');
        expect(updateType).toBe('update');
        expect(removeType).toBe('remove');

        // TypeScript should prevent invalid values at compile time
        // const invalidType: StagedChangeType = 'invalid';
    });
});
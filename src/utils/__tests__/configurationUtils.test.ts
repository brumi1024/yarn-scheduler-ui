/**
 * Tests for configuration utility functions
 */

import { createChangeSetsFromFormData, convertFormDataToYarnConfig, validateChange } from '../configurationUtils';

describe('configurationUtils', () => {
    describe('createChangeSetsFromFormData', () => {
        it('should create ChangeSet objects for changed properties', () => {
            const queuePath = 'root.test';
            const formData = {
                capacity: '50%',
                'maximum-capacity': '80%',
                state: 'RUNNING',
                'user-limit-factor': 2,
            };

            const currentQueue = {
                queueName: 'test',
                capacity: 30,
                maxCapacity: 100,
                state: 'STOPPED',
                userLimitFactor: 1,
            };

            const changes = createChangeSetsFromFormData(queuePath, formData, currentQueue);

            expect(changes).toHaveLength(4); // All properties changed

            const capacityChange = changes.find((c) => c.property === 'capacity');
            expect(capacityChange).toBeDefined();
            expect(capacityChange?.queueName).toBe(queuePath);
            expect(capacityChange?.oldValue).toBe('30');
            expect(capacityChange?.newValue).toBe('50');
            expect(capacityChange?.type).toBe('update-queue');
            expect(capacityChange?.id).toBeDefined();
            expect(capacityChange?.timestamp).toBeInstanceOf(Date);

            const stateChange = changes.find((c) => c.property === 'state');
            expect(stateChange?.oldValue).toBe('STOPPED');
            expect(stateChange?.newValue).toBe('RUNNING');
        });

        it('should not create ChangeSet objects for unchanged properties', () => {
            const queuePath = 'root.test';
            const formData = {
                capacity: '30%',
                state: 'RUNNING',
            };

            const currentQueue = {
                queueName: 'test',
                capacity: 30,
                state: 'RUNNING',
            };

            const changes = createChangeSetsFromFormData(queuePath, formData, currentQueue);

            expect(changes).toHaveLength(0); // No changes
        });

        it('should handle missing current queue', () => {
            const queuePath = 'root.new';
            const formData = {
                capacity: '50%',
                state: 'RUNNING',
            };

            const changes = createChangeSetsFromFormData(queuePath, formData);

            expect(changes).toHaveLength(2); // All properties are "changes" since no current values

            const capacityChange = changes.find((c) => c.property === 'capacity');
            expect(capacityChange?.oldValue).toBe('');
            expect(capacityChange?.newValue).toBe('50');
        });
    });

    describe('convertFormDataToYarnConfig', () => {
        it('should convert form data to YARN configuration format', () => {
            const formData = {
                capacity: '50%',
                'maximum-capacity': '80%',
                state: 'RUNNING',
                'user-limit-factor': 2,
                disable_preemption: true,
                'unknown-field': 'should be ignored',
            };

            const yarnConfig = convertFormDataToYarnConfig(formData);

            expect(yarnConfig).toEqual({
                capacity: '50',
                'maximum-capacity': '80',
                state: 'RUNNING',
                'user-limit-factor': '2',
                disable_preemption: 'true',
            });
        });

        it('should handle array values', () => {
            const formData = {
                'accessible-node-labels': ['label1', 'label2'],
            };

            const yarnConfig = convertFormDataToYarnConfig(formData);

            expect(yarnConfig).toEqual({
                'accessible-node-labels': 'label1,label2',
            });
        });
    });

    describe('validateChange', () => {
        it('should validate valid changes', () => {
            const change = {
                id: 'test-1',
                timestamp: new Date(),
                type: 'update-queue' as const,
                queueName: 'root.test',
                property: 'capacity',
                oldValue: '30',
                newValue: '50',
                description: 'Update capacity',
            };

            const result = validateChange(change);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should reject invalid capacity values', () => {
            const change = {
                id: 'test-1',
                timestamp: new Date(),
                type: 'update-queue' as const,
                queueName: 'root.test',
                property: 'capacity',
                oldValue: '30',
                newValue: '150', // Invalid - over 100%
                description: 'Update capacity',
            };

            const result = validateChange(change);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('between 0 and 100');
        });

        it('should reject invalid state values', () => {
            const change = {
                id: 'test-1',
                timestamp: new Date(),
                type: 'update-queue' as const,
                queueName: 'root.test',
                property: 'state',
                oldValue: 'RUNNING',
                newValue: 'INVALID_STATE',
                description: 'Update state',
            };

            const result = validateChange(change);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('RUNNING or STOPPED');
        });

        it('should reject changes without required fields', () => {
            const change = {
                id: 'test-1',
                timestamp: new Date(),
                type: 'update-queue' as const,
                queueName: '', // Missing
                property: 'capacity',
                oldValue: '30',
                newValue: '50',
                description: 'Update capacity',
            };

            const result = validateChange(change);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Queue name is required');
        });
    });
});

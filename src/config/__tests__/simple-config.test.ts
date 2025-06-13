/**
 * Tests for the simplified configuration system
 */

import { describe, test, expect } from 'vitest';
import {
    getQueuePropertyGroups,
    getGlobalPropertyGroups,
    getNodeLabelProperties,
    getPropertyDefinition,
    validateSingleProperty,
    validateMultipleProperties,
    buildYarnPropertyKey,
    extractQueuePath,
    getDefaultValue,
    isPropertyRequired,
    getPropertyType,
    getPropertyOptions,
} from '../simple-config';

describe('Simplified Configuration System', () => {
    describe('Property Groups', () => {
        test('should get queue property groups', () => {
            const groups = getQueuePropertyGroups();
            expect(groups).toBeDefined();
            expect(groups.length).toBeGreaterThan(0);
            
            // Check that we have expected groups
            const groupNames = groups.map(g => g.groupName);
            expect(groupNames).toContain('Core Properties');
            expect(groupNames).toContain('Resource Limits & Management');
            expect(groupNames).toContain('Advanced Settings');
            expect(groupNames).toContain('Auto-Queue Creation');
        });

        test('should get global property groups', () => {
            const groups = getGlobalPropertyGroups();
            expect(groups).toBeDefined();
            expect(groups.length).toBeGreaterThan(0);
            
            const groupNames = groups.map(g => g.groupName);
            expect(groupNames).toContain('General Scheduler Settings');
            expect(groupNames).toContain('Global Application Management');
        });

        test('should get node label properties', () => {
            const properties = getNodeLabelProperties();
            expect(properties).toBeDefined();
            expect(properties.length).toBeGreaterThan(0);
            
            const keys = properties.map(p => p.key);
            expect(keys).toContain('accessible-node-labels');
        });
    });

    describe('Property Lookup', () => {
        test('should find property by key', () => {
            const property = getPropertyDefinition('capacity');
            expect(property).toBeDefined();
            expect(property?.displayName).toBe('Capacity');
            expect(property?.type).toBe('string');
        });

        test('should return undefined for unknown property', () => {
            const property = getPropertyDefinition('unknown-property');
            expect(property).toBeUndefined();
        });

        test('should get default value', () => {
            const defaultValue = getDefaultValue('capacity');
            expect(defaultValue).toBe('10%');
        });

        test('should check if property is required', () => {
            const isRequired = isPropertyRequired('capacity');
            expect(isRequired).toBe(true);
        });

        test('should get property type', () => {
            const type = getPropertyType('capacity');
            expect(type).toBe('string');
        });

        test('should get property options for enum', () => {
            const options = getPropertyOptions('state');
            expect(options).toEqual(['RUNNING', 'STOPPED']);
        });
    });

    describe('Property Validation', () => {
        test('should validate valid string property', () => {
            const result = validateSingleProperty('capacity', '10%');
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        test('should validate invalid enum property', () => {
            const result = validateSingleProperty('state', 'INVALID');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Must be one of: RUNNING, STOPPED');
        });

        test('should validate boolean property', () => {
            const validResult = validateSingleProperty('disable_preemption', true);
            expect(validResult.valid).toBe(true);

            const invalidResult = validateSingleProperty('disable_preemption', 'invalid');
            expect(invalidResult.valid).toBe(false);
        });

        test('should validate number property', () => {
            const validResult = validateSingleProperty('user-limit-factor', 1.5);
            expect(validResult.valid).toBe(true);

            const invalidResult = validateSingleProperty('user-limit-factor', 'not-a-number');
            expect(invalidResult.valid).toBe(false);
        });

        test('should validate percentage property', () => {
            const validResult = validateSingleProperty('maximum-am-resource-percent', 0.1);
            expect(validResult.valid).toBe(true);

            const invalidResult = validateSingleProperty('maximum-am-resource-percent', 1.5);
            expect(invalidResult.valid).toBe(false);
            expect(invalidResult.error).toBe('Must be a number between 0 and 1');
        });

        test('should validate multiple properties', () => {
            const properties = {
                'capacity': '10%',
                'state': 'RUNNING',
                'user-limit-factor': 1,
            };

            const result = validateMultipleProperties(properties);
            expect(result.valid).toBe(true);
            expect(Object.keys(result.errors)).toHaveLength(0);
        });

        test('should return errors for invalid properties', () => {
            const properties = {
                'capacity': '10%',
                'state': 'INVALID_STATE',
                'user-limit-factor': 'not-a-number',
            };

            const result = validateMultipleProperties(properties);
            expect(result.valid).toBe(false);
            expect(result.errors['state']).toBe('Must be one of: RUNNING, STOPPED');
            expect(result.errors['user-limit-factor']).toBe('Must be a valid number');
        });
    });

    describe('YARN Property Key Utilities', () => {
        test('should build YARN property key', () => {
            const key = buildYarnPropertyKey('root.production', 'capacity');
            expect(key).toBe('yarn.scheduler.capacity.root.production.capacity');
        });

        test('should extract queue path from YARN property key', () => {
            const queuePath = extractQueuePath('yarn.scheduler.capacity.root.production.capacity');
            expect(queuePath).toBe('root.production');
        });

        test('should return null for invalid YARN property key', () => {
            const queuePath = extractQueuePath('invalid.property.key');
            expect(queuePath).toBeNull();
        });

        test('should handle nested queue paths', () => {
            const queuePath = extractQueuePath('yarn.scheduler.capacity.root.team1.dev.capacity');
            expect(queuePath).toBe('root.team1.dev');
        });
    });

    describe('Property Organization', () => {
        test('should organize properties correctly', () => {
            const queueGroups = getQueuePropertyGroups();
            
            // Check core properties are in the right group
            const coreGroup = queueGroups.find(g => g.groupName === 'Core Properties');
            expect(coreGroup).toBeDefined();
            
            const coreKeys = coreGroup!.properties.map(p => p.key);
            expect(coreKeys).toContain('capacity');
            expect(coreKeys).toContain('maximum-capacity');
            expect(coreKeys).toContain('state');
        });

        test('should have auto-creation properties in separate group', () => {
            const queueGroups = getQueuePropertyGroups();
            
            const autoGroup = queueGroups.find(g => g.groupName === 'Auto-Queue Creation');
            expect(autoGroup).toBeDefined();
            
            const autoKeys = autoGroup!.properties.map(p => p.key);
            expect(autoKeys).toContain('auto-create-child-queue.enabled');
            expect(autoKeys).toContain('auto-queue-creation-v2.enabled');
        });
    });
});
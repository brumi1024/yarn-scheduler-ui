/**
 * Test file to verify staged changes integration in useQueueDataProcessor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQueueDataProcessor } from '../useQueueDataProcessor';
import { useChangesStore } from '../../../../store';
import type { ChangeSet, ConfigurationResponse, SchedulerResponse } from '../../../../types/Configuration';

// Mock the useConfigParser hook
vi.mock('../../../../yarn-parser/useConfigParser', () => ({
    useConfigParser: vi.fn(() => ({
        data: {
            queues: [{
                name: 'root',
                path: 'root',
                capacity: { numericValue: 100 },
                maxCapacity: { numericValue: 100 },
                state: 'RUNNING',
                children: [{
                    name: 'default',
                    path: 'root.default',
                    capacity: { numericValue: 50 },
                    maxCapacity: { numericValue: 50 },
                    state: 'RUNNING',
                    children: []
                }]
            }],
            errors: []
        },
        isLoading: false,
        error: null
    }))
}));

// Mock the changes store
vi.mock('../../../../store', () => ({
    useChangesStore: vi.fn()
}));

describe('useQueueDataProcessor - Staged Changes Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockConfigQuery = {
        data: {
            properties: { 'root.default.capacity': '50' },
            'queue-mappings': []
        } as ConfigurationResponse,
        isLoading: false,
        error: null
    };

    const mockSchedulerQuery = {
        data: {
            scheduler: {
                schedulerInfo: {
                    queuePath: 'root',
                    queueName: 'root',
                    capacity: 100,
                    usedCapacity: 0,
                    queues: {
                        queue: [{
                            queuePath: 'root.default',
                            queueName: 'default',
                            capacity: 50,
                            usedCapacity: 10
                        }]
                    }
                }
            }
        } as SchedulerResponse,
        isLoading: false,
        error: null
    };

    it('should apply PROPERTY_UPDATE changes to queue hierarchy', () => {
        const mockChanges: ChangeSet[] = [{
            id: 'test-change-1',
            type: 'PROPERTY_UPDATE',
            queuePath: 'root.default',
            property: 'capacity',
            oldValue: '50',
            newValue: '75',
            timestamp: new Date()
        }];

        (useChangesStore as any).mockReturnValue(mockChanges);

        const { result } = renderHook(() => 
            useQueueDataProcessor(mockConfigQuery, mockSchedulerQuery)
        );

        expect(result.current.nodes).toHaveLength(2); // root + default
        
        const defaultQueue = result.current.nodes.find(node => node.id === 'root.default');
        expect(defaultQueue).toBeDefined();
        expect(defaultQueue?.data.capacity).toBe(75); // Should be updated from staged change
        expect(defaultQueue?.data.stagedStatus).toBe('modified');
    });

    it('should apply ADD_QUEUE changes to queue hierarchy', () => {
        const mockChanges: ChangeSet[] = [{
            id: 'test-change-2',
            type: 'ADD_QUEUE',
            queuePath: 'root.default',
            property: 'root.default.newqueue',
            oldValue: null,
            newValue: {
                capacity: 20,
                maxCapacity: 100,
                state: 'RUNNING'
            },
            timestamp: new Date()
        }];

        (useChangesStore as any).mockReturnValue(mockChanges);

        const { result } = renderHook(() => 
            useQueueDataProcessor(mockConfigQuery, mockSchedulerQuery)
        );

        expect(result.current.nodes).toHaveLength(3); // root + default + newqueue
        
        const newQueue = result.current.nodes.find(node => node.id === 'root.default.newqueue');
        expect(newQueue).toBeDefined();
        expect(newQueue?.data.capacity).toBe(20);
        expect(newQueue?.data.stagedStatus).toBe('new');
    });

    it('should apply DELETE_QUEUE changes to queue hierarchy', () => {
        const mockChanges: ChangeSet[] = [{
            id: 'test-change-3',
            type: 'DELETE_QUEUE',
            queuePath: 'root.default',
            property: 'default',
            oldValue: {},
            newValue: null,
            timestamp: new Date()
        }];

        (useChangesStore as any).mockReturnValue(mockChanges);

        const { result } = renderHook(() => 
            useQueueDataProcessor(mockConfigQuery, mockSchedulerQuery)
        );

        const defaultQueue = result.current.nodes.find(node => node.id === 'root.default');
        expect(defaultQueue).toBeDefined();
        expect(defaultQueue?.data.stagedStatus).toBe('deleted');
    });

    it('should handle no staged changes correctly', () => {
        const mockChanges: ChangeSet[] = [];
        (useChangesStore as any).mockReturnValue(mockChanges);

        const { result } = renderHook(() => 
            useQueueDataProcessor(mockConfigQuery, mockSchedulerQuery)
        );

        expect(result.current.nodes).toHaveLength(2); // root + default
        
        const defaultQueue = result.current.nodes.find(node => node.id === 'root.default');
        expect(defaultQueue?.data.stagedStatus).toBeUndefined();
    });
});
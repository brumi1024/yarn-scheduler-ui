import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDataStore } from '../dataStore';
import { apiService } from '../../api/ApiService';
import type { SchedulerResponse, ConfigurationResponse } from '../../types/Configuration';
import type { NodeLabelsResponse, NodesResponse } from '../../types/NodeLabel';

// Mock the API service
vi.mock('../../api/ApiService', () => ({
    apiService: {
        getScheduler: vi.fn(),
        getConfiguration: vi.fn(),
        getNodeLabels: vi.fn(),
        getNodes: vi.fn(),
    },
}));

const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('dataStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useDataStore.setState({
            scheduler: null,
            configuration: null,
            nodeLabels: null,
            nodes: null,
            loading: {
                scheduler: false,
                configuration: false,
                nodeLabels: false,
                nodes: false,
            },
            errors: {
                scheduler: null,
                configuration: null,
                nodeLabels: null,
                nodes: null,
            },
            lastUpdated: {},
        });

        // Reset mocks
        vi.clearAllMocks();
    });

    describe('initial state', () => {
        it('should have correct initial state', () => {
            const state = useDataStore.getState();
            
            expect(state.scheduler).toBeNull();
            expect(state.configuration).toBeNull();
            expect(state.nodeLabels).toBeNull();
            expect(state.nodes).toBeNull();
            
            expect(state.loading).toEqual({
                scheduler: false,
                configuration: false,
                nodeLabels: false,
                nodes: false,
            });
            
            expect(state.errors).toEqual({
                scheduler: null,
                configuration: null,
                nodeLabels: null,
                nodes: null,
            });
            
            expect(state.lastUpdated).toEqual({});
        });
    });


    describe('clearError', () => {
        it('should clear all errors', () => {
            const error = new Error('Test error');
            
            // Set some errors first
            useDataStore.setState({
                errors: {
                    scheduler: error,
                    configuration: error,
                    nodeLabels: error,
                    nodes: error,
                },
            });

            const { clearError } = useDataStore.getState();
            clearError();

            const state = useDataStore.getState();
            expect(state.errors).toEqual({
                scheduler: null,
                configuration: null,
                nodeLabels: null,
                nodes: null,
            });
        });

        it('should not affect other state properties', () => {
            const mockScheduler: SchedulerResponse = {
                scheduler: {
                    schedulerInfo: {
                        type: 'capacityScheduler',
                        capacity: 100,
                        usedCapacity: 0,
                        maxCapacity: 100,
                        queueName: 'root',
                        queues: {
                            queue: []
                        }
                    }
                }
            };

            const error = new Error('Test error');
            
            // Set state with data and errors
            useDataStore.setState({
                scheduler: mockScheduler,
                loading: { scheduler: true, configuration: false, nodeLabels: false, nodes: false },
                errors: {
                    scheduler: error,
                    configuration: null,
                    nodeLabels: null,
                    nodes: null,
                },
                lastUpdated: { scheduler: 123456789 },
            });

            const { clearError } = useDataStore.getState();
            clearError();

            const state = useDataStore.getState();

            // Errors should be cleared
            expect(state.errors).toEqual({
                scheduler: null,
                configuration: null,
                nodeLabels: null,
                nodes: null,
            });

            // Other properties should remain unchanged
            expect(state.scheduler).toEqual(mockScheduler);
            expect(state.loading.scheduler).toBe(true);
            expect(state.lastUpdated.scheduler).toBe(123456789);
        });
    });
});
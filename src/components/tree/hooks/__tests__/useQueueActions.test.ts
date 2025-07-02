import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQueueActions } from '../useQueueActions';
import { useSchedulerStore } from '../../../../store/schedulerStore';
import type { QueueNode } from '../../../../types';

// Mock the scheduler store
vi.mock('../../../../store/schedulerStore');

describe('useQueueActions', () => {
    const mockStoreActions = {
        stageQueueAddition: vi.fn(),
        stageQueueRemoval: vi.fn(),
        stageQueueChange: vi.fn(),
        getQueueByPath: vi.fn(),
    };

    const mockQueueTree: QueueNode = {
        path: 'root',
        name: 'root',
        type: 'parent',
        properties: new Map([
            ['capacity', '100'],
            ['state', 'RUNNING'],
        ]),
        children: [
            {
                path: 'root.default',
                name: 'default',
                type: 'leaf',
                properties: new Map([
                    ['capacity', '30'],
                    ['state', 'RUNNING'],
                ]),
                children: [],
                labelConfigs: new Map(),
            },
            {
                path: 'root.production',
                name: 'production',
                type: 'parent',
                properties: new Map([
                    ['capacity', '70'],
                    ['state', 'RUNNING'],
                ]),
                children: [],
                labelConfigs: new Map(),
            },
        ],
        labelConfigs: new Map(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useSchedulerStore as any).mockImplementation((selector) => {
            const state = {
                ...mockStoreActions,
                queueTree: mockQueueTree,
            };
            return selector ? selector(state) : state;
        });
    });

    describe('addChildQueue', () => {
        it('should add a child queue with valid name and config', () => {
            mockStoreActions.getQueueByPath.mockReturnValue(mockQueueTree);

            const { result } = renderHook(() => useQueueActions());

            act(() => {
                result.current.addChildQueue('root', 'newqueue', {
                    capacity: '10',
                    'maximum-capacity': '100',
                });
            });

            expect(mockStoreActions.stageQueueAddition).toHaveBeenCalledWith(
                'root',
                'newqueue',
                {
                    capacity: '10',
                    'maximum-capacity': '100',
                }
            );
        });

        it('should throw error if queue name contains dots', () => {
            const { result } = renderHook(() => useQueueActions());

            expect(() => {
                result.current.addChildQueue('root', 'new.queue', {});
            }).toThrow('Queue name cannot contain dots');
        });

        it('should throw error if parent queue does not exist', () => {
            mockStoreActions.getQueueByPath.mockReturnValue(null);

            const { result } = renderHook(() => useQueueActions());

            expect(() => {
                result.current.addChildQueue('root.nonexistent', 'newqueue', {});
            }).toThrow('Parent queue not found');
        });
    });

    describe('deleteQueue', () => {
        it('should delete a queue without children', () => {
            mockStoreActions.getQueueByPath.mockReturnValue({
                path: 'root.default',
                name: 'default',
                type: 'leaf',
                properties: new Map(),
                children: [],
            });

            const { result } = renderHook(() => useQueueActions());

            act(() => {
                result.current.deleteQueue('root.default');
            });

            expect(mockStoreActions.stageQueueRemoval).toHaveBeenCalledWith('root.default');
        });

        it('should throw error if queue has children', () => {
            mockStoreActions.getQueueByPath.mockReturnValue({
                path: 'root.production',
                name: 'production',
                type: 'parent',
                properties: new Map(),
                children: [{ path: 'root.production.child' }],
            });

            const { result } = renderHook(() => useQueueActions());

            expect(() => {
                result.current.deleteQueue('root.production');
            }).toThrow('Cannot delete queue with children');
        });

        it('should throw error if queue does not exist', () => {
            mockStoreActions.getQueueByPath.mockReturnValue(null);

            const { result } = renderHook(() => useQueueActions());

            expect(() => {
                result.current.deleteQueue('root.nonexistent');
            }).toThrow('Queue not found');
        });

        it('should not allow deleting root queue', () => {
            const { result } = renderHook(() => useQueueActions());

            expect(() => {
                result.current.deleteQueue('root');
            }).toThrow('Cannot delete root queue');
        });
    });

    describe('updateQueueProperty', () => {
        it('should update a queue property', () => {
            const { result } = renderHook(() => useQueueActions());

            act(() => {
                result.current.updateQueueProperty('root.default', 'capacity', '40');
            });

            expect(mockStoreActions.stageQueueChange).toHaveBeenCalledWith(
                'root.default',
                'capacity',
                '40'
            );
        });
    });

    describe('validation methods', () => {
        it('canAddChildQueue should return true for valid parent', () => {
            mockStoreActions.getQueueByPath.mockReturnValue(mockQueueTree);

            const { result } = renderHook(() => useQueueActions());

            expect(result.current.canAddChildQueue('root')).toBe(true);
        });

        it('canAddChildQueue should return false for non-existent parent', () => {
            mockStoreActions.getQueueByPath.mockReturnValue(null);

            const { result } = renderHook(() => useQueueActions());

            expect(result.current.canAddChildQueue('root.nonexistent')).toBe(false);
        });

        it('canDeleteQueue should return true for leaf queue', () => {
            mockStoreActions.getQueueByPath.mockReturnValue({
                path: 'root.default',
                name: 'default',
                type: 'leaf',
                properties: new Map(),
                children: [],
            });

            const { result } = renderHook(() => useQueueActions());

            expect(result.current.canDeleteQueue('root.default')).toBe(true);
        });

        it('canDeleteQueue should return false for queue with children', () => {
            mockStoreActions.getQueueByPath.mockReturnValue({
                path: 'root',
                name: 'root',
                type: 'parent',
                properties: new Map(),
                children: [{ path: 'root.child' }],
            });

            const { result } = renderHook(() => useQueueActions());

            expect(result.current.canDeleteQueue('root')).toBe(false);
        });

        it('canDeleteQueue should return false for root queue', () => {
            const { result } = renderHook(() => useQueueActions());

            expect(result.current.canDeleteQueue('root')).toBe(false);
        });
    });
});
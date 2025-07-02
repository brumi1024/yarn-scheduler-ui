import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NodesPanel } from '../NodesPanel';

// Mock the scheduler store
const mockGetQueueDisplayValue = vi.fn();
const mockStageQueueChange = vi.fn();
const mockStagedChanges = vi.fn(() => []);

const mockSchedulerData = {
    queueName: 'root',
    queuePath: 'root',
    type: 'capacityScheduler',
    queues: {
        queue: [
            {
                queueName: 'default',
                queuePath: 'root.default',
                type: 'capacitySchedulerLeafQueueInfo',
            },
            {
                queueName: 'production',
                queuePath: 'root.production',
                type: 'capacityScheduler',
                queues: {
                    queue: [
                        {
                            queueName: 'batch',
                            queuePath: 'root.production.batch',
                            type: 'capacitySchedulerLeafQueueInfo',
                        },
                    ],
                },
            },
        ],
    },
};

const createMockState = (overrides = {}) => ({
    selectedNodeLabel: 'gpu',
    schedulerData: mockSchedulerData,
    getQueueDisplayValue: mockGetQueueDisplayValue,
    stageQueueChange: mockStageQueueChange,
    stagedChanges: mockStagedChanges(),
    ...overrides,
});

vi.mock('../../../store/schedulerStore', () => ({
    useSchedulerStore: vi.fn((selector: any) => {
        const state = createMockState();
        return selector(state);
    }),
}));

describe('NodesPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStagedChanges.mockReturnValue([]);
        mockGetQueueDisplayValue.mockReturnValue({ value: '', isStaged: false });
    });

    it('should show empty state when no label is selected', () => {
        const { useSchedulerStore } = require('../../../store/schedulerStore');
        useSchedulerStore.mockImplementation((selector: any) => {
            const state = createMockState({
                selectedNodeLabel: null,
            });
            return selector(state);
        });

        render(<NodesPanel />);
        
        expect(screen.getByText('No Label Selected')).toBeInTheDocument();
        expect(screen.getByText(/Select a node label from the left panel/)).toBeInTheDocument();
    });

    it('should show configuration for selected label', () => {
        render(<NodesPanel />);
        
        expect(screen.getByText('Queue Configuration for "gpu" Label')).toBeInTheDocument();
        expect(screen.getByText(/Configure how much of the gpu label's resources/)).toBeInTheDocument();
    });

    it('should render queue accordions for each queue', () => {
        render(<NodesPanel />);
        
        expect(screen.getByText('root')).toBeInTheDocument();
        expect(screen.getByText('default')).toBeInTheDocument();
        expect(screen.getByText('production')).toBeInTheDocument();
        expect(screen.getByText('batch')).toBeInTheDocument();
    });

    it('should show queue paths in accordions', () => {
        render(<NodesPanel />);
        
        expect(screen.getByText('(root)')).toBeInTheDocument();
        expect(screen.getByText('(root.default)')).toBeInTheDocument();
        expect(screen.getByText('(root.production)')).toBeInTheDocument();
        expect(screen.getByText('(root.production.batch)')).toBeInTheDocument();
    });

    it('should show "Has Changes" chip for queues with staged changes', () => {
        mockStagedChanges.mockReturnValue([
            {
                id: '1',
                queuePath: 'root.default',
                property: 'accessible-node-labels.gpu.capacity',
                newValue: '50',
                type: 'update',
            },
        ]);

        render(<NodesPanel />);
        
        expect(screen.getByText('Has Changes')).toBeInTheDocument();
    });

    it('should expand accordion and show capacity fields', async () => {
        const user = userEvent.setup();
        mockGetQueueDisplayValue.mockImplementation((queuePath: string, property: string) => {
            if (property === 'accessible-node-labels') return { value: 'gpu', isStaged: false };
            if (property === 'accessible-node-labels.gpu.capacity') return { value: '30', isStaged: false };
            if (property === 'accessible-node-labels.gpu.maximum-capacity') return { value: '80', isStaged: false };
            return { value: '', isStaged: false };
        });

        render(<NodesPanel />);
        
        // Click on the root accordion to expand it
        const rootAccordion = screen.getByText('root').closest('[role="button"]');
        await user.click(rootAccordion!);
        
        expect(screen.getByLabelText('Capacity')).toBeInTheDocument();
        expect(screen.getByLabelText('Maximum Capacity')).toBeInTheDocument();
    });

    it('should show warning when queue has no access to label', async () => {
        const user = userEvent.setup();
        mockGetQueueDisplayValue.mockImplementation((queuePath: string, property: string) => {
            if (property === 'accessible-node-labels') return { value: 'ssd', isStaged: false }; // Different label
            return { value: '', isStaged: false };
        });

        render(<NodesPanel />);
        
        // Click on the root accordion to expand it
        const rootAccordion = screen.getByText('root').closest('[role="button"]');
        await user.click(rootAccordion!);
        
        expect(screen.getByText(/This queue does not have access to the gpu label/)).toBeInTheDocument();
    });

    it('should call stageQueueChange when capacity is modified', async () => {
        const user = userEvent.setup();
        mockGetQueueDisplayValue.mockImplementation((queuePath: string, property: string) => {
            if (property === 'accessible-node-labels') return { value: 'gpu', isStaged: false };
            if (property === 'accessible-node-labels.gpu.capacity') return { value: '30', isStaged: false };
            return { value: '', isStaged: false };
        });

        render(<NodesPanel />);
        
        // Expand accordion
        const rootAccordion = screen.getByText('root').closest('[role="button"]');
        await user.click(rootAccordion!);
        
        // Modify capacity
        const capacityInput = screen.getByLabelText('Capacity');
        await user.clear(capacityInput);
        await user.type(capacityInput, '50');
        
        expect(mockStageQueueChange).toHaveBeenCalledWith(
            'root',
            'accessible-node-labels.gpu.capacity',
            '50'
        );
    });

    it('should call stageQueueChange when maximum capacity is modified', async () => {
        const user = userEvent.setup();
        mockGetQueueDisplayValue.mockImplementation((queuePath: string, property: string) => {
            if (property === 'accessible-node-labels') return { value: 'gpu', isStaged: false };
            if (property === 'accessible-node-labels.gpu.maximum-capacity') return { value: '80', isStaged: false };
            return { value: '', isStaged: false };
        });

        render(<NodesPanel />);
        
        // Expand accordion
        const rootAccordion = screen.getByText('root').closest('[role="button"]');
        await user.click(rootAccordion!);
        
        // Modify maximum capacity
        const maxCapacityInput = screen.getByLabelText('Maximum Capacity');
        await user.clear(maxCapacityInput);
        await user.type(maxCapacityInput, '90');
        
        expect(mockStageQueueChange).toHaveBeenCalledWith(
            'root',
            'accessible-node-labels.gpu.maximum-capacity',
            '90'
        );
    });

    it('should show Modified chip for staged properties', async () => {
        const user = userEvent.setup();
        mockGetQueueDisplayValue.mockImplementation((queuePath: string, property: string) => {
            if (property === 'accessible-node-labels') return { value: 'gpu', isStaged: false };
            if (property === 'accessible-node-labels.gpu.capacity') return { value: '50', isStaged: true };
            return { value: '', isStaged: false };
        });

        render(<NodesPanel />);
        
        // Expand accordion
        const rootAccordion = screen.getByText('root').closest('[role="button"]');
        await user.click(rootAccordion!);
        
        expect(screen.getByText('Modified')).toBeInTheDocument();
    });

    it('should show info alert when no queues exist', () => {
        const { useSchedulerStore } = require('../../../store/schedulerStore');
        useSchedulerStore.mockImplementation((selector: any) => {
            const state = createMockState({
                schedulerData: null,
            });
            return selector(state);
        });

        render(<NodesPanel />);
        
        expect(screen.getByText(/No queues found/)).toBeInTheDocument();
    });

    it('should handle queue with wildcard label access', async () => {
        const user = userEvent.setup();
        mockGetQueueDisplayValue.mockImplementation((queuePath: string, property: string) => {
            if (property === 'accessible-node-labels') return { value: '*', isStaged: false }; // Wildcard access
            return { value: '', isStaged: false };
        });

        render(<NodesPanel />);
        
        // Expand accordion
        const rootAccordion = screen.getByText('root').closest('[role="button"]');
        await user.click(rootAccordion!);
        
        // Should show capacity fields since wildcard gives access to all labels
        expect(screen.getByLabelText('Capacity')).toBeInTheDocument();
        expect(screen.getByLabelText('Maximum Capacity')).toBeInTheDocument();
    });

    it('should show "No Access" chip for queues without label access', () => {
        mockGetQueueDisplayValue.mockImplementation((queuePath: string, property: string) => {
            if (property === 'accessible-node-labels') return { value: 'ssd', isStaged: false }; // Different label
            return { value: '', isStaged: false };
        });

        render(<NodesPanel />);
        
        // Should show "No Access" chip in accordion summary
        expect(screen.getByText('No Access')).toBeInTheDocument();
    });
});
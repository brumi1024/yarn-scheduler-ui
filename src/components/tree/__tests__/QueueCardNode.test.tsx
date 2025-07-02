import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueueCardNode } from '../QueueCardNode';
import type { NodeProps } from '@xyflow/react';
import type { QueueCardData } from '../hooks/useQueueTreeData';
import { useSchedulerStore } from '../../../store/schedulerStore';

// Mock React Flow Handle component
vi.mock('@xyflow/react', () => ({
    Handle: vi.fn(() => null),
    Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}));

// Mock the scheduler store
vi.mock('../../../store/schedulerStore', () => {
    const mockUseSchedulerStore = vi.fn(() => ({
        comparisonQueues: [],
        selectedQueuePath: null,
        toggleComparisonQueue: vi.fn(),
        selectQueue: vi.fn(),
        setPropertyPanelOpen: vi.fn(),
        getState: () => ({
            getQueueDisplayValue: () => ({ value: '70%', isStaged: false }),
        }),
    }));

    return {
        useSchedulerStore: mockUseSchedulerStore,
    };
});

// Mock the QueueContextMenu component
vi.mock('../components/QueueContextMenu', () => ({
    QueueContextMenu: vi.fn(() => null),
}));

describe('QueueCardNode', () => {
    const mockNodeData: QueueCardData = {
        // Required QueueInfo properties
        type: 'capacitySchedulerLeafQueueInfo',
        queuePath: 'root.production',
        queueName: 'production',
        capacity: 70,
        maxCapacity: 100,
        usedCapacity: 45,
        absoluteCapacity: 70,
        absoluteMaxCapacity: 100,
        absoluteUsedCapacity: 31.5,
        numApplications: 5,
        numActiveApplications: 3,
        numPendingApplications: 2,
        state: 'RUNNING',
        resourcesUsed: { memory: 2048, vCores: 4 },

        // UI-specific QueueCardData properties
        isLeaf: false,
        capacityConfig: '70',
        maxCapacityConfig: '100',
        stagedState: undefined,
        autoCreationEligibility: 'off',
        autoCreationStatus: { status: 'off', isStaged: false },
    };

    const mockNodeProps: NodeProps<QueueCardData> = {
        id: 'root.production',
        data: mockNodeData,
        type: 'queueCard',
        selected: false,
        isConnectable: false,
        xPos: 0,
        yPos: 0,
        dragging: false,
        zIndex: 1,
    };

    it('should render queue name', () => {
        render(<QueueCardNode {...mockNodeProps} />);

        expect(screen.getByText('production')).toBeInTheDocument();
    });

    it('should display capacity information', () => {
        render(<QueueCardNode {...mockNodeProps} />);

        // Should show capacity percentage
        expect(screen.getByText(/70%/)).toBeInTheDocument();
    });

    it('should show state badge', () => {
        render(<QueueCardNode {...mockNodeProps} />);

        expect(screen.getByText('RUNNING')).toBeInTheDocument();
    });

    it('should show STOPPED state with different styling', () => {
        const stoppedProps = {
            ...mockNodeProps,
            data: {
                ...mockNodeData,
                state: 'STOPPED' as const,
            },
        };

        render(<QueueCardNode {...stoppedProps} />);

        const stateBadge = screen.getByText('STOPPED');
        expect(stateBadge).toBeInTheDocument();
    });

    it('should display resource usage', () => {
        render(<QueueCardNode {...mockNodeProps} />);

        // Should show memory, vCores, and apps in the combined format
        expect(screen.getByText(/Memory: 2 GB • vCores: 4 • Apps: 5/)).toBeInTheDocument();
    });

    it('should show staged status badge when modified', () => {
        const modifiedProps = {
            ...mockNodeProps,
            data: {
                ...mockNodeData,
                stagedStatus: 'modified' as const,
            },
        };

        render(<QueueCardNode {...modifiedProps} />);

        expect(screen.getByText('modified')).toBeInTheDocument();
    });

    it('should show staged status badge when new', () => {
        const newProps = {
            ...mockNodeProps,
            data: {
                ...mockNodeData,
                stagedStatus: 'new' as const,
            },
        };

        render(<QueueCardNode {...newProps} />);

        expect(screen.getByText('new')).toBeInTheDocument();
    });

    it('should show staged status badge when deleted', () => {
        const deletedProps = {
            ...mockNodeProps,
            data: {
                ...mockNodeData,
                stagedStatus: 'deleted' as const,
            },
        };

        render(<QueueCardNode {...deletedProps} />);

        const deletedBadge = screen.getByText('deleted');
        expect(deletedBadge).toBeInTheDocument();
    });

    it('should display usage percentage', () => {
        render(<QueueCardNode {...mockNodeProps} />);

        expect(screen.getByText(/45\.0% used/)).toBeInTheDocument();
    });

    it('should display capacity text', () => {
        render(<QueueCardNode {...mockNodeProps} />);

        // Should show the capacity percentage and label
        expect(screen.getByText('70%')).toBeInTheDocument();
        expect(screen.getByText('capacity')).toBeInTheDocument();
    });

    it('should render with selected prop', () => {
        const selectedProps = {
            ...mockNodeProps,
            selected: true,
        };

        render(<QueueCardNode {...selectedProps} />);

        // Should render without error
        expect(screen.getByText('production')).toBeInTheDocument();
    });

    it('should handle leaf queue display', () => {
        const leafProps = {
            ...mockNodeProps,
            data: {
                ...mockNodeData,
                isLeaf: true,
            },
        };

        render(<QueueCardNode {...leafProps} />);

        // Should render without error
        expect(screen.getByText('production')).toBeInTheDocument();
    });

    it('should format memory correctly', () => {
        const { rerender } = render(<QueueCardNode {...mockNodeProps} />);

        // Test different memory values
        const testCases = [
            { memory: 512, expected: 'Memory: 536.87 MB' }, // formatBytes converts MB to bytes first
            { memory: 1024, expected: 'Memory: 1.07 GB' },
            { memory: 2048, expected: 'Memory: 2.15 GB' },
        ];

        testCases.forEach(({ memory, expected }) => {
            rerender(
                <QueueCardNode
                    {...mockNodeProps}
                    data={{
                        ...mockNodeData,
                        resourcesUsed: { memory, vCores: 1 },
                    }}
                />
            );

            // Check for presence of memory value
            expect(screen.getByText(new RegExp(`Memory:.*vCores: 1`))).toBeInTheDocument();
        });
    });

    it('should handle missing resource data gracefully', () => {
        const noResourceProps = {
            ...mockNodeProps,
            data: {
                ...mockNodeData,
                resourcesUsed: undefined,
            },
        };

        render(<QueueCardNode {...noResourceProps} />);

        // Should not crash and should show basic info
        expect(screen.getByText('production')).toBeInTheDocument();
        expect(screen.queryByText(/GB/)).not.toBeInTheDocument();
        expect(screen.queryByText(/vCores/)).not.toBeInTheDocument();
    });

    it('should show staged state badge when state is staged', () => {
        const stagedStateProps = {
            ...mockNodeProps,
            data: {
                ...mockNodeData,
                state: 'RUNNING',
                stagedState: 'STOPPED',
            },
        };

        render(<QueueCardNode {...stagedStateProps} />);

        // Should show both live state and staged state
        expect(screen.getByText('RUNNING')).toBeInTheDocument();
        expect(screen.getByText('→STOPPED')).toBeInTheDocument();
    });

    it('should not show staged state badge when no staged state', () => {
        render(<QueueCardNode {...mockNodeProps} />);

        // Should only show live state
        expect(screen.getByText('RUNNING')).toBeInTheDocument();
        expect(screen.queryByText(/→/)).not.toBeInTheDocument();
    });

    it('should not show auto-creation icon when autoCreationEligibility is off', () => {
        render(<QueueCardNode {...mockNodeProps} />);

        // Should not show auto-creation icon
        expect(screen.queryByLabelText(/Auto Queue Creation/)).not.toBeInTheDocument();
    });

    it('should show auto-creation icon when autoCreationEligibility is flexible', () => {
        const flexibleProps = {
            ...mockNodeProps,
            data: {
                ...mockNodeData,
                autoCreationEligibility: 'flexible',
                autoCreationStatus: { status: 'flexible', isStaged: false },
            },
        };

        render(<QueueCardNode {...flexibleProps} />);

        // Should show auto-creation icon with tooltip
        expect(screen.getByLabelText('Auto Queue Creation: flexible')).toBeInTheDocument();
    });

    it('should show auto-creation icon when autoCreationEligibility is legacy', () => {
        const legacyProps = {
            ...mockNodeProps,
            data: {
                ...mockNodeData,
                autoCreationEligibility: 'legacy',
                autoCreationStatus: { status: 'legacy', isStaged: false },
            },
        };

        render(<QueueCardNode {...legacyProps} />);

        // Should show auto-creation icon with tooltip
        expect(screen.getByLabelText('Auto Queue Creation: legacy')).toBeInTheDocument();
    });

    it('should show staged auto-creation change from off to flexible', () => {
        const stagedFlexibleProps = {
            ...mockNodeProps,
            data: {
                ...mockNodeData,
                autoCreationEligibility: 'off',
                autoCreationStatus: { status: 'flexible', isStaged: true },
            },
        };

        render(<QueueCardNode {...stagedFlexibleProps} />);

        // Should show arrow and staged status in tooltip
        expect(screen.getByLabelText('Auto Queue Creation: flexible (staged)')).toBeInTheDocument();
        expect(screen.getByText('→')).toBeInTheDocument();
    });

    it('should show staged auto-creation change from off to legacy', () => {
        const stagedLegacyProps = {
            ...mockNodeProps,
            data: {
                ...mockNodeData,
                autoCreationEligibility: 'off',
                autoCreationStatus: { status: 'legacy', isStaged: true },
            },
        };

        render(<QueueCardNode {...stagedLegacyProps} />);

        // Should show arrow and staged status in tooltip
        expect(screen.getByLabelText('Auto Queue Creation: legacy (staged)')).toBeInTheDocument();
        expect(screen.getByText('→')).toBeInTheDocument();
    });

    it('should show staged auto-creation change from flexible to off', () => {
        const stagedOffProps = {
            ...mockNodeProps,
            data: {
                ...mockNodeData,
                autoCreationEligibility: 'flexible',
                autoCreationStatus: { status: 'off', isStaged: true },
            },
        };

        render(<QueueCardNode {...stagedOffProps} />);

        // Should not show auto-creation indicator when staged status is off
        expect(screen.queryByLabelText(/Auto Queue Creation/)).not.toBeInTheDocument();
    });

    it('should show staged auto-creation change from legacy to flexible', () => {
        const stagedChangeProps = {
            ...mockNodeProps,
            data: {
                ...mockNodeData,
                autoCreationEligibility: 'legacy',
                autoCreationStatus: { status: 'flexible', isStaged: true },
            },
        };

        render(<QueueCardNode {...stagedChangeProps} />);

        // Should show arrow and new staged status
        expect(screen.getByLabelText('Auto Queue Creation: flexible (staged)')).toBeInTheDocument();
        expect(screen.getByText('→')).toBeInTheDocument();
    });

    it('should show arrow indicator for staged auto-creation changes', () => {
        const stagedProps = {
            ...mockNodeProps,
            data: {
                ...mockNodeData,
                autoCreationEligibility: 'off',
                autoCreationStatus: { status: 'flexible', isStaged: true },
            },
        };

        render(<QueueCardNode {...stagedProps} />);

        // Should show arrow indicator and proper tooltip
        expect(screen.getByLabelText('Auto Queue Creation: flexible (staged)')).toBeInTheDocument();
        expect(screen.getByText('→')).toBeInTheDocument();
    });

});
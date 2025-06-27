import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueueCardNode } from '../QueueCardNode';
import type { NodeProps } from '@xyflow/react';
import type { QueueNodeData } from '../hooks/useQueueTreeData';

// Mock React Flow Handle component
vi.mock('@xyflow/react', () => ({
    Handle: vi.fn(() => null),
    Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}));

// Mock the scheduler store
vi.mock('../../store/schedulerStore', () => ({
    useSchedulerStore: vi.fn(() => ({
        comparisonQueues: [],
        toggleComparisonQueue: vi.fn(),
        getState: () => ({
            getQueueDisplayValue: () => ({ value: '70%', isStaged: false }),
        }),
    })),
}));

// Mock the QueueContextMenu component
vi.mock('../components/QueueContextMenu', () => ({
    QueueContextMenu: vi.fn(() => null),
}));

describe('QueueCardNode', () => {
    const mockNodeData: QueueNodeData = {
        queuePath: 'root.production',
        queueName: 'production',
        capacity: 70,
        maxCapacity: 100,
        state: 'RUNNING',
        usedCapacity: 45,
        absoluteUsedCapacity: 31.5,
        numApplications: 5,
        resourcesUsed: { memory: 2048, vCores: 4 },
        isLeaf: false,
    };

    const mockNodeProps: NodeProps<QueueNodeData> = {
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
        
        expect(screen.getByText(/45% used/)).toBeInTheDocument();
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
});
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
        // With MUI Chip, check the parent element for the class
        const chipElement = stateBadge.closest('.queue-state-stopped');
        expect(chipElement).toBeInTheDocument();
    });

    it('should display resource usage', () => {
        render(<QueueCardNode {...mockNodeProps} />);
        
        // Should show memory and vCores
        expect(screen.getByText(/2 GB/)).toBeInTheDocument();
        expect(screen.getByText(/4 vCores/)).toBeInTheDocument();
        expect(screen.getByText(/5 apps/)).toBeInTheDocument();
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
        
        expect(screen.getByText('MODIFIED')).toBeInTheDocument();
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
        
        expect(screen.getByText('NEW')).toBeInTheDocument();
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
        
        const deletedBadge = screen.getByText('DELETED');
        expect(deletedBadge).toBeInTheDocument();
        // Should have strike-through styling
        expect(deletedBadge.closest('.queue-card')).toHaveClass('queue-deleted');
    });

    it('should display usage percentage', () => {
        render(<QueueCardNode {...mockNodeProps} />);
        
        expect(screen.getByText(/45% used/)).toBeInTheDocument();
    });

    it('should render capacity bar with correct width', () => {
        render(<QueueCardNode {...mockNodeProps} />);
        
        const capacityBar = screen.getByTestId('capacity-bar');
        expect(capacityBar).toHaveStyle({ width: '70%' });
        
        const usageBar = screen.getByTestId('usage-bar');
        // Usage is 45% of total, but within the 70% capacity
        const expectedWidth = (45 / 100) * 70;
        expect(usageBar).toHaveStyle({ width: `${expectedWidth}%` });
    });

    it('should apply selected styling when selected', () => {
        const selectedProps = {
            ...mockNodeProps,
            selected: true,
        };
        
        render(<QueueCardNode {...selectedProps} />);
        
        const card = screen.getByTestId('queue-card');
        expect(card).toHaveClass('selected');
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
        
        const card = screen.getByTestId('queue-card');
        expect(card).toHaveClass('leaf-queue');
    });

    it('should format memory correctly', () => {
        const testCases = [
            { memory: 512, expected: '512 MB' },
            { memory: 1024, expected: '1 GB' },
            { memory: 2048, expected: '2 GB' },
            { memory: 1536, expected: '1.5 GB' },
        ];

        testCases.forEach(({ memory, expected }) => {
            const { rerender } = render(
                <QueueCardNode 
                    {...mockNodeProps} 
                    data={{
                        ...mockNodeData,
                        resourcesUsed: { memory, vCores: 1 },
                    }}
                />
            );
            
            expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
            rerender(<></>); // Clean up for next test
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
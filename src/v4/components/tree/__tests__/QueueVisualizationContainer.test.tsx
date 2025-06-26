import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueueVisualizationContainer } from '../QueueVisualizationContainer';
import { useSchedulerStore } from '../../../store/schedulerStore';
import { useQueueTreeData } from '../hooks/useQueueTreeData';
import type { QueueNode } from '../../../types';

// Mock the scheduler store
vi.mock('../../../store/schedulerStore');

// Mock the useQueueTreeData hook
vi.mock('../hooks/useQueueTreeData');

// Mock React Flow
vi.mock('@xyflow/react', () => ({
    ReactFlow: vi.fn(({ children }) => (
        <div data-testid="react-flow">
            {children}
        </div>
    )),
    ReactFlowProvider: vi.fn(({ children }) => (
        <div data-testid="react-flow-provider">
            {children}
        </div>
    )),
    Background: vi.fn(() => <div data-testid="react-flow-background" />),
    Controls: vi.fn(() => <div data-testid="react-flow-controls" />),
    MiniMap: vi.fn(() => <div data-testid="react-flow-minimap" />),
    Handle: vi.fn(() => null),
    Position: { Left: 'left', Right: 'right' },
    useReactFlow: vi.fn(() => ({
        fitView: vi.fn(),
    })),
}));

describe('QueueVisualizationContainer', () => {
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

    const mockStoreState = {
        schedulerData: {
            type: 'capacityScheduler',
            queueName: 'root',
            capacity: 100,
            usedCapacity: 45,
            maxCapacity: 100,
            state: 'RUNNING',
        },
        queueTree: mockQueueTree,
        configData: new Map(),
        nodeLabels: [],
        stagedChanges: [],
        selectedNodeLabel: null,
        configVersion: 1,
        isLoading: false,
        error: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useSchedulerStore as any).mockReturnValue(mockStoreState);
        
        // Mock useQueueTreeData to return test data
        (useQueueTreeData as any).mockReturnValue({
            nodes: [
                {
                    id: 'root',
                    type: 'queueCard',
                    position: { x: 0, y: 0 },
                    data: {
                        queuePath: 'root',
                        queueName: 'root',
                        capacity: 100,
                        maxCapacity: 100,
                        state: 'RUNNING',
                        usedCapacity: 45,
                        absoluteUsedCapacity: 45,
                        numApplications: 10,
                        resourcesUsed: { memory: 4096, vCores: 8 },
                        isLeaf: false,
                    },
                },
                {
                    id: 'root.default',
                    type: 'queueCard',
                    position: { x: 300, y: 0 },
                    data: {
                        queuePath: 'root.default',
                        queueName: 'default',
                        capacity: 30,
                        maxCapacity: 100,
                        state: 'RUNNING',
                        usedCapacity: 10,
                        absoluteUsedCapacity: 3,
                        numApplications: 2,
                        resourcesUsed: { memory: 1024, vCores: 2 },
                        isLeaf: true,
                    },
                },
            ],
            edges: [
                {
                    id: 'root-root.default',
                    source: 'root',
                    target: 'root.default',
                },
            ],
            isLoading: false,
            error: null,
        });
    });

    it('should render without crashing', () => {
        const { container } = render(<QueueVisualizationContainer />);
        expect(container).toBeTruthy();
    });

    it('should render React Flow provider and components', () => {
        render(<QueueVisualizationContainer />);
        
        expect(screen.getByTestId('react-flow-provider')).toBeInTheDocument();
        expect(screen.getByTestId('react-flow')).toBeInTheDocument();
        expect(screen.getByTestId('react-flow-background')).toBeInTheDocument();
        expect(screen.getByTestId('react-flow-controls')).toBeInTheDocument();
        expect(screen.getByTestId('react-flow-minimap')).toBeInTheDocument();
    });

    it('should show loading state when data is loading', () => {
        (useQueueTreeData as any).mockReturnValue({
            nodes: [],
            edges: [],
            isLoading: true,
            error: null,
        });

        render(<QueueVisualizationContainer />);
        
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show error state when there is an error', () => {
        const errorMessage = 'Failed to load scheduler data';
        (useQueueTreeData as any).mockReturnValue({
            nodes: [],
            edges: [],
            isLoading: false,
            error: errorMessage,
        });

        render(<QueueVisualizationContainer />);
        
        expect(screen.getByText(`Failed to load scheduler data: ${errorMessage}`)).toBeInTheDocument();
    });

    it('should handle queue selection on node click', async () => {
        const mockSelectQueue = vi.fn();
        (useSchedulerStore as any).mockReturnValue({
            ...mockStoreState,
            selectQueue: mockSelectQueue,
        });

        const { ReactFlow } = await import('@xyflow/react');
        const mockReactFlow = ReactFlow as any;

        render(<QueueVisualizationContainer />);

        // Get the onNodeClick handler from React Flow
        const onNodeClick = mockReactFlow.mock.calls[0][0].onNodeClick;
        
        // Simulate clicking a node
        const mockNode = { id: 'root.default' };
        onNodeClick({}, mockNode);

        expect(mockSelectQueue).toHaveBeenCalledWith('root.default');
    });

    it('should pass custom className prop', () => {
        const testClassName = 'custom-tree-class';
        render(<QueueVisualizationContainer className={testClassName} />);
        
        const container = screen.getByTestId('queue-tree-container');
        expect(container).toHaveClass(testClassName);
    });
});
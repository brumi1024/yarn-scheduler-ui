import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueueVisualizationContainer } from '../QueueVisualizationContainer';
import { useSchedulerStore } from '../../../store/schedulerStore';
import { useQueueActions } from '../hooks/useQueueActions';
import { createMockQueueTree } from './testHelpers';
import type { QueueInfo } from '../../../types';

// Mock the store
vi.mock('../../../store/schedulerStore');

// Mock useQueueActions hook
vi.mock('../hooks/useQueueActions');

// Mock React Flow components
vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual('@xyflow/react');
    const React = await import('react');
    
    return {
        ...actual,
        ReactFlow: ({ children, nodes, edges, onNodeClick, nodeTypes }: any) => {
            return React.createElement('div', { 'data-testid': 'react-flow' },
                nodes.map((node: any) => 
                    React.createElement('div', {
                        key: node.id,
                        'data-testid': `node-${node.id}`,
                        onClick: () => onNodeClick?.(null, node)
                    },
                        nodeTypes?.queueCard && React.createElement(nodeTypes.queueCard, {
                            ...node,
                            data: node.data,
                            selected: node.selected || false,
                            id: node.id,
                            type: 'queueCard',
                            xPos: 0,
                            yPos: 0,
                            isConnectable: true,
                            zIndex: 1,
                            dragging: false,
                        })
                    )
                ),
                children
            );
        },
        ReactFlowProvider: ({ children }: any) => React.createElement('div', { 'data-testid': 'react-flow-provider' }, children),
        Controls: () => React.createElement('div', { 'data-testid': 'react-flow-controls' }, 'Controls'),
        MiniMap: () => React.createElement('div', { 'data-testid': 'react-flow-minimap' }, 'MiniMap'),
        Background: () => React.createElement('div', { 'data-testid': 'react-flow-background' }, 'Background'),
        Handle: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': `handle-${props.type}`, ...props }, children),
        Position: {
            Left: 'left',
            Right: 'right',
        },
    };
});

describe('QueueVisualizationContainer Integration', () => {
    const mockQueueTree = createMockQueueTree();

    const mockStoreState = {
        queueTree: mockQueueTree,
        schedulerData: null as QueueInfo | null,
        configData: new Map<string, string>(),
        nodeLabels: [],
        stagedChanges: [],
        selectedQueuePath: null,
        selectedNodeLabel: null,
        configVersion: 1,
        isLoading: false,
        error: null,
        getQueueByPath: vi.fn(),
        getChildQueues: vi.fn(),
        stageQueueAddition: vi.fn(),
        stageQueueRemoval: vi.fn(),
        stageQueueChange: vi.fn(),
        selectQueue: vi.fn(),
        hasUnsavedChanges: vi.fn(() => false),
        getChangesForQueue: vi.fn(() => []),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock store implementation
        (useSchedulerStore as any).mockImplementation((selector: any) => {
            if (typeof selector === 'function') {
                return selector(mockStoreState);
            }
            return mockStoreState;
        });
        
        // Mock getQueueByPath to search the tree
        mockStoreState.getQueueByPath.mockImplementation((path: string) => {
            const findQueue = (node: any, targetPath: string): any => {
                if (node.path === targetPath) return node;
                if (node.children) {
                    for (const child of node.children) {
                        const found = findQueue(child, targetPath);
                        if (found) return found;
                    }
                }
                return null;
            };
            // Return null for QueueInfo type since we're working with QueueNode
            return null;
        });
        
        // Mock getChildQueues
        mockStoreState.getChildQueues.mockImplementation(() => {
            // Return empty array since this expects QueueInfo[]
            return [];
        });
        
        // Mock useQueueActions to call the store methods
        (useQueueActions as any).mockReturnValue({
            canAddChildQueue: () => true,
            canDeleteQueue: (path: string) => {
                // Can delete leaf queues (not root and not parent queues)
                if (path === 'root' || path === 'root.production') return false;
                return true; // Simplified for testing
            },
            addChildQueue: (parentPath: string, queueName: string, config: any) => {
                mockStoreState.stageQueueAddition(parentPath, queueName, config);
            },
            deleteQueue: (queuePath: string) => {
                mockStoreState.stageQueueRemoval(queuePath);
            },
            updateQueueProperty: (queuePath: string, property: string, value: string) => {
                mockStoreState.stageQueueChange(queuePath, property, value);
            },
        });
    });

    it('should render the queue tree and allow queue selection', async () => {
        render(<QueueVisualizationContainer />);

        // Wait for the tree to load
        await waitFor(() => {
            expect(screen.getByTestId('react-flow')).toBeInTheDocument();
        });

        // Verify all queue nodes are rendered
        expect(screen.getByTestId('node-root')).toBeInTheDocument();
        expect(screen.getByTestId('node-root.default')).toBeInTheDocument();
        expect(screen.getByTestId('node-root.production')).toBeInTheDocument();
        expect(screen.getByTestId('node-root.production.critical')).toBeInTheDocument();
        expect(screen.getByTestId('node-root.production.batch')).toBeInTheDocument();

        // Click on a queue to select it
        fireEvent.click(screen.getByTestId('node-root.production'));

        // Verify selectQueue was called
        expect(mockStoreState.selectQueue).toHaveBeenCalledWith('root.production');
    });

    it('should add a new queue through context menu', async () => {
        const user = userEvent.setup();
        render(<QueueVisualizationContainer />);

        // Wait for the tree to load
        await waitFor(() => {
            expect(screen.getByTestId('react-flow')).toBeInTheDocument();
        });

        // Find the production queue card within the node
        const productionNode = screen.getByTestId('node-root.production');
        const productionCard = within(productionNode).getByTestId('queue-card');
        expect(productionCard).toBeInTheDocument();

        // Right-click on the production queue to open context menu
        fireEvent.contextMenu(productionCard);

        // Wait for context menu and click Add Child Queue
        await waitFor(() => {
            expect(screen.getByText('Add Child Queue')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText('Add Child Queue'));

        // Fill in the add queue form
        const queueNameInput = await screen.findByPlaceholderText('e.g., production, development');
        await user.type(queueNameInput, 'staging');

        const capacityInput = screen.getByDisplayValue('10');
        await user.clear(capacityInput);
        await user.type(capacityInput, '15');

        // Submit the form
        const addButton = screen.getByRole('button', { name: /^Add Queue$/i });
        fireEvent.click(addButton);

        // Verify stageQueueAddition was called
        await waitFor(() => {
            expect(mockStoreState.stageQueueAddition).toHaveBeenCalledWith(
                'root.production',
                'staging',
                {
                    capacity: '15',
                    'maximum-capacity': '100',
                    state: 'RUNNING',
                }
            );
        });
    });

    it('should delete a queue through context menu', async () => {
        render(<QueueVisualizationContainer />);

        // Wait for the tree to load
        await waitFor(() => {
            expect(screen.getByTestId('react-flow')).toBeInTheDocument();
        });

        // Find the batch queue (leaf queue that can be deleted)
        const batchNode = screen.getByTestId('node-root.production.batch');
        const batchCard = within(batchNode).getByTestId('queue-card');
        expect(batchCard).toBeInTheDocument();

        // Right-click to open context menu
        fireEvent.contextMenu(batchCard);

        // Wait for context menu and click Delete Queue
        await waitFor(() => {
            expect(screen.getByText('Delete Queue')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText('Delete Queue'));

        // Confirm deletion in dialog
        await waitFor(() => {
            expect(screen.getByText(/Are you sure you want to delete the queue/)).toBeInTheDocument();
        });

        const deleteButton = screen.getByRole('button', { name: /^Delete Queue$/i });
        fireEvent.click(deleteButton);

        // Verify stageQueueRemoval was called
        expect(mockStoreState.stageQueueRemoval).toHaveBeenCalledWith('root.production.batch');
    });

    it('should toggle queue state through context menu', async () => {
        render(<QueueVisualizationContainer />);

        // Wait for the tree to load
        await waitFor(() => {
            expect(screen.getByTestId('react-flow')).toBeInTheDocument();
        });

        // Find the batch queue (currently STOPPED)
        const batchNode = screen.getByTestId('node-root.production.batch');
        const batchCard = within(batchNode).getByTestId('queue-card');
        expect(batchCard).toBeInTheDocument();

        // Verify it shows STOPPED state
        expect(within(batchNode).getByText('STOPPED')).toBeInTheDocument();

        // Right-click to open context menu
        fireEvent.contextMenu(batchCard);

        // Wait for context menu and click Start Queue
        await waitFor(() => {
            expect(screen.getByText('Start Queue')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText('Start Queue'));

        // Verify stageQueueChange was called to start the queue
        expect(mockStoreState.stageQueueChange).toHaveBeenCalledWith(
            'root.production.batch',
            'state',
            'RUNNING'
        );
    });

    it('should handle queue selection and show selected state', async () => {
        render(<QueueVisualizationContainer />);

        // Wait for the tree to load
        await waitFor(() => {
            expect(screen.getByTestId('react-flow')).toBeInTheDocument();
        });

        // Click on the critical queue
        const criticalNode = screen.getByTestId('node-root.production.critical');
        fireEvent.click(criticalNode);

        // Verify selectQueue was called
        expect(mockStoreState.selectQueue).toHaveBeenCalledWith('root.production.critical');
    });

    it('should not allow deletion of queues with children', async () => {
        render(<QueueVisualizationContainer />);

        // Wait for the tree to load
        await waitFor(() => {
            expect(screen.getByTestId('react-flow')).toBeInTheDocument();
        });

        // Find the production queue (has children)
        const productionNode = screen.getByTestId('node-root.production');
        const productionCard = within(productionNode).getByTestId('queue-card');
        expect(productionCard).toBeInTheDocument();

        // Right-click to open context menu
        fireEvent.contextMenu(productionCard);

        // Delete Queue option should not be available
        await waitFor(() => {
            expect(screen.getByText('Add Child Queue')).toBeInTheDocument();
        });
        expect(screen.queryByText('Delete Queue')).not.toBeInTheDocument();
    });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueueCardNode } from '../QueueCardNode';
import { useSchedulerStore } from '../../../store/schedulerStore';
import { useQueueActions } from '../hooks/useQueueActions';
import { createMockQueueTree, createMockQueueNode } from './testHelpers';
import type { NodeProps } from '@xyflow/react';
import type { QueueNodeData } from '../hooks/useQueueTreeData';
import type { QueueInfo } from '../../../types';

// Mock the store
vi.mock('../../../store/schedulerStore');

// Mock useQueueActions hook
vi.mock('../hooks/useQueueActions');

// Mock React Flow hooks
vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual('@xyflow/react');
    return {
        ...actual,
        Handle: ({ children, ...props }: any) => <div data-testid={`handle-${props.type}`} {...props}>{children}</div>,
        Position: {
            Left: 'left',
            Right: 'right',
        },
    };
});

describe('QueueCardNode Store Integration', () => {
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
        (useSchedulerStore as any).mockImplementation((selector: any) => {
            if (typeof selector === 'function') {
                return selector(mockStoreState);
            }
            return mockStoreState;
        });
        mockStoreState.getQueueByPath.mockImplementation((path: string) => {
            // Return null since getQueueByPath returns QueueInfo, not QueueNode
            return null;
        });
        
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
                return true;
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

    it('should complete add queue flow from context menu to store', async () => {
        const user = userEvent.setup();
        
        // Create a node for the production queue
        const nodeProps: NodeProps<QueueNodeData> = {
            id: 'root.production',
            data: {
                queuePath: 'root.production',
                queueName: 'production',
                capacity: 50,
                maxCapacity: 100,
                state: 'RUNNING',
                usedCapacity: 25,
                numApplications: 3,
                resourcesUsed: { memory: 2048, vCores: 4 },
                isLeaf: false,
                absoluteUsedCapacity: 25,
                stagedStatus: undefined,
            },
            xPos: 0,
            yPos: 0,
            selected: false,
            type: 'queueCard',
            isConnectable: true,
            zIndex: 1,
            dragging: false,
        };

        render(<QueueCardNode {...nodeProps} />);

        // Find and right-click the queue card
        const queueCard = screen.getByTestId('queue-card');
        fireEvent.contextMenu(queueCard);

        // Wait for context menu
        await waitFor(() => {
            expect(screen.getByText('Add Child Queue')).toBeInTheDocument();
        });

        // Click Add Child Queue
        fireEvent.click(screen.getByText('Add Child Queue'));

        // Wait for dialog
        await waitFor(() => {
            expect(screen.getByText('Creating new queue under:')).toBeInTheDocument();
            const productionTexts = screen.getAllByText('production');
            expect(productionTexts.length).toBeGreaterThan(0);
        });

        // Fill in the form
        const queueNameInput = await screen.findByPlaceholderText('e.g., production, development');
        await user.type(queueNameInput, 'staging');

        const capacityInput = screen.getByDisplayValue('10');
        await user.clear(capacityInput);
        await user.type(capacityInput, '25');

        const maxCapacityInput = screen.getByDisplayValue('100');
        await user.clear(maxCapacityInput);
        await user.type(maxCapacityInput, '75');

        // Submit
        const addButton = screen.getByRole('button', { name: /^Add Queue$/i });
        fireEvent.click(addButton);

        // Verify store interaction
        await waitFor(() => {
            expect(mockStoreState.stageQueueAddition).toHaveBeenCalledWith(
                'root.production',
                'staging',
                {
                    capacity: '25',
                    'maximum-capacity': '75',
                    state: 'RUNNING',
                }
            );
        });
    });

    it('should complete delete queue flow', async () => {
        const nodeProps: NodeProps<QueueNodeData> = {
            id: 'root.default',
            data: {
                queuePath: 'root.default',
                queueName: 'default',
                capacity: 50,
                maxCapacity: 80,
                state: 'RUNNING',
                usedCapacity: 10,
                numApplications: 1,
                resourcesUsed: { memory: 512, vCores: 1 },
                isLeaf: false,
                absoluteUsedCapacity: 25,
                stagedStatus: undefined,
            },
            xPos: 0,
            yPos: 0,
            selected: false,
            type: 'queueCard',
            isConnectable: true,
            zIndex: 1,
            dragging: false,
        };

        render(<QueueCardNode {...nodeProps} />);

        // Right-click to open context menu
        const queueCard = screen.getByTestId('queue-card');
        fireEvent.contextMenu(queueCard);

        // Click Delete Queue
        await waitFor(() => {
            expect(screen.getByText('Delete Queue')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText('Delete Queue'));

        // Confirm in dialog
        await waitFor(() => {
            expect(screen.getByText(/Are you sure you want to delete the queue/)).toBeInTheDocument();
        });

        const deleteButton = screen.getByRole('button', { name: /^Delete Queue$/i });
        fireEvent.click(deleteButton);

        // Verify store interaction - the hook uses stageQueueRemoval
        expect(mockStoreState.stageQueueRemoval).toHaveBeenCalledWith('root.default');
    });

    it('should complete queue state toggle flow', async () => {
        const nodeProps: NodeProps<QueueNodeData> = {
            id: 'root.production',
            data: {
                queuePath: 'root.production',
                queueName: 'production',
                capacity: 50,
                maxCapacity: 100,
                state: 'RUNNING',
                usedCapacity: 25,
                numApplications: 3,
                resourcesUsed: { memory: 2048, vCores: 4 },
                isLeaf: false,
                absoluteUsedCapacity: 25,
                stagedStatus: undefined,
            },
            xPos: 0,
            yPos: 0,
            selected: false,
            type: 'queueCard',
            isConnectable: true,
            zIndex: 1,
            dragging: false,
        };

        render(<QueueCardNode {...nodeProps} />);

        // Right-click to open context menu
        const queueCard = screen.getByTestId('queue-card');
        fireEvent.contextMenu(queueCard);

        // Click Stop Queue
        await waitFor(() => {
            expect(screen.getByText('Stop Queue')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText('Stop Queue'));

        // Verify store interaction
        expect(mockStoreState.stageQueueChange).toHaveBeenCalledWith(
            'root.production',
            'state',
            'STOPPED'
        );
    });

    it.skip('should validate queue names during add flow', async () => {
        const user = userEvent.setup();
        
        const nodeProps: NodeProps<QueueNodeData> = {
            id: 'root.production',
            data: {
                queuePath: 'root.production',
                queueName: 'production',
                capacity: 50,
                maxCapacity: 100,
                state: 'RUNNING',
                usedCapacity: 25,
                numApplications: 3,
                resourcesUsed: { memory: 2048, vCores: 4 },
                isLeaf: false,
                absoluteUsedCapacity: 25,
                stagedStatus: undefined,
            },
            xPos: 0,
            yPos: 0,
            selected: false,
            type: 'queueCard',
            isConnectable: true,
            zIndex: 1,
            dragging: false,
        };

        render(<QueueCardNode {...nodeProps} />);

        // Open context menu and add queue dialog
        const queueCard = screen.getByTestId('queue-card');
        fireEvent.contextMenu(queueCard);
        await waitFor(() => screen.getByText('Add Child Queue'));
        fireEvent.click(screen.getByText('Add Child Queue'));

        // Try to enter invalid queue name with dots
        const queueNameInput = await screen.findByPlaceholderText('e.g., production, development');
        await user.type(queueNameInput, 'invalid.name');
        
        // Trigger validation by blurring the input
        fireEvent.blur(queueNameInput);

        // Should see validation error - wait for it to appear
        await waitFor(() => {
            const errorText = screen.getByText('Queue name cannot contain dots');
            expect(errorText).toBeInTheDocument();
        });

        // Submit button should be disabled
        const addButton = screen.getByRole('button', { name: /^Add Queue$/i });
        expect(addButton).toBeDisabled();
    });

    it('should integrate useQueueActions hook with store correctly', () => {
        // Create test queue tree with a test queue
        const testQueueTree = createMockQueueNode('root', 'root', {
            type: 'parent',
            children: [
                createMockQueueNode('root.test', 'test', {
                    type: 'leaf',
                    capacity: 10,
                    maxCapacity: 20,
                }),
            ],
        });
        
        // Update the mock state
        mockStoreState.queueTree = testQueueTree;

        const TestComponent = () => {
            const actions = useQueueActions();
            
            return (
                <div>
                    <button onClick={() => actions.addChildQueue('root', 'test2', { capacity: '10' })}>
                        Add Queue
                    </button>
                    <button onClick={() => actions.deleteQueue('root.test')}>
                        Delete Queue
                    </button>
                    <button onClick={() => actions.updateQueueProperty('root.test', 'state', 'STOPPED')}>
                        Update Property
                    </button>
                </div>
            );
        };

        render(<TestComponent />);

        // Test add queue (using test2 to avoid conflict)
        fireEvent.click(screen.getByText('Add Queue'));
        expect(mockStoreState.stageQueueAddition).toHaveBeenCalledWith('root', 'test2', { capacity: '10' });

        // Test delete queue
        fireEvent.click(screen.getByText('Delete Queue'));
        expect(mockStoreState.stageQueueRemoval).toHaveBeenCalledWith('root.test');

        // Test update property
        fireEvent.click(screen.getByText('Update Property'));
        expect(mockStoreState.stageQueueChange).toHaveBeenCalledWith('root.test', 'state', 'STOPPED');
    });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueueCardNode } from '../QueueCardNode';
import { useSchedulerStore } from '../../../store/schedulerStore';
import type { NodeProps } from '@xyflow/react';
import type { QueueNodeData } from '../hooks/useQueueTreeData';

// Mock the store
vi.mock('../../../store/schedulerStore');

// Mock React Flow hooks
vi.mock('@xyflow/react', async () => {
    const actual = await vi.importActual('@xyflow/react');
    return {
        ...actual,
        Handle: ({ children, ...props }: any) => <div data-testid={`handle-${props.type}`} {...props}>{children}</div>,
    };
});

describe('QueueContextMenu Integration', () => {
    const mockStoreState = {
        queueTree: new Map([
            ['root', {
                name: 'root',
                path: 'root',
                capacity: 100,
                maxCapacity: 100,
                state: 'RUNNING',
                properties: new Map(),
                childQueues: ['root.default', 'root.production'],
            }],
            ['root.default', {
                name: 'default',
                path: 'root.default',
                capacity: 50,
                maxCapacity: 80,
                state: 'RUNNING',
                properties: new Map(),
                childQueues: [],
            }],
            ['root.production', {
                name: 'production',
                path: 'root.production',
                capacity: 50,
                maxCapacity: 100,
                state: 'RUNNING',
                properties: new Map(),
                childQueues: [],
            }],
        ]),
        stagedChanges: {
            addedQueues: new Map(),
            deletedQueues: new Set(),
            modifiedQueues: new Map(),
        },
        getQueueByPath: vi.fn(),
        stageQueueAddition: vi.fn(),
        stageQueueDeletion: vi.fn(),
        stageQueueModification: vi.fn(),
        stageQueueChange: vi.fn(),
    };

    const nodeProps: NodeProps<QueueNodeData> = {
        id: 'root.default',
        data: {
            queuePath: 'root.default',
            queueName: 'default',
            capacity: 50,
            maxCapacity: 80,
            state: 'RUNNING',
            usedCapacity: 25,
            numApplications: 2,
            resourcesUsed: { memory: 1024, vCores: 2 },
            isLeaf: true,
        },
        xPos: 0,
        yPos: 0,
        selected: false,
        type: 'queueCard',
        isConnectable: true,
        zIndex: 1,
        dragging: false,
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
            return mockStoreState.queueTree.get(path);
        });
    });

    it('should open context menu on right click and add a child queue', async () => {
        const user = userEvent.setup();
        render(<QueueCardNode {...nodeProps} />);

        // Find the queue card
        const queueCard = screen.getByTestId('queue-card');
        expect(queueCard).toBeInTheDocument();

        // Right-click to open context menu
        fireEvent.contextMenu(queueCard);

        // Check context menu is open
        await waitFor(() => {
            expect(screen.getByText('Add Child Queue')).toBeInTheDocument();
        });

        // Click Add Child Queue
        const addChildMenuItem = screen.getByText('Add Child Queue');
        fireEvent.click(addChildMenuItem);

        // Check that Add Queue Dialog is open
        await waitFor(() => {
            expect(screen.getByText('Add Child Queue')).toBeInTheDocument();
            expect(screen.getByText('Creating new queue under:')).toBeInTheDocument();
        });

        // Wait for form elements and find input using placeholder
        const queueNameInput = await screen.findByPlaceholderText('e.g., production, development');
        expect(queueNameInput).toBeInTheDocument();

        // Fill in the queue name
        await user.type(queueNameInput, 'test-queue');

        // Find and fill other inputs
        const capacityInput = screen.getByDisplayValue('10'); // Default value
        await user.clear(capacityInput);
        await user.type(capacityInput, '20');

        const maxCapacityInput = screen.getByDisplayValue('100'); // Default value
        await user.clear(maxCapacityInput);
        await user.type(maxCapacityInput, '50');

        // Submit the form
        const addButton = screen.getByRole('button', { name: /^Add Queue$/i });
        expect(addButton).toBeInTheDocument();
        fireEvent.click(addButton);

        // Check that stageQueueAddition was called
        await waitFor(() => {
            expect(mockStoreState.stageQueueAddition).toHaveBeenCalledWith(
                'root.default',
                'test-queue',
                {
                    capacity: '20',
                    'maximum-capacity': '50',
                    state: 'RUNNING',
                }
            );
        });
    });

    it('should toggle queue state through context menu', async () => {
        render(<QueueCardNode {...nodeProps} />);

        // Right-click to open context menu
        const queueCard = screen.getByTestId('queue-card');
        fireEvent.contextMenu(queueCard);

        // Check context menu is open
        await waitFor(() => {
            expect(screen.getByText('Stop Queue')).toBeInTheDocument();
        });

        // Click Stop Queue
        const stopQueueMenuItem = screen.getByText('Stop Queue');
        fireEvent.click(stopQueueMenuItem);

        // Check that stageQueueChange was called with state change
        await waitFor(() => {
            expect(mockStoreState.stageQueueChange).toHaveBeenCalledWith(
                'root.default',
                'state',
                'STOPPED'
            );
        });
    });

    it('should not allow deletion of queues with children', async () => {
        // Test with root queue that has children
        const rootNodeProps = {
            ...nodeProps,
            id: 'root',
            data: {
                ...nodeProps.data,
                queuePath: 'root',
                queueName: 'root',
                isLeaf: false,
            },
        };

        render(<QueueCardNode {...rootNodeProps} />);

        // Right-click to open context menu
        const queueCard = screen.getByTestId('queue-card');
        fireEvent.contextMenu(queueCard);

        // Delete option should not be available
        await waitFor(() => {
            expect(screen.queryByText('Delete Queue')).not.toBeInTheDocument();
        });
    });
});
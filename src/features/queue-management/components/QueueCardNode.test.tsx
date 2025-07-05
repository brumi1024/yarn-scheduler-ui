import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '~/testing/setup/setup';
import { QueueCardNode } from './QueueCardNode';
import userEvent from '@testing-library/user-event';
import { useSchedulerStore } from '~/stores/schedulerStore';
import type { QueueCardData } from '../hooks/useQueueTreeData';
import { TooltipProvider } from '~/components/ui/tooltip';
import type { NodeProps } from '@xyflow/react';

// Mock the store
vi.mock('~/stores/schedulerStore');

// Mock the dialog components
vi.mock('./dialogs/AddQueueDialog', () => ({
  AddQueueDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="add-queue-dialog">Add Queue Dialog</div> : null,
}));

vi.mock('./dialogs/DeleteQueueDialog', () => ({
  DeleteQueueDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="delete-queue-dialog">Delete Queue Dialog</div> : null,
}));

// Mock React Flow Handle components
vi.mock('@xyflow/react', () => ({
  Handle: ({ type, position }: any) => <div data-testid={`handle-${type}-${position}`} />,
  Position: {
    Top: 'top',
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right',
  },
}));

const mockSelectQueue = vi.fn();
const mockSetPropertyPanelOpen = vi.fn();
const mockToggleComparisonQueue = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

const createNodeProps = (data: QueueCardData, overrides?: Partial<NodeProps>) => {
  return {
    id: '1',
    data,
    type: 'custom',
    position: { x: 0, y: 0 },
    selected: false,
    draggable: true,
    selectable: true,
    deletable: true,
    dragging: false,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    ...overrides,
  };
};

describe('QueueCardNode', () => {
  const defaultNodeData: QueueCardData = {
    queueType: 'leaf',
    queuePath: 'root.default',
    queueName: 'default',
    capacity: 10,
    maxCapacity: 100,
    state: 'RUNNING',
    usedCapacity: 5,
    absoluteCapacity: 10,
    absoluteMaxCapacity: 100,
    absoluteUsedCapacity: 5,
    numApplications: 2,
    numActiveApplications: 1,
    numPendingApplications: 1,
    resourcesUsed: undefined,
    stagedStatus: undefined,
    isLeaf: true,
    capacityConfig: '10',
    maxCapacityConfig: '100',
    stagedState: undefined,
    autoCreationStatus: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useSchedulerStore as any).mockImplementation((selector: any) => {
      const state = {
        comparisonQueues: [],
        selectedQueuePath: null,
        selectQueue: mockSelectQueue,
        setPropertyPanelOpen: mockSetPropertyPanelOpen,
        toggleComparisonQueue: mockToggleComparisonQueue,
        getQueueByPath: vi.fn().mockReturnValue({ queueName: 'default' }),
        getChildQueues: vi.fn().mockReturnValue([]),
      };
      return selector ? selector(state) : state;
    });
  });

  it('should display queue name and path', () => {
    renderWithProviders(<QueueCardNode {...createNodeProps(defaultNodeData)} />);

    expect(screen.getByText('default')).toBeInTheDocument();
    expect(screen.getByText('root.default')).toBeInTheDocument();
  });

  it('should display capacity information', () => {
    renderWithProviders(<QueueCardNode {...createNodeProps(defaultNodeData)} />);

    const capacityDisplay = screen
      .getAllByText('10%')
      .find((el) => el.className.includes('text-2xl'));
    expect(capacityDisplay).toBeInTheDocument();
    expect(screen.getByText('capacity')).toBeInTheDocument();
    expect(screen.getByText('Maximum capacity: 100%')).toBeInTheDocument();
  });

  it('should display capacity with weight format', () => {
    const nodeData = {
      ...defaultNodeData,
      capacityConfig: '2w',
      maxCapacityConfig: '5w',
    };

    renderWithProviders(<QueueCardNode {...createNodeProps(nodeData)} />);

    expect(screen.getByText('2w')).toBeInTheDocument();
    expect(screen.getByText('Maximum capacity: 5w')).toBeInTheDocument();
  });

  it('should display queue status badges', () => {
    const { container } = renderWithProviders(
      <QueueCardNode {...createNodeProps(defaultNodeData)} />,
    );

    const svgIcons = container.querySelectorAll('svg.lucide');
    expect(svgIcons.length).toBeGreaterThanOrEqual(2); // At least capacity mode and state badges

    // Verify we have the percentage icon (capacity mode)
    const percentIcon = container.querySelector('svg.lucide-percent');
    expect(percentIcon).toBeInTheDocument();

    // Verify we have the play icon (running state)
    const playIcon = container.querySelector('svg.lucide-play');
    expect(playIcon).toBeInTheDocument();
  });

  it('should open property panel on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QueueCardNode {...createNodeProps(defaultNodeData)} />);

    const card = screen.getByText('default').closest('.relative');
    if (!card) throw new Error('Card not found');
    await user.click(card);

    expect(mockSelectQueue).toHaveBeenCalledWith('root.default');
    expect(mockSetPropertyPanelOpen).toHaveBeenCalledWith(true);
  });

  it('should not open property panel for newly added queues', async () => {
    const user = userEvent.setup();
    const nodeData = {
      ...defaultNodeData,
      stagedStatus: 'new' as const,
    };

    renderWithProviders(<QueueCardNode {...createNodeProps(nodeData)} />);

    const card = screen.getByText('default').closest('.relative');
    if (!card) throw new Error('Card not found');
    await user.click(card);

    expect(mockSelectQueue).not.toHaveBeenCalled();
    expect(mockSetPropertyPanelOpen).not.toHaveBeenCalled();
  });

  it('should show tooltip for newly added queues', async () => {
    const user = userEvent.setup();
    const nodeData = {
      ...defaultNodeData,
      stagedStatus: 'new' as const,
    };

    renderWithProviders(<QueueCardNode {...createNodeProps(nodeData)} />);

    const card = screen.getByText('default').closest('.relative');
    if (!card) throw new Error('Card not found');
    await user.hover(card);

    const tooltips = await screen.findAllByText(
      'This queue must be applied before it can be edited',
    );
    expect(tooltips.length).toBeGreaterThan(0);
  });

  it('should toggle comparison checkbox', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QueueCardNode {...createNodeProps(defaultNodeData)} />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(mockToggleComparisonQueue).toHaveBeenCalledWith('root.default');
  });

  it('should show selected state when queue is selected', () => {
    (useSchedulerStore as any).mockImplementation((selector: any) => {
      const state = {
        comparisonQueues: [],
        selectedQueuePath: 'root.default',
        selectQueue: mockSelectQueue,
        setPropertyPanelOpen: mockSetPropertyPanelOpen,
        toggleComparisonQueue: mockToggleComparisonQueue,
        getQueueByPath: vi.fn().mockReturnValue({ queueName: 'default' }),
        getChildQueues: vi.fn().mockReturnValue([]),
      };
      return selector ? selector(state) : state;
    });

    renderWithProviders(<QueueCardNode {...createNodeProps(defaultNodeData)} />);

    const card = screen.getByText('default').closest('.relative');
    if (!card) throw new Error('Card not found');
    expect(card).toHaveClass('bg-blue-200');
  });

  it('should show comparison state when queue is in comparison', () => {
    (useSchedulerStore as any).mockImplementation((selector: any) => {
      const state = {
        comparisonQueues: ['root.default'],
        selectedQueuePath: null,
        selectQueue: mockSelectQueue,
        setPropertyPanelOpen: mockSetPropertyPanelOpen,
        toggleComparisonQueue: mockToggleComparisonQueue,
        getQueueByPath: vi.fn().mockReturnValue({ queueName: 'default' }),
        getChildQueues: vi.fn().mockReturnValue([]),
      };
      return selector ? selector(state) : state;
    });

    renderWithProviders(<QueueCardNode {...createNodeProps(defaultNodeData)} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('should show context menu on right click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QueueCardNode {...createNodeProps(defaultNodeData)} />);

    // Find the card by its queue name
    const card = screen.getByText('default').closest('[data-slot="context-menu-trigger"]');
    if (!card) throw new Error('Card not found');

    await user.pointer({ keys: '[MouseRight]', target: card });

    expect(await screen.findByText('Edit Properties')).toBeInTheDocument();
    expect(screen.getByText('Stop Queue')).toBeInTheDocument();
    expect(screen.getByText('Add Child Queue')).toBeInTheDocument();
  });

  it('should show new queue status with tooltip', () => {
    const nodeData = {
      ...defaultNodeData,
      stagedStatus: 'new' as const,
    };

    const { container } = renderWithProviders(<QueueCardNode {...createNodeProps(nodeData)} />);

    const card = screen.getByText('default').closest('.relative');
    expect(card).toHaveClass('ring-queue-new');
    expect(card).toHaveClass('cursor-not-allowed');
    expect(card).toHaveClass('opacity-75');

    const tooltipTrigger = container.querySelector('[data-slot="tooltip-trigger"]');
    expect(tooltipTrigger).toBeInTheDocument();
  });

  it('should show different status badges based on staged changes', () => {
    const nodeData = {
      ...defaultNodeData,
      stagedStatus: 'modified' as const,
    };

    renderWithProviders(<QueueCardNode {...createNodeProps(nodeData)} />);

    const card = screen.getByText('default').closest('.relative');
    if (!card) throw new Error('Card not found');
    expect(card).toHaveClass('ring-queue-modified');
  });

  it('should show resource usage statistics', () => {
    const nodeData = {
      ...defaultNodeData,
      numApplications: 5,
      resourcesUsed: {
        memory: 1024,
        vCores: 4,
      },
    };

    renderWithProviders(<QueueCardNode {...createNodeProps(nodeData)} />);

    // QueueResourceStats shows total apps, memory and vCores
    expect(screen.getByText('Apps: 5')).toBeInTheDocument();
    expect(screen.getByText('Memory: 1 GB')).toBeInTheDocument(); // formatMemory should convert 1024 MB to 1 GB
    expect(screen.getByText('vCores: 4')).toBeInTheDocument();
  });

  it('should open add queue dialog from context menu', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QueueCardNode {...createNodeProps(defaultNodeData)} />);

    // Find the card by queue name
    const card = screen.getByText('default').closest('[data-slot="context-menu-trigger"]');
    if (!card) throw new Error('Card not found');

    await user.pointer({ keys: '[MouseRight]', target: card });

    const addMenuItem = await screen.findByText('Add Child Queue');
    await user.click(addMenuItem);

    expect(screen.getByTestId('add-queue-dialog')).toBeInTheDocument();
  });

  it('should deselect queue when context menu closes', async () => {
    const user = userEvent.setup();
    (useSchedulerStore as any).mockImplementation((selector: any) => {
      const state = {
        comparisonQueues: [],
        selectedQueuePath: 'root.default',
        selectQueue: mockSelectQueue,
        setPropertyPanelOpen: mockSetPropertyPanelOpen,
        toggleComparisonQueue: mockToggleComparisonQueue,
        getQueueByPath: vi.fn().mockReturnValue({ queueName: 'default' }),
        getChildQueues: vi.fn().mockReturnValue([]),
      };
      return selector ? selector(state) : state;
    });

    renderWithProviders(<QueueCardNode {...createNodeProps(defaultNodeData)} />);

    // Open context menu
    const card = screen.getByText('default').closest('[data-slot="context-menu-trigger"]');
    if (!card) throw new Error('Card not found');

    await user.pointer({ keys: '[MouseRight]', target: card });

    // Wait for context menu to open
    await screen.findByText('Edit Properties');

    // Close by pressing escape
    await user.keyboard('{Escape}');

    expect(mockSelectQueue).toHaveBeenCalledWith(null);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '~/test-utils/setup';
import { QueueCardNode } from './QueueCardNode';
import { getMockQueueInfo } from '~/test-utils/factories';
import userEvent from '@testing-library/user-event';
import { useSchedulerStore } from '~/store/schedulerStore';
import type { QueueCardData } from './hooks/useQueueTreeData';

// Mock the store
vi.mock('~/store/schedulerStore');

// Mock the dialog components
vi.mock('./dialogs/AddQueueDialog', () => ({
  AddQueueDialog: ({ open, onClose }: any) => 
    open ? <div data-testid="add-queue-dialog">Add Queue Dialog</div> : null,
}));

vi.mock('./dialogs/DeleteQueueDialog', () => ({
  DeleteQueueDialog: ({ open, onClose }: any) => 
    open ? <div data-testid="delete-queue-dialog">Delete Queue Dialog</div> : null,
}));

const mockSelectQueue = vi.fn();
const mockSetPropertyPanelOpen = vi.fn();
const mockToggleComparisonQueue = vi.fn();

describe('QueueCardNode', () => {
  const defaultNodeData: QueueCardData = {
    queuePath: 'root.default',
    queueName: 'default',
    capacity: 10,
    maxCapacity: 100,
    state: 'RUNNING',
    usedCapacity: 5,
    numApplications: 2,
    resourcesUsed: null,
    stagedStatus: undefined,
    capacityConfig: '10',
    maxCapacityConfig: '100',
    stagedState: undefined,
    autoCreationStatus: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useSchedulerStore as any).mockReturnValue({
      comparisonQueues: [],
      selectedQueuePath: null,
      selectQueue: mockSelectQueue,
      setPropertyPanelOpen: mockSetPropertyPanelOpen,
      toggleComparisonQueue: mockToggleComparisonQueue,
    });
  });

  it('should display queue name and path', () => {
    render(<QueueCardNode data={defaultNodeData} />);
    
    expect(screen.getByText('default')).toBeInTheDocument();
    expect(screen.getByText('root.default')).toBeInTheDocument();
  });

  it('should display capacity information', () => {
    render(<QueueCardNode data={defaultNodeData} />);
    
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('capacity')).toBeInTheDocument();
    expect(screen.getByText('Maximum capacity: 100%')).toBeInTheDocument();
  });

  it('should display capacity with weight format', () => {
    const nodeData = {
      ...defaultNodeData,
      capacityConfig: '2w',
      maxCapacityConfig: '5w',
    };
    
    render(<QueueCardNode data={nodeData} />);
    
    expect(screen.getByText('2w')).toBeInTheDocument();
    expect(screen.getByText('Maximum capacity: 5w')).toBeInTheDocument();
  });

  it('should display queue status badges', () => {
    render(<QueueCardNode data={defaultNodeData} />);
    
    // The QueueStatusBadges component should render the appropriate badges
    const runningBadge = screen.getByRole('img', { name: /running/i });
    expect(runningBadge).toBeInTheDocument();
  });

  it('should open property panel on click', async () => {
    const user = userEvent.setup();
    render(<QueueCardNode data={defaultNodeData} />);
    
    const card = screen.getByRole('button');
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
    
    render(<QueueCardNode data={nodeData} />);
    
    const card = screen.getByRole('button');
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
    
    render(<QueueCardNode data={nodeData} />);
    
    const card = screen.getByRole('button');
    await user.hover(card);
    
    expect(await screen.findByText('This queue must be applied before it can be edited')).toBeInTheDocument();
  });

  it('should toggle comparison checkbox', async () => {
    const user = userEvent.setup();
    render(<QueueCardNode data={defaultNodeData} />);
    
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    
    expect(mockToggleComparisonQueue).toHaveBeenCalledWith('root.default');
  });

  it('should show selected state when queue is selected', () => {
    (useSchedulerStore as any).mockReturnValue({
      comparisonQueues: [],
      selectedQueuePath: 'root.default',
      selectQueue: mockSelectQueue,
      setPropertyPanelOpen: mockSetPropertyPanelOpen,
      toggleComparisonQueue: mockToggleComparisonQueue,
    });
    
    render(<QueueCardNode data={defaultNodeData} />);
    
    const card = screen.getByRole('button');
    expect(card).toHaveClass('bg-accent');
  });

  it('should show comparison state when queue is in comparison', () => {
    (useSchedulerStore as any).mockReturnValue({
      comparisonQueues: ['root.default'],
      selectedQueuePath: null,
      selectQueue: mockSelectQueue,
      setPropertyPanelOpen: mockSetPropertyPanelOpen,
      toggleComparisonQueue: mockToggleComparisonQueue,
    });
    
    render(<QueueCardNode data={defaultNodeData} />);
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('should show context menu on right click', async () => {
    const user = userEvent.setup();
    render(<QueueCardNode data={defaultNodeData} />);
    
    const card = screen.getByRole('button');
    await user.pointer({ keys: '[MouseRight]', target: card });
    
    expect(await screen.findByText('Edit Properties')).toBeInTheDocument();
    expect(screen.getByText('Stop Queue')).toBeInTheDocument();
    expect(screen.getByText('Add Child Queue')).toBeInTheDocument();
  });

  it('should disable edit properties for new queues in context menu', async () => {
    const user = userEvent.setup();
    const nodeData = {
      ...defaultNodeData,
      stagedStatus: 'new' as const,
    };
    
    render(<QueueCardNode data={nodeData} />);
    
    const card = screen.getByRole('button');
    await user.pointer({ keys: '[MouseRight]', target: card });
    
    const editMenuItem = await screen.findByText('Edit Properties');
    expect(editMenuItem.closest('[role="menuitem"]')).toHaveAttribute('aria-disabled', 'true');
  });

  it('should show different status badges based on staged changes', () => {
    const nodeData = {
      ...defaultNodeData,
      stagedStatus: 'modified' as const,
    };
    
    render(<QueueCardNode data={nodeData} />);
    
    const card = screen.getByRole('button');
    expect(card).toHaveClass('ring-queue-modified');
  });

  it('should show resource usage statistics', () => {
    const nodeData = {
      ...defaultNodeData,
      numApplications: 5,
      numActiveApplications: 3,
      numPendingApplications: 2,
    };
    
    render(<QueueCardNode data={nodeData} />);
    
    expect(screen.getByText('5')).toBeInTheDocument(); // Total apps
    expect(screen.getByText('3')).toBeInTheDocument(); // Active
    expect(screen.getByText('2')).toBeInTheDocument(); // Pending
  });

  it('should open add queue dialog from context menu', async () => {
    const user = userEvent.setup();
    render(<QueueCardNode data={defaultNodeData} />);
    
    const card = screen.getByRole('button');
    await user.pointer({ keys: '[MouseRight]', target: card });
    
    const addMenuItem = await screen.findByText('Add Child Queue');
    await user.click(addMenuItem);
    
    expect(screen.getByTestId('add-queue-dialog')).toBeInTheDocument();
  });

  it('should deselect queue when context menu closes', async () => {
    const user = userEvent.setup();
    (useSchedulerStore as any).mockReturnValue({
      comparisonQueues: [],
      selectedQueuePath: 'root.default',
      selectQueue: mockSelectQueue,
      setPropertyPanelOpen: mockSetPropertyPanelOpen,
      toggleComparisonQueue: mockToggleComparisonQueue,
    });
    
    render(<QueueCardNode data={defaultNodeData} />);
    
    // Open context menu
    const card = screen.getByRole('button');
    await user.pointer({ keys: '[MouseRight]', target: card });
    
    // Close by clicking outside
    await user.click(document.body);
    
    expect(mockSelectQueue).toHaveBeenCalledWith(null);
  });
});
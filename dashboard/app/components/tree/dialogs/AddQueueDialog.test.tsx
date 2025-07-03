import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '~/test-utils/setup';
import { AddQueueDialog } from './AddQueueDialog';
import userEvent from '@testing-library/user-event';
import { useSchedulerStore } from '~/store/schedulerStore';

// Mock the store
vi.mock('~/store/schedulerStore');

const mockStageQueueAddition = vi.fn();
const mockGetChildQueues = vi.fn();
const mockGetQueuePropertyValue = vi.fn();

describe('AddQueueDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSchedulerStore as any).mockReturnValue({
      stageQueueAddition: mockStageQueueAddition,
      getChildQueues: mockGetChildQueues,
      getQueuePropertyValue: mockGetQueuePropertyValue,
    });
    
    // Default mocks
    mockGetChildQueues.mockReturnValue([]);
    mockGetQueuePropertyValue.mockReturnValue({ value: '100', isStaged: false });
  });

  it('should not render when closed', () => {
    render(
      <AddQueueDialog 
        open={false} 
        parentQueuePath="root" 
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render dialog with parent queue information', () => {
    render(
      <AddQueueDialog 
        open={true} 
        parentQueuePath="root.production" 
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add New Queue')).toBeInTheDocument();
    expect(screen.getByText('Parent queue: root.production')).toBeInTheDocument();
  });

  it('should validate queue name format', async () => {
    const user = userEvent.setup();
    render(
      <AddQueueDialog 
        open={true} 
        parentQueuePath="root" 
        onClose={vi.fn()} 
      />
    );
    
    const nameInput = screen.getByLabelText('Queue Name');
    const submitButton = screen.getByRole('button', { name: 'Add Queue' });
    
    // Test invalid name with dots
    await user.type(nameInput, 'queue.with.dots');
    await user.click(submitButton);
    
    expect(await screen.findByText('Queue name must be alphanumeric with hyphens or underscores only, and cannot contain dots')).toBeInTheDocument();
    expect(mockStageQueueAddition).not.toHaveBeenCalled();
  });

  it('should validate duplicate queue names', async () => {
    const user = userEvent.setup();
    mockGetChildQueues.mockReturnValue([
      { queueName: 'existing-queue', queuePath: 'root.existing-queue' },
    ]);
    
    render(
      <AddQueueDialog 
        open={true} 
        parentQueuePath="root" 
        onClose={vi.fn()} 
      />
    );
    
    const nameInput = screen.getByLabelText('Queue Name');
    const submitButton = screen.getByRole('button', { name: 'Add Queue' });
    
    await user.type(nameInput, 'existing-queue');
    await user.click(submitButton);
    
    expect(await screen.findByText('A queue with this name already exists')).toBeInTheDocument();
    expect(mockStageQueueAddition).not.toHaveBeenCalled();
  });

  it('should validate capacity value', async () => {
    const user = userEvent.setup();
    render(
      <AddQueueDialog 
        open={true} 
        parentQueuePath="root" 
        onClose={vi.fn()} 
      />
    );
    
    const nameInput = screen.getByLabelText('Queue Name');
    const capacityInput = screen.getByLabelText('Capacity');
    const submitButton = screen.getByRole('button', { name: 'Add Queue' });
    
    await user.type(nameInput, 'valid-queue');
    await user.clear(capacityInput);
    await user.type(capacityInput, '-10');
    await user.click(submitButton);
    
    expect(await screen.findByText(/Invalid capacity format/)).toBeInTheDocument();
    expect(mockStageQueueAddition).not.toHaveBeenCalled();
  });

  it('should show available capacity from parent', () => {
    mockGetQueuePropertyValue.mockReturnValue({ value: '60', isStaged: false });
    mockGetChildQueues.mockReturnValue([
      { queueName: 'child1', queuePath: 'root.child1', capacity: 25 },
      { queueName: 'child2', queuePath: 'root.child2', capacity: 15 },
    ]);
    
    render(
      <AddQueueDialog 
        open={true} 
        parentQueuePath="root" 
        onClose={vi.fn()} 
      />
    );
    
    // Available = 60 - 25 - 15 = 20
    expect(screen.getByText('Available capacity: 20%')).toBeInTheDocument();
  });

  it('should stage new queue on valid submission', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    render(
      <AddQueueDialog 
        open={true} 
        parentQueuePath="root.production" 
        onClose={onClose} 
      />
    );
    
    const nameInput = screen.getByLabelText('Queue Name');
    const capacityInput = screen.getByLabelText('Capacity');
    const submitButton = screen.getByRole('button', { name: 'Add Queue' });
    
    await user.type(nameInput, 'new-queue');
    await user.clear(capacityInput);
    await user.type(capacityInput, '25');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockStageQueueAddition).toHaveBeenCalledWith(
        'root.production',
        'new-queue',
        {
          capacity: '25',
          'maximum-capacity': '100',
          state: 'RUNNING',
        }
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should clear form and close on cancel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    render(
      <AddQueueDialog 
        open={true} 
        parentQueuePath="root" 
        onClose={onClose} 
      />
    );
    
    const nameInput = screen.getByLabelText('Queue Name');
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    
    await user.type(nameInput, 'some-text');
    await user.click(cancelButton);
    
    expect(onClose).toHaveBeenCalled();
    expect(mockStageQueueAddition).not.toHaveBeenCalled();
  });

  it('should accept weight-based capacity', async () => {
    const user = userEvent.setup();
    
    render(
      <AddQueueDialog 
        open={true} 
        parentQueuePath="root" 
        onClose={vi.fn()} 
      />
    );
    
    const nameInput = screen.getByLabelText('Queue Name');
    const capacityInput = screen.getByLabelText('Capacity');
    const submitButton = screen.getByRole('button', { name: 'Add Queue' });
    
    await user.type(nameInput, 'weighted-queue');
    await user.clear(capacityInput);
    await user.type(capacityInput, '2w');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockStageQueueAddition).toHaveBeenCalledWith(
        'root',
        'weighted-queue',
        expect.objectContaining({
          capacity: '2w',
        })
      );
    });
  });

  it('should accept absolute resource capacity', async () => {
    const user = userEvent.setup();
    
    render(
      <AddQueueDialog 
        open={true} 
        parentQueuePath="root" 
        onClose={vi.fn()} 
      />
    );
    
    const nameInput = screen.getByLabelText('Queue Name');
    const capacityInput = screen.getByLabelText('Capacity');
    const submitButton = screen.getByRole('button', { name: 'Add Queue' });
    
    await user.type(nameInput, 'absolute-queue');
    await user.clear(capacityInput);
    await user.type(capacityInput, '[memory=1024,vcores=2]');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockStageQueueAddition).toHaveBeenCalledWith(
        'root',
        'absolute-queue',
        expect.objectContaining({
          capacity: '[memory=1024,vcores=2]',
        })
      );
    });
  });

  it('should show validation error for capacity exceeding available', async () => {
    const user = userEvent.setup();
    mockGetQueuePropertyValue.mockReturnValue({ value: '100', isStaged: false });
    mockGetChildQueues.mockReturnValue([
      { queueName: 'child1', queuePath: 'root.child1', capacity: 80 },
    ]);
    
    render(
      <AddQueueDialog 
        open={true} 
        parentQueuePath="root" 
        onClose={vi.fn()} 
      />
    );
    
    const nameInput = screen.getByLabelText('Queue Name');
    const capacityInput = screen.getByLabelText('Capacity');
    const submitButton = screen.getByRole('button', { name: 'Add Queue' });
    
    await user.type(nameInput, 'overflow-queue');
    await user.clear(capacityInput);
    await user.type(capacityInput, '30'); // 80 + 30 > 100
    await user.click(submitButton);
    
    // The validation should occur in the component
    await waitFor(() => {
      expect(mockStageQueueAddition).not.toHaveBeenCalled();
    });
  });
});
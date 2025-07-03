import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '~/test-utils/setup';
import { DeleteQueueDialog } from './DeleteQueueDialog';
import userEvent from '@testing-library/user-event';
import { useSchedulerStore } from '~/store/schedulerStore';

// Mock the store
vi.mock('~/store/schedulerStore');

const mockStageQueueRemoval = vi.fn();
const mockGetChildQueues = vi.fn();

describe('DeleteQueueDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSchedulerStore as any).mockReturnValue({
      stageQueueRemoval: mockStageQueueRemoval,
      getChildQueues: mockGetChildQueues,
    });
    
    // Default: queue has no children
    mockGetChildQueues.mockReturnValue([]);
  });

  it('should not render when closed', () => {
    render(
      <DeleteQueueDialog 
        open={false} 
        queuePath="root.default" 
        queueName="default"
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render dialog with queue information', () => {
    render(
      <DeleteQueueDialog 
        open={true} 
        queuePath="root.production.team1" 
        queueName="team1"
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete Queue')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete queue "team1"\?/)).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('should stage queue removal on confirmation', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    render(
      <DeleteQueueDialog 
        open={true} 
        queuePath="root.production.team1" 
        queueName="team1"
        onClose={onClose} 
      />
    );
    
    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    await user.click(deleteButton);
    
    expect(mockStageQueueRemoval).toHaveBeenCalledWith('root.production.team1');
    expect(onClose).toHaveBeenCalled();
  });

  it('should close without deletion on cancel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    render(
      <DeleteQueueDialog 
        open={true} 
        queuePath="root.production.team1" 
        queueName="team1"
        onClose={onClose} 
      />
    );
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);
    
    expect(mockStageQueueRemoval).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should show error for queues with children', () => {
    mockGetChildQueues.mockReturnValue([
      { queueName: 'child1', queuePath: 'root.parent.child1' },
      { queueName: 'child2', queuePath: 'root.parent.child2' },
    ]);
    
    render(
      <DeleteQueueDialog 
        open={true} 
        queuePath="root.parent" 
        queueName="parent"
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.getByText('Cannot delete queue with child queues')).toBeInTheDocument();
    expect(screen.getByText('This queue has 2 child queue(s). Please delete them first.')).toBeInTheDocument();
    
    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    expect(deleteButton).toBeDisabled();
  });

  it('should handle root queue specially', () => {
    render(
      <DeleteQueueDialog 
        open={true} 
        queuePath="root" 
        queueName="root"
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.getByText(/Are you sure you want to delete queue "root"\?/)).toBeInTheDocument();
    
    // Even though it's root, if it has no children in our mock, delete should be enabled
    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    expect(deleteButton).not.toBeDisabled();
  });

  it('should close on escape key', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    render(
      <DeleteQueueDialog 
        open={true} 
        queuePath="root.default" 
        queueName="default"
        onClose={onClose} 
      />
    );
    
    await user.keyboard('{Escape}');
    
    expect(onClose).toHaveBeenCalled();
    expect(mockStageQueueRemoval).not.toHaveBeenCalled();
  });

  it('should show correct child queue names', () => {
    mockGetChildQueues.mockReturnValue([
      { queueName: 'dev-team', queuePath: 'root.production.dev-team' },
      { queueName: 'qa-team', queuePath: 'root.production.qa-team' },
      { queueName: 'ops-team', queuePath: 'root.production.ops-team' },
    ]);
    
    render(
      <DeleteQueueDialog 
        open={true} 
        queuePath="root.production" 
        queueName="production"
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.getByText('This queue has 3 child queue(s). Please delete them first.')).toBeInTheDocument();
  });

  it('should use danger variant for delete button', () => {
    render(
      <DeleteQueueDialog 
        open={true} 
        queuePath="root.default" 
        queueName="default"
        onClose={vi.fn()} 
      />
    );
    
    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    expect(deleteButton).toHaveClass('destructive');
  });
});
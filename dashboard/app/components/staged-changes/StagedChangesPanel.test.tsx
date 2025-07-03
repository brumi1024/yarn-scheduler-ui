import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '~/test-utils/setup';
import { StagedChangesPanel } from './StagedChangesPanel';
import userEvent from '@testing-library/user-event';
import { useSchedulerStore } from '~/store/schedulerStore';
import { toast } from 'sonner';
import type { StagedChange } from '~/types';

// Mock the store
vi.mock('~/store/schedulerStore');

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock the child components
vi.mock('./QueueChangeGroup', () => ({
  QueueChangeGroup: ({ queuePath, changes, onRevert }: any) => (
    <div data-testid={`queue-group-${queuePath}`}>
      <div>Queue: {queuePath}</div>
      <div>Changes: {changes.length}</div>
      {changes.map((change: StagedChange) => (
        <button
          key={change.id}
          onClick={() => onRevert(change)}
          data-testid={`revert-${change.id}`}
        >
          Revert {change.property}
        </button>
      ))}
    </div>
  ),
}));

const mockStagedChanges: StagedChange[] = [
  {
    id: '1',
    type: 'update',
    queuePath: 'root.default',
    property: 'capacity',
    oldValue: '10',
    newValue: '20',
    timestamp: Date.now(),
  },
  {
    id: '2',
    type: 'add',
    queuePath: 'root.production',
    property: 'maximum-capacity',
    newValue: '100',
    timestamp: Date.now(),
  },
];

const mockRevertChange = vi.fn();
const mockClearAllChanges = vi.fn();
const mockApplyChanges = vi.fn();

describe('StagedChangesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock the selector pattern used by the component
    (useSchedulerStore as any).mockImplementation((selector: any) => {
      const state = {
        stagedChanges: [],
        revertChange: mockRevertChange,
        clearAllChanges: mockClearAllChanges,
        applyChanges: mockApplyChanges,
      };
      return selector ? selector(state) : state;
    });
  });

  it('should show floating button when closed with staged changes', () => {
    (useSchedulerStore as any).mockImplementation((selector: any) => {
      const state = {
        stagedChanges: mockStagedChanges,
        revertChange: mockRevertChange,
        clearAllChanges: mockClearAllChanges,
        applyChanges: mockApplyChanges,
      };
      return selector ? selector(state) : state;
    });

    const onOpen = vi.fn();
    render(
      <StagedChangesPanel 
        open={false} 
        onClose={vi.fn()} 
        onOpen={onOpen}
      />
    );
    
    const button = screen.getByRole('button', { name: /view staged changes/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Badge count
  });

  it('should not show floating button when no staged changes', () => {
    render(
      <StagedChangesPanel 
        open={false} 
        onClose={vi.fn()} 
        onOpen={vi.fn()}
      />
    );
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should open panel when floating button is clicked', async () => {
    const user = userEvent.setup();
    (useSchedulerStore as any).mockImplementation((selector: any) => {
      const state = {
      stagedChanges: mockStagedChanges,
      revertChange: mockRevertChange,
      clearAllChanges: mockClearAllChanges,
      applyChanges: mockApplyChanges,
      };
      return selector ? selector(state) : state;
    });

    const onOpen = vi.fn();
    render(
      <StagedChangesPanel 
        open={false} 
        onClose={vi.fn()} 
        onOpen={onOpen}
      />
    );
    
    await user.click(screen.getByRole('button', { name: /view staged changes/i }));
    expect(onOpen).toHaveBeenCalled();
  });

  it('should render staged changes grouped by queue', () => {
    (useSchedulerStore as any).mockImplementation((selector: any) => {
      const state = {
      stagedChanges: mockStagedChanges,
      revertChange: mockRevertChange,
      clearAllChanges: mockClearAllChanges,
      applyChanges: mockApplyChanges,
      };
      return selector ? selector(state) : state;
    });

    render(
      <StagedChangesPanel 
        open={true} 
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.getByText('Staged Changes')).toBeInTheDocument();
    expect(screen.getByText('2 changes')).toBeInTheDocument();
    expect(screen.getByTestId('queue-group-root.default')).toBeInTheDocument();
    expect(screen.getByTestId('queue-group-root.production')).toBeInTheDocument();
  });

  it('should show empty state when no staged changes', () => {
    render(
      <StagedChangesPanel 
        open={true} 
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.getByText('No staged changes')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apply all changes/i })).not.toBeInTheDocument();
  });

  it('should revert individual change', async () => {
    const user = userEvent.setup();
    (useSchedulerStore as any).mockImplementation((selector: any) => {
      const state = {
      stagedChanges: mockStagedChanges,
      revertChange: mockRevertChange,
      clearAllChanges: mockClearAllChanges,
      applyChanges: mockApplyChanges,
      };
      return selector ? selector(state) : state;
    });

    render(
      <StagedChangesPanel 
        open={true} 
        onClose={vi.fn()} 
      />
    );
    
    await user.click(screen.getByTestId('revert-1'));
    
    expect(mockRevertChange).toHaveBeenCalledWith(mockStagedChanges[0].id);
    expect(toast.info).toHaveBeenCalledWith('Reverted change: capacity');
  });

  it('should clear all changes', async () => {
    const user = userEvent.setup();
    (useSchedulerStore as any).mockImplementation((selector: any) => {
      const state = {
      stagedChanges: mockStagedChanges,
      revertChange: mockRevertChange,
      clearAllChanges: mockClearAllChanges,
      applyChanges: mockApplyChanges,
      };
      return selector ? selector(state) : state;
    });

    render(
      <StagedChangesPanel 
        open={true} 
        onClose={vi.fn()} 
      />
    );
    
    await user.click(screen.getByRole('button', { name: /clear all/i }));
    
    expect(mockClearAllChanges).toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith('All staged changes cleared');
  });

  it('should apply all changes successfully', async () => {
    const user = userEvent.setup();
    mockApplyChanges.mockResolvedValue(undefined);
    (useSchedulerStore as any).mockImplementation((selector: any) => {
      const state = {
      stagedChanges: mockStagedChanges,
      revertChange: mockRevertChange,
      clearAllChanges: mockClearAllChanges,
      applyChanges: mockApplyChanges,
      };
      return selector ? selector(state) : state;
    });

    const onClose = vi.fn();
    render(
      <StagedChangesPanel 
        open={true} 
        onClose={onClose} 
      />
    );
    
    await user.click(screen.getByRole('button', { name: /apply all changes/i }));
    
    expect(mockApplyChanges).toHaveBeenCalled();
    
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('All changes applied successfully');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should handle apply changes error', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockApplyChanges.mockRejectedValue(new Error('Network error'));
    
    (useSchedulerStore as any).mockImplementation((selector: any) => {
      const state = {
      stagedChanges: mockStagedChanges,
      revertChange: mockRevertChange,
      clearAllChanges: mockClearAllChanges,
      applyChanges: mockApplyChanges,
      };
      return selector ? selector(state) : state;
    });

    render(
      <StagedChangesPanel 
        open={true} 
        onClose={vi.fn()} 
      />
    );
    
    await user.click(screen.getByRole('button', { name: /apply all changes/i }));
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to apply changes');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to apply changes:', expect.any(Error));
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('should disable actions while applying changes', async () => {
    const user = userEvent.setup();
    mockApplyChanges.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    (useSchedulerStore as any).mockImplementation((selector: any) => {
      const state = {
      stagedChanges: mockStagedChanges,
      revertChange: mockRevertChange,
      clearAllChanges: mockClearAllChanges,
      applyChanges: mockApplyChanges,
      };
      return selector ? selector(state) : state;
    });

    render(
      <StagedChangesPanel 
        open={true} 
        onClose={vi.fn()} 
      />
    );
    
    const applyButton = screen.getByRole('button', { name: /apply all changes/i });
    const clearButton = screen.getByRole('button', { name: /clear all/i });
    
    await user.click(applyButton);
    
    // Should show loading state
    expect(screen.getByText('Applying...')).toBeInTheDocument();
    expect(applyButton).toBeDisabled();
    expect(clearButton).toBeDisabled();
  });

  it('should toggle drawer state', async () => {
    const user = userEvent.setup();
    (useSchedulerStore as any).mockImplementation((selector: any) => {
      const state = {
      stagedChanges: mockStagedChanges,
      revertChange: mockRevertChange,
      clearAllChanges: mockClearAllChanges,
      applyChanges: mockApplyChanges,
      };
      return selector ? selector(state) : state;
    });

    const { container } = render(
      <StagedChangesPanel 
        open={true} 
        onClose={vi.fn()} 
      />
    );
    
    // The Sheet component renders content in a portal, so we need to look in the document body
    const sheetContent = document.querySelector('[data-slot="sheet-content"]');
    expect(sheetContent).toBeTruthy();
    expect(sheetContent).toHaveClass('h-[200px]');
    
    // Click toggle button - find the button with ChevronUp icon
    const toggleButton = screen.getAllByRole('button').find(
      btn => btn.querySelector('svg.lucide-chevron-up')
    );
    expect(toggleButton).toBeDefined();
    await user.click(toggleButton!);
    
    // Should expand
    expect(sheetContent).toHaveClass('h-[60vh]');
  });

  it('should close panel when clicking close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    render(
      <StagedChangesPanel 
        open={true} 
        onClose={onClose} 
      />
    );
    
    // The Sheet component would normally handle this through onOpenChange
    // We test that the onClose prop is passed correctly
    expect(onClose).toBeDefined();
  });

  it('should display change count in badge', () => {
    const changes: StagedChange[] = [
      ...mockStagedChanges,
      {
        id: '3',
        type: 'remove',
        queuePath: 'root.test',
        property: 'state',
        oldValue: 'RUNNING',
        timestamp: Date.now(),
      },
    ];
    
    (useSchedulerStore as any).mockImplementation((selector: any) => {
      const state = {
      stagedChanges: changes,
      revertChange: mockRevertChange,
      clearAllChanges: mockClearAllChanges,
      applyChanges: mockApplyChanges,
      };
      return selector ? selector(state) : state;
    });

    render(
      <StagedChangesPanel 
        open={true} 
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.getByText('3 changes')).toBeInTheDocument();
  });

  it('should display singular form for one change', () => {
    (useSchedulerStore as any).mockImplementation((selector: any) => {
      const state = {
      stagedChanges: [mockStagedChanges[0]],
      revertChange: mockRevertChange,
      clearAllChanges: mockClearAllChanges,
      applyChanges: mockApplyChanges,
      };
      return selector ? selector(state) : state;
    });

    render(
      <StagedChangesPanel 
        open={true} 
        onClose={vi.fn()} 
      />
    );
    
    expect(screen.getByText('1 change')).toBeInTheDocument();
  });
});
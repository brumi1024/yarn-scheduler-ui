import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompareButton } from './CompareButton';
import { useSchedulerStore } from '~/stores/schedulerStore';

vi.mock('~/stores/schedulerStore');
vi.mock('./QueueComparisonDialog', () => ({
  QueueComparisonDialog: vi.fn(({ open, onOpenChange }) => (
    <div data-testid="comparison-dialog" data-open={open}>
      <button onClick={() => onOpenChange(false)}>Close</button>
    </div>
  )),
}));

describe('CompareButton', () => {
  const mockSetComparisonMode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useSchedulerStore as any).mockImplementation((selector: any) => {
      const state = {
        comparisonQueues: ['root.default', 'root.production'],
        setComparisonMode: mockSetComparisonMode,
        isComparisonModeActive: true,
      };
      return selector ? selector(state) : state;
    });
  });

  it('should not render when comparison mode is not active', () => {
    (useSchedulerStore as any).mockImplementation((selector: any) => {
      const state = {
        comparisonQueues: ['root.default', 'root.production'],
        setComparisonMode: mockSetComparisonMode,
        isComparisonModeActive: false,
      };
      return selector ? selector(state) : state;
    });

    const { container } = render(<CompareButton />);

    expect(container.firstChild).toBeNull();
  });

  it('should render when 2 or more queues are selected', () => {
    render(<CompareButton />);

    expect(screen.getByText('Compare 2 Queues')).toBeInTheDocument();
  });

  it('should display the correct number of selected queues', () => {
    (useSchedulerStore as any).mockImplementation((selector: any) => {
      const state = {
        comparisonQueues: ['root.default', 'root.production', 'root.dev'],
        setComparisonMode: mockSetComparisonMode,
        isComparisonModeActive: true,
      };
      return selector ? selector(state) : state;
    });

    render(<CompareButton />);

    expect(screen.getByText('Compare 3 Queues')).toBeInTheDocument();
  });

  it('should open dialog when compare button is clicked', () => {
    render(<CompareButton />);
    const compareButton = screen.getByText('Compare 2 Queues');

    fireEvent.click(compareButton);

    const dialog = screen.getByTestId('comparison-dialog');
    expect(dialog).toHaveAttribute('data-open', 'true');
  });

  it('should exit comparison mode when exit button is clicked', () => {
    render(<CompareButton />);
    const exitButton = screen.getByLabelText('Exit comparison mode');

    fireEvent.click(exitButton);

    expect(mockSetComparisonMode).toHaveBeenCalledWith(false);
  });

  it('should close dialog when onOpenChange is called without exiting comparison mode', () => {
    render(<CompareButton />);
    const compareButton = screen.getByText('Compare 2 Queues');

    fireEvent.click(compareButton);

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    const dialog = screen.getByTestId('comparison-dialog');
    expect(dialog).toHaveAttribute('data-open', 'false');
    // Comparison mode should NOT be exited when dialog closes
    expect(mockSetComparisonMode).not.toHaveBeenCalled();
  });
});

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
  const mockClearComparisonQueues = vi.fn();
  const mockCanCompareQueues = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useSchedulerStore as any).mockReturnValue({
      comparisonQueues: ['root.default', 'root.production'],
      clearComparisonQueues: mockClearComparisonQueues,
      canCompareQueues: mockCanCompareQueues,
    });
  });

  it('should not render when canCompareQueues returns false', () => {
    mockCanCompareQueues.mockReturnValue(false);

    const { container } = render(<CompareButton />);

    expect(container.firstChild).toBeNull();
  });

  it('should render when canCompareQueues returns true', () => {
    mockCanCompareQueues.mockReturnValue(true);

    render(<CompareButton />);

    expect(screen.getByText('Compare 2 Queues')).toBeInTheDocument();
  });

  it('should display the correct number of selected queues', () => {
    mockCanCompareQueues.mockReturnValue(true);
    (useSchedulerStore as any).mockReturnValue({
      comparisonQueues: ['root.default', 'root.production', 'root.dev'],
      clearComparisonQueues: mockClearComparisonQueues,
      canCompareQueues: mockCanCompareQueues,
    });

    render(<CompareButton />);

    expect(screen.getByText('Compare 3 Queues')).toBeInTheDocument();
  });

  it('should open dialog when compare button is clicked', () => {
    mockCanCompareQueues.mockReturnValue(true);

    render(<CompareButton />);
    const compareButton = screen.getByText('Compare 2 Queues');

    fireEvent.click(compareButton);

    const dialog = screen.getByTestId('comparison-dialog');
    expect(dialog).toHaveAttribute('data-open', 'true');
  });

  it('should clear selection when clear button is clicked', () => {
    mockCanCompareQueues.mockReturnValue(true);

    render(<CompareButton />);
    const clearButton = screen.getByLabelText('Clear selection');

    fireEvent.click(clearButton);

    expect(mockClearComparisonQueues).toHaveBeenCalled();
  });

  it('should close dialog when onOpenChange is called', () => {
    mockCanCompareQueues.mockReturnValue(true);

    render(<CompareButton />);
    const compareButton = screen.getByText('Compare 2 Queues');

    fireEvent.click(compareButton);

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    const dialog = screen.getByTestId('comparison-dialog');
    expect(dialog).toHaveAttribute('data-open', 'false');
  });
});

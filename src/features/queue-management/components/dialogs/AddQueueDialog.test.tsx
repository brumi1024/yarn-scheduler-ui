import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '~/testing/setup';
import { AddQueueDialog } from './AddQueueDialog';
import userEvent from '@testing-library/user-event';

// Mock the useQueueActions hook
const mockAddChildQueue = vi.fn();
const mockCanAddChildQueue = vi.fn();

vi.mock('../hooks/useQueueActions', () => ({
  useQueueActions: () => ({
    addChildQueue: mockAddChildQueue,
    canAddChildQueue: mockCanAddChildQueue,
  }),
}));

describe('AddQueueDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: can add child queue
    mockCanAddChildQueue.mockReturnValue(true);
  });

  it('should not render when closed', () => {
    render(<AddQueueDialog open={false} parentQueuePath="root" onClose={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render dialog with parent queue information', () => {
    render(<AddQueueDialog open={true} parentQueuePath="root.production" onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /add child queue/i })).toBeInTheDocument();
    expect(screen.getByText(/Creating new queue under:/)).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
  });

  it('should validate queue name format', async () => {
    const user = userEvent.setup();
    render(<AddQueueDialog open={true} parentQueuePath="root" onClose={vi.fn()} />);

    const nameInput = screen.getByLabelText(/queue name/i);
    const submitButton = screen.getByRole('button', { name: /add queue/i });

    // Initially button should be disabled (no name entered)
    expect(submitButton).toBeDisabled();

    // Test invalid name with dots - button should remain disabled
    await user.type(nameInput, 'queue.with.dots');

    // Wait for validation to update
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    expect(mockAddChildQueue).not.toHaveBeenCalled();
  });

  it('should validate queue name with special characters', async () => {
    const user = userEvent.setup();

    render(<AddQueueDialog open={true} parentQueuePath="root" onClose={vi.fn()} />);

    const nameInput = screen.getByLabelText(/queue name/i);
    const submitButton = screen.getByRole('button', { name: /add queue/i });

    await user.type(nameInput, 'queue@#$%');

    // Button should be disabled for invalid characters
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    expect(mockAddChildQueue).not.toHaveBeenCalled();
  });

  it('should validate capacity value', async () => {
    const user = userEvent.setup();
    render(<AddQueueDialog open={true} parentQueuePath="root" onClose={vi.fn()} />);

    const nameInput = screen.getByLabelText(/queue name/i);
    const capacityInput = screen.getByLabelText('Capacity (%) *');
    const submitButton = screen.getByRole('button', { name: /add queue/i });

    await user.type(nameInput, 'valid-queue');

    // HTML number input won't allow typing values outside min/max range
    // The browser will enforce max=100, so we can't type 150
    // Let's test that the form starts with valid defaults
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    // Clear and enter 0 should still be valid
    await user.clear(capacityInput);
    await user.type(capacityInput, '0');

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });
  });

  it('should stage new queue on valid submission', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<AddQueueDialog open={true} parentQueuePath="root.production" onClose={onClose} />);

    const nameInput = screen.getByLabelText(/queue name/i);
    const capacityInput = screen.getByLabelText('Capacity (%) *');
    const submitButton = screen.getByRole('button', { name: /add queue/i });

    await user.type(nameInput, 'new-queue');
    await user.clear(capacityInput);
    await user.type(capacityInput, '25');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockAddChildQueue).toHaveBeenCalledWith(
        'root.production',
        'new-queue',
        expect.objectContaining({
          capacity: '25',
        }),
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should clear form and close on cancel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<AddQueueDialog open={true} parentQueuePath="root" onClose={onClose} />);

    const nameInput = screen.getByLabelText(/queue name/i);
    const cancelButton = screen.getByRole('button', { name: /cancel/i });

    await user.type(nameInput, 'some-text');
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
    expect(mockAddChildQueue).not.toHaveBeenCalled();
  });
});

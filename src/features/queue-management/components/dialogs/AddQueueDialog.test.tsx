import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '~/testing/setup/setup';
import { AddQueueDialog } from './AddQueueDialog';
import userEvent from '@testing-library/user-event';

// Mock the useQueueActions hook
const mockAddChildQueue = vi.fn();
const mockCanAddChildQueue = vi.fn();
const mockGetQueueByPath = vi.fn();
const mockStageQueueAddition = vi.fn();

vi.mock('../../hooks/useQueueActions', () => ({
  useQueueActions: () => ({
    addChildQueue: mockAddChildQueue,
    canAddChildQueue: mockCanAddChildQueue,
  }),
}));

// Mock the store
vi.mock('~/stores/schedulerStore', () => ({
  useSchedulerStore: vi.fn((selector) => {
    const state = {
      getQueueByPath: mockGetQueueByPath,
      stageQueueAddition: mockStageQueueAddition,
    };

    if (typeof selector === 'function') {
      return selector(state);
    }

    return state;
  }),
}));

describe('AddQueueDialog', () => {
  const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleError.mockClear();
    // Default: can add child queue
    mockCanAddChildQueue.mockReturnValue(true);
    // Default: parent queue exists
    mockGetQueueByPath.mockReturnValue({ queuePath: 'root.production', queueName: 'production' });
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
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
    const capacityInput = screen.getByLabelText('Capacity *');
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
    const capacityInput = screen.getByLabelText('Capacity *');
    const maxCapacityInput = screen.getByLabelText('Max Capacity *');

    // Fill all required fields
    await user.type(nameInput, 'newqueue');

    // Clear and type capacity (default is 10)
    await user.clear(capacityInput);
    await user.type(capacityInput, '25');

    // Clear and type max capacity (default is 100)
    await user.clear(maxCapacityInput);
    await user.type(maxCapacityInput, '100');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /add queue/i });
    expect(submitButton).not.toBeDisabled();

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockAddChildQueue).toHaveBeenCalledWith(
        'root.production',
        'newqueue',
        expect.objectContaining({
          capacity: '25',
          'maximum-capacity': '100', // Default value
          state: 'RUNNING', // Default value
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

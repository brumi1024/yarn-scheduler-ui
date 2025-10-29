import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GlobalRefreshButton } from './GlobalRefreshButton';
import { useSchedulerStore } from '~/stores/schedulerStore';

vi.mock('~/stores/schedulerStore');

describe('GlobalRefreshButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls loadInitialData when clicked', async () => {
    const loadInitialData = vi.fn().mockResolvedValue(undefined);
    const state = {
      loadInitialData,
      isLoading: false,
    };

    vi.mocked(useSchedulerStore).mockImplementation((selector: any) => selector(state));

    const user = userEvent.setup();
    render(<GlobalRefreshButton />);

    const button = screen.getByRole('button', { name: /refresh data/i });
    await user.click(button);

    expect(loadInitialData).toHaveBeenCalledTimes(1);
  });

  it('disables the button and shows spinner while loading', () => {
    const loadInitialData = vi.fn().mockResolvedValue(undefined);
    const state = {
      loadInitialData,
      isLoading: true,
    };

    vi.mocked(useSchedulerStore).mockImplementation((selector: any) => selector(state));

    render(<GlobalRefreshButton />);

    const button = screen.getByRole('button', { name: /refresh data/i });
    expect(button).toBeDisabled();

    const icon = button.querySelector('svg');
    expect(icon).toHaveClass('animate-spin');
  });
});

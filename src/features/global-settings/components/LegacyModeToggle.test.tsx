import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LegacyModeToggle } from './LegacyModeToggle';
import { useSchedulerStore } from '~/stores/schedulerStore';

vi.mock('~/stores/schedulerStore');

// Mock the Dialog component to avoid portal issues in tests
vi.mock('~/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogTrigger: ({ children, asChild }: any) => (asChild ? children : <div>{children}</div>),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

describe('LegacyModeToggle', () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    value: 'true',
    isStaged: false,
    onChange: mockOnChange,
    property: {
      name: 'legacy-queue-mode.enabled',
      displayName: 'Enable Legacy Queue Mode',
      description: 'Test description',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useSchedulerStore as any).mockReturnValue({
      schedulerData: {
        queueName: 'root',
        queuePath: 'root',
        queues: { queue: [] },
      },
      configData: new Map([['yarn.scheduler.capacity.legacy-queue-mode.enabled', 'true']]),
      stagedChanges: [],
    });
  });

  it('should render the toggle with correct state', () => {
    render(<LegacyModeToggle {...defaultProps} />);

    expect(screen.getByText('Enable Legacy Queue Mode')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();

    const toggle = screen.getByRole('switch');
    expect(toggle).toBeChecked();
  });

  it('should show Modified badge when staged', () => {
    render(<LegacyModeToggle {...defaultProps} isStaged={true} />);

    expect(screen.getByText('Modified')).toBeInTheDocument();
  });

  it('should call onChange when toggled', () => {
    render(<LegacyModeToggle {...defaultProps} />);

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    expect(mockOnChange).toHaveBeenCalledWith('false');
  });

  it('should show preview button', () => {
    render(<LegacyModeToggle {...defaultProps} />);

    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('should disable preview when no scheduler data', () => {
    (useSchedulerStore as any).mockReturnValue({
      schedulerData: null,
      configData: new Map(),
      stagedChanges: [],
    });

    render(<LegacyModeToggle {...defaultProps} />);

    const previewButton = screen.getByRole('button', { name: /preview/i });
    expect(previewButton).toBeDisabled();
  });
});

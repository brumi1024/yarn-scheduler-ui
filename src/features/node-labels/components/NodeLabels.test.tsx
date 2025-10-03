import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { NodeLabels } from './NodeLabels';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { getMockNodeLabel } from '~/testing/factories';
import type { NodeLabel } from '~/types/node-label';

// Mock the store
vi.mock('~/stores/schedulerStore');

// Mock the child components to focus on NodeLabels behavior
vi.mock('./NodeLabelsPanel', () => ({
  NodeLabelsPanel: () => <div data-testid="node-labels-panel">Node Labels Panel</div>,
}));

vi.mock('./NodesPanel', () => ({
  NodesPanel: ({ selectedLabel }: { selectedLabel: string | null }) => (
    <div data-testid="nodes-panel">Nodes Panel - Selected: {selectedLabel || 'none'}</div>
  ),
}));

describe('NodeLabels', () => {
  const mockRefreshSchedulerData = vi.fn();
  const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  const defaultStoreState = {
    isLoading: false,
    error: null,
    nodeLabels: [],
    selectedNodeLabel: null,
    refreshSchedulerData: mockRefreshSchedulerData,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleError.mockClear();
    vi.mocked(useSchedulerStore).mockReturnValue(defaultStoreState);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('Loading states', () => {
    it('should display loading skeleton when loading with no existing node labels', () => {
      vi.mocked(useSchedulerStore).mockReturnValue({
        ...defaultStoreState,
        isLoading: true,
        nodeLabels: [],
      });

      render(<NodeLabels />);

      expect(screen.getByText('Loading node labels...')).toBeInTheDocument();
      expect(screen.queryByText('Node Labels Management')).not.toBeInTheDocument();
      expect(screen.queryByTestId('node-labels-panel')).not.toBeInTheDocument();
    });

    it('should display content when loading with existing node labels', () => {
      const existingLabels: NodeLabel[] = [
        getMockNodeLabel({ name: 'gpu', exclusivity: true }),
        getMockNodeLabel({ name: 'highmem', exclusivity: false }),
      ];

      vi.mocked(useSchedulerStore).mockReturnValue({
        ...defaultStoreState,
        isLoading: true,
        nodeLabels: existingLabels,
      });

      render(<NodeLabels />);

      expect(screen.getByText('Node Labels Management')).toBeInTheDocument();
      expect(screen.queryByText('Loading node labels...')).not.toBeInTheDocument();
      expect(screen.getByTestId('node-labels-panel')).toBeInTheDocument();
    });
  });

  describe('Page header and description', () => {
    it('should display the page title and description', () => {
      render(<NodeLabels />);

      expect(screen.getByText('Node Labels Management')).toBeInTheDocument();
      expect(screen.getByText(/Manage node labels for the YARN cluster/)).toBeInTheDocument();
      expect(screen.getByText(/Each node can be assigned to node labels/)).toBeInTheDocument();
    });

    it('should display the refresh button', () => {
      render(<NodeLabels />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton).not.toBeDisabled();
    });
  });

  describe('Refresh functionality', () => {
    it('should call refreshSchedulerData when refresh button is clicked', async () => {
      mockRefreshSchedulerData.mockResolvedValue(undefined);

      render(<NodeLabels />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton as HTMLElement);

      expect(mockRefreshSchedulerData).toHaveBeenCalledTimes(1);
    });

    it('should disable refresh button while loading', () => {
      vi.mocked(useSchedulerStore).mockReturnValue({
        ...defaultStoreState,
        isLoading: true,
        nodeLabels: [getMockNodeLabel()],
      });

      render(<NodeLabels />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeDisabled();
    });

    it('should show spinning animation on refresh icon when loading', () => {
      vi.mocked(useSchedulerStore).mockReturnValue({
        ...defaultStoreState,
        isLoading: true,
        nodeLabels: [getMockNodeLabel()],
      });

      render(<NodeLabels />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      const refreshIcon = refreshButton.querySelector('svg');
      expect(refreshIcon).toHaveClass('animate-spin');
    });

    it('should handle refresh errors gracefully', async () => {
      const testError = new Error('Failed to refresh');
      mockRefreshSchedulerData.mockRejectedValue(testError);

      render(<NodeLabels />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton as HTMLElement);

      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith(
          'Failed to refresh node labels data:',
          testError,
        );
      });
    });
  });

  describe('Error handling', () => {
    it('should display error alert when error exists', () => {
      const errorMessage = 'Failed to load node labels';
      vi.mocked(useSchedulerStore).mockReturnValue({
        ...defaultStoreState,
        error: errorMessage,
      });

      render(<NodeLabels />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('mb-4');
    });

    it('should not display error alert when no error', () => {
      render(<NodeLabels />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Panel layout', () => {
    it('should render both NodeLabelsPanel and NodesPanel', () => {
      render(<NodeLabels />);

      expect(screen.getByTestId('node-labels-panel')).toBeInTheDocument();
      expect(screen.getByTestId('nodes-panel')).toBeInTheDocument();
    });

    it('should display correct card titles', () => {
      render(<NodeLabels />);

      expect(screen.getByText('Available Labels')).toBeInTheDocument();
      expect(screen.getByText('Node Label Configuration')).toBeInTheDocument();
    });

    it('should display card descriptions', () => {
      render(<NodeLabels />);

      expect(
        screen.getByText('Select labels to configure queue capacity for each label'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Assign nodes to labels for resource allocation'),
      ).toBeInTheDocument();
    });
  });

  describe('Selected label display', () => {
    it('should not show selected label badge when no label is selected', () => {
      render(<NodeLabels />);

      const configCard = screen.getByText('Node Label Configuration').closest('[data-slot="card"]');
      const badge = configCard?.querySelector('.bg-primary\\/10');
      expect(badge).not.toBeInTheDocument();
    });

    it('should show selected label badge when a label is selected', () => {
      const selectedLabel = 'gpu';
      vi.mocked(useSchedulerStore).mockReturnValue({
        ...defaultStoreState,
        selectedNodeLabel: selectedLabel,
      });

      render(<NodeLabels />);

      const badge = screen.getByText(selectedLabel);
      expect(badge).toHaveClass('bg-primary/10');
      expect(badge).toHaveClass('text-primary');
    });

    it('should pass selected label to NodesPanel', () => {
      const selectedLabel = 'highmem';
      vi.mocked(useSchedulerStore).mockReturnValue({
        ...defaultStoreState,
        selectedNodeLabel: selectedLabel,
      });

      render(<NodeLabels />);

      const nodesPanel = screen.getByTestId('nodes-panel');
      expect(nodesPanel).toHaveTextContent(`Selected: ${selectedLabel}`);
    });
  });

  describe('Responsive layout', () => {
    it('should apply responsive grid layout', () => {
      render(<NodeLabels />);

      // Find the grid container that contains both cards
      const labelsCard = screen.getByText('Available Labels').closest('[data-slot="card"]');
      const gridContainer = labelsCard?.parentElement;
      expect(gridContainer).toHaveClass('md:grid-cols-[400px_1fr]');
      expect(gridContainer).toHaveClass('gap-6');
    });

    it('should have overflow handling for content areas', () => {
      render(<NodeLabels />);

      const cards = document.querySelectorAll('[data-slot="card"]');
      expect(cards).toHaveLength(2);
      cards.forEach((card) => {
        expect(card).toHaveClass('overflow-hidden');
      });
    });
  });

  describe('Integration with child components', () => {
    it('should render NodeLabelsPanel inside the labels card', () => {
      render(<NodeLabels />);

      const labelsCard = screen.getByText('Available Labels').closest('[data-slot="card"]');
      const labelsPanel = within(labelsCard! as HTMLElement).getByTestId('node-labels-panel');
      expect(labelsPanel).toBeInTheDocument();
    });

    it('should render NodesPanel inside the configuration card', () => {
      render(<NodeLabels />);

      const configCard = screen.getByText('Node Label Configuration').closest('[data-slot="card"]');
      const nodesPanel = within(configCard! as HTMLElement).getByTestId('nodes-panel');
      expect(nodesPanel).toBeInTheDocument();
    });
  });

  describe('Component lifecycle', () => {
    it('should not call refresh on mount', () => {
      render(<NodeLabels />);

      expect(mockRefreshSchedulerData).not.toHaveBeenCalled();
    });

    it('should handle component unmount gracefully', () => {
      const { unmount } = render(<NodeLabels />);

      expect(() => unmount()).not.toThrow();
    });

    it('should update when store state changes', () => {
      const { rerender } = render(<NodeLabels />);

      // Update store to show error
      vi.mocked(useSchedulerStore).mockReturnValue({
        ...defaultStoreState,
        error: 'New error occurred',
      });

      rerender(<NodeLabels />);

      expect(screen.getByText('New error occurred')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible page structure', () => {
      render(<NodeLabels />);

      // Main heading
      const heading = screen.getByRole('heading', { name: 'Node Labels Management' });
      expect(heading).toBeInTheDocument();

      // Buttons should be accessible
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toHaveAccessibleName();
    });

    it('should have proper card structure', () => {
      render(<NodeLabels />);

      const cards = document.querySelectorAll('[data-slot="card"]');
      expect(cards).toHaveLength(2);
    });
  });
});

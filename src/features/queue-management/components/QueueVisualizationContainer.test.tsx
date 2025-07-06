import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { QueueVisualizationContainer } from './QueueVisualizationContainer';
import { ThemeProvider } from '~/components/providers/theme-provider';
import { useQueueTreeData } from '../hooks/useQueueTreeData';
import { useSchedulerStore } from '~/stores/schedulerStore';
import type { Node, Edge } from '@xyflow/react';
import type { QueueCardData } from '../hooks/useQueueTreeData';

// Mock d3 modules to prevent errors in test environment
vi.mock('d3-drag', () => ({
  drag: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    subject: vi.fn().mockReturnThis(),
    touchable: vi.fn().mockReturnThis(),
    clickDistance: vi.fn().mockReturnThis(),
    container: vi.fn().mockReturnThis(),
  })),
}));

vi.mock('d3-zoom', () => ({
  zoom: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    extent: vi.fn().mockReturnThis(),
    scaleExtent: vi.fn().mockReturnThis(),
    translateExtent: vi.fn().mockReturnThis(),
    duration: vi.fn().mockReturnThis(),
    interpolate: vi.fn().mockReturnThis(),
    constrain: vi.fn().mockReturnThis(),
    wheelDelta: vi.fn().mockReturnThis(),
    touchable: vi.fn().mockReturnThis(),
    clickDistance: vi.fn().mockReturnThis(),
  })),
  zoomIdentity: {
    scale: vi.fn(() => ({ x: 0, y: 0, k: 1 })),
    translate: vi.fn(() => ({ x: 0, y: 0, k: 1 })),
  },
}));

vi.mock('d3-selection', () => ({
  select: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    call: vi.fn().mockReturnThis(),
    node: vi.fn(() => ({})),
  })),
}));

// Mock factory for QueueCardData
const getMockQueueCardData = (overrides?: Partial<QueueCardData>): QueueCardData => {
  return {
    queueType: 'leaf' as const,
    queueName: 'test-queue',
    queuePath: 'root.test-queue',
    absoluteCapacity: 50,
    absoluteMaxCapacity: 100,
    absoluteUsedCapacity: 25,
    capacity: 50,
    maxCapacity: 100,
    usedCapacity: 25,
    numApplications: 5,
    numActiveApplications: 3,
    numPendingApplications: 2,
    state: 'RUNNING',
    queues: undefined,
    resourcesUsed: {
      memory: 1024,
      vCores: 2,
    },
    isLeaf: true,
    stagedStatus: undefined,
    capacityConfig: '50',
    maxCapacityConfig: '100',
    stagedState: undefined,
    autoCreationStatus: {
      status: 'off',
      isStaged: false,
    },
    autoCreationEligibility: 'off',
    ...overrides,
  };
};

// Mock the useQueueTreeData hook
vi.mock('~/stores/schedulerStore', () => ({
  useSchedulerStore: vi.fn((selector) => {
    const state = {
      selectQueue: vi.fn(),
      selectedQueuePath: null,
      comparisonQueues: [],
      toggleComparisonQueue: vi.fn(),
      stagedChanges: [],
      setPropertyPanelOpen: vi.fn(),
      updateQueueProperty: vi.fn(),
      getQueueByPath: vi.fn(() => ({ queuePath: 'root', queueName: 'root' })),
      stageQueueAddition: vi.fn(),
      stageQueueRemoval: vi.fn(),
      stageQueueChange: vi.fn(),
      canCompareQueues: vi.fn(() => false),
      clearComparisonQueues: vi.fn(),
      getComparisonData: vi.fn(() => new Map()),
      searchQuery: '',
      nodeLabels: [],
      selectedNodeLabelFilter: '',
      selectNodeLabelFilter: vi.fn(),
      getQueueAccessibility: vi.fn(() => true),
      getQueueLabelCapacity: vi.fn(() => ({
        capacity: '0',
        maxCapacity: '100',
        absoluteCapacity: '0',
        isLabelSpecific: false,
        label: 'DEFAULT',
        hasAccess: true,
        canUseLabel: true,
      })),
      hasQueueProperty: vi.fn(() => false),
    };

    // If selector is provided, call it with state
    if (typeof selector === 'function') {
      return selector(state);
    }

    // Otherwise return the whole state
    return state;
  }),
}));

vi.mock('../hooks/useQueueTreeData', () => ({
  useQueueTreeData: vi.fn(() => ({
    nodes: [],
    edges: [],
    isLoading: true,
    error: null,
  })),
}));

// Remove duplicate mock - already mocked above

// Mock the useQueueActions hook
vi.mock('~/features/queue-management/hooks/useQueueActions', () => ({
  useQueueActions: vi.fn(() => ({
    canAddChildQueue: vi.fn(() => true),
    canDeleteQueue: vi.fn(() => true),
    addChildQueue: vi.fn(),
    deleteQueue: vi.fn(),
  })),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider defaultTheme="light" storageKey="test-theme">
      {component}
    </ThemeProvider>,
  );
};

describe('QueueVisualizationContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state while fetching queue data', () => {
    renderWithProviders(<QueueVisualizationContainer />);

    expect(screen.getByText('Loading queue hierarchy...')).toBeInTheDocument();
  });

  it('should show error state when queue data fails to load', () => {
    vi.mocked(useQueueTreeData).mockReturnValue({
      nodes: [],
      edges: [],
      isLoading: false,
      error: 'Failed to fetch queue data',
    });

    renderWithProviders(<QueueVisualizationContainer />);

    expect(screen.getByText('Error Loading Queue Data')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch queue data')).toBeInTheDocument();
  });

  it('should show empty state when no queue data exists', () => {
    vi.mocked(useQueueTreeData).mockReturnValue({
      nodes: [],
      edges: [],
      isLoading: false,
      error: null,
    });

    renderWithProviders(<QueueVisualizationContainer />);

    expect(screen.getByText('No Queue Data')).toBeInTheDocument();
    expect(
      screen.getByText(
        'No queue hierarchy data is available. Please check your scheduler configuration.',
      ),
    ).toBeInTheDocument();
  });

  it('should render queue hierarchy when data is available', async () => {
    const mockNodes: Node<QueueCardData>[] = [
      {
        id: 'root',
        type: 'queueCard',
        position: { x: 0, y: 0 },
        data: getMockQueueCardData({
          queueName: 'root',
          queuePath: 'root',
          capacity: 100,
          capacityConfig: '100',
        }),
      },
      {
        id: 'root.queue1',
        type: 'queueCard',
        position: { x: 200, y: 0 },
        data: getMockQueueCardData({
          queueName: 'queue1',
          queuePath: 'root.queue1',
          capacity: 50,
          capacityConfig: '50',
        }),
      },
    ];

    const mockEdges: Edge[] = [
      {
        id: 'root-root.queue1',
        source: 'root',
        target: 'root.queue1',
        type: 'sankeyFlow',
      },
    ];

    vi.mocked(useQueueTreeData).mockReturnValue({
      nodes: mockNodes,
      edges: mockEdges,
      isLoading: false,
      error: null,
    });

    renderWithProviders(<QueueVisualizationContainer />);

    // React Flow renders asynchronously, so we need to wait
    await waitFor(() => {
      // There will be multiple elements with 'root' text (title and description)
      const rootElements = screen.getAllByText('root');
      expect(rootElements.length).toBeGreaterThan(0);

      const queue1Elements = screen.getAllByText('queue1');
      expect(queue1Elements.length).toBeGreaterThan(0);
    });
  });

  it('should handle queue selection on node click', async () => {
    const mockSelectQueue = vi.fn();
    const mockSetPropertyPanelOpen = vi.fn();

    // Update the mock implementation to return the new functions
    vi.mocked(useSchedulerStore).mockImplementation((selector: any) => {
      const state = {
        selectQueue: mockSelectQueue,
        selectedQueuePath: null,
        comparisonQueues: [],
        toggleComparisonQueue: vi.fn(),
        stagedChanges: [],
        setPropertyPanelOpen: mockSetPropertyPanelOpen,
        updateQueueProperty: vi.fn(),
        getQueueByPath: vi.fn(() => ({ queuePath: 'root', queueName: 'root' })),
        stageQueueAddition: vi.fn(),
        stageQueueRemoval: vi.fn(),
        stageQueueChange: vi.fn(),
        canCompareQueues: vi.fn(() => false),
        clearComparisonQueues: vi.fn(),
        getComparisonData: vi.fn(() => new Map()),
        searchQuery: '',
        nodeLabels: [],
        selectedNodeLabelFilter: '',
        selectNodeLabelFilter: vi.fn(),
        getQueueAccessibility: vi.fn(() => true),
        getQueueLabelCapacity: vi.fn(() => ({
          capacity: '0',
          maxCapacity: '100',
          absoluteCapacity: '0',
          isLabelSpecific: false,
          label: 'DEFAULT',
          hasAccess: true,
          canUseLabel: true,
        })),
        hasQueueProperty: vi.fn(() => false),
      };

      if (typeof selector === 'function') {
        return selector(state);
      }

      return state;
    });

    const mockNodes: Node<QueueCardData>[] = [
      {
        id: 'root.queue1',
        type: 'queueCard',
        position: { x: 0, y: 0 },
        data: getMockQueueCardData({
          queueName: 'queue1',
          queuePath: 'root.queue1',
          capacity: 50,
          capacityConfig: '50',
        }),
      },
    ];

    vi.mocked(useQueueTreeData).mockReturnValue({
      nodes: mockNodes,
      edges: [],
      isLoading: false,
      error: null,
    });

    renderWithProviders(<QueueVisualizationContainer />);

    // Wait for the node to be rendered
    await waitFor(() => {
      expect(screen.getByText('queue1')).toBeInTheDocument();
    });

    // Find the card element and use fireEvent instead of userEvent
    const cardElement = screen.getByText('queue1').closest('.cursor-pointer');
    expect(cardElement).toBeInTheDocument();

    // Use fireEvent.click to avoid d3 event handling issues
    fireEvent.click(cardElement!);

    // Wait for the click to be processed
    await waitFor(() => {
      expect(mockSelectQueue).toHaveBeenCalledWith('root.queue1');
      expect(mockSetPropertyPanelOpen).toHaveBeenCalledWith(true);
    });
  });

  it('should apply correct color mode based on theme', async () => {
    const mockNodes: Node<QueueCardData>[] = [
      {
        id: 'root',
        type: 'queueCard',
        position: { x: 0, y: 0 },
        data: getMockQueueCardData({
          queueName: 'root',
          queuePath: 'root',
          capacity: 100,
          capacityConfig: '100',
        }),
      },
    ];

    vi.mocked(useQueueTreeData).mockReturnValue({
      nodes: mockNodes,
      edges: [],
      isLoading: false,
      error: null,
    });

    // Test with dark theme
    render(
      <ThemeProvider defaultTheme="dark" storageKey="test-theme">
        <QueueVisualizationContainer />
      </ThemeProvider>,
    );

    // React Flow component should receive colorMode prop
    // Since we can't directly test the prop, we verify the component renders without error
    await waitFor(() => {
      const rootElements = screen.getAllByText('root');
      expect(rootElements.length).toBeGreaterThan(0);
    });

    // Check that React Flow has dark mode class
    expect(screen.getByTestId('rf__wrapper')).toHaveClass('react-flow', 'dark');
  });
});

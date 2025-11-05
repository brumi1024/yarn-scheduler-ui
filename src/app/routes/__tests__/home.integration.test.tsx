import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Home from '../home';
import { ThemeProvider } from '~/components/providers/theme-provider';

// Mock the feature components
vi.mock('~/features/queue-management/components/QueueVisualizationContainer', () => ({
  QueueVisualizationContainer: () => (
    <div data-testid="queue-visualization">Queue Visualization</div>
  ),
}));

vi.mock('~/features/property-editor/components/PropertyPanel', () => ({
  PropertyPanel: () => <div data-testid="property-panel">Property Panel</div>,
}));

// Mock the store
vi.mock('~/stores/schedulerStore', () => ({
  useSchedulerStore: vi.fn(() => ({
    schedulerData: {
      type: 'capacityScheduler',
      capacity: 100,
      usedCapacity: 0,
      maxCapacity: 100,
      queueName: 'root',
      queues: {
        queue: [],
      },
    },
    selectedQueuePath: null,
    isPropertyPanelOpen: false,
    stagedChanges: [],
    isLoading: false,
    error: null,
    selectQueue: vi.fn(),
    loadInitialData: vi.fn(),
  })),
}));

describe('Home route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderHome = () => {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <ThemeProvider>
          <Home />
        </ThemeProvider>
      </MemoryRouter>,
    );
  };

  it('should render without crashing', () => {
    renderHome();
    expect(screen.getByTestId('queue-visualization')).toBeInTheDocument();
  });

  it('should render QueueVisualizationContainer', () => {
    renderHome();
    expect(screen.getByTestId('queue-visualization')).toBeInTheDocument();
    expect(screen.getByText('Queue Visualization')).toBeInTheDocument();
  });

  it('should render PropertyPanel', () => {
    renderHome();
    expect(screen.getByTestId('property-panel')).toBeInTheDocument();
    expect(screen.getByText('Property Panel')).toBeInTheDocument();
  });

  it('should render both main components', () => {
    renderHome();
    expect(screen.getByTestId('queue-visualization')).toBeInTheDocument();
    expect(screen.getByTestId('property-panel')).toBeInTheDocument();
  });
});

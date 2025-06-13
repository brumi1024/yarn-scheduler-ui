import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { QueueVisualization } from '../QueueVisualization';
import { useScheduler } from '../../hooks/useApi';

// Mock the hooks and components
vi.mock('../../hooks/useApi');
const mockUseScheduler = vi.mocked(useScheduler);

// We need to import useConfiguration to mock it too
import { useConfiguration } from '../../hooks/useApi';
const mockUseConfiguration = vi.mocked(useConfiguration);

vi.mock('../../utils/d3', () => ({
    D3TreeLayout: vi.fn().mockImplementation(() => ({
        computeLayout: vi.fn().mockReturnValue({
            nodes: [
                {
                    id: 'root',
                    x: 100,
                    y: 100,
                    width: 280,
                    height: 120,
                    data: {
                        queueName: 'root',
                        capacity: 100,
                        usedCapacity: 50,
                        maxCapacity: 100,
                        state: 'RUNNING',
                        numApplications: 5,
                        resourcesUsed: { memory: 1024, vCores: 2 },
                    },
                },
            ],
            flows: [],
            bounds: { x: 0, y: 0, width: 500, height: 300 },
        }),
    })),
    SankeyFlowCalculator: vi.fn().mockImplementation(() => ({
        calculateFlows: vi.fn().mockReturnValue([]),
    })),
}));

vi.mock('../../utils/canvas', () => ({
    CanvasRenderer: vi.fn().mockImplementation(() => ({
        render: vi.fn(),
        resize: vi.fn(),
        destroy: vi.fn(),
        setSelectedNodes: vi.fn(),
        setHoveredNode: vi.fn(),
    })),
    PanZoomController: vi.fn().mockImplementation(() => ({
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getState: vi.fn().mockReturnValue({ x: 0, y: 0, scale: 1 }),
        setState: vi.fn(),
        destroy: vi.fn(),
    })),
    QueueSelectionController: vi.fn().mockImplementation(() => ({
        addSelectionListener: vi.fn(),
        removeSelectionListener: vi.fn(),
        addHoverListener: vi.fn(),
        removeHoverListener: vi.fn(),
        updateNodes: vi.fn(),
        destroy: vi.fn(),
    })),
}));

vi.mock('../ZoomControls', () => ({
    ZoomControls: () => <div data-testid="zoom-controls">Zoom Controls</div>,
}));

vi.mock('../QueueInfoPanel', () => ({
    QueueInfoPanel: () => <div data-testid="queue-info-panel">Queue Info Panel</div>,
}));

// Mock canvas and ResizeObserver
global.HTMLCanvasElement.prototype.getContext = vi.fn();
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
    const theme = createTheme();
    return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

describe('QueueVisualization', () => {
    beforeEach(() => {
        // Default mock implementation
        mockUseScheduler.mockReturnValue({
            data: {
                scheduler: {
                    schedulerInfo: {
                        type: 'capacityScheduler' as const,
                        queueName: 'root',
                        capacity: 100,
                        usedCapacity: 50,
                        maxCapacity: 100,
                        queues: {
                            queue: [
                                {
                                    queueName: 'prod',
                                    capacity: 60,
                                    usedCapacity: 30,
                                    maxCapacity: 80,
                                    absoluteCapacity: 60,
                                    absoluteUsedCapacity: 30,
                                    absoluteMaxCapacity: 80,
                                    state: 'RUNNING',
                                    numApplications: 3,
                                    resourcesUsed: { memory: 512, vCores: 1 },
                                },
                            ],
                        },
                    },
                },
            },
            loading: false,
            error: null,
            refetch: vi.fn(),
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('rendering', () => {
        it('should render canvas and zoom controls', async () => {
            const { container } = render(
                <TestWrapper>
                    <QueueVisualization />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(container.querySelector('canvas')).toBeInTheDocument(); // canvas
                expect(screen.getByTestId('zoom-controls')).toBeInTheDocument();
            });
        });

        it('should show loading state', async () => {
            mockUseScheduler.mockReturnValue({
                data: null,
                loading: true,
                error: null,
                refetch: vi.fn(),
            });

            render(
                <TestWrapper>
                    <QueueVisualization />
                </TestWrapper>
            );

            expect(screen.getByRole('progressbar')).toBeInTheDocument();
        });

        it('should show error state', async () => {
            mockUseScheduler.mockReturnValue({
                data: null,
                loading: false,
                error: new Error('API Error'),
                refetch: vi.fn(),
            });

            render(
                <TestWrapper>
                    <QueueVisualization />
                </TestWrapper>
            );

            expect(screen.getByText(/Failed to load scheduler data/)).toBeInTheDocument();
        });

        it('should show queue count when data is loaded', async () => {
            render(
                <TestWrapper>
                    <QueueVisualization />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('1 queue')).toBeInTheDocument();
            });
        });
    });

    describe('data processing', () => {
        it('should handle empty scheduler data', async () => {
            mockUseScheduler.mockReturnValue({
                data: null,
                loading: false,
                error: null,
                refetch: vi.fn(),
            });

            const { container } = render(
                <TestWrapper>
                    <QueueVisualization />
                </TestWrapper>
            );

            // Component should render the basic structure
            expect(container.querySelector('canvas')).toBeInTheDocument();
            expect(screen.getByTestId('zoom-controls')).toBeInTheDocument();
        });

        it('should handle malformed scheduler data', async () => {
            mockUseScheduler.mockReturnValue({
                data: {} as any,
                loading: false,
                error: null,
                refetch: vi.fn(),
            });

            render(
                <TestWrapper>
                    <QueueVisualization />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText(/No queue data available/)).toBeInTheDocument();
            });
        });
    });

    describe('props', () => {
        it('should accept custom dimensions', () => {
            const { container } = render(
                <TestWrapper>
                    <QueueVisualization width={800} height={600} />
                </TestWrapper>
            );

            // Component should render without errors
            expect(container.querySelector('canvas')).toBeInTheDocument();
        });

        it('should accept custom className', () => {
            const { container } = render(
                <TestWrapper>
                    <QueueVisualization className="custom-class" />
                </TestWrapper>
            );

            expect(container.firstChild).toHaveClass('custom-class');
        });
    });

    describe('integration', () => {
        it('should initialize visualization components', async () => {
            const { container } = render(
                <TestWrapper>
                    <QueueVisualization />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(container.querySelector('canvas')).toBeInTheDocument();
            });

            // Check that all necessary components are rendered
            expect(screen.getByTestId('zoom-controls')).toBeInTheDocument();
            expect(screen.getByTestId('queue-info-panel')).toBeInTheDocument();
        });
    });

    describe('cleanup', () => {
        it('should cleanup on unmount', () => {
            const { unmount, container } = render(
                <TestWrapper>
                    <QueueVisualization />
                </TestWrapper>
            );

            unmount();

            // Component should unmount without errors
            expect(container.querySelector('canvas')).not.toBeInTheDocument();
        });
    });
});

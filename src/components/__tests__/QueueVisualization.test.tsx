import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { QueueVisualization } from '../QueueVisualization';

// Mock the hooks and stores
vi.mock('../../hooks/useApiWithZustand', () => ({
    useScheduler: vi.fn(),
    useConfiguration: vi.fn(),
}));

// Mock Zustand stores
vi.mock('../../store/zustand', () => ({
    useConfigurationStore: vi.fn(() => ({
        scheduler: null,
        configuration: null,
        loading: { scheduler: false, configuration: false },
        errors: { scheduler: null, configuration: null },
    })),
    useUIStore: vi.fn(() => ({
        selectedQueuePath: null,
        selectQueue: vi.fn(),
        openPropertyEditor: vi.fn(),
        openConfirmDialog: vi.fn(),
    })),
    useSelectedQueue: vi.fn(() => null),
}));

// Import after mocking
import { useScheduler, useConfiguration } from '../../hooks/useApiWithZustand';
import { useConfigurationStore, useUIStore, useSelectedQueue } from '../../store/zustand';

const mockUseScheduler = vi.mocked(useScheduler);
const mockUseConfiguration = vi.mocked(useConfiguration);
const mockUseConfigurationStore = vi.mocked(useConfigurationStore);
const mockUseUIStore = vi.mocked(useUIStore);
const mockUseSelectedQueue = vi.mocked(useSelectedQueue);

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
    D3ZoomController: vi.fn().mockImplementation(() => ({
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

        // Default configuration mock
        mockUseConfiguration.mockReturnValue({
            data: {
                property: [
                    { name: 'yarn.scheduler.capacity.root.queues', value: 'default' },
                    { name: 'yarn.scheduler.capacity.root.default.capacity', value: '100' },
                    { name: 'yarn.scheduler.capacity.root.default.state', value: 'RUNNING' },
                ],
            },
            loading: false,
            error: null,
            refetch: vi.fn(),
        });

        // Mock store functions
        mockUseConfigurationStore.mockReturnValue({
            scheduler: {
                scheduler: {
                    schedulerInfo: {
                        type: 'capacityScheduler' as const,
                        queueName: 'root',
                        capacity: 100,
                        usedCapacity: 50,
                        maxCapacity: 100,
                    },
                },
            },
            configuration: {
                property: [
                    { name: 'yarn.scheduler.capacity.root.queues', value: 'default' },
                    { name: 'yarn.scheduler.capacity.root.default.capacity', value: '100' },
                    { name: 'yarn.scheduler.capacity.root.default.state', value: 'RUNNING' },
                ],
            },
            loading: { scheduler: false, configuration: false },
            errors: { scheduler: null, configuration: null },
        });

        mockUseUIStore.mockReturnValue({
            selectedQueuePath: null,
            selectQueue: vi.fn(),
            openPropertyEditor: vi.fn(),
            openConfirmDialog: vi.fn(),
        });

        mockUseSelectedQueue.mockReturnValue(null);
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

            mockUseConfiguration.mockReturnValue({
                data: null,
                loading: true,
                error: null,
                refetch: vi.fn(),
            });

            mockUseConfigurationStore.mockReturnValue({
                scheduler: null,
                configuration: null,
                loading: { scheduler: true, configuration: true },
                errors: { scheduler: null, configuration: null },
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

            mockUseConfiguration.mockReturnValue({
                data: null,
                loading: false,
                error: new Error('API Error'),
                refetch: vi.fn(),
            });

            mockUseConfigurationStore.mockReturnValue({
                scheduler: null,
                configuration: null,
                loading: { scheduler: false, configuration: false },
                errors: { scheduler: new Error('API Error'), configuration: null },
            });

            render(
                <TestWrapper>
                    <QueueVisualization />
                </TestWrapper>
            );

            expect(screen.getByText(/Failed to load scheduler data: API Error/)).toBeInTheDocument();
        });

        it('should show queue count when data is loaded', async () => {
            // Mock configuration data that will create a valid queue tree
            mockUseConfiguration.mockReturnValue({
                data: {
                    property: [
                        { name: 'yarn.scheduler.capacity.root.queues', value: 'default' },
                        { name: 'yarn.scheduler.capacity.root.default.capacity', value: '100' },
                        { name: 'yarn.scheduler.capacity.root.default.state', value: 'RUNNING' },
                    ],
                },
                loading: false,
                error: null,
                refetch: vi.fn(),
            });

            mockUseConfigurationStore.mockReturnValue({
                scheduler: {
                    scheduler: {
                        schedulerInfo: {
                            type: 'capacityScheduler' as const,
                            queueName: 'root',
                            capacity: 100,
                        },
                    },
                },
                configuration: {
                    property: [
                        { name: 'yarn.scheduler.capacity.root.queues', value: 'default' },
                        { name: 'yarn.scheduler.capacity.root.default.capacity', value: '100' },
                        { name: 'yarn.scheduler.capacity.root.default.state', value: 'RUNNING' },
                    ],
                },
                loading: { scheduler: false, configuration: false },
                errors: { scheduler: null, configuration: null },
            });

            render(
                <TestWrapper>
                    <QueueVisualization />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('1 queue')).toBeInTheDocument(); // Based on the mock data structure
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

            mockUseConfiguration.mockReturnValue({
                data: null,
                loading: false,
                error: null,
                refetch: vi.fn(),
            });

            mockUseConfigurationStore.mockReturnValue({
                scheduler: null,
                configuration: null,
                loading: { scheduler: false, configuration: false },
                errors: { scheduler: null, configuration: null },
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

            mockUseConfiguration.mockReturnValue({
                data: {} as any, // Empty config data
                loading: false,
                error: null,
                refetch: vi.fn(),
            });

            mockUseConfigurationStore.mockReturnValue({
                scheduler: {},
                configuration: {},
                loading: { scheduler: false, configuration: false },
                errors: { scheduler: null, configuration: null },
            });

            render(
                <TestWrapper>
                    <QueueVisualization />
                </TestWrapper>
            );

            // Since config data is empty, it should show an error message
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

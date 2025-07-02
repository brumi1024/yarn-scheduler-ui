import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Ensure proper AbortController is available
if (typeof globalThis.AbortController === 'undefined') {
    const { AbortController, AbortSignal } = globalThis;
    globalThis.AbortController = AbortController;
    globalThis.AbortSignal = AbortSignal;
}

// Setup MSW for tests
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { 
    mockSchedulerResponse, 
    mockConfigResponse, 
    mockNodeLabelsResponse, 
    mockVersionResponse 
} from '../__mocks__/schedulerResponse';

// Create test handlers using in-memory mock data
const testHandlers = [
    // Scheduler endpoints
    http.get('/ws/v1/cluster/scheduler', () => {
        return HttpResponse.json(mockSchedulerResponse);
    }),

    http.get('/ws/v1/cluster/scheduler-conf', () => {
        return HttpResponse.json(mockConfigResponse);
    }),

    http.put('/ws/v1/cluster/scheduler-conf', async ({ request }) => {
        const changes = await request.json();
        console.log('Mock: Applying configuration changes:', changes);
        return HttpResponse.json({
            response: 'Configuration updated successfully',
        });
    }),

    http.get('/ws/v1/cluster/scheduler-conf/version', () => {
        return HttpResponse.json(mockVersionResponse);
    }),

    // Node endpoints
    http.get('/ws/v1/cluster/nodes', () => {
        return HttpResponse.json({
            nodes: {
                node: [
                    { id: 'node1', state: 'RUNNING', nodeLabels: ['gpu', 'ssd'] },
                    { id: 'node2', state: 'RUNNING', nodeLabels: ['cpu'] },
                ]
            }
        });
    }),

    // Node labels endpoints
    http.get('/ws/v1/cluster/get-node-labels', () => {
        return HttpResponse.json(mockNodeLabelsResponse);
    }),

    http.get('/ws/v1/cluster/get-node-to-labels', () => {
        return HttpResponse.json({
            nodeToLabels: {
                entry: [
                    { key: 'node1', value: 'gpu,ssd' },
                    { key: 'node2', value: 'cpu' },
                ]
            }
        });
    }),

    http.get('/ws/v1/cluster/get-labels-to-nodes', () => {
        return HttpResponse.json({
            labelsToNodes: {
                entry: [
                    { key: 'gpu', value: 'node1' },
                    { key: 'ssd', value: 'node1' },
                    { key: 'cpu', value: 'node2' },
                ]
            }
        });
    }),

    http.post('/ws/v1/cluster/add-node-labels', async ({ request }) => {
        const body = await request.json();
        console.log('Mock: Adding node labels:', body);
        return HttpResponse.json({ message: 'Labels added successfully' });
    }),

    http.post('/ws/v1/cluster/replace-node-to-labels', async ({ request }) => {
        const body = await request.json();
        console.log('Mock: Replacing node labels:', body);
        return HttpResponse.json({ message: 'Node labels replaced successfully' });
    }),

    http.post('/ws/v1/cluster/remove-node-labels', async ({ request }) => {
        const body = await request.json();
        console.log('Mock: Removing node labels:', body);
        return HttpResponse.json({ message: 'Labels removed successfully' });
    }),
];

// Create MSW server for tests
export const server = setupServer(...testHandlers);

// Start server before all tests (except API tests which have their own MSW setup)
if (typeof global !== 'undefined' && global.beforeAll) {
    global.beforeAll(() => {
        // Skip MSW setup for API tests to avoid conflicts
        const testFile = expect.getState()?.testPath;
        if (testFile && testFile.includes('YarnApiClient.test.ts')) {
            return;
        }
        server.listen({ onUnhandledRequest: 'warn' });
    });
}

// Clean up after each test
if (typeof global !== 'undefined' && global.afterEach) {
    global.afterEach(() => {
        server.resetHandlers();
    });
}

// Close server after all tests
if (typeof global !== 'undefined' && global.afterAll) {
    global.afterAll(() => {
        server.close();
    });
}

// Mock the MSW browser module for tests
vi.mock('../api/mocks/browser', () => ({
    worker: {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
    },
}));

// Mock Canvas 2D Context
const mockContext2D = {
    // Drawing methods
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),

    // Text methods
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),

    // Transform methods
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    transform: vi.fn(),
    setTransform: vi.fn(),

    // Path methods
    clip: vi.fn(),

    // Image methods
    drawImage: vi.fn(),

    // Gradient methods
    createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
    })),

    // Properties
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    lineDashOffset: 0,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    direction: 'inherit',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low',
    shadowColor: 'rgba(0, 0, 0, 0)',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,

    // Line dash methods
    setLineDash: vi.fn(),
    getLineDash: vi.fn(() => []),

    // Hit region methods (for accessibility)
    addHitRegion: vi.fn(),
    removeHitRegion: vi.fn(),
    clearHitRegions: vi.fn(),

    // Canvas state
    canvas: {
        width: 800,
        height: 600,
    },
};

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: vi.fn((contextType: string) => {
        if (contextType === '2d') {
            return mockContext2D;
        }
        return null;
    }),
    writable: true,
});

// Mock Canvas constructor for jsdom
global.HTMLCanvasElement = HTMLCanvasElement;

// Mock D3 timer for render loop tests
vi.mock('d3-timer', () => ({
    timer: vi.fn((callback: () => void) => {
        // Immediately call the callback for tests
        callback();
        return {
            stop: vi.fn(),
        };
    }),
}));

// Global test setup
Object.defineProperty(window, 'location', {
    value: {
        href: 'http://localhost:3000',
    },
    writable: true,
});

// Import V4 scheduler store for global reset functionality
import { useSchedulerStore } from '../store/schedulerStore';

// Global store reset function for tests
export const resetAllStores = () => {
    // Reset V4 scheduler store to initial state
    useSchedulerStore.setState({
        schedulerData: null,
        configData: new Map(),
        nodeLabels: [],
        nodes: [],
        nodeToLabels: [],
        stagedChanges: [],
        selectedNodeLabel: null,
        selectedQueuePath: null,
        comparisonQueues: [],
        configVersion: 0,
        isLoading: false,
        error: null,
        isPropertyPanelOpen: false,
    });
};

// Automatically reset stores before each test
if (typeof global !== 'undefined' && global.beforeEach) {
    global.beforeEach(() => {
        resetAllStores();
    });
}

// Also provide a global for manual cleanup
(global as any).resetAllStores = resetAllStores;

// Suppress React 18 act() warnings in tests
// These warnings occur when testing hooks that perform async operations
// In our case, the Zustand stores and MSW mocks trigger these warnings
// but the functionality is correct - the warnings are just noise in tests
const originalError = console.error;
console.error = (...args: any[]) => {
    const errorMessage = args[0];
    if (
        typeof errorMessage === 'string' &&
        errorMessage.includes('An update to TestComponent inside a test was not wrapped in act(...)')
    ) {
        return; // Suppress the act() warning
    }
    originalError.apply(console, args);
};

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Ensure proper AbortController is available
if (typeof globalThis.AbortController === 'undefined') {
    const { AbortController, AbortSignal } = globalThis;
    globalThis.AbortController = AbortController;
    globalThis.AbortSignal = AbortSignal;
}

// Mock the MSW browser module for tests
vi.mock('../api/mocks/browser', () => ({
    worker: {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
    },
    startMockService: vi.fn().mockResolvedValue(undefined),
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

// Import all Zustand stores for global reset functionality
import { useDataStore } from '../store/dataStore';
import { useUIStore } from '../store/uiStore';
import { useChangesStore } from '../store/changesStore';
import { useActivityStore } from '../store/activityStore';

// Global store reset function for tests
export const resetAllStores = () => {
    // Reset data store
    useDataStore.setState({
        scheduler: null,
        configuration: null,
        nodeLabels: null,
        nodes: null,
        loading: {
            scheduler: false,
            configuration: false,
            nodeLabels: false,
            nodes: false,
        },
        errors: {
            scheduler: null,
            configuration: null,
            nodeLabels: null,
            nodes: null,
        },
        lastUpdated: {},
    });

    // Reset UI store
    useUIStore.setState({
        selectedQueuePath: undefined,
        hoveredQueuePath: null,
        expandedQueues: new Set<string>(),
        viewSettings: {
            showCapacityBars: true,
            showUsageMetrics: true,
            layout: 'tree',
            zoomLevel: 1,
            panPosition: { x: 0, y: 0 },
        },
        notifications: [],
        modals: {},
    });

    // Reset changes store
    useChangesStore.setState({
        stagedChanges: [],
        applyingChanges: false,
        applyError: null,
        lastApplied: undefined,
        conflicts: [],
    });

    // Reset activity store
    useActivityStore.setState({
        logs: [],
        apiCalls: [],
        maxEntries: 1000,
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
    if (typeof errorMessage === 'string' && errorMessage.includes('An update to TestComponent inside a test was not wrapped in act(...)')) {
        return; // Suppress the act() warning
    }
    originalError.apply(console, args);
};

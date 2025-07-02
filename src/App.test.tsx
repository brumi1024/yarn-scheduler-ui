import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

// Mock the V4 scheduler store
vi.mock('./store/schedulerStore', () => ({
    useSchedulerStore: vi.fn((selector: any) => {
        const state = {
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
            loadInitialData: vi.fn().mockResolvedValue(undefined),
            selectQueue: vi.fn(),
            selectNodeLabel: vi.fn(),
            addNodeLabel: vi.fn(),
            removeNodeLabel: vi.fn(),
            assignNodeToLabel: vi.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
    }),
}));

// Test wrapper with QueryClient provider
function renderWithQueryClient(component: React.ReactElement) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
}

describe('App', () => {
    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
    });

    it('renders YARN Capacity Scheduler title', () => {
        renderWithQueryClient(<App />);
        expect(screen.getByText('YARN Capacity Scheduler')).toBeInTheDocument();
    });

    it('renders the main navigation tabs', () => {
        renderWithQueryClient(<App />);
        expect(screen.getByText('Queue Tree')).toBeInTheDocument();
        expect(screen.getByText('Global Settings')).toBeInTheDocument();
        expect(screen.getByText('Node Labels')).toBeInTheDocument();
    });

    it('renders the queue tree container', () => {
        renderWithQueryClient(<App />);
        expect(screen.getByTestId('queue-tree-container')).toBeInTheDocument();
    });
});

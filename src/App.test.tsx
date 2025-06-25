import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

// Mock the TanStack Query hooks
vi.mock('./hooks/useYarnApi', () => ({
    useSchedulerQuery: vi.fn(() => ({
        data: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
    })),
    useConfigurationQuery: vi.fn(() => ({
        data: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
    })),
    useNodeLabelsQuery: vi.fn(() => ({
        data: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
    })),
    useNodesQuery: vi.fn(() => ({
        data: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
    })),
    useUpdateConfigurationMutation: vi.fn(() => ({
        mutate: vi.fn(),
        isPending: false,
        error: null,
    })),
}));

// Mock all store modules to prevent API calls and provide default states
vi.mock('./store', () => ({
    useRuntimeStore: vi.fn(),
    useConfigStore: vi.fn(() => ({
        staged: new Map(),
        unstageChange: vi.fn(),
        clearAllChanges: vi.fn(),
        applyChanges: vi.fn(),
        isApplying: false,
        error: null,
        stageChange: vi.fn(),
        validationStatus: 'idle',
        validateAll: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
    })),
    useUIStore: vi.fn(),
    useActivityStore: vi.fn(() => ({
        addLogEntry: vi.fn(),
        addApiCallLog: vi.fn(),
    })),
    useAllQueues: vi.fn(() => []),
    useSelectedQueue: vi.fn(() => null),
    useHasStagedChanges: vi.fn(() => false),
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
        expect(screen.getByText('Queues')).toBeInTheDocument();
        expect(screen.getByText('Global Settings')).toBeInTheDocument();
        expect(screen.getByText('Node Labels')).toBeInTheDocument();
        expect(screen.getByText('Diagnostics')).toBeInTheDocument();
    });

    it('renders the default Queue Visualization view', () => {
        renderWithQueryClient(<App />);
        expect(screen.getByText('Queue Visualization')).toBeInTheDocument();
        expect(screen.getByText(/Interactive YARN Capacity Scheduler queue tree/)).toBeInTheDocument();
    });

    it('renders status bar', () => {
        renderWithQueryClient(<App />);
        expect(screen.getByText('YARN Scheduler UI v2.0')).toBeInTheDocument();
    });
});

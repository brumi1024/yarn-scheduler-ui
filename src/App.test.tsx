import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';

// Mock all store modules to prevent API calls and provide default states
vi.mock('./store/dataStore', () => ({
    useDataStore: vi.fn(),
}));

vi.mock('./store', () => ({
    useDataStore: vi.fn(),
    useUIStore: vi.fn(),
    useChangesStore: vi.fn(() => ({
        stagedChanges: [],
        unstageChange: vi.fn(),
        clearStagedChanges: vi.fn(),
        applyChanges: vi.fn(),
        applyingChanges: false,
        conflicts: [],
        applyError: null,
        lastApplied: undefined,
        stageChange: vi.fn(),
        hasUnsavedChanges: vi.fn(() => false),
        getChangesByQueue: vi.fn(() => []),
    })),
    useActivityStore: vi.fn(),
    useAllQueues: vi.fn(() => []),
    useSelectedQueue: vi.fn(() => null),
    useHasStagedChanges: vi.fn(() => false),
}));

vi.mock('./hooks/useApiWithZustand', () => ({
    useHealthCheck: vi.fn(() => ({ status: 'ok', lastCheck: Date.now(), checkHealth: vi.fn() })),
    useScheduler: vi.fn(() => ({ data: null, loading: false, error: null, refetch: vi.fn() })),
    useConfiguration: vi.fn(() => ({ data: null, loading: false, error: null, refetch: vi.fn() })),
    useNodeLabels: vi.fn(() => ({ data: null, loading: false, error: null, refetch: vi.fn() })),
    useNodes: vi.fn(() => ({ data: null, loading: false, error: null, refetch: vi.fn() })),
    useApiMutation: vi.fn(() => ({ mutate: vi.fn(), loading: false, error: null })),
}));

import { useDataStore } from './store/dataStore';

const mockLoadAllData = vi.fn();
const mockUseDataStore = vi.mocked(useDataStore);

describe('App', () => {
    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
        
        // Mock the dataStore hook to return a mock loadAllData function
        mockUseDataStore.mockReturnValue(mockLoadAllData);
    });

    it('renders YARN Capacity Scheduler title', () => {
        render(<App />);
        expect(screen.getByText('YARN Capacity Scheduler')).toBeInTheDocument();
    });

    it('renders the main navigation tabs', () => {
        render(<App />);
        expect(screen.getByText('Queues')).toBeInTheDocument();
        expect(screen.getByText('Global Settings')).toBeInTheDocument();
        expect(screen.getByText('Node Labels')).toBeInTheDocument();
        expect(screen.getByText('Diagnostics')).toBeInTheDocument();
    });

    it('renders the default Queue Visualization view', () => {
        render(<App />);
        expect(screen.getByText('Queue Visualization')).toBeInTheDocument();
        expect(screen.getByText(/Interactive YARN Capacity Scheduler queue tree/)).toBeInTheDocument();
    });

    it('renders status bar', () => {
        render(<App />);
        expect(screen.getByText('YARN Scheduler UI v2.0')).toBeInTheDocument();
    });

    it('calls loadAllData on mount', () => {
        render(<App />);
        expect(mockLoadAllData).toHaveBeenCalledOnce();
    });
});

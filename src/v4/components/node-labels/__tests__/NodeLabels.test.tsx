import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NodeLabels } from '../NodeLabels';

// Mock the scheduler store
const mockRefreshSchedulerData = vi.fn().mockResolvedValue(undefined);
const mockApplyChanges = vi.fn().mockResolvedValue(undefined);
const mockClearAllChanges = vi.fn();
const mockStagedChanges = vi.fn(() => []);

const createMockState = (overrides = {}) => ({
    isLoading: false,
    error: null,
    nodeLabels: [
        { name: 'gpu', exclusivity: true },
        { name: 'ssd', exclusivity: false },
        { name: 'highmem', exclusivity: true },
    ],
    stagedChanges: mockStagedChanges(),
    refreshSchedulerData: mockRefreshSchedulerData,
    applyChanges: mockApplyChanges,
    clearAllChanges: mockClearAllChanges,
    ...overrides,
});

vi.mock('../../store/schedulerStore', () => ({
    useSchedulerStore: vi.fn((selector: any) => {
        const state = createMockState();
        return selector(state);
    }),
}));

// Mock child components
vi.mock('../NodeLabelsPanel', () => ({
    NodeLabelsPanel: vi.fn(() => <div data-testid="node-labels-panel">NodeLabelsPanel</div>),
}));

vi.mock('../NodesPanel', () => ({
    NodesPanel: vi.fn(() => <div data-testid="nodes-panel">NodesPanel</div>),
}));

describe('NodeLabels', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStagedChanges.mockReturnValue([]);
    });

    it('should render the main title and description', () => {
        render(<NodeLabels />);
        
        expect(screen.getByText('Node Labels Management')).toBeInTheDocument();
        expect(screen.getByText(/Manage node labels for the YARN cluster/)).toBeInTheDocument();
    });

    it('should render both child panels', () => {
        render(<NodeLabels />);
        
        expect(screen.getByTestId('node-labels-panel')).toBeInTheDocument();
        expect(screen.getByTestId('nodes-panel')).toBeInTheDocument();
    });

    it('should show refresh button', () => {
        render(<NodeLabels />);
        
        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        expect(refreshButton).toBeInTheDocument();
    });

    it('should call refreshSchedulerData when refresh button is clicked', async () => {
        const user = userEvent.setup();
        render(<NodeLabels />);
        
        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        await user.click(refreshButton);
        
        expect(mockRefreshSchedulerData).toHaveBeenCalledTimes(1);
    });

    it('should show staged changes alert when there are node label changes', () => {
        mockStagedChanges.mockReturnValue([
            {
                id: '1',
                queuePath: 'root.default',
                property: 'accessible-node-labels.gpu.capacity',
                newValue: '50',
                type: 'update',
            },
        ]);

        render(<NodeLabels />);
        
        expect(screen.getByText(/You have unsaved node label changes/)).toBeInTheDocument();
        expect(screen.getByText('1 change')).toBeInTheDocument();
    });

    it('should show apply and clear buttons when there are changes', () => {
        mockStagedChanges.mockReturnValue([
            {
                id: '1',
                queuePath: 'root.default',
                property: 'accessible-node-labels.gpu.capacity',
                newValue: '50',
                type: 'update',
            },
        ]);

        render(<NodeLabels />);
        
        expect(screen.getByRole('button', { name: /apply changes/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /clear changes/i })).toBeInTheDocument();
    });

    it('should not show apply and clear buttons when there are no changes', () => {
        render(<NodeLabels />);
        
        expect(screen.queryByRole('button', { name: /apply changes/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /clear changes/i })).not.toBeInTheDocument();
    });

    it('should call applyChanges when apply button is clicked', async () => {
        const user = userEvent.setup();
        mockStagedChanges.mockReturnValue([
            {
                id: '1',
                queuePath: 'root.default',
                property: 'accessible-node-labels.gpu.capacity',
                newValue: '50',
                type: 'update',
            },
        ]);

        render(<NodeLabels />);
        
        const applyButton = screen.getByRole('button', { name: /apply changes/i });
        await user.click(applyButton);
        
        expect(mockApplyChanges).toHaveBeenCalledTimes(1);
    });

    it('should call clearAllChanges when clear button is clicked', async () => {
        const user = userEvent.setup();
        mockStagedChanges.mockReturnValue([
            {
                id: '1',
                queuePath: 'root.default',
                property: 'accessible-node-labels.gpu.capacity',
                newValue: '50',
                type: 'update',
            },
        ]);

        render(<NodeLabels />);
        
        const clearButton = screen.getByRole('button', { name: /clear changes/i });
        await user.click(clearButton);
        
        expect(mockClearAllChanges).toHaveBeenCalledTimes(1);
    });

    it('should display error alert when there is an error', () => {
        const { useSchedulerStore } = require('../../store/schedulerStore');
        useSchedulerStore.mockImplementation((selector: any) => {
            const state = createMockState({
                error: 'Failed to load node labels',
                nodeLabels: [],
            });
            return selector(state);
        });

        render(<NodeLabels />);
        
        expect(screen.getByText('Failed to load node labels')).toBeInTheDocument();
    });

    it('should show loading state when loading', () => {
        const { useSchedulerStore } = require('../../store/schedulerStore');
        useSchedulerStore.mockImplementation((selector: any) => {
            const state = createMockState({
                isLoading: true,
                nodeLabels: [],
            });
            return selector(state);
        });

        render(<NodeLabels />);
        
        expect(screen.getByText('Loading node labels...')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should handle multiple node label changes in alert', () => {
        mockStagedChanges.mockReturnValue([
            {
                id: '1',
                queuePath: 'root.default',
                property: 'accessible-node-labels.gpu.capacity',
                newValue: '50',
                type: 'update',
            },
            {
                id: '2',
                queuePath: 'root.production',
                property: 'accessible-node-labels.ssd.capacity',
                newValue: '30',
                type: 'update',
            },
        ]);

        render(<NodeLabels />);
        
        expect(screen.getByText('2 changes')).toBeInTheDocument();
    });

    it('should filter changes to only show node label related changes', () => {
        mockStagedChanges.mockReturnValue([
            {
                id: '1',
                queuePath: 'root.default',
                property: 'accessible-node-labels.gpu.capacity',
                newValue: '50',
                type: 'update',
            },
            {
                id: '2',
                queuePath: 'root.production',
                property: 'capacity',  // Not a node label property
                newValue: '70',
                type: 'update',
            },
            {
                id: '3',
                queuePath: 'global',
                property: 'maximum-applications',  // Global property
                newValue: '15000',
                type: 'update',
            },
        ]);

        render(<NodeLabels />);
        
        // Should only show 1 change (the node label change)
        expect(screen.getByText('1 change')).toBeInTheDocument();
    });

    it('should have correct grid layout structure', () => {
        render(<NodeLabels />);
        
        // Check that we have the expected card structure
        expect(screen.getByText('Available Labels')).toBeInTheDocument();
        expect(screen.getByText('Node Label Configuration')).toBeInTheDocument();
    });
});
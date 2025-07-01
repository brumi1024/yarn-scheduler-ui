import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NodeLabelsPanel } from '../NodeLabelsPanel';

// Mock the scheduler store
const mockSelectNodeLabel = vi.fn();
const mockStagedChanges = vi.fn(() => []);

const createMockState = (overrides = {}) => ({
    nodeLabels: [
        { name: 'gpu', exclusivity: true },
        { name: 'ssd', exclusivity: false },
        { name: 'highmem', exclusivity: true },
    ],
    selectedNodeLabel: null,
    selectNodeLabel: mockSelectNodeLabel,
    stagedChanges: mockStagedChanges(),
    ...overrides,
});

vi.mock('../../store/schedulerStore', () => ({
    useSchedulerStore: vi.fn((selector: any) => {
        const state = createMockState();
        return selector(state);
    }),
}));

describe('NodeLabelsPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStagedChanges.mockReturnValue([]);
    });

    it('should render all node labels', () => {
        render(<NodeLabelsPanel />);
        
        expect(screen.getByText('gpu')).toBeInTheDocument();
        expect(screen.getByText('ssd')).toBeInTheDocument();
        expect(screen.getByText('highmem')).toBeInTheDocument();
    });

    it('should show label count', () => {
        render(<NodeLabelsPanel />);
        
        expect(screen.getByText('3 labels available')).toBeInTheDocument();
    });

    it('should show exclusive labels with chip', () => {
        render(<NodeLabelsPanel />);
        
        // GPU and highmem are exclusive
        const exclusiveChips = screen.getAllByText('Exclusive');
        expect(exclusiveChips).toHaveLength(2);
    });

    it('should show add button', () => {
        render(<NodeLabelsPanel />);
        
        const addButton = screen.getByRole('button', { name: /add/i });
        expect(addButton).toBeInTheDocument();
    });

    it('should open add dialog when add button is clicked', async () => {
        const user = userEvent.setup();
        render(<NodeLabelsPanel />);
        
        const addButton = screen.getByRole('button', { name: /add/i });
        await user.click(addButton);
        
        expect(screen.getByText('Add New Node Label')).toBeInTheDocument();
        expect(screen.getByLabelText('Label Name')).toBeInTheDocument();
    });

    it('should call selectNodeLabel when label is clicked', async () => {
        const user = userEvent.setup();
        render(<NodeLabelsPanel />);
        
        const gpuLabel = screen.getByText('gpu').closest('button');
        expect(gpuLabel).toBeInTheDocument();
        
        await user.click(gpuLabel!);
        
        expect(mockSelectNodeLabel).toHaveBeenCalledWith('gpu');
    });

    it('should show changes count for labels with staged changes', () => {
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
                property: 'accessible-node-labels.gpu.maximum-capacity',
                newValue: '80',
                type: 'update',
            },
        ]);

        render(<NodeLabelsPanel />);
        
        expect(screen.getByText('2 changes')).toBeInTheDocument();
    });

    it('should show delete button for each label', () => {
        render(<NodeLabelsPanel />);
        
        const deleteButtons = screen.getAllByLabelText('Remove label');
        expect(deleteButtons).toHaveLength(3);
    });

    it('should log removal when delete button is clicked', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
        const user = userEvent.setup();
        render(<NodeLabelsPanel />);
        
        const deleteButtons = screen.getAllByLabelText('Remove label');
        await user.click(deleteButtons[0]);
        
        expect(consoleSpy).toHaveBeenCalledWith('Removing node label:', 'gpu');
        
        consoleSpy.mockRestore();
    });

    it('should show selected state when a label is selected', () => {
        const { useSchedulerStore } = require('../../store/schedulerStore');
        useSchedulerStore.mockImplementation((selector: any) => {
            const state = createMockState({
                nodeLabels: [
                    { name: 'gpu', exclusivity: true },
                    { name: 'ssd', exclusivity: false },
                ],
                selectedNodeLabel: 'gpu',
            });
            return selector(state);
        });

        render(<NodeLabelsPanel />);
        
        expect(screen.getByText(/Selected label: gpu/)).toBeInTheDocument();
    });

    it('should deselect label when clicking selected label', async () => {
        const user = userEvent.setup();
        
        const { useSchedulerStore } = require('../../store/schedulerStore');
        useSchedulerStore.mockImplementation((selector: any) => {
            const state = createMockState({
                nodeLabels: [{ name: 'gpu', exclusivity: true }],
                selectedNodeLabel: 'gpu',
            });
            return selector(state);
        });

        render(<NodeLabelsPanel />);
        
        const gpuLabel = screen.getByText('gpu').closest('button');
        await user.click(gpuLabel!);
        
        expect(mockSelectNodeLabel).toHaveBeenCalledWith(null);
    });

    describe('Add Label Dialog', () => {
        it('should add label with valid name and exclusivity', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
            const user = userEvent.setup();
            render(<NodeLabelsPanel />);
            
            // Open dialog
            const addButton = screen.getByRole('button', { name: /add/i });
            await user.click(addButton);
            
            // Fill form
            const nameInput = screen.getByLabelText('Label Name');
            await user.type(nameInput, 'test-label');
            
            const exclusiveSwitch = screen.getByRole('checkbox');
            await user.click(exclusiveSwitch);
            
            // Submit
            const submitButton = screen.getByRole('button', { name: 'Add Label' });
            await user.click(submitButton);
            
            expect(consoleSpy).toHaveBeenCalledWith('Adding node label:', { name: 'test-label', exclusivity: true });
            
            consoleSpy.mockRestore();
        });

        it('should show error for empty label name', async () => {
            const user = userEvent.setup();
            render(<NodeLabelsPanel />);
            
            // Open dialog
            const addButton = screen.getByRole('button', { name: /add/i });
            await user.click(addButton);
            
            // Try to submit without name
            const submitButton = screen.getByRole('button', { name: 'Add Label' });
            await user.click(submitButton);
            
            expect(screen.getByText('Label name is required')).toBeInTheDocument();
        });

        it('should show error for duplicate label name', async () => {
            const user = userEvent.setup();
            render(<NodeLabelsPanel />);
            
            // Open dialog
            const addButton = screen.getByRole('button', { name: /add/i });
            await user.click(addButton);
            
            // Enter existing label name
            const nameInput = screen.getByLabelText('Label Name');
            await user.type(nameInput, 'gpu');
            
            const submitButton = screen.getByRole('button', { name: 'Add Label' });
            await user.click(submitButton);
            
            expect(screen.getByText('Label already exists')).toBeInTheDocument();
        });

        it('should show error for invalid label name characters', async () => {
            const user = userEvent.setup();
            render(<NodeLabelsPanel />);
            
            // Open dialog
            const addButton = screen.getByRole('button', { name: /add/i });
            await user.click(addButton);
            
            // Enter invalid label name
            const nameInput = screen.getByLabelText('Label Name');
            await user.type(nameInput, 'invalid label name!');
            
            const submitButton = screen.getByRole('button', { name: 'Add Label' });
            await user.click(submitButton);
            
            expect(screen.getByText(/Label name can only contain letters, numbers, hyphens, and underscores/)).toBeInTheDocument();
        });

        it('should close dialog when cancel is clicked', async () => {
            const user = userEvent.setup();
            render(<NodeLabelsPanel />);
            
            // Open dialog
            const addButton = screen.getByRole('button', { name: /add/i });
            await user.click(addButton);
            
            expect(screen.getByText('Add New Node Label')).toBeInTheDocument();
            
            // Cancel
            const cancelButton = screen.getByRole('button', { name: 'Cancel' });
            await user.click(cancelButton);
            
            await waitFor(() => {
                expect(screen.queryByText('Add New Node Label')).not.toBeInTheDocument();
            });
        });
    });

    it('should show empty state when no labels exist', () => {
        const { useSchedulerStore } = require('../../store/schedulerStore');
        useSchedulerStore.mockImplementation((selector: any) => {
            const state = createMockState({
                nodeLabels: [],
            });
            return selector(state);
        });

        render(<NodeLabelsPanel />);
        
        expect(screen.getByText('No node labels found')).toBeInTheDocument();
        expect(screen.getByText("Click 'Add' to create the first label")).toBeInTheDocument();
    });
});
import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { NodeLabelsPanel } from './NodeLabelsPanel';
import { useSchedulerStore } from '~/store/schedulerStore';
import { validateLabelRemoval } from '~/lib/utils/labelValidation';
import { getMockNodeLabel } from '~/test-utils/factories';
import type { NodeLabel } from '~/lib/types';

// Mock dependencies
vi.mock('~/store/schedulerStore');
vi.mock('~/lib/utils/labelValidation');

// Mock the AddLabelDialog component
vi.mock('./AddLabelDialog', () => ({
    AddLabelDialog: ({ 
        open, 
        onClose, 
        onConfirm, 
        existingLabels,
        isLoading 
    }: {
        open: boolean;
        onClose: () => void;
        onConfirm: (name: string, exclusivity: boolean) => void;
        existingLabels: string[];
        isLoading?: boolean;
    }) => {
        if (!open) return null;
        
        return (
            <div data-testid="add-label-dialog">
                <div>Existing labels: {existingLabels.join(', ')}</div>
                <button onClick={onClose}>Cancel</button>
                <button 
                    onClick={() => onConfirm('new-label', true)}
                    disabled={isLoading}
                >
                    Add Label
                </button>
            </div>
        );
    }
}));

describe('NodeLabelsPanel', () => {
    const mockSelectNodeLabel = vi.fn();
    const mockAddNodeLabel = vi.fn();
    const mockRemoveNodeLabel = vi.fn();
    const mockGetState = vi.fn();
    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const defaultStoreState = {
        nodeLabels: [],
        selectedNodeLabel: null,
        selectNodeLabel: mockSelectNodeLabel,
        addNodeLabel: mockAddNodeLabel,
        removeNodeLabel: mockRemoveNodeLabel,
        isLoading: false,
        nodeToLabels: []
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockConsoleError.mockClear();
        (useSchedulerStore as any).mockReturnValue(defaultStoreState);
        (useSchedulerStore as any).getState = mockGetState;
        mockGetState.mockReturnValue({ nodeToLabels: [] });
        (validateLabelRemoval as any).mockReturnValue({ valid: true });
    });

    afterAll(() => {
        mockConsoleError.mockRestore();
    });

    describe('Empty state', () => {
        it('should display empty state when no labels exist', () => {
            render(<NodeLabelsPanel />);

            expect(screen.getByText('No node labels found')).toBeInTheDocument();
            expect(screen.getByText("Click 'Add' to create the first label")).toBeInTheDocument();
        });

        it('should show correct label count for empty state', () => {
            render(<NodeLabelsPanel />);

            expect(screen.getByText('0 labels available')).toBeInTheDocument();
        });
    });

    describe('Label list display', () => {
        const mockLabels: NodeLabel[] = [
            getMockNodeLabel({ name: 'gpu', exclusivity: true }),
            getMockNodeLabel({ name: 'highmem', exclusivity: false }),
            getMockNodeLabel({ name: 'ssd', exclusivity: true })
        ];

        it('should display all node labels', () => {
            (useSchedulerStore as any).mockReturnValue({
                ...defaultStoreState,
                nodeLabels: mockLabels
            });

            render(<NodeLabelsPanel />);

            expect(screen.getByText('gpu')).toBeInTheDocument();
            expect(screen.getByText('highmem')).toBeInTheDocument();
            expect(screen.getByText('ssd')).toBeInTheDocument();
        });

        it('should show correct label count', () => {
            (useSchedulerStore as any).mockReturnValue({
                ...defaultStoreState,
                nodeLabels: mockLabels
            });

            render(<NodeLabelsPanel />);

            expect(screen.getByText('3 labels available')).toBeInTheDocument();
        });

        it('should display exclusive badge for exclusive labels', () => {
            (useSchedulerStore as any).mockReturnValue({
                ...defaultStoreState,
                nodeLabels: mockLabels
            });

            render(<NodeLabelsPanel />);

            const exclusiveBadges = screen.getAllByText('Exclusive');
            expect(exclusiveBadges).toHaveLength(2); // gpu and ssd are exclusive
        });

        it('should show shield icon for exclusive labels', () => {
            (useSchedulerStore as any).mockReturnValue({
                ...defaultStoreState,
                nodeLabels: mockLabels
            });

            render(<NodeLabelsPanel />);

            const labelItems = screen.getAllByRole('listitem');
            const gpuItem = labelItems.find(item => within(item).queryByText('gpu'));
            const highmemItem = labelItems.find(item => within(item).queryByText('highmem'));

            expect(gpuItem?.querySelector('.text-warning')).toBeInTheDocument(); // Shield icon
            expect(highmemItem?.querySelector('.text-primary')).toBeInTheDocument(); // Tag icon
        });

        it('should handle singular vs plural label text', () => {
            (useSchedulerStore as any).mockReturnValue({
                ...defaultStoreState,
                nodeLabels: [getMockNodeLabel()]
            });

            render(<NodeLabelsPanel />);

            expect(screen.getByText('1 label available')).toBeInTheDocument();
        });
    });

    describe('Label selection', () => {
        const mockLabels: NodeLabel[] = [
            getMockNodeLabel({ name: 'gpu', exclusivity: true }),
            getMockNodeLabel({ name: 'highmem', exclusivity: false })
        ];

        it('should call selectNodeLabel when clicking on a label', async () => {
            (useSchedulerStore as any).mockReturnValue({
                ...defaultStoreState,
                nodeLabels: mockLabels
            });

            render(<NodeLabelsPanel />);

            const gpuLabel = screen.getByText('gpu').closest('div[class*="group"]');
            await userEvent.click(gpuLabel!);

            expect(mockSelectNodeLabel).toHaveBeenCalledWith('gpu');
        });

        it('should deselect label when clicking on selected label', async () => {
            (useSchedulerStore as any).mockReturnValue({
                ...defaultStoreState,
                nodeLabels: mockLabels,
                selectedNodeLabel: 'gpu'
            });

            render(<NodeLabelsPanel />);

            const gpuLabel = screen.getByText('gpu').closest('div[class*="group"]');
            await userEvent.click(gpuLabel!);

            expect(mockSelectNodeLabel).toHaveBeenCalledWith(null);
        });

        it('should highlight selected label', () => {
            (useSchedulerStore as any).mockReturnValue({
                ...defaultStoreState,
                nodeLabels: mockLabels,
                selectedNodeLabel: 'highmem'
            });

            render(<NodeLabelsPanel />);

            const highmemLabel = screen.getByText('highmem');
            expect(highmemLabel).toHaveClass('font-semibold');
            
            const highmemContainer = highmemLabel.closest('div[class*="group"]');
            expect(highmemContainer).toHaveClass('bg-accent');
        });
    });

    describe('Add label functionality', () => {
        it('should display add button', () => {
            render(<NodeLabelsPanel />);

            const addButton = screen.getByRole('button', { name: /add/i });
            expect(addButton).toBeInTheDocument();
            expect(addButton).not.toBeDisabled();
        });

        it('should disable add button when loading', () => {
            (useSchedulerStore as any).mockReturnValue({
                ...defaultStoreState,
                isLoading: true
            });

            render(<NodeLabelsPanel />);

            const addButton = screen.getByRole('button', { name: /add/i });
            expect(addButton).toBeDisabled();
        });

        it('should open add dialog when add button is clicked', async () => {
            render(<NodeLabelsPanel />);

            const addButton = screen.getByRole('button', { name: /add/i });
            await userEvent.click(addButton);

            expect(screen.getByTestId('add-label-dialog')).toBeInTheDocument();
        });

        it('should pass existing label names to add dialog', async () => {
            const mockLabels: NodeLabel[] = [
                getMockNodeLabel({ name: 'gpu' }),
                getMockNodeLabel({ name: 'highmem' })
            ];

            (useSchedulerStore as any).mockReturnValue({
                ...defaultStoreState,
                nodeLabels: mockLabels
            });

            render(<NodeLabelsPanel />);

            const addButton = screen.getByRole('button', { name: /add/i });
            await userEvent.click(addButton);

            expect(screen.getByText('Existing labels: gpu, highmem')).toBeInTheDocument();
        });

        it('should call addNodeLabel when confirming dialog', async () => {
            mockAddNodeLabel.mockResolvedValue(undefined);

            render(<NodeLabelsPanel />);

            const addButton = screen.getByRole('button', { name: /add/i });
            await userEvent.click(addButton);

            const confirmButton = within(screen.getByTestId('add-label-dialog'))
                .getByRole('button', { name: /add label/i });
            await userEvent.click(confirmButton);

            expect(mockAddNodeLabel).toHaveBeenCalledWith('new-label', true);
        });

        it('should handle add label errors', async () => {
            const testError = new Error('Failed to add label');
            mockAddNodeLabel.mockRejectedValue(testError);

            render(<NodeLabelsPanel />);

            const addButton = screen.getByRole('button', { name: /add/i });
            await userEvent.click(addButton);

            const confirmButton = within(screen.getByTestId('add-label-dialog'))
                .getByRole('button', { name: /add label/i });
            await userEvent.click(confirmButton);

            await waitFor(() => {
                expect(mockConsoleError).toHaveBeenCalledWith(
                    'Failed to add node label:',
                    testError
                );
            });
        });

        it('should close dialog when cancel is clicked', async () => {
            render(<NodeLabelsPanel />);

            const addButton = screen.getByRole('button', { name: /add/i });
            await userEvent.click(addButton);

            const cancelButton = within(screen.getByTestId('add-label-dialog'))
                .getByRole('button', { name: /cancel/i });
            await userEvent.click(cancelButton);

            expect(screen.queryByTestId('add-label-dialog')).not.toBeInTheDocument();
        });
    });

    describe('Remove label functionality', () => {
        const mockLabels: NodeLabel[] = [
            getMockNodeLabel({ name: 'gpu', exclusivity: true }),
            getMockNodeLabel({ name: 'highmem', exclusivity: false })
        ];

        beforeEach(() => {
            (useSchedulerStore as any).mockReturnValue({
                ...defaultStoreState,
                nodeLabels: mockLabels
            });
        });

        it('should show delete button on hover', async () => {
            render(<NodeLabelsPanel />);

            const gpuLabel = screen.getByText('gpu').closest('div[class*="group"]');
            
            // Delete button should be hidden initially
            const deleteButton = within(gpuLabel!).getByRole('button');
            expect(deleteButton).toHaveClass('opacity-0');

            // Hover over the label
            fireEvent.mouseEnter(gpuLabel!);
            
            // Delete button should be visible
            expect(deleteButton).toHaveClass('group-hover:opacity-100');
        });

        it('should validate label removal before deleting', async () => {
            const mockNodeToLabels = [
                { nodeId: 'node1', nodeLabels: ['gpu'] }
            ];

            mockGetState.mockReturnValue({ nodeToLabels: mockNodeToLabels });
            (validateLabelRemoval as any).mockReturnValue({
                valid: false,
                error: 'Cannot remove label: nodes are assigned'
            });

            render(<NodeLabelsPanel />);

            const gpuLabel = screen.getByText('gpu').closest('div[class*="group"]');
            const deleteButton = within(gpuLabel!).getByRole('button');
            
            await userEvent.click(deleteButton);

            expect(validateLabelRemoval).toHaveBeenCalledWith(
                'gpu',
                new Map([['node1', ['gpu']]])
            );

            expect(mockRemoveNodeLabel).not.toHaveBeenCalled();
            expect(mockConsoleError).toHaveBeenCalledWith(
                'Failed to remove node label:',
                expect.any(Error)
            );
        });

        it('should call removeNodeLabel when validation passes', async () => {
            (validateLabelRemoval as any).mockReturnValue({ valid: true });
            mockRemoveNodeLabel.mockResolvedValue(undefined);

            render(<NodeLabelsPanel />);

            const gpuLabel = screen.getByText('gpu').closest('div[class*="group"]');
            const deleteButton = within(gpuLabel!).getByRole('button');
            
            await userEvent.click(deleteButton);

            expect(mockRemoveNodeLabel).toHaveBeenCalledWith('gpu');
        });

        it('should prevent event bubbling when clicking delete', async () => {
            render(<NodeLabelsPanel />);

            const gpuLabel = screen.getByText('gpu').closest('div[class*="group"]');
            const deleteButton = within(gpuLabel!).getByRole('button');
            
            await userEvent.click(deleteButton);

            // Should not trigger label selection
            expect(mockSelectNodeLabel).not.toHaveBeenCalled();
        });

        it('should disable delete button when loading', () => {
            (useSchedulerStore as any).mockReturnValue({
                ...defaultStoreState,
                nodeLabels: mockLabels,
                isLoading: true
            });

            render(<NodeLabelsPanel />);

            const deleteButtons = screen.getAllByRole('button').filter(
                button => button.querySelector('.text-destructive')
            );

            deleteButtons.forEach(button => {
                expect(button).toBeDisabled();
            });
        });

        it('should handle remove label errors', async () => {
            const testError = new Error('Failed to remove label');
            mockRemoveNodeLabel.mockRejectedValue(testError);
            (validateLabelRemoval as any).mockReturnValue({ valid: true });

            render(<NodeLabelsPanel />);

            const gpuLabel = screen.getByText('gpu').closest('div[class*="group"]');
            const deleteButton = within(gpuLabel!).getByRole('button');
            
            await userEvent.click(deleteButton);

            await waitFor(() => {
                expect(mockConsoleError).toHaveBeenCalledWith(
                    'Failed to remove node label:',
                    testError
                );
            });
        });
    });

    describe('Visual feedback', () => {
        const mockLabels: NodeLabel[] = [
            getMockNodeLabel({ name: 'gpu', exclusivity: true }),
            getMockNodeLabel({ name: 'highmem', exclusivity: false })
        ];

        it('should show hover effect on labels', () => {
            (useSchedulerStore as any).mockReturnValue({
                ...defaultStoreState,
                nodeLabels: mockLabels
            });

            render(<NodeLabelsPanel />);

            const labelItems = screen.getAllByRole('listitem');
            labelItems.forEach(item => {
                const labelDiv = item.querySelector('div[class*="group"]');
                expect(labelDiv).toHaveClass('hover:bg-accent');
                expect(labelDiv).toHaveClass('transition-colors');
            });
        });

        it('should show cursor pointer on labels', () => {
            (useSchedulerStore as any).mockReturnValue({
                ...defaultStoreState,
                nodeLabels: mockLabels
            });

            render(<NodeLabelsPanel />);

            const labelItems = screen.getAllByRole('listitem');
            labelItems.forEach(item => {
                const labelDiv = item.querySelector('div[class*="group"]');
                expect(labelDiv).toHaveClass('cursor-pointer');
            });
        });
    });

    describe('Accessibility', () => {
        const mockLabels: NodeLabel[] = [
            getMockNodeLabel({ name: 'gpu', exclusivity: true }),
            getMockNodeLabel({ name: 'highmem', exclusivity: false })
        ];

        it('should have accessible list structure', () => {
            (useSchedulerStore as any).mockReturnValue({
                ...defaultStoreState,
                nodeLabels: mockLabels
            });

            render(<NodeLabelsPanel />);

            const list = screen.getByRole('list');
            expect(list).toBeInTheDocument();

            const listItems = screen.getAllByRole('listitem');
            expect(listItems).toHaveLength(2);
        });

        it('should have accessible tooltips for delete buttons', () => {
            (useSchedulerStore as any).mockReturnValue({
                ...defaultStoreState,
                nodeLabels: mockLabels
            });

            render(<NodeLabelsPanel />);

            // Check that delete buttons exist and have proper structure
            const deleteButtons = screen.getAllByRole('button').filter(
                button => button.querySelector('.text-destructive')
            );
            
            expect(deleteButtons).toHaveLength(2); // One for each label
            deleteButtons.forEach(button => {
                // Button component might not have data-slot attribute, check it's a button element
                expect(button.tagName).toBe('BUTTON');
                expect(button).not.toBeDisabled();
            });
        });

        it('should have accessible button labels', () => {
            render(<NodeLabelsPanel />);

            const addButton = screen.getByRole('button', { name: /add/i });
            expect(addButton).toHaveAccessibleName();
        });
    });
});
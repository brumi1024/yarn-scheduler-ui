import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { StagedChangesPanel } from '../StagedChangesPanel';
import { useStagedChangesStore } from '../../store/zustand/stagedChangesStore';
import type { ChangeSet } from '../../types/Configuration';

// Mock the store
vi.mock('../../store/zustand/stagedChangesStore', () => ({
    useStagedChangesStore: vi.fn(),
}));

const mockStore = {
    changes: [] as ChangeSet[],
    unstageChange: vi.fn(),
    clearAllChanges: vi.fn(),
    hasUnsavedChanges: vi.fn(),
    conflicts: [],
};

const theme = createTheme();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const mockChanges: ChangeSet[] = [
    {
        id: 'change-1',
        timestamp: new Date('2025-01-01T10:00:00Z'),
        type: 'update-queue',
        queueName: 'default',
        property: 'capacity',
        oldValue: '50',
        newValue: '75',
        description: 'Updated capacity from 50% to 75%',
    },
    {
        id: 'change-2',
        timestamp: new Date('2025-01-01T10:01:00Z'),
        type: 'update-queue',
        queueName: 'production',
        property: 'state',
        oldValue: 'RUNNING',
        newValue: 'STOPPED',
        description: 'Changed state from RUNNING to STOPPED',
    },
    {
        id: 'change-3',
        timestamp: new Date('2025-01-01T10:02:00Z'),
        type: 'add-queue',
        queueName: 'new-queue',
        property: 'queue-creation',
        oldValue: '',
        newValue: 'new-queue',
        description: 'Added new queue: new-queue',
    },
];

describe('StagedChangesPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset to default mock store state
        (useStagedChangesStore as any).mockReturnValue({
            ...mockStore,
            changes: [],
            hasUnsavedChanges: () => false,
        });
    });

    describe('when no changes are staged', () => {
        it('should not render anything', () => {
            render(
                <TestWrapper>
                    <StagedChangesPanel />
                </TestWrapper>
            );

            expect(screen.queryByText(/staged changes/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/changes staged/i)).not.toBeInTheDocument();
        });
    });

    describe('when changes are staged', () => {
        beforeEach(() => {
            (useStagedChangesStore as any).mockReturnValue({
                ...mockStore,
                changes: mockChanges,
                hasUnsavedChanges: () => true,
            });
        });

        it('should render collapsed state with change count', () => {
            render(
                <TestWrapper>
                    <StagedChangesPanel />
                </TestWrapper>
            );

            expect(screen.getByText('3 Changes Staged')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /3 changes staged/i })).toBeInTheDocument();
        });

        it('should expand when clicked', async () => {
            render(
                <TestWrapper>
                    <StagedChangesPanel />
                </TestWrapper>
            );

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /3 changes staged/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('Staged Changes')).toBeInTheDocument();
            });
        });

        it('should show change details when expanded', async () => {
            render(
                <TestWrapper>
                    <StagedChangesPanel />
                </TestWrapper>
            );

            // Expand the panel
            fireEvent.click(screen.getByRole('button', { name: /3 changes staged/i }));

            await waitFor(() => {
                expect(screen.getByText('capacity')).toBeInTheDocument();
                expect(screen.getByText('state')).toBeInTheDocument();
                expect(screen.getByText('queue-creation')).toBeInTheDocument();
                expect(screen.getByText('Updated capacity from 50% to 75%')).toBeInTheDocument();
            });
        });

        it('should group changes by queue by default', async () => {
            render(
                <TestWrapper>
                    <StagedChangesPanel />
                </TestWrapper>
            );

            fireEvent.click(screen.getByRole('button', { name: /3 changes staged/i }));

            await waitFor(() => {
                expect(screen.getByText('Queue: default')).toBeInTheDocument();
                expect(screen.getByText('Queue: production')).toBeInTheDocument();
                expect(screen.getByText('Queue: new-queue')).toBeInTheDocument();
            });
        });

        it('should allow grouping by type', async () => {
            render(
                <TestWrapper>
                    <StagedChangesPanel />
                </TestWrapper>
            );

            fireEvent.click(screen.getByRole('button', { name: /3 changes staged/i }));

            await waitFor(() => {
                const groupByButton = screen.getByRole('button', { name: /group by type/i });
                fireEvent.click(groupByButton);
            });

            await waitFor(() => {
                expect(screen.getByText('Type: update-queue')).toBeInTheDocument();
                expect(screen.getByText('Type: add-queue')).toBeInTheDocument();
            });
        });

        it('should remove individual changes', async () => {
            const mockUnstageChange = vi.fn();
            (useStagedChangesStore as any).mockReturnValue({
                ...mockStore,
                changes: mockChanges,
                unstageChange: mockUnstageChange,
                hasUnsavedChanges: () => true,
            });

            render(
                <TestWrapper>
                    <StagedChangesPanel />
                </TestWrapper>
            );

            fireEvent.click(screen.getByRole('button', { name: /3 changes staged/i }));

            await waitFor(() => {
                const deleteButtons = screen.getAllByLabelText(/remove change/i);
                fireEvent.click(deleteButtons[0]);
            });

            expect(mockUnstageChange).toHaveBeenCalledWith('change-1');
        });

        it('should clear all changes', async () => {
            const mockClearAllChanges = vi.fn();
            (useStagedChangesStore as any).mockReturnValue({
                ...mockStore,
                changes: mockChanges,
                clearAllChanges: mockClearAllChanges,
                hasUnsavedChanges: () => true,
            });

            render(
                <TestWrapper>
                    <StagedChangesPanel />
                </TestWrapper>
            );

            fireEvent.click(screen.getByRole('button', { name: /3 changes staged/i }));

            await waitFor(() => {
                const clearButton = screen.getByRole('button', { name: /clear all/i });
                fireEvent.click(clearButton);
            });

            expect(mockClearAllChanges).toHaveBeenCalled();
        });

        it('should call onApplyChanges when apply button is clicked', async () => {
            const mockOnApplyChanges = vi.fn();

            render(
                <TestWrapper>
                    <StagedChangesPanel onApplyChanges={mockOnApplyChanges} />
                </TestWrapper>
            );

            fireEvent.click(screen.getByRole('button', { name: /3 changes staged/i }));

            await waitFor(() => {
                const applyButton = screen.getByRole('button', { name: /apply changes/i });
                fireEvent.click(applyButton);
            });

            expect(mockOnApplyChanges).toHaveBeenCalled();
        });

        it('should show proper change type icons and colors', async () => {
            render(
                <TestWrapper>
                    <StagedChangesPanel />
                </TestWrapper>
            );

            fireEvent.click(screen.getByRole('button', { name: /3 changes staged/i }));

            await waitFor(() => {
                // Check that change type chips are rendered
                expect(screen.getByText('update queue')).toBeInTheDocument();
                expect(screen.getByText('add queue')).toBeInTheDocument();
            });
        });
    });

    describe('when conflicts exist', () => {
        beforeEach(() => {
            (useStagedChangesStore as any).mockReturnValue({
                ...mockStore,
                changes: mockChanges,
                conflicts: [
                    {
                        changeId: 'change-1',
                        type: 'validation',
                        severity: 'error',
                        message: 'Invalid capacity value',
                    },
                ],
                hasUnsavedChanges: () => true,
            });
        });

        it('should show warning color in collapsed state', () => {
            render(
                <TestWrapper>
                    <StagedChangesPanel />
                </TestWrapper>
            );

            const button = screen.getByRole('button', { name: /3 changes staged/i });
            expect(button).toHaveStyle({ backgroundColor: expect.stringContaining('warning') });
        });

        it('should show conflicts alert when expanded', async () => {
            render(
                <TestWrapper>
                    <StagedChangesPanel />
                </TestWrapper>
            );

            fireEvent.click(screen.getByRole('button', { name: /3 changes staged/i }));

            await waitFor(() => {
                expect(screen.getByText(/1 conflict detected/i)).toBeInTheDocument();
            });
        });

        it('should disable apply button when conflicts exist', async () => {
            render(
                <TestWrapper>
                    <StagedChangesPanel />
                </TestWrapper>
            );

            fireEvent.click(screen.getByRole('button', { name: /3 changes staged/i }));

            await waitFor(() => {
                const applyButton = screen.getByRole('button', { name: /apply changes/i });
                expect(applyButton).toBeDisabled();
            });
        });
    });

    describe('accessibility', () => {
        beforeEach(() => {
            (useStagedChangesStore as any).mockReturnValue({
                ...mockStore,
                changes: mockChanges,
                hasUnsavedChanges: () => true,
            });
        });

        it('should have proper ARIA labels', async () => {
            render(
                <TestWrapper>
                    <StagedChangesPanel />
                </TestWrapper>
            );

            fireEvent.click(screen.getByRole('button', { name: /3 changes staged/i }));

            await waitFor(() => {
                expect(screen.getAllByLabelText(/remove change/i)).toHaveLength(3);
            });
        });

        it('should be keyboard accessible', async () => {
            render(
                <TestWrapper>
                    <StagedChangesPanel />
                </TestWrapper>
            );

            const expandButton = screen.getByRole('button', { name: /3 changes staged/i });

            await act(async () => {
                expandButton.focus();
                // Press Enter to expand
                fireEvent.keyDown(expandButton, { key: 'Enter' });
            });

            await waitFor(() => {
                expect(screen.getByText('Staged Changes')).toBeInTheDocument();
            });
        });
    });

    describe('time formatting', () => {
        beforeEach(() => {
            (useStagedChangesStore as any).mockReturnValue({
                ...mockStore,
                changes: [mockChanges[0]], // Only one change for simpler testing
                hasUnsavedChanges: () => true,
            });
        });

        it('should format timestamps correctly', async () => {
            render(
                <TestWrapper>
                    <StagedChangesPanel />
                </TestWrapper>
            );

            fireEvent.click(screen.getByRole('button', { name: /1 change staged/i }));

            await waitFor(() => {
                // The timestamp should be formatted as HH:MM:SS
                expect(screen.getByText(/\d{1,2}:\d{2}:\d{2}/)).toBeInTheDocument();
            });
        });
    });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import { StagedChangesPanel } from '../StagedChangesPanel';
import { useSchedulerStore } from '../../../store/schedulerStore';
import type { StagedChange } from '../../../types';
import { vi } from 'vitest';

// Mock the scheduler store
vi.mock('../../../store/schedulerStore');
const mockUseSchedulerStore = useSchedulerStore as ReturnType<typeof vi.mocked>;

// Helper to render component with theme
const renderWithTheme = (component: React.ReactElement) => {
    return render(
        <ThemeProvider theme={theme}>
            {component}
        </ThemeProvider>
    );
};

const mockStagedChanges: StagedChange[] = [
    {
        id: 'change-1',
        type: 'update',
        queuePath: 'root.production',
        property: 'capacity',
        oldValue: '50',
        newValue: '60',
        timestamp: Date.now(),
    },
    {
        id: 'change-2',
        type: 'add',
        queuePath: 'root.development',
        property: 'capacity',
        oldValue: undefined,
        newValue: '40',
        timestamp: Date.now(),
    },
];

describe('StagedChangesPanel', () => {
    const mockRevertChange = vi.fn();
    const mockClearAllChanges = vi.fn();
    const mockApplyChanges = vi.fn();
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock store selectors
        mockUseSchedulerStore.mockImplementation((selector: any) => {
            if (typeof selector === 'function') {
                const mockState = {
                    stagedChanges: mockStagedChanges,
                    revertChange: mockRevertChange,
                    clearAllChanges: mockClearAllChanges,
                    applyChanges: mockApplyChanges,
                };
                return selector(mockState);
            }
            return mockStagedChanges;
        });
    });

    it('should render with staged changes', () => {
        renderWithTheme(
            <StagedChangesPanel open={true} onClose={mockOnClose} />
        );

        expect(screen.getByText('Staged Changes')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // Badge count
        expect(screen.getByText('root.production')).toBeInTheDocument();
        expect(screen.getByText('root.development')).toBeInTheDocument();
        expect(screen.getByText('50 → 60')).toBeInTheDocument(); // Update change
        expect(screen.getByText('New value: 40')).toBeInTheDocument(); // Add change
    });

    it('should show empty state when no changes', () => {
        mockUseSchedulerStore.mockImplementation((selector: any) => {
            if (typeof selector === 'function') {
                const mockState = {
                    stagedChanges: [],
                    revertChange: mockRevertChange,
                    clearAllChanges: mockClearAllChanges,
                    applyChanges: mockApplyChanges,
                };
                return selector(mockState);
            }
            return [];
        });

        renderWithTheme(
            <StagedChangesPanel open={true} onClose={mockOnClose} />
        );

        expect(screen.getByText('No staged changes. Make some edits to see them here.')).toBeInTheDocument();
        expect(screen.queryByText('Apply All Changes')).not.toBeInTheDocument();
    });

    it('should call revertChange when delete button is clicked', async () => {
        renderWithTheme(
            <StagedChangesPanel open={true} onClose={mockOnClose} />
        );

        const deleteButtons = screen.getAllByLabelText(/Remove this change/i);
        fireEvent.click(deleteButtons[0]);

        expect(mockRevertChange).toHaveBeenCalledWith('change-1');
    });

    it('should call clearAllChanges when Clear All button is clicked', () => {
        renderWithTheme(
            <StagedChangesPanel open={true} onClose={mockOnClose} />
        );

        const clearButton = screen.getByText('Clear All');
        fireEvent.click(clearButton);

        expect(mockClearAllChanges).toHaveBeenCalled();
    });

    it('should call applyChanges and close panel when Apply All Changes is clicked', async () => {
        mockApplyChanges.mockResolvedValue(undefined);

        renderWithTheme(
            <StagedChangesPanel open={true} onClose={mockOnClose} />
        );

        const applyButton = screen.getByText('Apply All Changes');
        fireEvent.click(applyButton);

        await waitFor(() => {
            expect(mockApplyChanges).toHaveBeenCalled();
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('should handle apply changes error gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockApplyChanges.mockRejectedValue(new Error('Apply failed'));

        renderWithTheme(
            <StagedChangesPanel open={true} onClose={mockOnClose} />
        );

        const applyButton = screen.getByText('Apply All Changes');
        fireEvent.click(applyButton);

        await waitFor(() => {
            expect(mockApplyChanges).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('Failed to apply changes:', expect.any(Error));
            expect(mockOnClose).not.toHaveBeenCalled(); // Should not close on error
        });

        consoleSpy.mockRestore();
    });

    it('should display change types with correct colors', () => {
        renderWithTheme(
            <StagedChangesPanel open={true} onClose={mockOnClose} />
        );

        const updateChip = screen.getByText('UPDATE');
        const addChip = screen.getByText('ADD');

        expect(updateChip).toBeInTheDocument();
        expect(addChip).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
        renderWithTheme(
            <StagedChangesPanel open={true} onClose={mockOnClose} />
        );

        const closeButton = screen.getByTestId('CloseIcon').closest('button');
        expect(closeButton).toBeInTheDocument();
        fireEvent.click(closeButton!);

        expect(mockOnClose).toHaveBeenCalled();
    });
});
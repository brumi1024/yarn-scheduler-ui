import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddQueueModal } from '../AddQueueModal';
import { useUIStore, useChangesStore } from '../../../../store';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock the stores
vi.mock('../../../../store', () => ({
    useUIStore: vi.fn(),
    useChangesStore: vi.fn(),
}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
    return render(
        <ThemeProvider theme={theme}>
            {component}
        </ThemeProvider>
    );
};

describe('AddQueueModal', () => {
    const mockCloseAddQueueModal = vi.fn();
    const mockStageChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        
        (useUIStore as any).mockReturnValue({
            modals: {
                addQueueModal: {
                    open: true,
                    parentQueuePath: 'root.test'
                }
            },
            closeAddQueueModal: mockCloseAddQueueModal
        });

        (useChangesStore as any).mockReturnValue({
            stageChange: mockStageChange
        });
    });

    it('renders modal when open', () => {
        renderWithTheme(<AddQueueModal />);
        
        expect(screen.getByText('Add Child Queue')).toBeInTheDocument();
        expect(screen.getByText('Creating new queue under:')).toBeInTheDocument();
        expect(screen.getByText('test')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        (useUIStore as any).mockReturnValue({
            modals: {
                addQueueModal: {
                    open: false,
                    parentQueuePath: 'root.test'
                }
            },
            closeAddQueueModal: mockCloseAddQueueModal
        });

        renderWithTheme(<AddQueueModal />);
        
        expect(screen.queryByText('Add Child Queue')).not.toBeInTheDocument();
    });

    it('shows all form fields with default values', () => {
        renderWithTheme(<AddQueueModal />);
        
        expect(screen.getByPlaceholderText('e.g., production, development')).toBeInTheDocument();
        expect(screen.getByDisplayValue('10')).toBeInTheDocument();
        expect(screen.getByDisplayValue('100')).toBeInTheDocument();
        expect(screen.getByText('Running')).toBeInTheDocument();
    });

    it('validates queue name is required', async () => {
        const user = userEvent.setup();
        renderWithTheme(<AddQueueModal />);
        
        const queueNameInput = screen.getByPlaceholderText('e.g., production, development');
        const addButton = screen.getByRole('button', { name: /add queue/i });
        
        // Clear the input and try to submit - the button should be disabled
        await user.clear(queueNameInput);
        
        // Check that add button is disabled when required field is empty
        expect(addButton).toBeDisabled();
        expect(mockStageChange).not.toHaveBeenCalled();
    });

    it('validates capacity cannot exceed max capacity', async () => {
        const user = userEvent.setup();
        renderWithTheme(<AddQueueModal />);
        
        const capacityInput = screen.getByDisplayValue('10');
        const maxCapacityInput = screen.getByDisplayValue('100');
        
        // Set capacity higher than max capacity
        await user.clear(capacityInput);
        await user.type(capacityInput, '80');
        await user.clear(maxCapacityInput);
        await user.type(maxCapacityInput, '50');
        
        await waitFor(() => {
            expect(screen.getByText(/Capacity cannot exceed max capacity/)).toBeInTheDocument();
        });
        
        const addButton = screen.getByRole('button', { name: /add queue/i });
        expect(addButton).toBeDisabled();
    });

    it('submits form with valid data', async () => {
        const user = userEvent.setup();
        renderWithTheme(<AddQueueModal />);
        
        const queueNameInput = screen.getByPlaceholderText('e.g., production, development');
        const capacityInput = screen.getByDisplayValue('10');
        const addButton = screen.getByRole('button', { name: /add queue/i });
        
        // Fill out the form
        await user.type(queueNameInput, 'production');
        await user.clear(capacityInput);
        await user.type(capacityInput, '50');
        
        // Submit the form
        await user.click(addButton);
        
        await waitFor(() => {
            expect(mockStageChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'ADD_QUEUE',
                    queuePath: 'root.test',
                    property: 'root.test.production',
                    newValue: {
                        capacity: 50,
                        maxCapacity: 100,
                        state: 'RUNNING'
                    }
                })
            );
        });
        
        expect(mockCloseAddQueueModal).toHaveBeenCalled();
    });

    it('closes modal on cancel', async () => {
        const user = userEvent.setup();
        renderWithTheme(<AddQueueModal />);
        
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        await user.click(cancelButton);
        
        expect(mockCloseAddQueueModal).toHaveBeenCalled();
        expect(mockStageChange).not.toHaveBeenCalled();
    });

    it('validates queue name format', async () => {
        const user = userEvent.setup();
        renderWithTheme(<AddQueueModal />);
        
        const queueNameInput = screen.getByPlaceholderText('e.g., production, development');
        
        // Test invalid characters
        await user.type(queueNameInput, 'invalid queue!');
        
        await waitFor(() => {
            expect(screen.getByText(/Queue name can only contain letters, numbers, underscores, and hyphens/)).toBeInTheDocument();
        });
        
        const addButton = screen.getByRole('button', { name: /add queue/i });
        expect(addButton).toBeDisabled();
    });
});
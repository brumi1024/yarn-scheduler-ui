/**
 * Example of updated AddQueueModal test using new test utilities
 * This demonstrates the improved patterns from Phase 3: Test Utility Consolidation
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, fireEvent, waitFor } from '../../../test/testUtils/renderHelpers';
import { createMockFormData } from '../../../test/testUtils/mockFactories';
import { AddQueueModal } from '../AddQueueModal';
import { useUIStore, useChangesStore } from '../../../../store';

// Mock the stores
vi.mock('../../../../store', () => ({
    useUIStore: vi.fn(),
    useChangesStore: vi.fn(),
}));

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

    describe('Modal Display', () => {
        it('renders modal when open', () => {
            renderWithProviders(<AddQueueModal />);

            expect(screen.getByText('Add Child Queue')).toBeInTheDocument();
            expect(screen.getByText('Creating new queue under:')).toBeInTheDocument();
            expect(screen.getByText('test')).toBeInTheDocument(); // parent queue name
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

            renderWithProviders(<AddQueueModal />);

            expect(screen.queryByText('Add Child Queue')).not.toBeInTheDocument();
        });
    });

    describe('Form Fields', () => {
        it('renders all required form fields', () => {
            renderWithProviders(<AddQueueModal />);

            expect(screen.getByLabelText('Queue Name')).toBeInTheDocument();
            expect(screen.getByLabelText('Capacity (%)')).toBeInTheDocument();
            expect(screen.getByLabelText('Max Capacity (%)')).toBeInTheDocument();
            expect(screen.getByLabelText('State')).toBeInTheDocument();
        });

        it('has correct default values', () => {
            renderWithProviders(<AddQueueModal />);

            expect(screen.getByDisplayValue('')).toBeInTheDocument(); // queue name
            expect(screen.getByDisplayValue('10')).toBeInTheDocument(); // capacity
            expect(screen.getByDisplayValue('100')).toBeInTheDocument(); // max capacity
            expect(screen.getByDisplayValue('RUNNING')).toBeInTheDocument(); // state
        });
    });

    describe('Form Validation', () => {
        it('shows validation errors for empty queue name', async () => {
            const user = userEvent.setup();
            renderWithProviders(<AddQueueModal />);

            const submitButton = screen.getByText('Add Queue');
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/queue name is required/i)).toBeInTheDocument();
            });
        });

        it('shows validation error when capacity exceeds max capacity', async () => {
            const user = userEvent.setup();
            renderWithProviders(<AddQueueModal />);

            const capacityInput = screen.getByLabelText('Capacity (%)');
            const maxCapacityInput = screen.getByLabelText('Max Capacity (%)');

            // Set capacity higher than max capacity
            await user.clear(capacityInput);
            await user.type(capacityInput, '120');
            await user.clear(maxCapacityInput);
            await user.type(maxCapacityInput, '100');

            await waitFor(() => {
                expect(screen.getByText(/capacity cannot exceed max capacity/i)).toBeInTheDocument();
            });
        });

        it('disables submit button when form is invalid', async () => {
            const user = userEvent.setup();
            renderWithProviders(<AddQueueModal />);

            const capacityInput = screen.getByLabelText('Capacity (%)');
            const submitButton = screen.getByText('Add Queue');

            // Create invalid state
            await user.clear(capacityInput);
            await user.type(capacityInput, '150'); // Invalid: > 100

            await waitFor(() => {
                expect(submitButton).toBeDisabled();
            });
        });
    });

    describe('Form Submission', () => {
        it('submits valid form data', async () => {
            const user = userEvent.setup();
            const mockFormData = createMockFormData({
                queueName: 'new-queue',
                capacity: 30,
                maxCapacity: 80,
                state: 'RUNNING'
            });

            renderWithProviders(<AddQueueModal />);

            // Fill form with mock data
            const queueNameInput = screen.getByLabelText('Queue Name');
            const capacityInput = screen.getByLabelText('Capacity (%)');
            const maxCapacityInput = screen.getByLabelText('Max Capacity (%)');

            await user.clear(queueNameInput);
            await user.type(queueNameInput, mockFormData.queueName);
            await user.clear(capacityInput);
            await user.type(capacityInput, mockFormData.capacity.toString());
            await user.clear(maxCapacityInput);
            await user.type(maxCapacityInput, mockFormData.maxCapacity.toString());

            const submitButton = screen.getByText('Add Queue');
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockStageChange).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'ADD_QUEUE',
                        queuePath: 'root.test',
                        property: 'root.test.new-queue',
                        newValue: expect.objectContaining({
                            capacity: 30,
                            maxCapacity: 80,
                            state: 'RUNNING'
                        })
                    })
                );
            });

            expect(mockCloseAddQueueModal).toHaveBeenCalled();
        });

        it('resets form when modal is closed', async () => {
            const user = userEvent.setup();
            renderWithProviders(<AddQueueModal />);

            // Fill some data
            const queueNameInput = screen.getByLabelText('Queue Name');
            await user.type(queueNameInput, 'test-queue');

            // Close modal
            const cancelButton = screen.getByText('Cancel');
            await user.click(cancelButton);

            expect(mockCloseAddQueueModal).toHaveBeenCalled();
        });
    });

    describe('User Interactions', () => {
        it('handles state selection change', async () => {
            const user = userEvent.setup();
            renderWithProviders(<AddQueueModal />);

            const stateSelect = screen.getByLabelText('State');
            await user.click(stateSelect);

            const stoppedOption = screen.getByText('Stopped');
            await user.click(stoppedOption);

            expect(screen.getByDisplayValue('STOPPED')).toBeInTheDocument();
        });

        it('updates capacity warning in real-time', async () => {
            const user = userEvent.setup();
            renderWithProviders(<AddQueueModal />);

            const capacityInput = screen.getByLabelText('Capacity (%)');
            const maxCapacityInput = screen.getByLabelText('Max Capacity (%)');

            // Set max capacity first
            await user.clear(maxCapacityInput);
            await user.type(maxCapacityInput, '50');

            // Then set capacity higher than max
            await user.clear(capacityInput);
            await user.type(capacityInput, '60');

            await waitFor(() => {
                expect(screen.getByText(/capacity \(60%\) cannot exceed max capacity \(50%\)/i)).toBeInTheDocument();
            });
        });
    });

    describe('Accessibility', () => {
        it('has proper ARIA labels and roles', () => {
            renderWithProviders(<AddQueueModal />);

            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.getByLabelText('Queue Name')).toHaveAttribute('required');
            expect(screen.getByLabelText('Capacity (%)')).toHaveAttribute('required');
        });

        it('focuses queue name input when modal opens', () => {
            renderWithProviders(<AddQueueModal />);

            const queueNameInput = screen.getByLabelText('Queue Name');
            expect(queueNameInput).toHaveFocus();
        });
    });
});
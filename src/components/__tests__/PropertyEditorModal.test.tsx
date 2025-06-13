import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropertyEditorModal } from '../PropertyEditorModal';
import type { Queue } from '../../types/Queue';

// Mock the dependencies
vi.mock('../PropertyFormField', () => ({
    PropertyFormField: ({ property, value, onChange, error }: any) => (
        <div data-testid={`property-field-${property.key}`}>
            <label>{property.label}</label>
            <input
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                data-testid={`input-${property.key}`}
            />
            {error && <span data-testid={`error-${property.key}`}>{error}</span>}
        </div>
    ),
}));

vi.mock('../AutoQueueCreationSection', () => ({
    AutoQueueCreationSection: ({ properties, formData, onChange }: any) => (
        <div data-testid="auto-queue-creation-section">
            {Object.entries(properties).map(([key, property]: [string, any]) => (
                <div key={key} data-testid={`auto-property-${key}`}>
                    <label>{property.label}</label>
                    <input
                        value={formData[property.key] || ''}
                        onChange={(e) => onChange(property.key, e.target.value)}
                        data-testid={`auto-input-${property.key}`}
                    />
                </div>
            ))}
        </div>
    ),
}));

// Mock ConfigService with factory function to avoid hoisting issues
vi.mock('../../config', () => ({
    ConfigService: {
        getInstance: vi.fn(() => ({
            getQueuePropertyGroups: vi.fn(() => [
                {
                    groupName: 'Resource Management',
                    properties: {
                        capacity: {
                            key: 'capacity',
                            label: 'Capacity',
                            type: 'capacity',
                            required: true,
                        },
                        'maximum-capacity': {
                            key: 'maximum-capacity',
                            label: 'Maximum Capacity',
                            type: 'capacity',
                            required: false,
                        },
                    },
                },
                {
                    groupName: 'Application Settings',
                    properties: {
                        'max-parallel-apps': {
                            key: 'max-parallel-apps',
                            label: 'Max Parallel Apps',
                            type: 'number',
                            required: false,
                        },
                        'ordering-policy': {
                            key: 'ordering-policy',
                            label: 'Ordering Policy',
                            type: 'select',
                            required: false,
                        },
                    },
                },
                {
                    groupName: 'Auto-Queue Creation',
                    properties: {
                        'auto-create-child-queue.enabled': {
                            key: 'auto-create-child-queue.enabled',
                            label: 'Enable Auto-Creation',
                            type: 'boolean',
                            required: false,
                        },
                    },
                },
            ]),
            validateProperty: vi.fn((key: string, value: any) => {
                // Mock validation logic
                if (key === 'capacity' && (!value || value === '')) {
                    return { valid: false, error: 'Capacity is required' };
                }
                if (key === 'maximum-capacity' && value && parseInt(value) > 100) {
                    return { valid: false, error: 'Maximum capacity cannot exceed 100%' };
                }
                return { valid: true };
            }),
        })),
    },
}));

describe('PropertyEditorModal', () => {
    const mockQueue: Queue = {
        queueName: 'test-queue',
        capacity: 25,
        usedCapacity: 10,
        maxCapacity: 50,
        absoluteCapacity: 0.25,
        absoluteUsedCapacity: 0.1,
        absoluteMaxCapacity: 0.5,
        state: 'RUNNING',
        numApplications: 5,
        resourcesUsed: { memory: 1024, vCores: 2 },
        userLimitFactor: 1.5,
        maxApplications: 100,
        orderingPolicy: 'fifo',
        preemptionDisabled: false,
        autoCreateChildQueueEnabled: false,
    };

    const defaultProps = {
        open: true,
        onClose: vi.fn(),
        queue: mockQueue,
        onSave: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        it('renders when open with queue data', () => {
            render(<PropertyEditorModal {...defaultProps} />);

            expect(screen.getByText('Edit Queue Properties: test-queue')).toBeInTheDocument();
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        it('does not render when closed', () => {
            render(<PropertyEditorModal {...defaultProps} open={false} />);

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('does not render when queue is null', () => {
            render(<PropertyEditorModal {...defaultProps} queue={null} />);

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('renders all property group tabs', () => {
            render(<PropertyEditorModal {...defaultProps} />);

            // Use getByRole to find tabs specifically
            expect(screen.getByRole('tab', { name: 'Resource Management' })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: 'Application Settings' })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: 'Auto-Queue Creation' })).toBeInTheDocument();
        });
    });

    describe('Form Initialization', () => {
        it('initializes form data with queue properties', () => {
            render(<PropertyEditorModal {...defaultProps} />);

            // Check that form fields are populated with queue data
            expect(screen.getByDisplayValue('25%')).toBeInTheDocument(); // capacity
            expect(screen.getByDisplayValue('50%')).toBeInTheDocument(); // maximum-capacity
        });

        it('handles queue without optional properties', () => {
            const minimalQueue = {
                ...mockQueue,
                userLimitFactor: undefined,
                maxApplications: undefined,
                orderingPolicy: undefined,
            };

            render(<PropertyEditorModal {...defaultProps} queue={minimalQueue} />);

            // Should render without errors even when properties are missing
            expect(screen.getByText('Edit Queue Properties: test-queue')).toBeInTheDocument();
            // The first tab should show capacity properties
            expect(screen.getByTestId('property-field-capacity')).toBeInTheDocument();
        });
    });

    describe('Tab Navigation', () => {
        it('switches between tabs', async () => {
            const user = userEvent.setup();
            render(<PropertyEditorModal {...defaultProps} />);

            // Initially shows first tab content
            expect(screen.getByTestId('property-field-capacity')).toBeInTheDocument();

            // Click on Application Settings tab
            await user.click(screen.getByText('Application Settings'));

            // Should show second tab content
            expect(screen.getByTestId('property-field-max-parallel-apps')).toBeInTheDocument();
        });

        it('renders auto-queue creation section for that tab', async () => {
            const user = userEvent.setup();
            render(<PropertyEditorModal {...defaultProps} />);

            await user.click(screen.getByText('Auto-Queue Creation'));

            expect(screen.getByTestId('auto-queue-creation-section')).toBeInTheDocument();
        });
    });

    describe('Form Validation', () => {
        it('validates fields on change', async () => {
            const user = userEvent.setup();
            render(<PropertyEditorModal {...defaultProps} />);

            const capacityInput = screen.getByTestId('input-capacity');

            // Clear the field to trigger validation error
            await user.clear(capacityInput);

            await waitFor(() => {
                expect(screen.getByTestId('error-capacity')).toHaveTextContent('Capacity is required');
            });
        });

        it('shows validation error for invalid maximum capacity', async () => {
            const user = userEvent.setup();
            render(<PropertyEditorModal {...defaultProps} />);

            const maxCapacityInput = screen.getByTestId('input-maximum-capacity');

            // Set invalid value
            await user.clear(maxCapacityInput);
            await user.type(maxCapacityInput, '150%');

            await waitFor(() => {
                expect(screen.getByTestId('error-maximum-capacity')).toHaveTextContent(
                    'Maximum capacity cannot exceed 100%'
                );
            });
        });

        it('shows global validation error when there are field errors', async () => {
            const user = userEvent.setup();
            render(<PropertyEditorModal {...defaultProps} />);

            // Trigger a validation error
            const capacityInput = screen.getByTestId('input-capacity');
            await user.clear(capacityInput);

            await waitFor(() => {
                expect(screen.getByText('Please fix the validation errors before saving.')).toBeInTheDocument();
            });
        });

        it('disables save button when there are errors', async () => {
            const user = userEvent.setup();
            render(<PropertyEditorModal {...defaultProps} />);

            // Trigger a validation error
            const capacityInput = screen.getByTestId('input-capacity');
            await user.clear(capacityInput);

            await waitFor(() => {
                const saveButton = screen.getByText('Save Changes');
                expect(saveButton).toBeDisabled();
            });
        });
    });

    describe('Change Tracking', () => {
        it('tracks when form has changes', async () => {
            const user = userEvent.setup();
            render(<PropertyEditorModal {...defaultProps} />);

            // Initially save button should be disabled (no changes)
            expect(screen.getByText('Save Changes')).toBeDisabled();

            // Make a change
            const capacityInput = screen.getByTestId('input-capacity');
            await user.clear(capacityInput);
            await user.type(capacityInput, '30%');

            await waitFor(() => {
                expect(screen.getByText('Save Changes')).not.toBeDisabled();
            });
        });

        it('shows confirmation dialog when closing with unsaved changes', async () => {
            const user = userEvent.setup();
            const mockOnClose = vi.fn();

            // Mock window.confirm
            window.confirm = vi.fn(() => false);

            render(<PropertyEditorModal {...defaultProps} onClose={mockOnClose} />);

            // Make a change
            const capacityInput = screen.getByTestId('input-capacity');
            await user.type(capacityInput, '5');

            // Try to close (look for close icon button)
            await user.click(screen.getByTestId('CloseIcon').closest('button')!);

            expect(window.confirm).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to close?');
            expect(mockOnClose).not.toHaveBeenCalled();
        });

        it('allows closing without confirmation when no changes', async () => {
            const user = userEvent.setup();
            const mockOnClose = vi.fn();

            render(<PropertyEditorModal {...defaultProps} onClose={mockOnClose} />);

            await user.click(screen.getByTestId('CloseIcon').closest('button')!);

            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    describe('Save Functionality', () => {
        it('calls onSave with form data when valid', async () => {
            const user = userEvent.setup();
            const mockOnSave = vi.fn();
            const mockOnClose = vi.fn();

            render(<PropertyEditorModal {...defaultProps} onSave={mockOnSave} onClose={mockOnClose} />);

            // Make a valid change
            const capacityInput = screen.getByTestId('input-capacity');
            await user.clear(capacityInput);
            await user.type(capacityInput, '30%');

            // Save
            await user.click(screen.getByText('Save Changes'));

            expect(mockOnSave).toHaveBeenCalledWith(
                'test-queue',
                expect.objectContaining({
                    capacity: '30%',
                })
            );
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('prevents save when there are validation errors', async () => {
            const user = userEvent.setup();
            const mockOnSave = vi.fn();

            render(<PropertyEditorModal {...defaultProps} onSave={mockOnSave} />);

            // Create validation error by clearing required field
            const capacityInput = screen.getByTestId('input-capacity');
            await user.clear(capacityInput);

            // Wait for validation error to appear
            await waitFor(() => {
                expect(screen.getByTestId('error-capacity')).toBeInTheDocument();
            });

            // Save button should be disabled when there are errors
            const saveButton = screen.getByText('Save Changes');
            expect(saveButton).toBeDisabled();

            expect(mockOnSave).not.toHaveBeenCalled();
        });

        it('performs final validation before save', async () => {
            const user = userEvent.setup();
            const mockOnSave = vi.fn();

            render(<PropertyEditorModal {...defaultProps} onSave={mockOnSave} />);

            // Make a change
            const capacityInput = screen.getByTestId('input-capacity');
            await user.clear(capacityInput);
            await user.type(capacityInput, '30%');

            // Try to save
            await user.click(screen.getByText('Save Changes'));

            // With valid data, save should be called
            expect(mockOnSave).toHaveBeenCalled();
        });
    });

    describe('Component Updates', () => {
        it('reinitializes form when queue changes', async () => {
            const { rerender } = render(<PropertyEditorModal {...defaultProps} />);

            // Initial queue has 25% capacity
            expect(screen.getByDisplayValue('25%')).toBeInTheDocument();

            // Update queue
            const newQueue = { ...mockQueue, capacity: 40 };
            rerender(<PropertyEditorModal {...defaultProps} queue={newQueue} />);

            await waitFor(() => {
                expect(screen.getByDisplayValue('40%')).toBeInTheDocument();
            });
        });

        it('resets form when modal reopens', async () => {
            const { rerender } = render(<PropertyEditorModal {...defaultProps} />);

            // Make changes
            const user = userEvent.setup();
            const capacityInput = screen.getByTestId('input-capacity');
            await user.clear(capacityInput);
            await user.type(capacityInput, '99%');

            // Close modal
            rerender(<PropertyEditorModal {...defaultProps} open={false} />);

            // Reopen modal
            rerender(<PropertyEditorModal {...defaultProps} open={true} />);

            // Should be back to original value
            expect(screen.getByDisplayValue('25%')).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('handles missing queue properties gracefully', () => {
            const incompleteQueue = {
                queueName: 'incomplete-queue',
                capacity: 10,
                usedCapacity: 0,
                maxCapacity: 100,
                absoluteCapacity: 0.1,
                absoluteUsedCapacity: 0,
                absoluteMaxCapacity: 1,
                state: 'RUNNING' as const,
                numApplications: 0,
                resourcesUsed: { memory: 0, vCores: 0 },
            };

            render(<PropertyEditorModal {...defaultProps} queue={incompleteQueue} />);

            // Should render without errors and use defaults
            expect(screen.getByText('Edit Queue Properties: incomplete-queue')).toBeInTheDocument();
        });

        it('handles config service validation gracefully', async () => {
            const user = userEvent.setup();

            render(<PropertyEditorModal {...defaultProps} />);

            // Should not crash when making changes
            const capacityInput = screen.getByTestId('input-capacity');
            await user.type(capacityInput, '5');

            // Should still render the component
            expect(screen.getByText('Edit Queue Properties: test-queue')).toBeInTheDocument();
        });
    });
});

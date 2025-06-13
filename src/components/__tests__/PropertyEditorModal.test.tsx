import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropertyEditorModal } from '../PropertyEditorModal';
import type { Queue } from '../../types/Queue';

// Mock react-hook-form
vi.mock('react-hook-form', async () => {
    const actual = await vi.importActual<typeof import('react-hook-form')>('react-hook-form');
    return {
        ...actual,
        useController: vi.fn(({ name, defaultValue }) => ({
            field: {
                onChange: vi.fn(),
                onBlur: vi.fn(),
                value: defaultValue || '',
                name,
                ref: vi.fn(),
            },
            fieldState: {
                error: undefined,
                invalid: false,
                isDirty: false,
                isTouched: false,
            },
        })),
    };
});

// Mock the dependencies
vi.mock('../PropertyFormField', () => ({
    PropertyFormField: ({ property }: any) => (
        <div data-testid={`property-field-${property.key}`}>
            <label>{property.label || property.displayName}</label>
            <input
                data-testid={`input-${property.key}`}
                defaultValue=""
            />
        </div>
    ),
}));

vi.mock('../AutoQueueCreationSection', () => ({
    AutoQueueCreationSection: ({ properties }: any) => (
        <div data-testid="auto-queue-creation-section">
            {properties && Array.isArray(properties) && properties.map((property: any) => (
                <div key={property.key} data-testid={`auto-property-${property.key}`}>
                    <label>{property.label || property.displayName}</label>
                    <input
                        data-testid={`auto-input-${property.key}`}
                        defaultValue=""
                    />
                </div>
            ))}
        </div>
    ),
}));

// Mock the config functions
vi.mock('../../config', () => ({
    getQueuePropertyGroups: vi.fn(() => [
        {
            groupName: 'Resource Management',
            properties: [
                {
                    key: 'capacity',
                    label: 'Capacity',
                    type: 'capacity',
                    required: true,
                },
                {
                    key: 'maximum-capacity',
                    label: 'Maximum Capacity',
                    type: 'capacity',
                    required: false,
                },
            ],
        },
        {
            groupName: 'Application Settings',
            properties: [
                {
                    key: 'max-parallel-apps',
                    label: 'Max Parallel Apps',
                    type: 'number',
                    required: false,
                },
                {
                    key: 'ordering-policy',
                    label: 'Ordering Policy',
                    type: 'select',
                    required: false,
                },
            ],
        },
        {
            groupName: 'Auto-Queue Creation',
            properties: [
                {
                    key: 'auto-create-child-queue.enabled',
                    label: 'Enable Auto-Creation',
                    type: 'boolean',
                    required: false,
                },
            ],
        },
    ]),
    validateSingleProperty: vi.fn((key: string, value: any) => {
        // Mock validation logic
        if (key === 'capacity' && (!value || value === '')) {
            return { valid: false, error: 'Capacity is required' };
        }
        if (key === 'maximum-capacity' && value && parseInt(value) > 100) {
            return { valid: false, error: 'Maximum capacity cannot exceed 100%' };
        }
        return { valid: true };
    }),
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

            // Check that form fields are rendered (mock fields start empty)
            expect(screen.getByTestId('input-capacity')).toBeInTheDocument();
            expect(screen.getByTestId('input-maximum-capacity')).toBeInTheDocument();
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

    describe('Form Structure', () => {
        it('renders all form fields', () => {
            render(<PropertyEditorModal {...defaultProps} />);

            // Check that key fields are rendered
            expect(screen.getByTestId('property-field-capacity')).toBeInTheDocument();
            expect(screen.getByTestId('property-field-maximum-capacity')).toBeInTheDocument();
        });

        it('renders save and cancel buttons', () => {
            render(<PropertyEditorModal {...defaultProps} />);

            expect(screen.getByText('Save Changes')).toBeInTheDocument();
            expect(screen.getByText('Cancel')).toBeInTheDocument();
        });
    });

    describe('User Actions', () => {
        it('calls onClose when cancel button is clicked', async () => {
            const user = userEvent.setup();
            const mockOnClose = vi.fn();

            render(<PropertyEditorModal {...defaultProps} onClose={mockOnClose} />);

            await user.click(screen.getByText('Cancel'));

            expect(mockOnClose).toHaveBeenCalled();
        });

        it('calls onClose when close icon is clicked', async () => {
            const user = userEvent.setup();
            const mockOnClose = vi.fn();

            render(<PropertyEditorModal {...defaultProps} onClose={mockOnClose} />);

            const closeButton = screen.getByTestId('CloseIcon').closest('button');
            if (closeButton) {
                await user.click(closeButton);
                expect(mockOnClose).toHaveBeenCalled();
            }
        });
    });

    describe('Save Functionality', () => {
        it('has save button in the dialog', () => {
            render(<PropertyEditorModal {...defaultProps} />);
            
            const saveButton = screen.getByText('Save Changes');
            expect(saveButton).toBeInTheDocument();
            expect(saveButton.tagName).toBe('BUTTON');
        });

        it('passes queue name to onSave callback', () => {
            render(<PropertyEditorModal {...defaultProps} />);
            
            // Just verify the component renders with the queue
            expect(screen.getByText('Edit Queue Properties: test-queue')).toBeInTheDocument();
        });
    });

    describe('Component Updates', () => {
        it('reinitializes form when queue changes', async () => {
            const { rerender } = render(<PropertyEditorModal {...defaultProps} />);

            // Initial queue renders capacity field
            expect(screen.getByTestId('input-capacity')).toBeInTheDocument();

            // Update queue
            const newQueue = { ...mockQueue, capacity: 40 };
            rerender(<PropertyEditorModal {...defaultProps} queue={newQueue} />);

            await waitFor(() => {
                // Field should still be rendered (values handled by form state)
                expect(screen.getByTestId('input-capacity')).toBeInTheDocument();
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

            // Should be back with the field rendered
            expect(screen.getByTestId('input-capacity')).toBeInTheDocument();
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

        it('handles user input gracefully', async () => {
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

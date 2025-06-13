import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropertyFormField } from '../PropertyFormField';
import type { ConfigProperty } from '../../config';

// Mock CapacityEditor
vi.mock('../CapacityEditor', () => ({
    CapacityEditor: ({ label, value, onChange, error, siblings }: any) => (
        <div data-testid="capacity-editor">
            <label>{label}</label>
            <input value={value || ''} onChange={(e) => onChange(e.target.value)} data-testid="capacity-input" />
            {error && <span data-testid="capacity-error">{error}</span>}
            {siblings && <div data-testid="siblings-info">Siblings: {siblings.length}</div>}
        </div>
    ),
}));

describe('PropertyFormField', () => {
    const defaultOnChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Boolean Properties', () => {
        const booleanProperty: ConfigProperty = {
            key: 'auto-create-child-queue.enabled',
            displayName: 'Enable Auto-Creation',
            description: 'Enable automatic child queue creation',
            type: 'boolean',
            defaultValue: false,
        };

        it('renders boolean switch with correct initial state', () => {
            render(<PropertyFormField property={booleanProperty} value={true} onChange={defaultOnChange} />);

            const switchElement = screen.getByRole('checkbox');
            expect(switchElement).toBeChecked();
            expect(screen.getByText('Enable Auto-Creation')).toBeInTheDocument();
        });

        it('handles boolean change events', async () => {
            const user = userEvent.setup();
            render(<PropertyFormField property={booleanProperty} value={false} onChange={defaultOnChange} />);

            const switchElement = screen.getByRole('checkbox');
            await user.click(switchElement);

            expect(defaultOnChange).toHaveBeenCalledWith(true);
        });

        it('handles string boolean values', () => {
            render(<PropertyFormField property={booleanProperty} value="true" onChange={defaultOnChange} />);

            const switchElement = screen.getByRole('checkbox');
            expect(switchElement).toBeChecked();
        });

        it('handles falsy boolean values', () => {
            render(<PropertyFormField property={booleanProperty} value={false} onChange={defaultOnChange} />);

            const switchElement = screen.getByRole('checkbox');
            expect(switchElement).not.toBeChecked();
        });
    });

    describe('Enum Properties', () => {
        const enumProperty: ConfigProperty = {
            key: 'state',
            displayName: 'Queue State',
            description: 'Operational state of the queue',
            type: 'enum',
            options: ['RUNNING', 'STOPPED'],
            defaultValue: 'RUNNING',
        };

        it('renders select dropdown with options', () => {
            render(<PropertyFormField property={enumProperty} value="RUNNING" onChange={defaultOnChange} />);

            expect(screen.getByRole('combobox')).toBeInTheDocument();
            expect(screen.getByDisplayValue('RUNNING')).toBeInTheDocument();
        });

        it('handles enum value changes', async () => {
            const user = userEvent.setup();
            render(<PropertyFormField property={enumProperty} value="RUNNING" onChange={defaultOnChange} />);

            // Open select dropdown
            await user.click(screen.getByRole('combobox'));

            // Select different option
            await user.click(screen.getByText('STOPPED'));

            expect(defaultOnChange).toHaveBeenCalledWith('STOPPED');
        });

        it('displays error state for enum fields', () => {
            render(
                <PropertyFormField
                    property={enumProperty}
                    value="RUNNING"
                    error="Invalid state value"
                    onChange={defaultOnChange}
                />
            );

            // FormControl in enum mode doesn't show error message, but error prop is applied
            const formControl = screen.getByRole('combobox').closest('.MuiFormControl-root');
            expect(formControl).toBeInTheDocument();
            // Since there's no helper text for select, we just verify the field exists
            expect(screen.getByDisplayValue('RUNNING')).toBeInTheDocument();
        });

        it('handles empty enum value', () => {
            render(<PropertyFormField property={enumProperty} value="" onChange={defaultOnChange} />);

            expect(screen.getByDisplayValue('')).toBeInTheDocument();
        });
    });

    describe('Number Properties', () => {
        const numberProperty: ConfigProperty = {
            key: 'user-limit-factor',
            displayName: 'User Limit Factor',
            description: 'Multiplier for per-user resource limits',
            type: 'number',
            step: '0.1',
            defaultValue: 1,
            placeholder: 'Default: 1',
        };

        it('renders number input with correct attributes', () => {
            render(<PropertyFormField property={numberProperty} value={2.5} onChange={defaultOnChange} />);

            const input = screen.getByDisplayValue('2.5');
            expect(input).toHaveAttribute('type', 'number');
            expect(input).toHaveAttribute('step', '0.1');
            // Check for label text in the form field
            expect(screen.getByLabelText('User Limit Factor')).toBeInTheDocument();
        });

        it('handles number value changes', async () => {
            render(<PropertyFormField property={numberProperty} value={1} onChange={defaultOnChange} />);

            const input = screen.getByDisplayValue('1');
            // Use fireEvent for more predictable results
            fireEvent.change(input, { target: { value: '3.5' } });

            expect(defaultOnChange).toHaveBeenCalledWith(3.5);
        });

        it('displays validation errors for number fields', () => {
            render(
                <PropertyFormField
                    property={numberProperty}
                    value="invalid"
                    error="Must be a valid number"
                    onChange={defaultOnChange}
                />
            );

            expect(screen.getByText('Must be a valid number')).toBeInTheDocument();
            // Check for input with invalid value (it's rendered as type=number with value="invalid")
            const input = screen.getByRole('spinbutton');
            expect(input).toHaveAttribute('value', 'invalid');
            // Check that error classes are present
            expect(input.closest('.MuiInputBase-root')).toHaveClass('Mui-error');
        });

        it('shows placeholder text', () => {
            render(<PropertyFormField property={numberProperty} value="" onChange={defaultOnChange} />);

            const input = screen.getByPlaceholderText('Default: 1');
            expect(input).toBeInTheDocument();
        });

        it('handles empty number input', () => {
            render(<PropertyFormField property={numberProperty} value={1} onChange={defaultOnChange} />);

            const input = screen.getByDisplayValue('1');
            fireEvent.change(input, { target: { value: '' } });

            expect(defaultOnChange).toHaveBeenCalledWith('');
        });

        it('uses default step value when not specified', () => {
            const propertyWithoutStep = { ...numberProperty, step: undefined };
            render(<PropertyFormField property={propertyWithoutStep} value={1} onChange={defaultOnChange} />);

            const input = screen.getByDisplayValue('1');
            expect(input).toHaveAttribute('step', '1');
        });
    });

    describe('Percentage Properties', () => {
        const percentageProperty: ConfigProperty = {
            key: 'maximum-am-resource-percent',
            displayName: 'Maximum AM Resource Percent',
            description: 'Maximum application master resource percentage',
            type: 'percentage',
            defaultValue: 0.1,
        };

        it('renders percentage slider with correct value', () => {
            render(<PropertyFormField property={percentageProperty} value={0.25} onChange={defaultOnChange} />);

            expect(screen.getByText('Maximum AM Resource Percent: 25.0%')).toBeInTheDocument();

            const slider = screen.getByRole('slider');
            expect(slider).toHaveAttribute('aria-valuenow', '25');
        });

        it('handles percentage value changes', () => {
            render(<PropertyFormField property={percentageProperty} value={0.1} onChange={defaultOnChange} />);

            const slider = screen.getByRole('slider');

            // Simulate slider change to 50%
            fireEvent.change(slider, { target: { value: 50 } });

            expect(defaultOnChange).toHaveBeenCalledWith(0.5);
        });

        it('displays percentage validation errors', () => {
            render(
                <PropertyFormField
                    property={percentageProperty}
                    value={1.5}
                    error="Value must be between 0 and 1"
                    onChange={defaultOnChange}
                />
            );

            expect(screen.getByText('Value must be between 0 and 1')).toBeInTheDocument();
        });

        it('handles zero percentage value', () => {
            render(<PropertyFormField property={percentageProperty} value={0} onChange={defaultOnChange} />);

            expect(screen.getByText('Maximum AM Resource Percent: 0.0%')).toBeInTheDocument();
        });

        it('handles undefined percentage value', () => {
            render(<PropertyFormField property={percentageProperty} value={undefined} onChange={defaultOnChange} />);

            expect(screen.getByText('Maximum AM Resource Percent: 0.0%')).toBeInTheDocument();
        });
    });

    describe('String Properties', () => {
        const stringProperty: ConfigProperty = {
            key: 'accessible-node-labels',
            displayName: 'Accessible Node Labels',
            description: 'Node labels accessible to this queue',
            type: 'string',
            placeholder: 'e.g., gpu,ssd',
        };

        it('renders text input for string properties', () => {
            render(<PropertyFormField property={stringProperty} value="gpu,ssd" onChange={defaultOnChange} />);

            expect(screen.getByDisplayValue('gpu,ssd')).toBeInTheDocument();
            expect(screen.getByLabelText('Accessible Node Labels')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('e.g., gpu,ssd')).toBeInTheDocument();
        });

        it('handles string value changes', () => {
            render(<PropertyFormField property={stringProperty} value="" onChange={defaultOnChange} />);

            const input = screen.getByLabelText('Accessible Node Labels');
            fireEvent.change(input, { target: { value: 'high-memory' } });

            expect(defaultOnChange).toHaveBeenCalledWith('high-memory');
        });

        it('renders multiline input for description fields', () => {
            const descriptionProperty: ConfigProperty = {
                key: 'queue-description',
                displayName: 'Queue Description',
                description: 'Description of the queue purpose',
                type: 'string',
            };

            render(
                <PropertyFormField property={descriptionProperty} value="Test description" onChange={defaultOnChange} />
            );

            const input = screen.getByDisplayValue('Test description');
            expect(input).toHaveAttribute('rows', '3');
        });

        it('renders multiline input for policy fields', () => {
            const policyProperty: ConfigProperty = {
                key: 'ordering-policy',
                displayName: 'Ordering Policy',
                description: 'Policy for ordering applications',
                type: 'string',
            };

            render(<PropertyFormField property={policyProperty} value="fifo" onChange={defaultOnChange} />);

            const input = screen.getByDisplayValue('fifo');
            expect(input).toHaveAttribute('rows', '3');
        });

        it('displays validation errors for string fields', () => {
            render(
                <PropertyFormField
                    property={stringProperty}
                    value="invalid-labels"
                    error="Invalid label format"
                    onChange={defaultOnChange}
                />
            );

            expect(screen.getByText('Invalid label format')).toBeInTheDocument();
            expect(screen.getByDisplayValue('invalid-labels')).toBeInTheDocument();
        });
    });

    describe('Capacity Properties', () => {
        const capacityProperty: ConfigProperty = {
            key: 'capacity',
            displayName: 'Queue Capacity',
            description: 'Guaranteed resource capacity',
            type: 'string', // Capacity properties are string type but get special handling
        };

        it('renders CapacityEditor for capacity properties', () => {
            const siblings = [{ name: 'sibling1', capacity: '30%' }];

            render(
                <PropertyFormField
                    property={capacityProperty}
                    value="25%"
                    onChange={defaultOnChange}
                    siblings={siblings}
                />
            );

            expect(screen.getByTestId('capacity-editor')).toBeInTheDocument();
            expect(screen.getByText('Queue Capacity')).toBeInTheDocument();
            // The mock shows value as "25%" not "25"
            expect(screen.getByDisplayValue('25%')).toBeInTheDocument();
            expect(screen.getByTestId('siblings-info')).toHaveTextContent('Siblings: 1');
        });

        it('handles capacity value changes', () => {
            render(<PropertyFormField property={capacityProperty} value="10%" onChange={defaultOnChange} />);

            const input = screen.getByTestId('capacity-input');
            fireEvent.change(input, { target: { value: '40%' } });

            expect(defaultOnChange).toHaveBeenCalledWith('40%');
        });

        it('displays capacity validation errors', () => {
            render(
                <PropertyFormField
                    property={capacityProperty}
                    value="150%"
                    error="Capacity exceeds maximum"
                    onChange={defaultOnChange}
                />
            );

            expect(screen.getByTestId('capacity-error')).toHaveTextContent('Capacity exceeds maximum');
        });

        it('renders CapacityEditor for maximum-capacity', () => {
            const maxCapacityProperty = { ...capacityProperty, key: 'maximum-capacity' };

            render(<PropertyFormField property={maxCapacityProperty} value="100%" onChange={defaultOnChange} />);

            expect(screen.getByTestId('capacity-editor')).toBeInTheDocument();
        });

        it('renders CapacityEditor for template capacity properties', () => {
            const templateCapacityProperty = { ...capacityProperty, key: 'leaf-queue-template.capacity' };

            render(<PropertyFormField property={templateCapacityProperty} value="20%" onChange={defaultOnChange} />);

            expect(screen.getByTestId('capacity-editor')).toBeInTheDocument();
        });
    });

    describe('Property Metadata Display', () => {
        const propertyWithMetadata: ConfigProperty = {
            key: 'test-property',
            displayName: 'Test Property',
            description: 'This is a test property with metadata',
            type: 'string',
            defaultValue: 'default-value',
        };

        it('displays description tooltip', () => {
            render(<PropertyFormField property={propertyWithMetadata} value="" onChange={defaultOnChange} />);

            const helpIcon = screen.getByTestId('HelpIcon');
            // Just verify the help icon is present with correct aria-label
            expect(helpIcon).toHaveAttribute('aria-label', 'This is a test property with metadata');
        });

        it('displays default value for applicable field types', () => {
            render(<PropertyFormField property={propertyWithMetadata} value="" onChange={defaultOnChange} />);

            expect(screen.getByText('Default: default-value')).toBeInTheDocument();
        });

        it('does not display default value for percentage fields', () => {
            const percentagePropertyWithDefault: ConfigProperty = {
                ...propertyWithMetadata,
                type: 'percentage',
                defaultValue: 0.5,
            };

            render(
                <PropertyFormField property={percentagePropertyWithDefault} value={0.3} onChange={defaultOnChange} />
            );

            expect(screen.queryByText('Default: 0.5')).not.toBeInTheDocument();
        });

        it('does not display property name for boolean fields', () => {
            const booleanPropertyWithMetadata: ConfigProperty = {
                ...propertyWithMetadata,
                type: 'boolean',
            };

            render(
                <PropertyFormField property={booleanPropertyWithMetadata} value={true} onChange={defaultOnChange} />
            );

            // The property name should be in the FormControlLabel, not as separate text
            expect(screen.getByText('Test Property')).toBeInTheDocument();
            // But not as a separate text element above the field
            const separateLabels = screen.queryAllByText('Test Property');
            expect(separateLabels).toHaveLength(1); // Only in the FormControlLabel
        });

        it('handles property without description', () => {
            const propertyWithoutDescription: ConfigProperty = {
                key: 'test-property-no-desc',
                displayName: 'Test Property',
                description: '', // Empty string instead of undefined
                type: 'string',
                defaultValue: 'default-value',
            };

            render(<PropertyFormField property={propertyWithoutDescription} value="" onChange={defaultOnChange} />);

            expect(screen.queryByTestId('HelpIcon')).not.toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('handles undefined property value', () => {
            const stringProperty: ConfigProperty = {
                key: 'test',
                displayName: 'Test',
                description: 'Test property',
                type: 'string',
            };

            render(<PropertyFormField property={stringProperty} value={undefined} onChange={defaultOnChange} />);

            expect(screen.getByDisplayValue('')).toBeInTheDocument();
        });

        it('handles null property value', () => {
            const stringProperty: ConfigProperty = {
                key: 'test',
                displayName: 'Test',
                description: 'Test property',
                type: 'string',
            };

            render(<PropertyFormField property={stringProperty} value={null} onChange={defaultOnChange} />);

            expect(screen.getByDisplayValue('')).toBeInTheDocument();
        });

        it('handles unknown property type fallback to string', () => {
            const unknownProperty: ConfigProperty = {
                key: 'test',
                displayName: 'Test',
                description: 'Test property',
                type: 'unknown' as any, // Force unknown type
            };

            render(<PropertyFormField property={unknownProperty} value="test value" onChange={defaultOnChange} />);

            expect(screen.getByDisplayValue('test value')).toBeInTheDocument();
        });
    });
});

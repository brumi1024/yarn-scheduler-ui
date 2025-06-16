import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { PropertyFormField } from '../forms/PropertyFormField';
import type { PropertyDefinition } from '../../config';

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

// Helper component to wrap PropertyFormField with FormProvider
const PropertyFormFieldWrapper = ({
    property,
    defaultValue,
    siblings,
    onCustomChange,
}: {
    property: PropertyDefinition;
    defaultValue?: any;
    siblings?: Array<{ name: string; capacity: string }>;
    onCustomChange?: (value: any) => void;
}) => {
    const form = useForm({
        defaultValues: {
            [property.key]: defaultValue,
        },
    });

    return (
        <FormProvider {...form}>
            <PropertyFormField
                property={property}
                control={form.control}
                name={property.key}
                siblings={siblings}
                onCustomChange={onCustomChange}
            />
        </FormProvider>
    );
};

describe('PropertyFormField', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Boolean Properties', () => {
        const booleanProperty: PropertyDefinition = {
            key: 'auto-create-child-queue.enabled',
            label: 'Enable Auto-Creation',
            description: 'Enable automatic child queue creation',
            type: 'boolean',
            defaultValue: false,
            validation: z.boolean(),
            group: 'auto-creation',
            getValueFromQueue: (queue: any) => queue['auto-create-child-queue.enabled'],
        };

        it('renders boolean switch with correct initial state', () => {
            render(<PropertyFormFieldWrapper property={booleanProperty} defaultValue={true} />);

            const switchElement = screen.getByRole('checkbox');
            expect(switchElement).toBeChecked();
            expect(screen.getByText('Enable Auto-Creation')).toBeInTheDocument();
        });

        it('handles boolean change events', async () => {
            const user = userEvent.setup();
            render(<PropertyFormFieldWrapper property={booleanProperty} defaultValue={false} />);

            const switchElement = screen.getByRole('checkbox');
            await user.click(switchElement);

            expect(switchElement).toBeChecked();
        });

        it('handles string boolean values', () => {
            render(<PropertyFormFieldWrapper property={booleanProperty} defaultValue="true" />);

            const switchElement = screen.getByRole('checkbox');
            expect(switchElement).toBeChecked();
        });

        it('handles falsy boolean values', () => {
            render(<PropertyFormFieldWrapper property={booleanProperty} defaultValue={false} />);

            const switchElement = screen.getByRole('checkbox');
            expect(switchElement).not.toBeChecked();
        });
    });

    describe('Enum Properties', () => {
        const enumProperty: PropertyDefinition = {
            key: 'state',
            label: 'Queue State',
            description: 'Operational state of the queue',
            type: 'select',
            options: ['RUNNING', 'STOPPED'],
            defaultValue: 'RUNNING',
            validation: z.enum(['RUNNING', 'STOPPED']),
            group: 'core',
            getValueFromQueue: (queue: any) => queue.state,
        };

        it('renders select dropdown with options', () => {
            render(<PropertyFormFieldWrapper property={enumProperty} defaultValue="RUNNING" />);

            expect(screen.getByRole('combobox')).toBeInTheDocument();
            expect(screen.getByDisplayValue('RUNNING')).toBeInTheDocument();
        });

        it('handles enum value changes', async () => {
            const user = userEvent.setup();
            render(<PropertyFormFieldWrapper property={enumProperty} defaultValue="RUNNING" />);

            // Open select dropdown
            await user.click(screen.getByRole('combobox'));

            // Select different option
            await user.click(screen.getByText('STOPPED'));

            expect(screen.getByDisplayValue('STOPPED')).toBeInTheDocument();
        });

        it('handles empty enum value', () => {
            render(<PropertyFormFieldWrapper property={enumProperty} defaultValue="" />);

            expect(screen.getByDisplayValue('')).toBeInTheDocument();
        });
    });

    describe('Number Properties', () => {
        const numberProperty: PropertyDefinition = {
            key: 'user-limit-factor',
            label: 'User Limit Factor',
            description: 'Multiplier for per-user resource limits',
            type: 'number',
            defaultValue: 1,
            validation: z.number().positive(),
            group: 'resource',
            getValueFromQueue: (queue: any) => queue['user-limit-factor'],
        };

        it('renders number input with correct attributes', () => {
            render(<PropertyFormFieldWrapper property={numberProperty} defaultValue={2.5} />);

            const input = screen.getByDisplayValue('2.5');
            expect(input).toHaveAttribute('type', 'number');
            expect(screen.getByLabelText('User Limit Factor')).toBeInTheDocument();
        });

        it('handles number value changes', async () => {
            render(<PropertyFormFieldWrapper property={numberProperty} defaultValue={1} />);

            const input = screen.getByDisplayValue('1');
            fireEvent.change(input, { target: { value: '3.5' } });

            expect(screen.getByDisplayValue('3.5')).toBeInTheDocument();
        });

        it('handles empty number input', () => {
            render(<PropertyFormFieldWrapper property={numberProperty} defaultValue={0} />);

            const input = screen.getByDisplayValue('0');
            expect(input).toBeInTheDocument();
        });

        it('handles number value clearing', () => {
            render(<PropertyFormFieldWrapper property={numberProperty} defaultValue={1} />);

            const input = screen.getByDisplayValue('1');
            fireEvent.change(input, { target: { value: '' } });

            expect(screen.getByDisplayValue('0')).toBeInTheDocument(); // Component converts empty to 0
        });

        it('renders number input without additional attributes', () => {
            render(<PropertyFormFieldWrapper property={numberProperty} defaultValue={1} />);

            const input = screen.getByDisplayValue('1');
            expect(input).toHaveAttribute('type', 'number');
        });
    });

    describe('Number Properties for Percentages', () => {
        const percentageProperty: PropertyDefinition = {
            key: 'maximum-am-resource-percent',
            label: 'Maximum AM Resource Percent',
            description: 'Maximum application master resource percentage',
            type: 'number',
            defaultValue: 0.1,
            validation: z.number().min(0).max(1),
            group: 'resource',
            getValueFromQueue: (queue: any) => queue['maximum-am-resource-percent'],
        };

        it('renders number input for percentage values', () => {
            render(<PropertyFormFieldWrapper property={percentageProperty} defaultValue={0.25} />);

            const input = screen.getByDisplayValue('0.25');
            expect(input).toHaveAttribute('type', 'number');
            expect(screen.getByLabelText('Maximum AM Resource Percent')).toBeInTheDocument();
        });

        it('handles percentage value changes', () => {
            render(<PropertyFormFieldWrapper property={percentageProperty} defaultValue={0.1} />);

            const input = screen.getByDisplayValue('0.1');
            fireEvent.change(input, { target: { value: '0.5' } });

            expect(screen.getByDisplayValue('0.5')).toBeInTheDocument();
        });

        it('handles zero percentage value', () => {
            render(<PropertyFormFieldWrapper property={percentageProperty} defaultValue={0} />);

            expect(screen.getByDisplayValue('0')).toBeInTheDocument();
        });

        it('handles undefined percentage value', () => {
            render(<PropertyFormFieldWrapper property={percentageProperty} defaultValue={undefined} />);

            const input = screen.getByLabelText('Maximum AM Resource Percent');
            expect(input).toBeInTheDocument();
            expect(input).toHaveValue(null); // Undefined/empty value
        });
    });

    describe('String Properties', () => {
        const stringProperty: PropertyDefinition = {
            key: 'accessible-node-labels',
            label: 'Accessible Node Labels',
            description: 'Node labels accessible to this queue',
            type: 'text',
            defaultValue: '',
            validation: z.string(),
            group: 'advanced',
            getValueFromQueue: (queue: any) => queue['accessible-node-labels'],
        };

        it('renders text input for string properties', () => {
            render(<PropertyFormFieldWrapper property={stringProperty} defaultValue="gpu,ssd" />);

            expect(screen.getByDisplayValue('gpu,ssd')).toBeInTheDocument();
            expect(screen.getByLabelText('Accessible Node Labels')).toBeInTheDocument();
        });

        it('handles string value changes', () => {
            render(<PropertyFormFieldWrapper property={stringProperty} defaultValue="" />);

            const input = screen.getByLabelText('Accessible Node Labels');
            fireEvent.change(input, { target: { value: 'high-memory' } });

            expect(screen.getByDisplayValue('high-memory')).toBeInTheDocument();
        });

        it('renders text input for description fields', () => {
            const descriptionProperty: PropertyDefinition = {
                key: 'queue-description',
                label: 'Queue Description',
                description: 'Description of the queue purpose',
                type: 'text',
                defaultValue: '',
                validation: z.string(),
                group: 'core',
                getValueFromQueue: (queue: any) => queue['queue-description'],
            };

            render(<PropertyFormFieldWrapper property={descriptionProperty} defaultValue="Test description" />);

            const input = screen.getByDisplayValue('Test description');
            expect(input).toBeInTheDocument();
        });

        it('renders text input for policy fields', () => {
            const policyProperty: PropertyDefinition = {
                key: 'ordering-policy',
                label: 'Ordering Policy',
                description: 'Policy for ordering applications',
                type: 'text',
                defaultValue: '',
                validation: z.string(),
                group: 'advanced',
                getValueFromQueue: (queue: any) => queue['ordering-policy'],
            };

            render(<PropertyFormFieldWrapper property={policyProperty} defaultValue="fifo" />);

            const input = screen.getByDisplayValue('fifo');
            expect(input).toBeInTheDocument();
        });
    });

    describe('Capacity Properties', () => {
        const capacityProperty: PropertyDefinition = {
            key: 'capacity',
            label: 'Queue Capacity',
            description: 'Guaranteed resource capacity',
            type: 'capacity',
            defaultValue: '0%',
            validation: z.string(),
            group: 'resource',
            getValueFromQueue: (queue: any) => queue.capacity,
        };

        it('renders CapacityEditor for capacity properties', () => {
            const siblings = [{ name: 'sibling1', capacity: '30%' }];

            render(<PropertyFormFieldWrapper property={capacityProperty} defaultValue="25%" siblings={siblings} />);

            expect(screen.getByTestId('capacity-editor')).toBeInTheDocument();
            expect(screen.getByText('Queue Capacity')).toBeInTheDocument();
            expect(screen.getByDisplayValue('25%')).toBeInTheDocument();
            expect(screen.getByTestId('siblings-info')).toHaveTextContent('Siblings: 1');
        });

        it('handles capacity value changes', () => {
            render(<PropertyFormFieldWrapper property={capacityProperty} defaultValue="10%" />);

            const input = screen.getByTestId('capacity-input');
            fireEvent.change(input, { target: { value: '40%' } });

            expect(screen.getByDisplayValue('40%')).toBeInTheDocument();
        });

        it('renders CapacityEditor for maximum-capacity', () => {
            const maxCapacityProperty = { ...capacityProperty, key: 'maximum-capacity' };

            render(<PropertyFormFieldWrapper property={maxCapacityProperty} defaultValue="100%" />);

            expect(screen.getByTestId('capacity-editor')).toBeInTheDocument();
        });

        it('renders CapacityEditor for template capacity properties', () => {
            const templateCapacityProperty = { ...capacityProperty, key: 'leaf-queue-template.capacity' };

            render(<PropertyFormFieldWrapper property={templateCapacityProperty} defaultValue="20%" />);

            expect(screen.getByTestId('capacity-editor')).toBeInTheDocument();
        });
    });

    describe('Property Metadata Display', () => {
        const propertyWithMetadata: PropertyDefinition = {
            key: 'test-property',
            label: 'Test Property',
            description: 'This is a test property with metadata',
            type: 'string',
            defaultValue: 'default-value',
            validation: z.string(),
            group: 'core',
            getValueFromQueue: (queue: any) => queue['test-property'],
        };

        it('displays description in helper text', () => {
            render(<PropertyFormFieldWrapper property={propertyWithMetadata} defaultValue="" />);

            expect(screen.getByText('This is a test property with metadata')).toBeInTheDocument();
        });

        it('displays property description', () => {
            render(<PropertyFormFieldWrapper property={propertyWithMetadata} defaultValue="" />);

            expect(screen.getByText('This is a test property with metadata')).toBeInTheDocument();
        });

        it('displays description for number fields', () => {
            const numberPropertyWithMetadata: PropertyDefinition = {
                ...propertyWithMetadata,
                type: 'number',
                defaultValue: 0.5,
            };

            render(<PropertyFormFieldWrapper property={numberPropertyWithMetadata} defaultValue={0.3} />);

            expect(screen.getByText('This is a test property with metadata')).toBeInTheDocument();
        });

        it('does not display property name for boolean fields', () => {
            const booleanPropertyWithMetadata: PropertyDefinition = {
                ...propertyWithMetadata,
                type: 'boolean',
            };

            render(<PropertyFormFieldWrapper property={booleanPropertyWithMetadata} defaultValue={true} />);

            // The property name should be in the FormControlLabel, not as separate text
            expect(screen.getByText('Test Property')).toBeInTheDocument();
            // But not as a separate text element above the field
            const separateLabels = screen.queryAllByText('Test Property');
            expect(separateLabels).toHaveLength(1); // Only in the FormControlLabel
        });

        it('handles property without description', () => {
            const propertyWithoutDescription: PropertyDefinition = {
                key: 'test-property-no-desc',
                label: 'Test Property',
                description: '', // Empty string
                type: 'text',
                defaultValue: 'default-value',
                validation: z.string(),
                group: 'core',
                getValueFromQueue: (queue: any) => queue['test-property-no-desc'],
            };

            render(<PropertyFormFieldWrapper property={propertyWithoutDescription} defaultValue="" />);

            expect(screen.getByLabelText('Test Property')).toBeInTheDocument();
            // When description is empty, no helper text should be rendered
            const formControl = screen.getByLabelText('Test Property').closest('.MuiFormControl-root');
            const helperText = formControl?.querySelector('.MuiFormHelperText-root');
            expect(helperText).not.toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('handles undefined property value', () => {
            const stringProperty: PropertyDefinition = {
                key: 'test',
                label: 'Test',
                description: 'Test property',
                type: 'text',
                defaultValue: '',
                validation: z.string(),
                group: 'core',
                getValueFromQueue: (queue: any) => queue.test,
            };

            render(<PropertyFormFieldWrapper property={stringProperty} defaultValue={undefined} />);

            expect(screen.getByDisplayValue('')).toBeInTheDocument();
        });

        it('handles null property value', () => {
            const stringProperty: PropertyDefinition = {
                key: 'test',
                label: 'Test',
                description: 'Test property',
                type: 'text',
                defaultValue: '',
                validation: z.string(),
                group: 'core',
                getValueFromQueue: (queue: any) => queue.test,
            };

            render(<PropertyFormFieldWrapper property={stringProperty} defaultValue={null} />);

            expect(screen.getByDisplayValue('')).toBeInTheDocument();
        });

        it('handles unknown property type fallback to string', () => {
            const unknownProperty: PropertyDefinition = {
                key: 'test',
                label: 'Test',
                description: 'Test property',
                type: 'unknown' as any, // Force unknown type
                defaultValue: '',
                validation: z.string(),
                group: 'core',
                getValueFromQueue: (queue: any) => queue.test,
            };

            render(<PropertyFormFieldWrapper property={unknownProperty} defaultValue="test value" />);

            expect(screen.getByDisplayValue('test value')).toBeInTheDocument();
        });
    });

    describe('Custom Change Handler', () => {
        it('calls custom change handler when provided', async () => {
            const customChangeHandler = vi.fn();
            const booleanProperty: PropertyDefinition = {
                key: 'test-boolean',
                label: 'Test Boolean',
                description: 'Test boolean property',
                type: 'boolean',
                defaultValue: false,
                validation: z.boolean(),
                group: 'core',
                getValueFromQueue: (queue: any) => queue['test-boolean'],
            };

            render(
                <PropertyFormFieldWrapper
                    property={booleanProperty}
                    defaultValue={false}
                    onCustomChange={customChangeHandler}
                />
            );

            const user = userEvent.setup();
            const switchElement = screen.getByRole('checkbox');
            await user.click(switchElement);

            expect(customChangeHandler).toHaveBeenCalledWith(true);
        });
    });
});

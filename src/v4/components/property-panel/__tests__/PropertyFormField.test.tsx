import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { useForm } from 'react-hook-form';
import { PropertyFormField } from '../PropertyFormField';
import type { PropertyDescriptor } from '../../../types/property-descriptor';

// Test wrapper component to provide form context
const TestWrapper: React.FC<{
    children: React.ReactNode;
    defaultValues?: Record<string, any>;
}> = ({ children, defaultValues = {} }) => {
    const { control } = useForm({ defaultValues });
    return <form>{React.cloneElement(children as React.ReactElement, { control })}</form>;
};

const baseProperty: PropertyDescriptor = {
    name: 'test-property',
    displayName: 'Test Property',
    description: 'This is a test property',
    type: 'string',
    category: 'general',
    defaultValue: '',
    required: false,
};

describe('PropertyFormField', () => {
    it('renders a text field for string type', () => {
        const property: PropertyDescriptor = {
            ...baseProperty,
            type: 'string',
        };

        render(
            <TestWrapper>
                <PropertyFormField property={property} control={null as any} />
            </TestWrapper>
        );

        expect(screen.getByLabelText('Test Property')).toBeInTheDocument();
        expect(screen.getByText('This is a test property')).toBeInTheDocument();
    });

    it('renders a number field for number type', () => {
        const property: PropertyDescriptor = {
            ...baseProperty,
            type: 'number',
            validationRules: [
                {
                    type: 'range',
                    message: 'Must be between 0 and 100',
                    min: 0,
                    max: 100,
                },
            ],
        };

        render(
            <TestWrapper>
                <PropertyFormField property={property} control={null as any} />
            </TestWrapper>
        );

        const input = screen.getByLabelText('Test Property') as HTMLInputElement;
        expect(input).toBeInTheDocument();
        expect(input.type).toBe('number');
        expect(input.min).toBe('0');
        expect(input.max).toBe('100');
    });

    it('renders a switch for boolean type', () => {
        const property: PropertyDescriptor = {
            ...baseProperty,
            type: 'boolean',
        };

        render(
            <TestWrapper>
                <PropertyFormField property={property} control={null as any} />
            </TestWrapper>
        );

        expect(screen.getByRole('checkbox')).toBeInTheDocument();
        // The label appears in the Box header, not duplicated in the switch
        expect(screen.getByText('Test Property')).toBeInTheDocument();
    });

    it('renders toggle buttons for enum type', () => {
        const property: PropertyDescriptor = {
            ...baseProperty,
            type: 'enum',
            enumValues: ['RUNNING', 'STOPPED'],
        };

        render(
            <TestWrapper>
                <PropertyFormField property={property} control={null as any} />
            </TestWrapper>
        );

        // ToggleButtonGroup creates buttons for each enum value
        expect(screen.getByRole('button', { name: 'RUNNING' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'STOPPED' })).toBeInTheDocument();
        expect(screen.getByText('Test Property')).toBeInTheDocument();
    });

    it('displays required indicator for required fields', () => {
        const property: PropertyDescriptor = {
            ...baseProperty,
            required: true,
        };

        render(
            <TestWrapper>
                <PropertyFormField property={property} control={null as any} />
            </TestWrapper>
        );

        expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('displays staged indicator when field is staged', () => {
        render(
            <TestWrapper>
                <PropertyFormField
                    property={baseProperty}
                    control={null as any}
                    isStaged={true}
                />
            </TestWrapper>
        );

        expect(screen.getByText('Modified')).toBeInTheDocument();
    });

    it('displays deprecated indicator for deprecated fields', () => {
        const property: PropertyDescriptor = {
            ...baseProperty,
            deprecated: true,
            deprecationMessage: 'This property is deprecated. Use new-property instead.',
        };

        render(
            <TestWrapper>
                <PropertyFormField property={property} control={null as any} />
            </TestWrapper>
        );

        expect(screen.getByText('Deprecated')).toBeInTheDocument();
        expect(screen.getByText('Deprecated:')).toBeInTheDocument();
        expect(screen.getByText('This property is deprecated. Use new-property instead.')).toBeInTheDocument();
    });

    it('displays error message when validation fails', () => {
        const error = {
            type: 'validation',
            message: 'This field is required',
        };

        render(
            <TestWrapper>
                <PropertyFormField
                    property={baseProperty}
                    control={null as any}
                    error={error}
                />
            </TestWrapper>
        );

        expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('disables field when enableWhen condition is not met', () => {
        const property: PropertyDescriptor = {
            ...baseProperty,
            enableWhen: {
                'other-property': (value: string) => value === 'enabled',
            },
        };

        render(
            <TestWrapper>
                <PropertyFormField
                    property={property}
                    control={null as any}
                    dependentValues={{ 'other-property': 'disabled' }}
                />
            </TestWrapper>
        );

        const input = screen.getByLabelText('Test Property') as HTMLInputElement;
        expect(input).toBeDisabled();
        expect(screen.getByText('This field is disabled based on current configuration')).toBeInTheDocument();
    });

    it('enables field when enableWhen condition is met', () => {
        const property: PropertyDescriptor = {
            ...baseProperty,
            enableWhen: {
                'other-property': (value: string) => value === 'enabled',
            },
        };

        render(
            <TestWrapper>
                <PropertyFormField
                    property={property}
                    control={null as any}
                    dependentValues={{ 'other-property': 'enabled' }}
                />
            </TestWrapper>
        );

        const input = screen.getByLabelText('Test Property') as HTMLInputElement;
        expect(input).not.toBeDisabled();
    });

    it('renders multiline text field for ACL properties', () => {
        const property: PropertyDescriptor = {
            ...baseProperty,
            name: 'acl_submit_applications',
            displayName: 'Submit Applications ACL',
        };

        render(
            <TestWrapper>
                <PropertyFormField property={property} control={null as any} />
            </TestWrapper>
        );

        const textarea = screen.getByLabelText('Submit Applications ACL') as HTMLTextAreaElement;
        expect(textarea).toBeInTheDocument();
        expect(textarea.getAttribute('rows')).toBe('2');
    });

    it('displays suffix for number fields with display format', () => {
        const property: PropertyDescriptor = {
            ...baseProperty,
            type: 'number',
            displayFormat: {
                suffix: ' (0.0-1.0)',
                decimals: 2,
            },
        };

        render(
            <TestWrapper>
                <PropertyFormField property={property} control={null as any} />
            </TestWrapper>
        );

        expect(screen.getByText('(0.0-1.0)')).toBeInTheDocument();
    });

    it('handles boolean field changes correctly', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <TestWrapper defaultValues={{ 'test-property': '' }}>
                <PropertyFormField property={{ ...baseProperty, type: 'boolean' }} control={null as any} />
            </TestWrapper>
        );

        const switchElement = screen.getByRole('checkbox') as HTMLInputElement;
        expect(switchElement.checked).toBe(false);

        await user.click(switchElement);

        // Re-render with updated value
        rerender(
            <TestWrapper defaultValues={{ 'test-property': 'true' }}>
                <PropertyFormField property={{ ...baseProperty, type: 'boolean' }} control={null as any} />
            </TestWrapper>
        );
    });

    it('handles enum field selection with toggle buttons', async () => {
        const user = userEvent.setup();
        const property: PropertyDescriptor = {
            ...baseProperty,
            type: 'enum',
            enumValues: ['RUNNING', 'STOPPED'],
        };

        render(
            <TestWrapper>
                <PropertyFormField property={property} control={null as any} />
            </TestWrapper>
        );

        // Check that enum options are rendered as buttons
        const runningButton = screen.getByRole('button', { name: 'RUNNING' });
        const stoppedButton = screen.getByRole('button', { name: 'STOPPED' });

        expect(runningButton).toBeInTheDocument();
        expect(stoppedButton).toBeInTheDocument();

        // Test clicking a button
        await user.click(runningButton);
        expect(runningButton).toHaveAttribute('aria-pressed', 'true');

        // Test clicking the same button to deselect
        await user.click(runningButton);
        expect(runningButton).toHaveAttribute('aria-pressed', 'false');
    });
});
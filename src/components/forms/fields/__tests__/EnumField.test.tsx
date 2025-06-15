import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EnumField } from '../EnumField';

describe('EnumField', () => {
    const options = ['option1', 'option2', 'option3'];

    it('renders select with label and options', () => {
        const handleChange = vi.fn();
        render(<EnumField value="option1" onChange={handleChange} label="Select Option" options={options} />);

        expect(screen.getByLabelText('Select Option')).toBeInTheDocument();
    });

    it('displays selected value', () => {
        const handleChange = vi.fn();
        render(<EnumField value="option2" onChange={handleChange} label="Select Option" options={options} />);

        const select = screen.getByDisplayValue('option2');
        expect(select).toBeInTheDocument();
    });

    it('calls onChange when option is selected', () => {
        const handleChange = vi.fn();
        render(<EnumField value="option1" onChange={handleChange} label="Select Option" options={options} />);

        const select = screen.getByLabelText('Select Option');
        fireEvent.change(select, { target: { value: 'option3' } });

        expect(handleChange).toHaveBeenCalledWith('option3');
    });

    it('displays error message when provided', () => {
        const handleChange = vi.fn();
        render(
            <EnumField
                value=""
                onChange={handleChange}
                label="Select Option"
                options={options}
                error="This field is required"
            />
        );

        expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('handles empty options array', () => {
        const handleChange = vi.fn();
        render(<EnumField value="" onChange={handleChange} label="Select Option" options={[]} />);

        expect(screen.getByLabelText('Select Option')).toBeInTheDocument();
    });
});

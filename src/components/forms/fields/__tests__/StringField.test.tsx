import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StringField } from '../StringField';

describe('StringField', () => {
    it('renders text input with label', () => {
        const handleChange = vi.fn();
        render(<StringField value="test value" onChange={handleChange} label="Description" />);

        expect(screen.getByLabelText('Description')).toBeInTheDocument();
        expect(screen.getByDisplayValue('test value')).toBeInTheDocument();
    });

    it('handles text input change', () => {
        const handleChange = vi.fn();
        render(<StringField value="" onChange={handleChange} label="Description" />);

        const input = screen.getByLabelText('Description');
        fireEvent.change(input, { target: { value: 'new text' } });

        expect(handleChange).toHaveBeenCalledWith('new text');
    });

    it('renders as multiline when specified', () => {
        const handleChange = vi.fn();
        render(
            <StringField value="line 1\nline 2" onChange={handleChange} label="Description" multiline={true} rows={3} />
        );

        const textarea = screen.getByLabelText('Description');
        expect(textarea.tagName.toLowerCase()).toBe('textarea');
        expect(textarea).toHaveAttribute('rows', '3');
    });

    it('displays error message when provided', () => {
        const handleChange = vi.fn();
        render(<StringField value="" onChange={handleChange} label="Description" error="This field is required" />);

        expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('shows placeholder when provided', () => {
        const handleChange = vi.fn();
        render(<StringField value="" onChange={handleChange} label="Description" placeholder="Enter description" />);

        expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument();
    });

    it('handles empty value correctly', () => {
        const handleChange = vi.fn();
        render(<StringField value="" onChange={handleChange} label="Description" />);

        const input = screen.getByLabelText('Description');
        expect(input).toHaveValue('');
    });

    it('defaults to single line when multiline is false', () => {
        const handleChange = vi.fn();
        render(<StringField value="single line" onChange={handleChange} label="Description" multiline={false} />);

        const input = screen.getByLabelText('Description');
        expect(input.tagName.toLowerCase()).toBe('input');
    });
});

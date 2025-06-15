import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NumberField } from '../NumberField';

describe('NumberField', () => {
    it('renders number input with label', () => {
        const handleChange = vi.fn();
        render(<NumberField value={42} onChange={handleChange} label="Count" />);

        expect(screen.getByLabelText('Count')).toBeInTheDocument();
        expect(screen.getByDisplayValue('42')).toBeInTheDocument();
    });

    it('handles number input change', () => {
        const handleChange = vi.fn();
        render(<NumberField value={0} onChange={handleChange} label="Count" />);

        const input = screen.getByLabelText('Count');
        fireEvent.change(input, { target: { value: '123' } });

        expect(handleChange).toHaveBeenCalledWith(123);
    });

    it('handles empty string input', () => {
        const handleChange = vi.fn();
        render(<NumberField value={42} onChange={handleChange} label="Count" />);

        const input = screen.getByLabelText('Count');
        fireEvent.change(input, { target: { value: '' } });

        expect(handleChange).toHaveBeenCalledWith('');
    });

    it('ignores invalid number input', () => {
        const handleChange = vi.fn();
        render(<NumberField value={42} onChange={handleChange} label="Count" />);

        const input = screen.getByLabelText('Count');
        fireEvent.change(input, { target: { value: 'abc' } });

        expect(handleChange).not.toHaveBeenCalled();
    });

    it('displays error message when provided', () => {
        const handleChange = vi.fn();
        render(<NumberField value={0} onChange={handleChange} label="Count" error="Value must be positive" />);

        expect(screen.getByText('Value must be positive')).toBeInTheDocument();
    });

    it('handles decimal numbers with custom step', () => {
        const handleChange = vi.fn();
        render(<NumberField value={1.5} onChange={handleChange} label="Factor" step="0.1" />);

        const input = screen.getByLabelText('Factor');
        expect(input).toHaveAttribute('step', '0.1');
        expect(screen.getByDisplayValue('1.5')).toBeInTheDocument();
    });

    it('shows placeholder when provided', () => {
        const handleChange = vi.fn();
        render(<NumberField value="" onChange={handleChange} label="Count" placeholder="Enter a number" />);

        expect(screen.getByPlaceholderText('Enter a number')).toBeInTheDocument();
    });
});

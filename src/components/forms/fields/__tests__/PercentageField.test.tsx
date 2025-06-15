import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PercentageField } from '../PercentageField';

describe('PercentageField', () => {
    it('renders slider with label and percentage display', () => {
        const handleChange = vi.fn();
        render(<PercentageField value={0.5} onChange={handleChange} label="Usage Limit" />);

        expect(screen.getByText('Usage Limit: 50.0%')).toBeInTheDocument();
        expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    it('handles slider value change', () => {
        const handleChange = vi.fn();
        render(<PercentageField value={0.25} onChange={handleChange} label="Usage Limit" />);

        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: 75 } });

        expect(handleChange).toHaveBeenCalledWith(0.75);
    });

    it('displays correct percentage for decimal value', () => {
        const handleChange = vi.fn();
        render(<PercentageField value={0.333} onChange={handleChange} label="Usage Limit" />);

        expect(screen.getByText('Usage Limit: 33.3%')).toBeInTheDocument();
    });

    it('handles zero value correctly', () => {
        const handleChange = vi.fn();
        render(<PercentageField value={0} onChange={handleChange} label="Usage Limit" />);

        expect(screen.getByText('Usage Limit: 0.0%')).toBeInTheDocument();
    });

    it('handles maximum value correctly', () => {
        const handleChange = vi.fn();
        render(<PercentageField value={1} onChange={handleChange} label="Usage Limit" />);

        expect(screen.getByText('Usage Limit: 100.0%')).toBeInTheDocument();
    });

    it('handles string value correctly', () => {
        const handleChange = vi.fn();
        render(<PercentageField value="0.6" onChange={handleChange} label="Usage Limit" />);

        expect(screen.getByText('Usage Limit: 60.0%')).toBeInTheDocument();
    });

    it('handles invalid string value gracefully', () => {
        const handleChange = vi.fn();
        render(<PercentageField value="invalid" onChange={handleChange} label="Usage Limit" />);

        expect(screen.getByText('Usage Limit: 0.0%')).toBeInTheDocument();
    });

    it('displays error message when provided', () => {
        const handleChange = vi.fn();
        render(<PercentageField value={0.5} onChange={handleChange} label="Usage Limit" error="Value out of range" />);

        expect(screen.getByText('Value out of range')).toBeInTheDocument();
    });

    it('shows slider marks at expected positions', () => {
        const handleChange = vi.fn();
        render(<PercentageField value={0.5} onChange={handleChange} label="Usage Limit" />);

        expect(screen.getByText('0%')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
    });
});

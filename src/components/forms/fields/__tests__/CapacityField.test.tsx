import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CapacityField } from '../CapacityField';

// Mock CapacityEditor since it's a complex component
vi.mock('../../../CapacityEditor', () => ({
    CapacityEditor: ({ label, value, onChange, error, siblings }: any) => (
        <div data-testid="capacity-editor">
            <label>{label}</label>
            <input value={value} onChange={(e) => onChange(e.target.value)} data-testid="capacity-input" />
            {error && <span data-testid="error">{error}</span>}
            {siblings && <span data-testid="siblings">{siblings.length} siblings</span>}
        </div>
    ),
}));

describe('CapacityField', () => {
    it('renders CapacityEditor with correct props', () => {
        const handleChange = vi.fn();
        render(<CapacityField value="50%" onChange={handleChange} label="Queue Capacity" />);

        expect(screen.getByTestId('capacity-editor')).toBeInTheDocument();
        expect(screen.getByText('Queue Capacity')).toBeInTheDocument();
        expect(screen.getByDisplayValue('50%')).toBeInTheDocument();
    });

    it('passes error message to CapacityEditor', () => {
        const handleChange = vi.fn();
        render(
            <CapacityField
                value="invalid"
                onChange={handleChange}
                label="Queue Capacity"
                error="Invalid capacity format"
            />
        );

        expect(screen.getByTestId('error')).toBeInTheDocument();
        expect(screen.getByText('Invalid capacity format')).toBeInTheDocument();
    });

    it('passes siblings information to CapacityEditor', () => {
        const handleChange = vi.fn();
        const siblings = [
            { name: 'queue1', capacity: '30%' },
            { name: 'queue2', capacity: '20%' },
        ];

        render(<CapacityField value="50%" onChange={handleChange} label="Queue Capacity" siblings={siblings} />);

        expect(screen.getByTestId('siblings')).toBeInTheDocument();
        expect(screen.getByText('2 siblings')).toBeInTheDocument();
    });

    it('handles empty value correctly', () => {
        const handleChange = vi.fn();
        render(<CapacityField value="" onChange={handleChange} label="Queue Capacity" />);

        expect(screen.getByTestId('capacity-input')).toHaveValue('');
    });

    it('delegates onChange calls to parent', () => {
        const handleChange = vi.fn();
        render(<CapacityField value="30%" onChange={handleChange} label="Queue Capacity" />);

        const input = screen.getByTestId('capacity-input');
        const mockEvent = { target: { value: '40%' } } as any;
        input.onChange!(mockEvent);

        expect(handleChange).toHaveBeenCalledWith('40%');
    });
});

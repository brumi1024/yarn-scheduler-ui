import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CapacityEditor } from '../CapacityEditor';

describe('CapacityEditor', () => {
    const defaultProps = {
        label: 'Test Queue Capacity',
        value: '10%',
        onChange: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        it('renders with default props', () => {
            render(<CapacityEditor {...defaultProps} />);
            
            expect(screen.getByText('Test Queue Capacity')).toBeInTheDocument();
            expect(screen.getByText('Percentage (%)')).toBeInTheDocument();
            expect(screen.getByDisplayValue('10')).toBeInTheDocument();
            expect(screen.getByText('10%')).toBeInTheDocument();
        });

        it('displays error when provided', () => {
            render(<CapacityEditor {...defaultProps} error="Invalid capacity value" />);
            
            expect(screen.getByText('Invalid capacity value')).toBeInTheDocument();
            expect(screen.getByRole('alert')).toHaveClass('MuiAlert-colorError');
        });
    });

    describe('Capacity Mode Selection', () => {
        it('switches from percentage to weight mode', async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            render(<CapacityEditor {...defaultProps} onChange={onChange} />);

            // Open select dropdown
            await user.click(screen.getByRole('combobox'));
            
            // Select weight mode - use getByRole to be more specific
            await user.click(screen.getByRole('option', { name: 'Weight (w)' }));

            expect(onChange).toHaveBeenCalledWith('1w');
            expect(screen.getByDisplayValue('1')).toBeInTheDocument();
            expect(screen.getByLabelText('Weight')).toBeInTheDocument();
        });

        it('switches from percentage to absolute mode', async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            render(<CapacityEditor {...defaultProps} onChange={onChange} />);

            await user.click(screen.getByRole('combobox'));
            await user.click(screen.getByRole('option', { name: 'Absolute Resources' }));

            expect(onChange).toHaveBeenCalledWith('[memory=1024,vcores=1]');
            expect(screen.getByDisplayValue('1024')).toBeInTheDocument();
            expect(screen.getByDisplayValue('1')).toBeInTheDocument();
        });
    });

    describe('Percentage Mode', () => {
        it('parses percentage values correctly', () => {
            render(<CapacityEditor {...defaultProps} value="25.5%" />);
            
            expect(screen.getByDisplayValue('25.5')).toBeInTheDocument();
            expect(screen.getByText('25.5%')).toBeInTheDocument();
        });

        it('updates percentage value', async () => {
            const onChange = vi.fn();
            render(<CapacityEditor {...defaultProps} onChange={onChange} />);

            const input = screen.getByDisplayValue('10');
            
            // Directly set the value and trigger change event
            fireEvent.change(input, { target: { value: '25' } });

            expect(onChange).toHaveBeenCalledWith('25%');
        });

        it('handles invalid percentage input gracefully', () => {
            const onChange = vi.fn();
            render(<CapacityEditor {...defaultProps} onChange={onChange} />);

            const input = screen.getByDisplayValue('10');
            fireEvent.change(input, { target: { value: 'invalid' } });

            // Invalid input becomes 0, but formatCapacityValue returns 10% for 0 values
            expect(onChange).toHaveBeenCalledWith('10%');
        });
    });

    describe('Weight Mode', () => {
        it('parses weight values correctly', () => {
            render(<CapacityEditor {...defaultProps} value="2.5w" />);
            
            expect(screen.getByDisplayValue('2.5')).toBeInTheDocument();
            expect(screen.getByText('2.5w')).toBeInTheDocument();
        });

        it('updates weight value', () => {
            const onChange = vi.fn();
            render(<CapacityEditor {...defaultProps} value="1w" onChange={onChange} />);

            const input = screen.getByDisplayValue('1');
            fireEvent.change(input, { target: { value: '3' } });

            expect(onChange).toHaveBeenCalledWith('3w');
        });
    });

    describe('Absolute Mode', () => {
        it('parses absolute values correctly', () => {
            render(<CapacityEditor {...defaultProps} value="[memory=2048,vcores=4]" />);
            
            expect(screen.getByDisplayValue('2048')).toBeInTheDocument();
            expect(screen.getByDisplayValue('4')).toBeInTheDocument();
            expect(screen.getByText('[memory=2048,vcores=4]')).toBeInTheDocument();
        });

        it('updates memory value', () => {
            const onChange = vi.fn();
            render(<CapacityEditor {...defaultProps} value="[memory=1024,vcores=1]" onChange={onChange} />);

            const memoryInput = screen.getByLabelText('Memory (MB)');
            fireEvent.change(memoryInput, { target: { value: '2048' } });

            expect(onChange).toHaveBeenCalledWith('[memory=2048,vcores=1]');
        });

        it('updates vcores value', () => {
            const onChange = vi.fn();
            render(<CapacityEditor {...defaultProps} value="[memory=1024,vcores=1]" onChange={onChange} />);

            const vcoresInput = screen.getByLabelText('VCores');
            fireEvent.change(vcoresInput, { target: { value: '4' } });

            expect(onChange).toHaveBeenCalledWith('[memory=1024,vcores=4]');
        });
    });

    describe('Sibling Queue Usage', () => {
        const siblings = [
            { name: 'queue1', capacity: '30%' },
            { name: 'queue2', capacity: '25%' },
            { name: 'queue3', capacity: '15%' },
        ];

        it('displays sibling usage information', () => {
            render(<CapacityEditor {...defaultProps} siblings={siblings} />);
            
            expect(screen.getByText('Sibling Queue Usage')).toBeInTheDocument();
            expect(screen.getByText('Total Used: 70.0%')).toBeInTheDocument();
            expect(screen.getByText('queue1: 30.0%')).toBeInTheDocument();
            expect(screen.getByText('queue2: 25.0%')).toBeInTheDocument();
            expect(screen.getByText('queue3: 15.0%')).toBeInTheDocument();
        });

        it('shows warning when total allocation exceeds 100%', () => {
            const overallocatedSiblings = [
                { name: 'queue1', capacity: '60%' },
                { name: 'queue2', capacity: '50%' },
            ];

            render(<CapacityEditor {...defaultProps} siblings={overallocatedSiblings} />);
            
            expect(screen.getByText(/Total allocation exceeds 100%/)).toBeInTheDocument();
            expect(screen.getByText('Total Used: 110.0%')).toBeInTheDocument();
        });

        it('handles mixed capacity modes in siblings', () => {
            const mixedSiblings = [
                { name: 'queue1', capacity: '30%' },
                { name: 'queue2', capacity: '2w' },
                { name: 'queue3', capacity: '[memory=1024,vcores=1]' },
            ];

            render(<CapacityEditor {...defaultProps} siblings={mixedSiblings} />);
            
            expect(screen.getByText('queue1: 30.0%')).toBeInTheDocument();
            expect(screen.getByText('queue2: 0.0%')).toBeInTheDocument(); // Weight doesn't contribute to percentage total
            expect(screen.getByText('queue3: 0.0%')).toBeInTheDocument(); // Absolute doesn't contribute to percentage total
        });

        it('does not show sibling usage when no siblings provided', () => {
            render(<CapacityEditor {...defaultProps} siblings={[]} />);
            
            expect(screen.queryByText('Sibling Queue Usage')).not.toBeInTheDocument();
        });
    });

    describe('Value Parsing Edge Cases', () => {
        it('handles malformed percentage values', () => {
            render(<CapacityEditor {...defaultProps} value="invalid%" />);
            
            // Should fallback to default 10%
            expect(screen.getByDisplayValue('10')).toBeInTheDocument();
        });

        it('handles malformed weight values', () => {
            render(<CapacityEditor {...defaultProps} value="invalidw" />);
            
            // Should fallback to default weight mode
            expect(screen.getByText('Weight (w)')).toBeInTheDocument();
            expect(screen.getByDisplayValue('1')).toBeInTheDocument();
        });

        it('handles malformed absolute values', () => {
            render(<CapacityEditor {...defaultProps} value="[invalid]" />);
            
            // Should fallback to defaults for absolute mode
            expect(screen.getByText('Absolute Resources')).toBeInTheDocument();
            expect(screen.getByDisplayValue('1024')).toBeInTheDocument();
            expect(screen.getByDisplayValue('1')).toBeInTheDocument();
        });

        it('handles completely invalid input', () => {
            render(<CapacityEditor {...defaultProps} value="completely invalid" />);
            
            // Should fallback to percentage mode with 10%
            expect(screen.getByText('Percentage (%)')).toBeInTheDocument();
            expect(screen.getByDisplayValue('10')).toBeInTheDocument();
        });

        it('handles empty input', () => {
            render(<CapacityEditor {...defaultProps} value="" />);
            
            expect(screen.getByDisplayValue('10')).toBeInTheDocument();
        });
    });

    describe('Component Updates', () => {
        it('updates when value prop changes', async () => {
            const { rerender } = render(<CapacityEditor {...defaultProps} value="20%" />);
            
            expect(screen.getByDisplayValue('20')).toBeInTheDocument();

            rerender(<CapacityEditor {...defaultProps} value="30%" />);
            
            await waitFor(() => {
                expect(screen.getByDisplayValue('30')).toBeInTheDocument();
            });
        });

        it('maintains mode when switching between values of same type', async () => {
            const { rerender } = render(<CapacityEditor {...defaultProps} value="2w" />);
            
            expect(screen.getByText('Weight (w)')).toBeInTheDocument();

            rerender(<CapacityEditor {...defaultProps} value="5w" />);
            
            await waitFor(() => {
                expect(screen.getByText('Weight (w)')).toBeInTheDocument();
                expect(screen.getByDisplayValue('5')).toBeInTheDocument();
            });
        });
    });
});
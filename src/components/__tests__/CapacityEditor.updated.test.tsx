/**
 * Example of updated CapacityEditor test using new test utilities
 * This demonstrates the improved patterns from Phase 3: Test Utility Consolidation
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithTheme, screen, fireEvent } from '../../test/testUtils/renderHelpers';
import { createMockSiblings } from '../../test/testUtils/mockFactories';
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
            renderWithTheme(<CapacityEditor {...defaultProps} />);

            expect(screen.getByText('Test Queue Capacity')).toBeInTheDocument();
            expect(screen.getByText('Percentage (%)')).toBeInTheDocument();
            expect(screen.getByDisplayValue('10')).toBeInTheDocument();
            expect(screen.getByText('10%')).toBeInTheDocument();
        });

        it('displays error when provided', () => {
            renderWithTheme(<CapacityEditor {...defaultProps} error="Invalid capacity value" />);

            expect(screen.getByText('Invalid capacity value')).toBeInTheDocument();
            expect(screen.getByRole('alert')).toHaveClass('MuiAlert-colorError');
        });

        it('renders with siblings information', () => {
            const siblings = createMockSiblings(2);
            renderWithTheme(<CapacityEditor {...defaultProps} siblings={siblings} />);

            expect(screen.getByText('sibling-1: 20%')).toBeInTheDocument();
            expect(screen.getByText('sibling-2: 30%')).toBeInTheDocument();
        });
    });

    describe('Capacity Mode Selection', () => {
        it('switches from percentage to weight mode', async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderWithTheme(<CapacityEditor {...defaultProps} onChange={onChange} />);

            // Open select dropdown
            await user.click(screen.getByRole('combobox'));

            // Select weight mode
            await user.click(screen.getByRole('option', { name: 'Weight (w)' }));

            expect(onChange).toHaveBeenCalledWith('1w');
            expect(screen.getByDisplayValue('1')).toBeInTheDocument();
            expect(screen.getByLabelText('Weight')).toBeInTheDocument();
        });

        it('switches from percentage to absolute mode', async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderWithTheme(<CapacityEditor {...defaultProps} onChange={onChange} />);

            await user.click(screen.getByRole('combobox'));
            await user.click(screen.getByRole('option', { name: 'Absolute Resources' }));

            expect(onChange).toHaveBeenCalledWith('[memory=1024,vcores=1]');
            expect(screen.getByDisplayValue('1024')).toBeInTheDocument();
            expect(screen.getByDisplayValue('1')).toBeInTheDocument();
        });
    });

    describe('Percentage Mode', () => {
        it('parses percentage values correctly', () => {
            renderWithTheme(<CapacityEditor {...defaultProps} value="25.5%" />);

            expect(screen.getByDisplayValue('25.5')).toBeInTheDocument();
            expect(screen.getByText('25.5%')).toBeInTheDocument();
        });

        it('updates percentage value', async () => {
            const onChange = vi.fn();
            renderWithTheme(<CapacityEditor {...defaultProps} onChange={onChange} />);

            const input = screen.getByDisplayValue('10');

            // Use fireEvent for direct value changes
            fireEvent.change(input, { target: { value: '25' } });

            expect(onChange).toHaveBeenCalledWith('25%');
        });

        it('handles invalid percentage input gracefully', () => {
            const onChange = vi.fn();
            renderWithTheme(<CapacityEditor {...defaultProps} onChange={onChange} />);

            const input = screen.getByDisplayValue('10');
            fireEvent.change(input, { target: { value: 'invalid' } });

            // Invalid input becomes 0, but formatCapacityValue returns 10% for 0 values
            expect(onChange).toHaveBeenCalledWith('10%');
        });

        it('validates percentage ranges', () => {
            const onChange = vi.fn();
            renderWithTheme(<CapacityEditor {...defaultProps} onChange={onChange} />);

            const input = screen.getByDisplayValue('10');
            
            // Test boundary values
            fireEvent.change(input, { target: { value: '0' } });
            expect(onChange).toHaveBeenCalledWith('0%');

            fireEvent.change(input, { target: { value: '100' } });
            expect(onChange).toHaveBeenCalledWith('100%');
        });
    });

    describe('Weight Mode', () => {
        const weightProps = {
            ...defaultProps,
            value: '5w',
        };

        it('parses weight values correctly', () => {
            renderWithTheme(<CapacityEditor {...weightProps} />);

            expect(screen.getByDisplayValue('5')).toBeInTheDocument();
            expect(screen.getByText('5w')).toBeInTheDocument();
        });

        it('updates weight value', async () => {
            const onChange = vi.fn();
            renderWithTheme(<CapacityEditor {...weightProps} onChange={onChange} />);

            const input = screen.getByDisplayValue('5');
            fireEvent.change(input, { target: { value: '8' } });

            expect(onChange).toHaveBeenCalledWith('8w');
        });
    });

    describe('Absolute Mode', () => {
        const absoluteProps = {
            ...defaultProps,
            value: '[memory=2048,vcores=2]',
        };

        it('parses absolute values correctly', () => {
            renderWithTheme(<CapacityEditor {...absoluteProps} />);

            expect(screen.getByDisplayValue('2048')).toBeInTheDocument();
            expect(screen.getByDisplayValue('2')).toBeInTheDocument();
        });

        it('updates memory value', async () => {
            const onChange = vi.fn();
            renderWithTheme(<CapacityEditor {...absoluteProps} onChange={onChange} />);

            const memoryInput = screen.getByDisplayValue('2048');
            fireEvent.change(memoryInput, { target: { value: '4096' } });

            expect(onChange).toHaveBeenCalledWith('[memory=4096,vcores=2]');
        });

        it('updates vCores value', async () => {
            const onChange = vi.fn();
            renderWithTheme(<CapacityEditor {...absoluteProps} onChange={onChange} />);

            const vcoresInput = screen.getByDisplayValue('2');
            fireEvent.change(vcoresInput, { target: { value: '4' } });

            expect(onChange).toHaveBeenCalledWith('[memory=2048,vcores=4]');
        });
    });

    describe('Error Handling', () => {
        it('displays validation errors', () => {
            const errorMessage = 'Capacity cannot exceed 100%';
            renderWithTheme(<CapacityEditor {...defaultProps} error={errorMessage} />);

            expect(screen.getByText(errorMessage)).toBeInTheDocument();
            expect(screen.getByRole('alert')).toHaveClass('MuiAlert-colorError');
        });

        it('clears error when value becomes valid', () => {
            const { rerender } = renderWithTheme(
                <CapacityEditor {...defaultProps} error="Invalid value" />
            );

            expect(screen.getByText('Invalid value')).toBeInTheDocument();

            rerender(<CapacityEditor {...defaultProps} error={undefined} />);

            expect(screen.queryByText('Invalid value')).not.toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('has proper ARIA labels', () => {
            renderWithTheme(<CapacityEditor {...defaultProps} />);

            expect(screen.getByLabelText('Capacity mode')).toBeInTheDocument();
            expect(screen.getByLabelText('Percentage')).toBeInTheDocument();
        });

        it('associates error messages with inputs', () => {
            renderWithTheme(<CapacityEditor {...defaultProps} error="Test error" />);

            const input = screen.getByDisplayValue('10');
            expect(input).toHaveAttribute('aria-invalid', 'true');
        });
    });
});
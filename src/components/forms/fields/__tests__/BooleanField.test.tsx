import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BooleanField } from '../BooleanField';

describe('BooleanField', () => {
    it('renders switch with label', () => {
        const handleChange = vi.fn();
        render(<BooleanField value={true} onChange={handleChange} label="Enable Feature" />);

        expect(screen.getByText('Enable Feature')).toBeInTheDocument();
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('toggles boolean field when clicked', () => {
        const handleChange = vi.fn();
        render(<BooleanField value={true} onChange={handleChange} label="Enable Feature" />);

        const switchElement = screen.getByRole('checkbox');
        expect(switchElement).toBeChecked();

        fireEvent.click(switchElement);
        expect(handleChange).toHaveBeenCalledWith(false);
    });

    it('handles string "true" value correctly', () => {
        const handleChange = vi.fn();
        render(<BooleanField value="true" onChange={handleChange} label="Enable Feature" />);

        const switchElement = screen.getByRole('checkbox');
        expect(switchElement).toBeChecked();
    });

    it('handles falsy values correctly', () => {
        const handleChange = vi.fn();
        render(<BooleanField value={false} onChange={handleChange} label="Enable Feature" />);

        const switchElement = screen.getByRole('checkbox');
        expect(switchElement).not.toBeChecked();
    });
});

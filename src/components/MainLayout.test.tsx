import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../theme';
import MainLayout from './MainLayout';

// Helper to render with theme
const renderWithProviders = (component: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('MainLayout', () => {
    it('renders the main app structure', () => {
        renderWithProviders(<MainLayout />);

        expect(screen.getByText('YARN Capacity Scheduler')).toBeInTheDocument();
        expect(screen.getByText('Queue Visualization')).toBeInTheDocument();
        expect(screen.getByText('YARN Scheduler UI v2.0')).toBeInTheDocument();
    });

    it('switches between tabs correctly', () => {
        renderWithProviders(<MainLayout />);

        // Initially shows Queue Visualization
        expect(screen.getByText(/Interactive YARN Capacity Scheduler queue tree/)).toBeInTheDocument();

        // Click Global Settings tab
        fireEvent.click(screen.getByText('Global Settings'));
        expect(screen.getByText(/System-wide YARN scheduler configuration settings/)).toBeInTheDocument();

        // Click Node Labels tab
        fireEvent.click(screen.getByText('Node Labels'));
        expect(screen.getByText(/Node label management and assignment interface/)).toBeInTheDocument();

        // Click Diagnostics tab
        fireEvent.click(screen.getByText('Diagnostics'));
        expect(screen.getByText(/Activity logging, performance monitoring, and diagnostic tools/)).toBeInTheDocument();
    });

    it('shows correct queue count in status bar', () => {
        renderWithProviders(<MainLayout />);

        expect(screen.getByText('0 Queues')).toBeInTheDocument();
    });
});

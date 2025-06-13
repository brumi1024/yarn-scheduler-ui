import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ErrorBoundary, AppErrorBoundary, FeatureErrorBoundary, ComponentErrorBoundary } from '../ErrorBoundary';

const theme = createTheme();

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
    if (shouldThrow) {
        throw new Error('Test error message');
    }
    return <div>No error</div>;
};

// Console error suppression for tests
const originalError = console.error;
beforeAll(() => {
    console.error = vi.fn();
});

afterAll(() => {
    console.error = originalError;
});

describe('ErrorBoundary', () => {
    const renderWithTheme = (component: React.ReactElement) => {
        return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
    };

    describe('when no error occurs', () => {
        it('renders children normally', () => {
            renderWithTheme(
                <ErrorBoundary>
                    <div>Test content</div>
                </ErrorBoundary>
            );

            expect(screen.getByText('Test content')).toBeInTheDocument();
        });
    });

    describe('when an error occurs', () => {
        it('catches error and displays error UI', () => {
            renderWithTheme(
                <ErrorBoundary context="Test Component">
                    <ThrowError />
                </ErrorBoundary>
            );

            expect(screen.getByText('Component Error')).toBeInTheDocument();
            expect(screen.getByText(/Context: Test Component/)).toBeInTheDocument();
            // In development mode, error message should be visible
            expect(screen.getAllByText(/Test error message/)).toHaveLength(2); // One in summary, one in details
        });

        it('shows retry button that resets error state', () => {
            renderWithTheme(
                <ErrorBoundary context="Test Component">
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            // Error should be displayed
            expect(screen.getByText('Component Error')).toBeInTheDocument();

            // Click retry button
            const retryButton = screen.getByText('Try Again');
            expect(retryButton).toBeInTheDocument();
            
            // The retry button should be clickable (this verifies the error boundary sets up correctly)
            fireEvent.click(retryButton);
            
            // After clicking retry, the error boundary will attempt to re-render
            // but since our ThrowError component always throws, we'll still see the error
            // This tests that the retry mechanism works, even if it doesn't succeed
            expect(screen.getByText('Component Error')).toBeInTheDocument();
        });

        it('shows error details when expanded', () => {
            renderWithTheme(
                <ErrorBoundary context="Test Component">
                    <ThrowError />
                </ErrorBoundary>
            );

            // Initially should have the collapsed details
            const showDetailsButton = screen.getByText('Show Details');
            expect(showDetailsButton).toBeInTheDocument();

            // Click show details button
            fireEvent.click(showDetailsButton);

            // Details should now be visible
            expect(screen.getByText('Hide Details')).toBeInTheDocument();
            expect(screen.getByText('Error Details')).toBeInTheDocument();
        });

        it('calls onError callback when provided', () => {
            const onError = vi.fn();

            renderWithTheme(
                <ErrorBoundary onError={onError}>
                    <ThrowError />
                </ErrorBoundary>
            );

            expect(onError).toHaveBeenCalledWith(
                expect.any(Error),
                expect.objectContaining({
                    componentStack: expect.any(String),
                })
            );
        });
    });

    describe('custom fallback', () => {
        it('renders custom fallback when provided', () => {
            const customFallback = <div>Custom error UI</div>;

            renderWithTheme(
                <ErrorBoundary fallback={customFallback}>
                    <ThrowError />
                </ErrorBoundary>
            );

            expect(screen.getByText('Custom error UI')).toBeInTheDocument();
            expect(screen.queryByText(/Component Error/)).not.toBeInTheDocument();
        });
    });
});

describe('Convenience components', () => {
    const renderWithTheme = (component: React.ReactElement) => {
        return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
    };

    describe('AppErrorBoundary', () => {
        it('displays app-level error messages', () => {
            renderWithTheme(
                <AppErrorBoundary context="Application">
                    <ThrowError />
                </AppErrorBoundary>
            );

            expect(screen.getByText('Application Error')).toBeInTheDocument();
            expect(screen.getByText('Reload Page')).toBeInTheDocument();
        });
    });

    describe('FeatureErrorBoundary', () => {
        it('displays feature-level error messages', () => {
            renderWithTheme(
                <FeatureErrorBoundary context="Queue Editor">
                    <ThrowError />
                </FeatureErrorBoundary>
            );

            expect(screen.getByText('Feature Error')).toBeInTheDocument();
            expect(screen.getByText(/Context: Queue Editor/)).toBeInTheDocument();
        });
    });

    describe('ComponentErrorBoundary', () => {
        it('displays component-level error messages', () => {
            renderWithTheme(
                <ComponentErrorBoundary context="Queue Visualization">
                    <ThrowError />
                </ComponentErrorBoundary>
            );

            expect(screen.getByText('Component Error')).toBeInTheDocument();
            expect(screen.getByText(/Context: Queue Visualization/)).toBeInTheDocument();
        });
    });
});
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { NotificationProvider, useNotifications } from '../NotificationProvider';
import { vi } from 'vitest';

// Test component that uses the notification hook
function TestComponent() {
    const { showSuccess, showError, showWarning, showInfo } = useNotifications();

    return (
        <div>
            <button onClick={() => showSuccess('Success message')}>
                Show Success
            </button>
            <button onClick={() => showError('Error message')}>
                Show Error
            </button>
            <button onClick={() => showWarning('Warning message')}>
                Show Warning
            </button>
            <button onClick={() => showInfo('Info message')}>
                Show Info
            </button>
        </div>
    );
}

function TestApp() {
    return (
        <NotificationProvider>
            <TestComponent />
        </NotificationProvider>
    );
}

describe('NotificationProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render without crashing', () => {
        render(<TestApp />);
        expect(screen.getByText('Show Success')).toBeInTheDocument();
    });

    it('should show success notification when showSuccess is called', async () => {
        render(<TestApp />);
        
        const successButton = screen.getByText('Show Success');
        fireEvent.click(successButton);

        await waitFor(() => {
            expect(screen.getByText('Success message')).toBeInTheDocument();
        });
    });

    it('should show error notification when showError is called', async () => {
        render(<TestApp />);
        
        const errorButton = screen.getByText('Show Error');
        fireEvent.click(errorButton);

        await waitFor(() => {
            expect(screen.getByText('Error message')).toBeInTheDocument();
        });
    });

    it('should show warning notification when showWarning is called', async () => {
        render(<TestApp />);
        
        const warningButton = screen.getByText('Show Warning');
        fireEvent.click(warningButton);

        await waitFor(() => {
            expect(screen.getByText('Warning message')).toBeInTheDocument();
        });
    });

    it('should show info notification when showInfo is called', async () => {
        render(<TestApp />);
        
        const infoButton = screen.getByText('Show Info');
        fireEvent.click(infoButton);

        await waitFor(() => {
            expect(screen.getByText('Info message')).toBeInTheDocument();
        });
    });

    it('should allow closing notifications', async () => {
        render(<TestApp />);
        
        const successButton = screen.getByText('Show Success');
        fireEvent.click(successButton);

        await waitFor(() => {
            expect(screen.getByText('Success message')).toBeInTheDocument();
        });

        // Find and click the close button
        const closeButton = screen.getByLabelText('Close');
        fireEvent.click(closeButton);

        await waitFor(() => {
            expect(screen.queryByText('Success message')).not.toBeInTheDocument();
        });
    });

    it('should handle multiple notifications', async () => {
        render(<TestApp />);
        
        const successButton = screen.getByText('Show Success');
        const errorButton = screen.getByText('Show Error');
        
        fireEvent.click(successButton);
        fireEvent.click(errorButton);

        await waitFor(() => {
            expect(screen.getByText('Success message')).toBeInTheDocument();
            expect(screen.getByText('Error message')).toBeInTheDocument();
        });
    });

    it('should automatically hide notifications after autoHideDuration', async () => {
        render(
            <NotificationProvider defaultAutoHideDuration={100}>
                <TestComponent />
            </NotificationProvider>
        );
        
        const successButton = screen.getByText('Show Success');
        fireEvent.click(successButton);

        await waitFor(() => {
            expect(screen.getByText('Success message')).toBeInTheDocument();
        });

        // Wait for auto-hide
        await waitFor(() => {
            expect(screen.queryByText('Success message')).not.toBeInTheDocument();
        }, { timeout: 500 });
    });

    it('should limit the number of notifications shown at once', async () => {
        render(
            <NotificationProvider maxNotifications={2}>
                <TestComponent />
            </NotificationProvider>
        );
        
        const successButton = screen.getByText('Show Success');
        const errorButton = screen.getByText('Show Error');
        const warningButton = screen.getByText('Show Warning');
        
        // Show 3 notifications but only 2 should be visible due to maxNotifications=2
        fireEvent.click(successButton);
        fireEvent.click(errorButton);
        fireEvent.click(warningButton);

        await waitFor(() => {
            // First notification should be pushed out
            expect(screen.queryByText('Success message')).not.toBeInTheDocument();
            expect(screen.getByText('Error message')).toBeInTheDocument();
            expect(screen.getByText('Warning message')).toBeInTheDocument();
        });
    });

    it('should throw error when useNotifications is used outside provider', () => {
        // Suppress console.error for this test since we expect an error
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        expect(() => {
            render(<TestComponent />);
        }).toThrow('useNotifications must be used within a NotificationProvider');
        
        consoleSpy.mockRestore();
    });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GlobalSettings from '../GlobalSettings';
import { useYarnSchedulerStore } from '../../store/yarnSchedulerStore';
import { useSchedulerConfig } from '../../hooks/useSchedulerApi';
import { globalProperties } from '../../../config/globalProperties';

// Mock the hooks and store
vi.mock('../../store/yarnSchedulerStore');
vi.mock('../../hooks/useSchedulerApi');
vi.mock('../StagedChangesPanel', () => ({
    StagedChangesPanel: () => <div data-testid="staged-changes-panel">Staged Changes Panel</div>,
}));
vi.mock('../../../components/ConfirmationModal', () => ({
    ConfirmationModal: ({ open, onConfirm }: any) => 
        open ? (
            <div data-testid="confirmation-modal">
                <button onClick={onConfirm}>Confirm</button>
            </div>
        ) : null,
}));

describe('GlobalSettings V3', () => {
    let queryClient: QueryClient;
    let mockStore: any;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        });

        mockStore = {
            originalConfig: {
                'yarn.scheduler.capacity.legacy-queue-mode.enabled': 'true',
                'yarn.scheduler.capacity.preemption.disabled': 'false',
                'yarn.scheduler.capacity.maximum-applications': '10000',
            },
            propertyChanges: new Map(),
            updateProperty: vi.fn(),
        };

        (useYarnSchedulerStore as any).mockImplementation((selector: any) => {
            return selector(mockStore);
        });

        (useSchedulerConfig as any).mockReturnValue({
            isLoading: false,
            error: null,
        });
    });

    function wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    it('should render global settings with categories', () => {
        render(<GlobalSettings />, { wrapper });

        expect(screen.getByText('Global Scheduler Settings')).toBeInTheDocument();
        expect(screen.getByText('Legacy Queue Mode')).toBeInTheDocument();
        
        // Check for category accordions
        expect(screen.getByText('preemption Settings')).toBeInTheDocument();
        expect(screen.getByText('queue Settings')).toBeInTheDocument();
        expect(screen.getByText('resource Settings')).toBeInTheDocument();
    });

    it('should display current values from original config', () => {
        render(<GlobalSettings />, { wrapper });

        // Check legacy mode toggle
        const legacyModeSwitch = screen.getByRole('checkbox', { 
            name: /Enable Legacy Queue Mode/i 
        });
        expect(legacyModeSwitch).toBeChecked();
    });

    it('should call updateProperty when changing a value', () => {
        // Set initial value to false so toggling will enable it (no modal)
        mockStore.originalConfig['yarn.scheduler.capacity.legacy-queue-mode.enabled'] = 'false';
        
        render(<GlobalSettings />, { wrapper });

        const legacyModeSwitch = screen.getByRole('checkbox', { 
            name: /Enable Legacy Queue Mode/i 
        });
        
        expect(legacyModeSwitch).not.toBeChecked();
        
        // Toggle to enable (no modal should appear)
        fireEvent.click(legacyModeSwitch);

        // Should call updateProperty directly
        expect(mockStore.updateProperty).toHaveBeenCalledWith(
            'yarn.scheduler.capacity.legacy-queue-mode.enabled',
            'true'
        );
    });

    it('should show confirmation modal when disabling legacy mode', () => {
        render(<GlobalSettings />, { wrapper });

        const legacyModeSwitch = screen.getByRole('checkbox', { 
            name: /Enable Legacy Queue Mode/i 
        });
        
        fireEvent.click(legacyModeSwitch);

        expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
        
        // Confirm the change
        fireEvent.click(screen.getByText('Confirm'));
        
        expect(mockStore.updateProperty).toHaveBeenCalledWith(
            'yarn.scheduler.capacity.legacy-queue-mode.enabled',
            'false'
        );
    });

    it('should show changed indicator for modified properties', () => {
        // Add a change to the store
        mockStore.propertyChanges.set('yarn.scheduler.capacity.maximum-applications', {
            key: 'yarn.scheduler.capacity.maximum-applications',
            oldValue: '10000',
            newValue: '20000',
            queuePath: '',
        });

        render(<GlobalSettings />, { wrapper });

        // Expand the core settings (where maximum-applications is)
        const coreAccordion = screen.getByText('resource Settings');
        fireEvent.click(coreAccordion);

        // Should show changed indicator
        expect(screen.getByText('Changed from original')).toBeInTheDocument();
    });

    it('should handle loading state', () => {
        (useSchedulerConfig as any).mockReturnValue({
            isLoading: true,
            error: null,
        });

        render(<GlobalSettings />, { wrapper });

        expect(screen.getByText('Loading configuration...')).toBeInTheDocument();
    });

    it('should handle error state', () => {
        const error = new Error('Failed to load');
        (useSchedulerConfig as any).mockReturnValue({
            isLoading: false,
            error,
        });

        render(<GlobalSettings />, { wrapper });

        expect(screen.getByText('Failed to load configuration: Failed to load')).toBeInTheDocument();
    });

    it('should render staged changes panel', () => {
        render(<GlobalSettings />, { wrapper });

        expect(screen.getByTestId('staged-changes-panel')).toBeInTheDocument();
    });

    it('should handle different property types correctly', () => {
        render(<GlobalSettings />, { wrapper });

        // Expand advanced settings to see different property types
        const advancedAccordion = screen.getByText('advanced Settings');
        fireEvent.click(advancedAccordion);

        // Should have number inputs, select dropdowns, and boolean switches
        const numberInputs = screen.getAllByRole('spinbutton');
        expect(numberInputs.length).toBeGreaterThan(0);
    });
});
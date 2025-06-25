import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StagedChangesPanel } from '../StagedChangesPanel';
import { useYarnSchedulerStore } from '../../store/yarnSchedulerStore';
import { useUpdateConfig } from '../../hooks/useSchedulerApi';
import type { PropertyChange } from '../../store/types';

// Mock the hooks and store
vi.mock('../../store/yarnSchedulerStore');
vi.mock('../../hooks/useSchedulerApi');
vi.mock('../ValidationPreview', () => ({
    ValidationPreview: () => <div data-testid="validation-preview">Validation Preview</div>,
}));

describe('StagedChangesPanel V3', () => {
    let queryClient: QueryClient;
    let mockStore: any;
    let mockUpdateConfig: any;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        });

        mockUpdateConfig = {
            mutateAsync: vi.fn(),
            isPending: false,
            isError: false,
            error: null,
        };

        (useUpdateConfig as any).mockReturnValue(mockUpdateConfig);
    });

    function wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    it('should not render when there are no changes', () => {
        mockStore = {
            propertyChanges: new Map(),
            updateProperty: vi.fn(),
            revertAllChanges: vi.fn(),
            hasChanges: vi.fn(() => false),
        };

        (useYarnSchedulerStore as any).mockImplementation((selector: any) => {
            return selector(mockStore);
        });

        const { container } = render(<StagedChangesPanel />, { wrapper });
        expect(container.firstChild).toBeNull();
    });

    it('should correctly parse and group queue properties', () => {
        const changes = new Map<string, PropertyChange>([
            ['yarn.scheduler.capacity.root.capacity', {
                key: 'yarn.scheduler.capacity.root.capacity',
                oldValue: '100',
                newValue: '100',
                queuePath: 'root',
            }],
            ['yarn.scheduler.capacity.root.default.capacity', {
                key: 'yarn.scheduler.capacity.root.default.capacity',
                oldValue: '50',
                newValue: '60',
                queuePath: 'root.default',
            }],
            ['yarn.scheduler.capacity.root.default.maximum-capacity', {
                key: 'yarn.scheduler.capacity.root.default.maximum-capacity',
                oldValue: '100',
                newValue: '80',
                queuePath: 'root.default',
            }],
        ]);

        mockStore = {
            propertyChanges: changes,
            updateProperty: vi.fn(),
            revertAllChanges: vi.fn(),
            hasChanges: vi.fn(() => true),
        };

        (useYarnSchedulerStore as any).mockImplementation((selector: any) => {
            return selector(mockStore);
        });

        render(<StagedChangesPanel />, { wrapper });

        // Should show the floating button with correct count
        expect(screen.getByText('3 Staged Changes')).toBeInTheDocument();

        // Open the drawer
        const expandButton = screen.getByTestId('ExpandMoreIcon').closest('button');
        fireEvent.click(expandButton!);

        // Should show queue names correctly
        expect(screen.getByText('root')).toBeInTheDocument();
        expect(screen.getByText('root.default')).toBeInTheDocument();
    });

    it('should correctly parse and display global properties', () => {
        const changes = new Map<string, PropertyChange>([
            ['yarn.scheduler.capacity.legacy-queue-mode.enabled', {
                key: 'yarn.scheduler.capacity.legacy-queue-mode.enabled',
                oldValue: 'true',
                newValue: 'false',
                queuePath: '', // Empty queuePath indicates global property
            }],
            ['yarn.scheduler.capacity.resource-calculator', {
                key: 'yarn.scheduler.capacity.resource-calculator',
                oldValue: 'DefaultResourceCalculator',
                newValue: 'DominantResourceCalculator',
                queuePath: '', // Empty queuePath indicates global property
            }],
        ]);

        mockStore = {
            propertyChanges: changes,
            updateProperty: vi.fn(),
            revertAllChanges: vi.fn(),
            hasChanges: vi.fn(() => true),
        };

        (useYarnSchedulerStore as any).mockImplementation((selector: any) => {
            return selector(mockStore);
        });

        render(<StagedChangesPanel />, { wrapper });

        // Open the drawer
        const expandButton = screen.getByTestId('ExpandMoreIcon').closest('button');
        fireEvent.click(expandButton!);

        // Should show "Global Settings" as the group name
        expect(screen.getByText('Global Settings')).toBeInTheDocument();
        
        // Should show property names without prefix
        expect(screen.getByText('legacy-queue-mode.enabled')).toBeInTheDocument();
        expect(screen.getByText('resource-calculator')).toBeInTheDocument();
    });

    it('should handle mixed global and queue properties', () => {
        const changes = new Map<string, PropertyChange>([
            ['yarn.scheduler.capacity.root.default.capacity', {
                key: 'yarn.scheduler.capacity.root.default.capacity',
                oldValue: '50',
                newValue: '60',
                queuePath: 'root.default',
            }],
            ['yarn.scheduler.capacity.maximum-applications', {
                key: 'yarn.scheduler.capacity.maximum-applications',
                oldValue: '10000',
                newValue: '20000',
                queuePath: '', // Global property
            }],
        ]);

        mockStore = {
            propertyChanges: changes,
            updateProperty: vi.fn(),
            revertAllChanges: vi.fn(),
            hasChanges: vi.fn(() => true),
        };

        (useYarnSchedulerStore as any).mockImplementation((selector: any) => {
            return selector(mockStore);
        });

        render(<StagedChangesPanel />, { wrapper });

        // Open the drawer
        const expandButton = screen.getByTestId('ExpandMoreIcon').closest('button');
        fireEvent.click(expandButton!);

        // Should show both groups
        expect(screen.getByText('root.default')).toBeInTheDocument();
        expect(screen.getByText('Global Settings')).toBeInTheDocument();
    });

    it('should handle grouping by property type', () => {
        const changes = new Map<string, PropertyChange>([
            ['yarn.scheduler.capacity.root.capacity', {
                key: 'yarn.scheduler.capacity.root.capacity',
                oldValue: '100',
                newValue: '100',
                queuePath: 'root',
            }],
            ['yarn.scheduler.capacity.root.default.capacity', {
                key: 'yarn.scheduler.capacity.root.default.capacity',
                oldValue: '50',
                newValue: '60',
                queuePath: 'root.default',
            }],
        ]);

        mockStore = {
            propertyChanges: changes,
            updateProperty: vi.fn(),
            revertAllChanges: vi.fn(),
            hasChanges: vi.fn(() => true),
        };

        (useYarnSchedulerStore as any).mockImplementation((selector: any) => {
            return selector(mockStore);
        });

        render(<StagedChangesPanel />, { wrapper });

        // Open the drawer
        const expandButton = screen.getByTestId('ExpandMoreIcon').closest('button');
        fireEvent.click(expandButton!);

        // Switch to "By Property" grouping
        const byPropertyChip = screen.getByText('By Property');
        fireEvent.click(byPropertyChip);

        // Should group by property name (capacity)
        expect(screen.getAllByText('capacity')).toHaveLength(1);
    });
});
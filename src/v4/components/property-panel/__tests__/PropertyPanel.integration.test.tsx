import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { PropertyPanel } from '../PropertyPanel';
import { useSchedulerStore } from '../../../store/schedulerStore';

// Mock the store
vi.mock('../../../store/schedulerStore');

const mockQueue = {
    queueName: 'test-queue',
    queuePath: 'root.test-queue',
    type: 'capacitySchedulerLeafQueueInfo',
    capacity: 50.0,
    maxCapacity: 75.0,
    absoluteCapacity: 25.0,
    absoluteMaxCapacity: 37.5,
    absoluteUsedCapacity: 10.0,
    usedCapacity: 20.0,
    numApplications: 5,
    numActiveApplications: 3,
    numPendingApplications: 2,
    state: 'RUNNING',
    resourcesUsed: {
        memory: 1024,
        vCores: 2,
    },
    hideReservationQueues: false,
    nodeLabels: ['*'],
    allocatedContainers: 10,
    reservedContainers: 1,
    pendingContainers: 3,
    capacitiesUsedByNodeLabel: [],
    capacitiesByNodeLabel: [],
} as any;

describe('PropertyPanel Integration Tests', () => {
    const mockUseSchedulerStore = useSchedulerStore as Mock;

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseSchedulerStore.mockReturnValue({
            selectedQueuePath: 'root.test-queue',
            isPropertyPanelOpen: true,
            setPropertyPanelOpen: vi.fn(),
            getQueueByPath: vi.fn().mockReturnValue(mockQueue),
            getQueueDisplayValue: vi.fn().mockReturnValue({ value: '', isStaged: false }),
            stageQueueChange: vi.fn(),
            clearAllChanges: vi.fn(),
            applyChanges: vi.fn().mockResolvedValue(undefined),
            hasUnsavedChanges: vi.fn().mockReturnValue(false),
            getChangesForQueue: vi.fn().mockReturnValue([]),
        });
    });

    it('should show Apply/Reset buttons when on Configuration tab', () => {
        render(<PropertyPanel />);

        // Click on Configuration tab
        const configTab = screen.getByText('Configuration');
        fireEvent.click(configTab);

        // Buttons should be visible (but disabled initially)
        expect(screen.getByText('Apply Changes')).toBeInTheDocument();
        expect(screen.getByText('Reset')).toBeInTheDocument();

        // Buttons should be disabled when no changes
        expect(screen.getByText('Apply Changes')).toBeDisabled();
        expect(screen.getByText('Reset')).toBeDisabled();
    });

    it('should enable Apply/Reset buttons when changes are made', async () => {
        const user = userEvent.setup();
        const mockStageQueueChange = vi.fn();
        const mockHasUnsavedChanges = vi.fn().mockReturnValue(true);
        const mockGetChangesForQueue = vi.fn().mockReturnValue([{ id: '1', queuePath: 'root.test-queue' }]);

        mockUseSchedulerStore.mockReturnValue({
            selectedQueuePath: 'root.test-queue',
            isPropertyPanelOpen: true,
            setPropertyPanelOpen: vi.fn(),
            getQueueByPath: vi.fn().mockReturnValue(mockQueue),
            getQueueDisplayValue: vi.fn().mockReturnValue({ value: '', isStaged: false }),
            stageQueueChange: mockStageQueueChange,
            clearAllChanges: vi.fn(),
            applyChanges: vi.fn().mockResolvedValue(undefined),
            hasUnsavedChanges: mockHasUnsavedChanges,
            getChangesForQueue: mockGetChangesForQueue,
        });

        render(<PropertyPanel />);

        // Click on Configuration tab
        const configTab = screen.getByText('Configuration');
        fireEvent.click(configTab);

        // Find a text field and change its value
        const capacityField = screen.getByLabelText('Capacity');
        await user.clear(capacityField);
        await user.type(capacityField, '60');

        // Verify that stageQueueChange was called
        await waitFor(() => {
            expect(mockStageQueueChange).toHaveBeenCalledWith('root.test-queue', 'capacity', '60');
        });
    });

    it('should not show buttons on Overview tab', () => {
        render(<PropertyPanel />);

        // Default tab is Overview (index 0)
        expect(screen.queryByText('Apply Changes')).not.toBeInTheDocument();
        expect(screen.queryByText('Reset')).not.toBeInTheDocument();
    });
});
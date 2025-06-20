import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import MultiQueueComparisonView from '../MultiQueueComparisonView';
import type { LayoutQueue } from '../../utils/layout/DagreLayout';

// Mock the store hooks
vi.mock('../../../../store', () => ({
    useAllQueues: vi.fn(),
    useUIStore: vi.fn(),
}));

const mockQueues: LayoutQueue[] = [
    {
        id: 'root.production',
        queueName: 'production',
        queuePath: 'root.production',
        capacity: 60,
        usedCapacity: 30,
        maxCapacity: 80,
        absoluteCapacity: 60,
        absoluteUsedCapacity: 30,
        absoluteMaxCapacity: 80,
        state: 'RUNNING',
        numApplications: 5,
        resourcesUsed: {
            memory: 4096,
            vCores: 8,
        },
    },
    {
        id: 'root.development',
        queueName: 'development',
        queuePath: 'root.development',
        capacity: 20,
        usedCapacity: 10,
        maxCapacity: 40,
        absoluteCapacity: 20,
        absoluteUsedCapacity: 10,
        absoluteMaxCapacity: 40,
        state: 'RUNNING',
        numApplications: 2,
        resourcesUsed: {
            memory: 1024,
            vCores: 2,
        },
    },
    {
        id: 'root.production.team1',
        queueName: 'team1',
        queuePath: 'root.production.team1',
        capacity: 50,
        usedCapacity: 25,
        maxCapacity: 100,
        absoluteCapacity: 30,
        absoluteUsedCapacity: 15,
        absoluteMaxCapacity: 60,
        state: 'RUNNING',
        numApplications: 3,
        resourcesUsed: {
            memory: 2048,
            vCores: 4,
        },
    },
];

describe('MultiQueueComparisonView', () => {
    const mockUseAllQueues = vi.mocked(require('../../../../store').useAllQueues);
    const mockUseUIStore = vi.mocked(require('../../../../store').useUIStore);

    beforeEach(() => {
        mockUseAllQueues.mockReturnValue(mockQueues);
        mockUseUIStore.mockReturnValue({
            comparisonQueueNames: [],
            clearComparison: vi.fn(),
        });
    });

    it('should find queues by exact queuePath match', () => {
        mockUseUIStore.mockReturnValue({
            comparisonQueueNames: ['root.production', 'root.development'],
            clearComparison: vi.fn(),
        });

        render(
            <MultiQueueComparisonView
                open={true}
                onClose={vi.fn()}
            />
        );

        // Should find both queues and display comparison table
        expect(screen.getByText('Queue Comparison (2 queues)')).toBeInTheDocument();
        expect(screen.getByText('production')).toBeInTheDocument();
        expect(screen.getByText('development')).toBeInTheDocument();
    });

    it('should handle ambiguous queue name matching', () => {
        // Mock console.warn to verify it's called for ambiguous matches
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        mockUseUIStore.mockReturnValue({
            comparisonQueueNames: ['nonexistent', 'team1'], // team1 exists but is ambiguous if there were multiple
            clearComparison: vi.fn(),
        });

        render(
            <MultiQueueComparisonView
                open={true}
                onClose={vi.fn()}
            />
        );

        // Should show warning about missing queues
        expect(screen.getByText(/could not be found/i)).toBeInTheDocument();
        
        // Should still find the unambiguous queue
        expect(screen.getByText('team1')).toBeInTheDocument();

        consoleSpy.mockRestore();
    });

    it('should show error when no queues can be found', () => {
        mockUseUIStore.mockReturnValue({
            comparisonQueueNames: ['nonexistent1', 'nonexistent2'],
            clearComparison: vi.fn(),
        });

        render(
            <MultiQueueComparisonView
                open={true}
                onClose={vi.fn()}
            />
        );

        // Should show error message
        expect(screen.getByText(/could not find any of the selected queues/i)).toBeInTheDocument();
        expect(screen.getByText('nonexistent1, nonexistent2')).toBeInTheDocument();
    });

    it('should show message when no queues are selected', () => {
        mockUseUIStore.mockReturnValue({
            comparisonQueueNames: [],
            clearComparison: vi.fn(),
        });

        render(
            <MultiQueueComparisonView
                open={true}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText('No queues selected for comparison')).toBeInTheDocument();
    });
});
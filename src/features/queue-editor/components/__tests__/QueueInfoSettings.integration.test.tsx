// src/features/queue-editor/components/__tests__/QueueInfoSettings.integration.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueueInfoSettings } from '../queue-info/QueueInfoSettings';
import { TestWrapper } from '../../../../test/testUtils';

const mockQueueWithNodeLabels = {
    queueName: 'test',
    queuePath: 'root.test',
    capacity: 50,
    maxCapacity: 100,
    state: 'RUNNING',
    accessibleNodeLabels: ['gpu', 'ssd'],
    rawConfig: {
        'accessible-node-labels': 'gpu,ssd',
        'accessible-node-labels.gpu.capacity': '100',
        'accessible-node-labels.ssd.capacity': '50',
    },
};

describe('QueueInfoSettings Integration', () => {
    it('should display node label properties when queue has labels', async () => {
        const user = userEvent.setup();

        render(
            <TestWrapper>
                <QueueInfoSettings queue={mockQueueWithNodeLabels} queuePath="root.test" siblings={[]} />
            </TestWrapper>
        );

        // Find and click on Node Label Capacities accordion
        const nodeLabelAccordion = screen.getByText('Node Label Capacities');
        await user.click(nodeLabelAccordion);

        // Should show properties for each label
        expect(screen.getByText('gpu Label Capacity')).toBeInTheDocument();
        expect(screen.getByText('ssd Label Capacity')).toBeInTheDocument();
    });

    it('should display template properties when auto-creation is enabled', async () => {
        const user = userEvent.setup();
        const queueWithAutoCreation = {
            ...mockQueueWithNodeLabels,
            rawConfig: {
                ...mockQueueWithNodeLabels.rawConfig,
                'auto-queue-creation-v2.enabled': 'true',
            },
        };

        render(
            <TestWrapper>
                <QueueInfoSettings queue={queueWithAutoCreation} queuePath="root.test" siblings={[]} />
            </TestWrapper>
        );

        // Find and click on Auto-Queue Templates accordion
        const templateAccordion = screen.getByText('Auto-Queue Templates');
        await user.click(templateAccordion);

        // Should show template tabs
        expect(screen.getByText('All Queues')).toBeInTheDocument();
        expect(screen.getByText('Leaf Queues')).toBeInTheDocument();
        expect(screen.getByText('Parent Queues')).toBeInTheDocument();
    });
});

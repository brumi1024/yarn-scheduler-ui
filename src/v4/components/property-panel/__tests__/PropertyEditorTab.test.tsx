import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { PropertyEditorTab } from '../PropertyEditorTab';
import { useSchedulerStore } from '../../../store/schedulerStore';
import { usePropertyEditor } from '../../../hooks/usePropertyEditor';
import type { QueueInfo } from '../../../types/queue';

// Mock the store
vi.mock('../../../store/schedulerStore');

// Create a default mock implementation
const createMockUsePropertyEditor = (overrides = {}) => ({
    control: {
        register: vi.fn(),
        unregister: vi.fn(),
        formState: { errors: {} },
        handleSubmit: vi.fn(),
        reset: vi.fn(),
        setError: vi.fn(),
        clearErrors: vi.fn(),
        setValue: vi.fn(),
        getValues: vi.fn(),
        getFieldState: vi.fn(),
        trigger: vi.fn(),
        watch: vi.fn(),
        _subjects: { array: { next: vi.fn() } },
        _options: {},
        _formState: { errors: {} },
        _fields: {},
        _defaultValues: {},
        _stateFlags: {},
    } as any,
    handleSubmit: vi.fn().mockReturnValue(vi.fn()),
    handleReset: vi.fn(),
    errors: {},
    hasChanges: false,
    watchedValues: {},
    propertiesByCategory: {
        general: [
            {
                name: 'capacity',
                displayName: 'Capacity',
                description: 'Queue capacity allocation',
                type: 'string',
                category: 'general',
                defaultValue: '',
                required: true,
            },
            {
                name: 'state',
                displayName: 'Queue State',
                description: 'Operational state of the queue',
                type: 'enum',
                category: 'general',
                defaultValue: 'RUNNING',
                required: false,
                enumValues: ['RUNNING', 'STOPPED'],
            },
        ],
        security: [
            {
                name: 'acl_submit_applications',
                displayName: 'Submit Applications ACL',
                description: 'Controls who can submit applications',
                type: 'string',
                category: 'security',
                defaultValue: '',
                required: false,
            },
        ],
    },
    getStagedStatus: vi.fn().mockReturnValue(false),
    properties: [],
    ...overrides,
});

// Mock the hook
vi.mock('../../../hooks/usePropertyEditor', () => ({
    usePropertyEditor: vi.fn(() => createMockUsePropertyEditor()),
}));

const mockQueue: QueueInfo = {
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
};

describe('PropertyEditorTab', () => {
    const mockUseSchedulerStore = useSchedulerStore as Mock;
    const mockUsePropertyEditor = usePropertyEditor as Mock;

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseSchedulerStore.mockReturnValue({
            getQueueDisplayValue: vi.fn().mockReturnValue({ value: '', isStaged: false }),
            stageQueueChange: vi.fn(),
            clearAllChanges: vi.fn(),
            applyChanges: vi.fn(),
            hasUnsavedChanges: vi.fn().mockReturnValue(false),
            getChangesForQueue: vi.fn().mockReturnValue([]),
        });

        mockUsePropertyEditor.mockReturnValue(createMockUsePropertyEditor());
    });

    it('renders the queue configuration form', () => {
        render(<PropertyEditorTab queue={mockQueue} />);

        expect(screen.getByText('Queue Configuration')).toBeInTheDocument();
        expect(screen.getByText(/Configure properties for queue:.*root\.test-queue/)).toBeInTheDocument();
    });

    it('displays property categories as accordions', () => {
        render(<PropertyEditorTab queue={mockQueue} />);

        expect(screen.getByText('General Configuration')).toBeInTheDocument();
        expect(screen.getByText('Security & Access Control')).toBeInTheDocument();
        expect(screen.getByText('Basic queue settings including capacity, state, and hierarchy')).toBeInTheDocument();
    });

    it('renders form fields within categories', () => {
        render(<PropertyEditorTab queue={mockQueue} />);

        // General category should be expanded by default
        expect(screen.getByText('Capacity')).toBeInTheDocument();
        expect(screen.getByText('Queue State')).toBeInTheDocument();
    });

    it('does not show Apply/Reset buttons (moved to PropertyPanel)', () => {
        render(<PropertyEditorTab queue={mockQueue} />);

        expect(screen.queryByText('Apply Changes')).not.toBeInTheDocument();
        expect(screen.queryByText('Reset')).not.toBeInTheDocument();
    });

    it('does not show Apply/Reset buttons even when there are changes (moved to PropertyPanel)', () => {
        // Mock the hook to return hasChanges: true
        mockUsePropertyEditor.mockReturnValue(createMockUsePropertyEditor({ hasChanges: true }));

        render(<PropertyEditorTab queue={mockQueue} />);

        expect(screen.queryByText('Apply Changes')).not.toBeInTheDocument();
        expect(screen.queryByText('Reset')).not.toBeInTheDocument();
    });

    it('notifies parent about hasChanges state via callback', () => {
        const mockOnHasChangesChange = vi.fn();

        mockUsePropertyEditor.mockReturnValue(createMockUsePropertyEditor({
            hasChanges: true
        }));

        render(<PropertyEditorTab queue={mockQueue} onHasChangesChange={mockOnHasChangesChange} />);

        expect(mockOnHasChangesChange).toHaveBeenCalledWith(true);
    });

    it('provides submit and reset handlers via ref', () => {
        const ref = React.createRef<PropertyEditorTabHandle>();

        render(<PropertyEditorTab ref={ref} queue={mockQueue} />);

        expect(ref.current).toBeDefined();
        expect(ref.current?.submit).toBeInstanceOf(Function);
        expect(ref.current?.reset).toBeInstanceOf(Function);
    });

    it('does not show informational note about optional fields', () => {
        render(<PropertyEditorTab queue={mockQueue} />);

        expect(screen.queryByText(/Empty optional fields will remain unset in the YARN configuration/)).not.toBeInTheDocument();
    });

    it('expands and collapses accordion sections', async () => {
        const user = userEvent.setup();

        render(<PropertyEditorTab queue={mockQueue} />);

        // General Configuration should be expanded by default
        expect(screen.getByText('Capacity')).toBeInTheDocument();

        // Security & Access Control should be collapsed by default
        const securityAccordion = screen.getByText('Security & Access Control');
        await user.click(securityAccordion);

        // After clicking, the security section should expand
        await waitFor(() => {
            expect(screen.getByText('Submit Applications ACL')).toBeInTheDocument();
        });
    });
});
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { PropertyEditorTab } from '../PropertyEditorTab';
import { usePropertyEditor } from '../../../hooks/usePropertyEditor';

// Mock the hook
vi.mock('../../../hooks/usePropertyEditor');

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

// Create a mock with many properties across all categories to test scrolling
const createMockUsePropertyEditor = () => ({
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
    stageChange: vi.fn(),
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
                name: 'maximum-capacity',
                displayName: 'Maximum Capacity',
                description: 'Maximum capacity this queue can grow to',
                type: 'string',
                category: 'general',
                defaultValue: '',
                required: false,
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
        resource: [
            {
                name: 'minimum-user-limit-percent',
                displayName: 'Minimum User Limit Percent',
                description: 'Minimum percentage of queue capacity for a single user',
                type: 'number',
                category: 'resource',
                defaultValue: '100',
                required: false,
            },
            {
                name: 'user-limit-factor',
                displayName: 'User Limit Factor',
                description: 'Multiplier for per-user resource limits',
                type: 'number',
                category: 'resource',
                defaultValue: '1.0',
                required: false,
            },
        ],
        limits: [
            {
                name: 'maximum-applications',
                displayName: 'Maximum Applications',
                description: 'Maximum number of applications that can run in this queue',
                type: 'number',
                category: 'limits',
                defaultValue: '',
                required: false,
            },
            {
                name: 'maximum-am-resource-percent',
                displayName: 'Maximum AM Resource Percent',
                description: 'Maximum percentage of resources for Application Masters',
                type: 'number',
                category: 'limits',
                defaultValue: '0.1',
                required: false,
            },
        ],
        scheduling: [
            {
                name: 'ordering-policy',
                displayName: 'Ordering Policy',
                description: 'Policy for ordering applications in the queue',
                type: 'enum',
                category: 'scheduling',
                defaultValue: 'fifo',
                required: false,
                enumValues: ['fifo', 'fair'],
            },
        ],
        security: [
            {
                name: 'acl_submit_applications',
                displayName: 'Submit Applications ACL',
                description: 'Controls who can submit applications to this queue',
                type: 'string',
                category: 'security',
                defaultValue: '',
                required: false,
            },
            {
                name: 'acl_administer_queue',
                displayName: 'Administer Queue ACL',
                description: 'Controls who can administer this queue',
                type: 'string',
                category: 'security',
                defaultValue: '',
                required: false,
            },
        ],
        advanced: [
            {
                name: 'disable_preemption',
                displayName: 'Disable Preemption',
                description: 'Whether to disable preemption for this queue',
                type: 'boolean',
                category: 'advanced',
                defaultValue: 'false',
                required: false,
            },
            {
                name: 'intra-queue-preemption-disabled',
                displayName: 'Intra-queue Preemption Disabled',
                description: 'Whether to disable preemption within this queue',
                type: 'boolean',
                category: 'advanced',
                defaultValue: 'false',
                required: false,
            },
        ],
    },
    getStagedStatus: vi.fn().mockReturnValue(false),
    properties: [],
});

describe('PropertyEditorTab Scrolling Tests', () => {
    const mockUsePropertyEditor = usePropertyEditor as Mock;

    beforeEach(() => {
        vi.clearAllMocks();
        mockUsePropertyEditor.mockReturnValue(createMockUsePropertyEditor());
    });

    it('should render with proper scrollable layout structure', () => {
        render(<PropertyEditorTab queue={mockQueue} />);

        // Check that the main container has proper flex layout
        const mainContainer = screen.getByText('Queue Configuration').closest('[style*="flex"]');
        expect(mainContainer).toBeInTheDocument();

        // Check that all categories are rendered (which would require scrolling in a real scenario)
        expect(screen.getByText('General Configuration')).toBeInTheDocument();
        expect(screen.getByText('Resource Allocation')).toBeInTheDocument();
        expect(screen.getByText('Application Limits')).toBeInTheDocument();
        expect(screen.getByText('Scheduling Policy')).toBeInTheDocument();
        expect(screen.getByText('Security & Access Control')).toBeInTheDocument();
        expect(screen.getByText('Advanced Features')).toBeInTheDocument();
    });

    it('should have scrollable content area with proper styling', () => {
        const { container } = render(<PropertyEditorTab queue={mockQueue} />);

        // Find the scrollable content area (should have overflow: auto)
        const scrollableArea = container.querySelector('[style*="overflow"]');
        expect(scrollableArea).toBeInTheDocument();
    });

    it('should render many form fields that would require scrolling', () => {
        render(<PropertyEditorTab queue={mockQueue} />);

        // Expand all accordions to see all fields
        const accordions = screen.getAllByRole('button', { expanded: false });
        accordions.forEach(accordion => {
            if (accordion.getAttribute('aria-expanded') === 'false') {
                accordion.click();
            }
        });

        // Check that multiple fields from different categories are present
        expect(screen.getByText('Capacity')).toBeInTheDocument();
        expect(screen.getByText('Maximum Capacity')).toBeInTheDocument();
        expect(screen.getByText('User Limit Factor')).toBeInTheDocument();
        expect(screen.getByText('Maximum Applications')).toBeInTheDocument();
        expect(screen.getByText('Submit Applications ACL')).toBeInTheDocument();
        expect(screen.getByText('Disable Preemption')).toBeInTheDocument();
    });
});
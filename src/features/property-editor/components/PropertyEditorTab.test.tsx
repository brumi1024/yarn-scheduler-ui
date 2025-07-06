import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { PropertyEditorTab } from './PropertyEditorTab';
import { usePropertyEditor } from '~/features/property-editor/hooks/usePropertyEditor';
import { useSchedulerStore } from '~/stores/schedulerStore';
import type { QueueInfo, NodeLabel } from '~/types';

// Mock the hooks
vi.mock('~/features/property-editor/hooks/usePropertyEditor');
vi.mock('~/stores/schedulerStore');

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock PropertyFormField to avoid react-hook-form issues in tests
vi.mock('./PropertyFormField', () => ({
  PropertyFormField: ({ property }: any) => (
    <div data-testid={`property-field-${property.name}`}>
      <span>{property.displayName}</span>
    </div>
  ),
}));

describe('PropertyEditorTab', () => {
  const mockQueue: QueueInfo = {
    queueType: 'leaf',
    queueName: 'test-queue',
    queuePath: 'root.test-queue',
    absoluteCapacity: 50,
    absoluteMaxCapacity: 100,
    absoluteUsedCapacity: 25,
    capacity: 50,
    maxCapacity: 100,
    usedCapacity: 25,
    numApplications: 5,
    numActiveApplications: 3,
    numPendingApplications: 2,
    state: 'RUNNING',
    queues: undefined,
    resourcesUsed: {
      memory: 1024,
      vCores: 2,
    },
  };

  const mockNodeLabels: NodeLabel[] = [
    {
      name: 'gpu',
      exclusivity: true,
    },
    {
      name: 'ssd',
      exclusivity: false,
    },
  ];

  const mockPropertyEditor = {
    form: {
      control: {},
      handleSubmit: vi.fn(),
      register: vi.fn(),
      setValue: vi.fn(),
      getValues: vi.fn(),
      watch: vi.fn(),
      reset: vi.fn(),
      formState: { errors: {}, isDirty: false },
    },
    control: {},
    handleSubmit: vi.fn(),
    handleReset: vi.fn(),
    errors: {},
    isValid: true,
    hasChanges: false,
    watchedValues: {},
    propertiesByCategory: {
      general: [],
      resource: [],
      limits: [],
      scheduling: [],
      security: [],
      advanced: [],
      nodeLabels: [
        {
          name: 'accessible-node-labels.gpu.capacity',
          displayName: 'GPU Label Capacity',
          type: 'number' as const,
          defaultValue: '0',
          description: 'Capacity for GPU label',
          category: 'nodeLabels' as const,
          label: 'gpu',
          formFieldName: 'accessible-node-labels.gpu.capacity',
          required: false,
          validationRules: [],
        },
        {
          name: 'accessible-node-labels.ssd.capacity',
          displayName: 'SSD Label Capacity',
          type: 'number' as const,
          defaultValue: '0',
          description: 'Capacity for SSD label',
          category: 'nodeLabels' as const,
          label: 'ssd',
          formFieldName: 'accessible-node-labels.ssd.capacity',
          required: false,
          validationRules: [],
        },
      ],
    },
    getStagedStatus: vi.fn(),
    formState: { isDirty: false },
    handleFieldBlur: vi.fn(),
    getFieldWarnings: vi.fn(() => []),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePropertyEditor).mockReturnValue(mockPropertyEditor as any);
  });

  it('should show node label properties when queue has inherited access', () => {
    // Mock the store to indicate the queue has inherited access to labels
    vi.mocked(useSchedulerStore).mockReturnValue({
      nodeLabels: mockNodeLabels,
      getQueueAccessibility: vi.fn((queuePath, label) => {
        // Simulate inherited access - queue has access to gpu label but not ssd
        return label === 'gpu';
      }),
      hasQueueProperty: vi.fn(() => false), // No explicit config
    } as any);

    // Queue has no explicit accessible-node-labels configured
    vi.mocked(usePropertyEditor).mockReturnValue({
      ...mockPropertyEditor,
      watchedValues: {
        // undefined means no explicit configuration (will inherit from parent)
      },
    } as any);

    render(<PropertyEditorTab queue={mockQueue} />);

    // Should show node labels accordion since queue has inherited access
    expect(screen.getByText('Node Labels')).toBeInTheDocument();
    expect(
      screen.getByText('Per-label capacity configuration for accessible labels'),
    ).toBeInTheDocument();

    // Should show inherited badge
    expect(screen.getByText('Inherited')).toBeInTheDocument();

    // Click to open the Node Labels accordion
    const nodeLabelsTrigger = screen.getByRole('button', { name: /Node Labels/i });
    fireEvent.click(nodeLabelsTrigger);

    // Should only show GPU label properties (inherited access)
    expect(screen.getByText('Label: gpu')).toBeInTheDocument();
    expect(screen.getByText('GPU Label Capacity')).toBeInTheDocument();

    // Should NOT show SSD label properties (no access)
    expect(screen.queryByText('Label: ssd')).not.toBeInTheDocument();
    expect(screen.queryByText('SSD Label Capacity')).not.toBeInTheDocument();
  });

  it('should show all label properties when queue has explicit * access', () => {
    // Mock the store
    vi.mocked(useSchedulerStore).mockReturnValue({
      nodeLabels: mockNodeLabels,
      getQueueAccessibility: vi.fn(() => true), // All labels accessible
      hasQueueProperty: vi.fn(() => true), // Explicit config exists
    } as any);

    // Queue has * (all labels) access
    vi.mocked(usePropertyEditor).mockReturnValue({
      ...mockPropertyEditor,
      watchedValues: {
        'accessible-node-labels': '*',
      },
    } as any);

    render(<PropertyEditorTab queue={mockQueue} />);

    // Should show node labels accordion
    expect(screen.getByText('Node Labels')).toBeInTheDocument();

    // Should NOT show inherited badge since access is explicit
    expect(screen.queryByText('Inherited')).not.toBeInTheDocument();

    // Click to open the Node Labels accordion
    const nodeLabelsTrigger = screen.getByRole('button', { name: /Node Labels/i });
    fireEvent.click(nodeLabelsTrigger);

    // Should show all label properties
    expect(screen.getByText('Label: gpu')).toBeInTheDocument();
    expect(screen.getByText('GPU Label Capacity')).toBeInTheDocument();
    expect(screen.getByText('Label: ssd')).toBeInTheDocument();
    expect(screen.getByText('SSD Label Capacity')).toBeInTheDocument();
  });

  it('should not show node labels section when queue has no access to any labels', () => {
    // Mock the store - queue has no access to any labels
    vi.mocked(useSchedulerStore).mockReturnValue({
      nodeLabels: mockNodeLabels,
      getQueueAccessibility: vi.fn(() => false), // No label access
      hasQueueProperty: vi.fn(() => true), // Explicit empty config exists
    } as any);

    // Queue has empty accessible-node-labels (DEFAULT only)
    vi.mocked(usePropertyEditor).mockReturnValue({
      ...mockPropertyEditor,
      watchedValues: {
        'accessible-node-labels': '',
      },
    } as any);

    render(<PropertyEditorTab queue={mockQueue} />);

    // Should not show node labels section at all
    expect(screen.queryByText('Node Labels')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Per-label capacity configuration for accessible labels'),
    ).not.toBeInTheDocument();
  });
});

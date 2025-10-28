import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { PropertyEditorTab } from './PropertyEditorTab';
import { usePropertyEditor } from '~/features/property-editor/hooks/usePropertyEditor';
import type { QueueInfo } from '~/types';

// Mock the hooks
vi.mock('~/features/property-editor/hooks/usePropertyEditor');

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

const createMockPropertyEditor = () => ({
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
    general: [
      {
        name: 'capacity',
        displayName: 'Capacity',
        type: 'string' as const,
        defaultValue: '50',
        description: 'Queue capacity allocation',
        category: 'general' as const,
        formFieldName: 'capacity',
        required: true,
        validationRules: [],
      },
    ],
    resource: [],
    limits: [],
    scheduling: [],
    security: [],
    advanced: [],
  },
  getStagedStatus: vi.fn(),
  formState: { isDirty: false },
  handleFieldBlur: vi.fn(),
  getFieldErrors: vi.fn(() => []),
  getFieldWarnings: vi.fn(() => []),
  properties: [
    {
      name: 'capacity',
      displayName: 'Capacity',
      type: 'string' as const,
      defaultValue: '50',
      description: 'Queue capacity allocation',
      category: 'general' as const,
      formFieldName: 'capacity',
      required: true,
      validationRules: [],
    },
  ],
});

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

  let mockPropertyEditor: ReturnType<typeof createMockPropertyEditor>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPropertyEditor = createMockPropertyEditor();
    vi.mocked(usePropertyEditor).mockReturnValue(mockPropertyEditor as any);
  });

  it('renders configured property categories without node label capacity section', () => {
    render(<PropertyEditorTab queue={mockQueue} />);

    expect(screen.getByText('General Configuration')).toBeInTheDocument();
    expect(screen.getByText('Capacity')).toBeInTheDocument();
    expect(screen.queryByText('Node Labels')).not.toBeInTheDocument();
  });

  it('displays error badge when category has errors', () => {
    vi.mocked(usePropertyEditor).mockReturnValue({
      ...mockPropertyEditor,
      errors: {
        capacity: { message: 'Invalid capacity', type: 'validation' },
      },
    } as any);

    render(<PropertyEditorTab queue={mockQueue} />);

    expect(screen.getByText('General Configuration')).toBeInTheDocument();
    const generalTrigger = screen.getByRole('button', { name: /General Configuration/i });
    expect(within(generalTrigger).getByText('1')).toBeInTheDocument();
  });

  it('renders template configuration button when controls allow management', async () => {
    const templateProperty = {
      name: 'auto-queue-creation-v2.enabled',
      displayName: 'Flexible Auto-Creation',
      type: 'string' as const,
      defaultValue: 'false',
      description: 'Flexible mode toggle',
      category: 'general' as const,
      formFieldName: 'auto-queue-creation-v2__DOT__enabled',
      required: false,
      validationRules: [],
    };

    mockPropertyEditor.propertiesByCategory.general = [
      ...mockPropertyEditor.propertiesByCategory.general,
      templateProperty,
    ];
    mockPropertyEditor.properties = [...mockPropertyEditor.properties, templateProperty];

    const onOpenTemplateConfig = vi.fn();
    const user = userEvent.setup();

    render(
      <PropertyEditorTab
        queue={mockQueue}
        templateConfigControls={{
          canManageTemplates: true,
          legacyAvailable: false,
          flexibleAvailable: true,
          onOpenTemplateConfig,
        }}
      />,
    );

    const button = screen.getByRole('button', { name: /Manage template properties/i });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(onOpenTemplateConfig).toHaveBeenCalled();
  });
});

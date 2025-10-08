import { describe, it, expect } from 'vitest';
import { render, screen } from '~/testing/setup/setup';
import { PropertyFormField } from './PropertyFormField';
import { useForm, FormProvider } from 'react-hook-form';
import { getMockPropertyDescriptor } from '~/testing/factories';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '~/components/ui/tooltip';

// Helper component to wrap PropertyFormField with form context
function FormWrapper({
  children,
  defaultValues = {},
}: {
  children: React.ReactNode;
  defaultValues?: Record<string, string>;
}) {
  const methods = useForm({ defaultValues });
  return (
    <TooltipProvider>
      <FormProvider {...methods}>{children}</FormProvider>
    </TooltipProvider>
  );
}

describe('PropertyFormField', () => {
  it('should render text input for string property type', () => {
    const property = getMockPropertyDescriptor({
      name: 'user-limit-factor',
      displayName: 'User Limit Factor',
      type: 'string',
      required: false,
    });

    render(
      <FormWrapper>
        <PropertyFormField property={property} control={undefined as any} />
      </FormWrapper>,
    );

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(screen.getByText('User Limit Factor')).toBeInTheDocument();
  });

  it('should render number input for number property type', () => {
    const property = getMockPropertyDescriptor({
      name: 'maximum-applications',
      displayName: 'Maximum Applications',
      type: 'number',
      required: false,
    });

    render(
      <FormWrapper>
        <PropertyFormField property={property} control={undefined as any} />
      </FormWrapper>,
    );

    const input = screen.getByRole('spinbutton');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'number');
  });

  it('should render switch for boolean property type', () => {
    const property = getMockPropertyDescriptor({
      name: 'enable-preemption',
      displayName: 'Enable Preemption',
      type: 'boolean',
      required: false,
    });

    render(
      <FormWrapper defaultValues={{ 'enable-preemption': 'true' }}>
        <PropertyFormField property={property} control={undefined as any} />
      </FormWrapper>,
    );

    const switchElement = screen.getByRole('switch');
    expect(switchElement).toBeInTheDocument();
    expect(switchElement).toHaveAttribute('aria-checked', 'true');
  });

  it('should render toggle group for enum property type', () => {
    const property = getMockPropertyDescriptor({
      name: 'state',
      displayName: 'State',
      type: 'enum',
      enumValues: [
        { value: 'RUNNING', label: 'Running' },
        { value: 'STOPPED', label: 'Stopped' },
      ],
      required: false,
    });

    render(
      <FormWrapper defaultValues={{ state: 'RUNNING' }}>
        <PropertyFormField property={property} control={undefined as any} />
      </FormWrapper>,
    );

    expect(screen.getByRole('radio', { name: 'Running' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Stopped' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Running' })).toHaveAttribute('data-state', 'on');
  });

  it('renders choice cards for enum properties requesting card layout', () => {
    const property = getMockPropertyDescriptor({
      name: 'resource-calculator',
      displayName: 'Resource Calculator',
      type: 'enum',
      enumDisplay: 'choiceCard',
      enumValues: [
        {
          value: 'default',
          label: 'Default (Memory Only)',
          description: 'Memory-based calculator for simple clusters.',
        },
        {
          value: 'dominant',
          label: 'Dominant Resource',
          description: 'Considers both memory and CPU for fairness.',
        },
      ],
    });

    render(
      <FormWrapper defaultValues={{ 'resource-calculator': 'default' }}>
        <PropertyFormField property={property} control={undefined as any} />
      </FormWrapper>,
    );

    expect(screen.getByRole('radio', { name: /Default \(Memory Only\)/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Dominant Resource/i })).toBeInTheDocument();
    expect(screen.getByText('Memory-based calculator for simple clusters.')).toBeInTheDocument();
  });

  it('should show required indicator for required fields', () => {
    const property = getMockPropertyDescriptor({
      name: 'capacity',
      displayName: 'Capacity',
      type: 'string',
      required: true,
    });

    render(
      <FormWrapper>
        <PropertyFormField property={property} control={undefined as any} />
      </FormWrapper>,
    );

    expect(screen.getByText('Capacity *')).toBeInTheDocument();
  });

  it('should display the property description inline', () => {
    const property = getMockPropertyDescriptor({
      name: 'capacity',
      displayName: 'Capacity',
      description: 'This is the capacity description',
      type: 'string',
    });

    render(
      <FormWrapper>
        <PropertyFormField property={property} control={undefined as any} />
      </FormWrapper>,
    );

    expect(screen.getByText('This is the capacity description')).toBeInTheDocument();
  });

  it('should show staged badge when field is modified', () => {
    const property = getMockPropertyDescriptor({
      name: 'capacity',
      displayName: 'Capacity',
      type: 'string',
    });

    render(
      <FormWrapper>
        <PropertyFormField property={property} control={undefined as any} stagedStatus="modified" />
      </FormWrapper>,
    );

    expect(screen.getByText('Staged')).toBeInTheDocument();
  });

  it('should disable field based on enableWhen condition', () => {
    const property = getMockPropertyDescriptor({
      name: 'accessible-node-labels',
      displayName: 'Accessible Node Labels',
      type: 'string',
      enableWhen: {
        'node-labels-enabled': (value) => value === 'true',
      },
    });

    render(
      <FormWrapper>
        <PropertyFormField
          property={property}
          control={undefined as any}
          dependentValues={{ 'node-labels-enabled': 'false' }}
        />
      </FormWrapper>,
    );

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(
      screen.getByText('This field is disabled based on current configuration'),
    ).toBeInTheDocument();
  });

  it('should show deprecation warning for deprecated properties', () => {
    const property = getMockPropertyDescriptor({
      name: 'old-property',
      displayName: 'Old Property',
      type: 'string',
      deprecated: true,
      deprecationMessage: 'Use new-property instead',
    });

    render(
      <FormWrapper>
        <PropertyFormField property={property} control={undefined as any} />
      </FormWrapper>,
    );

    expect(screen.getByText('Deprecated')).toBeInTheDocument();
    expect(screen.getByText('Use new-property instead')).toBeInTheDocument();
  });

  it('should render textarea for ACL properties', () => {
    const property = getMockPropertyDescriptor({
      name: 'acl-submit-applications',
      displayName: 'Submit Applications ACL',
      type: 'string',
    });

    render(
      <FormWrapper>
        <PropertyFormField property={property} control={undefined as any} />
      </FormWrapper>,
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('should prevent deselection in enum toggle group', async () => {
    const user = userEvent.setup();
    const property = getMockPropertyDescriptor({
      name: 'state',
      displayName: 'State',
      type: 'enum',
      enumValues: [
        { value: 'RUNNING', label: 'Running' },
        { value: 'STOPPED', label: 'Stopped' },
      ],
    });

    render(
      <FormWrapper defaultValues={{ state: 'RUNNING' }}>
        <PropertyFormField property={property} control={undefined as any} />
      </FormWrapper>,
    );

    const runningToggle = screen.getByRole('radio', { name: 'Running' });
    expect(runningToggle).toHaveAttribute('data-state', 'on');

    // Try to click the already selected toggle
    await user.click(runningToggle);

    // Should still be selected
    expect(runningToggle).toHaveAttribute('data-state', 'on');
  });

  it('should display suffix for number fields with display format', () => {
    const property = getMockPropertyDescriptor({
      name: 'maximum-am-resource-percent',
      displayName: 'Maximum AM Resource Percent',
      type: 'number',
      displayFormat: {
        suffix: ' (0.0-1.0)',
        decimals: 2,
      },
    });

    render(
      <FormWrapper>
        <PropertyFormField property={property} control={undefined as any} />
      </FormWrapper>,
    );

    expect(screen.getByText('(0.0-1.0)')).toBeInTheDocument();
  });
});

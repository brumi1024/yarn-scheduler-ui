import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GlobalSettings } from './GlobalSettings';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { globalPropertyDefinitions } from '~/config/properties/global-properties';
import type { PropertyDescriptor } from '~/types/property-descriptor';
import type { StagedChange } from '~/types/staged-change';

// Mock the store
vi.mock('~/stores/schedulerStore');

// Mock the property definitions
vi.mock('~/config/properties/global-properties', () => ({
  globalPropertyDefinitions: [],
}));

// Mock UI components that might have complex implementations
vi.mock('~/components/ui/accordion', () => ({
  Accordion: ({ children, ...props }: any) => (
    <div data-testid="accordion" {...props}>
      {children}
    </div>
  ),
  AccordionContent: ({ children }: any) => <div data-testid="accordion-content">{children}</div>,
  AccordionItem: ({ children, ...props }: any) => (
    <div data-testid="accordion-item" {...props}>
      {children}
    </div>
  ),
  AccordionTrigger: ({ children }: any) => (
    <button data-testid="accordion-trigger">{children}</button>
  ),
}));

vi.mock('./PropertyInput', () => ({
  PropertyInput: vi.fn(({ property, value, isStaged, onChange }: any) => (
    <div data-testid={`property-input-${property.name}`}>
      <input
        data-testid={`input-${property.name}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        data-is-staged={isStaged}
      />
    </div>
  )),
}));

// Test data factories
const getMockPropertyDescriptor = (overrides?: Partial<PropertyDescriptor>): PropertyDescriptor => {
  return {
    name: 'test-property',
    displayName: 'Test Property',
    description: 'A test property',
    type: 'string',
    category: 'general',
    defaultValue: 'default',
    required: false,
    ...overrides,
  };
};

const getMockStagedChange = (overrides?: Partial<StagedChange>): StagedChange => {
  return {
    id: 'change-123',
    type: 'update',
    queuePath: 'global',
    property: 'test-property',
    oldValue: 'old',
    newValue: 'new',
    timestamp: Date.now(),
    ...overrides,
  };
};

// Mock store implementation
const createMockStore = (overrides?: Partial<ReturnType<typeof useSchedulerStore>>) => ({
  getGlobalPropertyValue: vi.fn().mockReturnValue({ value: 'test-value', isStaged: false }),
  stageGlobalChange: vi.fn(),
  stagedChanges: [],
  ...overrides,
});

describe('GlobalSettings', () => {
  const mockUseSchedulerStore = useSchedulerStore as any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset property definitions
    (globalPropertyDefinitions as PropertyDescriptor[]).length = 0;
  });

  describe('rendering', () => {
    it('should render a message when no global properties are available', () => {
      mockUseSchedulerStore.mockReturnValue(createMockStore());

      render(<GlobalSettings />);

      expect(screen.getByText('No Global Properties Available')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Global properties configuration is not available. Please check the configuration setup.',
        ),
      ).toBeInTheDocument();
    });

    it('should render property categories as accordion items', () => {
      const properties = [
        getMockPropertyDescriptor({ name: 'prop1', category: 'general' }),
        getMockPropertyDescriptor({ name: 'prop2', category: 'security' }),
        getMockPropertyDescriptor({ name: 'prop3', category: 'general' }),
      ];
      (globalPropertyDefinitions as PropertyDescriptor[]).push(...properties);
      mockUseSchedulerStore.mockReturnValue(createMockStore());

      render(<GlobalSettings />);

      expect(screen.getByText('general Settings')).toBeInTheDocument();
      expect(screen.getByText('security Settings')).toBeInTheDocument();
    });

    it('should render all properties within their categories', () => {
      const properties = [
        getMockPropertyDescriptor({ name: 'prop1', category: 'general' }),
        getMockPropertyDescriptor({ name: 'prop2', category: 'general' }),
        getMockPropertyDescriptor({ name: 'prop3', category: 'security' }),
      ];
      (globalPropertyDefinitions as PropertyDescriptor[]).push(...properties);
      mockUseSchedulerStore.mockReturnValue(createMockStore());

      render(<GlobalSettings />);

      expect(screen.getByTestId('property-input-prop1')).toBeInTheDocument();
      expect(screen.getByTestId('property-input-prop2')).toBeInTheDocument();
      expect(screen.getByTestId('property-input-prop3')).toBeInTheDocument();
    });

    it('should display current property values', () => {
      const properties = [
        getMockPropertyDescriptor({ name: 'prop1' }),
        getMockPropertyDescriptor({ name: 'prop2' }),
      ];
      (globalPropertyDefinitions as PropertyDescriptor[]).push(...properties);

      const mockStore = createMockStore({
        getGlobalPropertyValue: vi
          .fn()
          .mockReturnValueOnce({ value: 'value1', isStaged: false })
          .mockReturnValueOnce({ value: 'value2', isStaged: true }),
      });
      mockUseSchedulerStore.mockReturnValue(mockStore);

      render(<GlobalSettings />);

      expect(screen.getByTestId('input-prop1')).toHaveValue('value1');
      expect(screen.getByTestId('input-prop2')).toHaveValue('value2');
      expect(screen.getByTestId('input-prop2')).toHaveAttribute('data-is-staged', 'true');
    });
  });

  describe('unsaved changes alert', () => {
    it('should not display alert when there are no staged changes', () => {
      const properties = [getMockPropertyDescriptor()];
      (globalPropertyDefinitions as PropertyDescriptor[]).push(...properties);
      mockUseSchedulerStore.mockReturnValue(createMockStore());

      render(<GlobalSettings />);

      expect(screen.queryByText(/You have \d+ unsaved global setting/)).not.toBeInTheDocument();
    });

    it('should display alert when there are global staged changes', () => {
      const properties = [getMockPropertyDescriptor()];
      (globalPropertyDefinitions as PropertyDescriptor[]).push(...properties);

      const stagedChanges = [
        getMockStagedChange({ property: 'prop1' }),
        getMockStagedChange({ property: 'prop2' }),
      ];
      mockUseSchedulerStore.mockReturnValue(createMockStore({ stagedChanges }));

      render(<GlobalSettings />);

      expect(
        screen.getByText('You have 2 unsaved global settings. Apply changes to make them active.'),
      ).toBeInTheDocument();
    });

    it('should display correct singular/plural text for staged changes', () => {
      const properties = [getMockPropertyDescriptor()];
      (globalPropertyDefinitions as PropertyDescriptor[]).push(...properties);

      const stagedChanges = [getMockStagedChange()];
      mockUseSchedulerStore.mockReturnValue(createMockStore({ stagedChanges }));

      render(<GlobalSettings />);

      expect(
        screen.getByText('You have 1 unsaved global setting. Apply changes to make them active.'),
      ).toBeInTheDocument();
    });

    it('should only count global staged changes, not queue-specific ones', () => {
      const properties = [getMockPropertyDescriptor()];
      (globalPropertyDefinitions as PropertyDescriptor[]).push(...properties);

      const stagedChanges = [
        getMockStagedChange({ queuePath: 'global' }),
        getMockStagedChange({ queuePath: 'root.queue1' }),
        getMockStagedChange({ queuePath: 'global' }),
      ];
      mockUseSchedulerStore.mockReturnValue(createMockStore({ stagedChanges }));

      render(<GlobalSettings />);

      expect(
        screen.getByText('You have 2 unsaved global settings. Apply changes to make them active.'),
      ).toBeInTheDocument();
    });
  });

  describe('category badges', () => {
    it('should show "Has Changes" badge for categories with staged changes', () => {
      const properties = [
        getMockPropertyDescriptor({ name: 'prop1', category: 'general' }),
        getMockPropertyDescriptor({ name: 'prop2', category: 'security' }),
      ];
      (globalPropertyDefinitions as PropertyDescriptor[]).push(...properties);

      const stagedChanges = [getMockStagedChange({ property: 'prop1' })];
      mockUseSchedulerStore.mockReturnValue(createMockStore({ stagedChanges }));

      render(<GlobalSettings />);

      // Find the general category heading and its badge
      const generalHeading = screen.getByText('general Settings').closest('div');
      expect(generalHeading).toHaveTextContent('Has Changes');

      // Security category should not have the badge
      const securityHeading = screen.getByText('security Settings').closest('div');
      expect(securityHeading).not.toHaveTextContent('Has Changes');
    });

    it('should not show badge when category has no changes', () => {
      const properties = [
        getMockPropertyDescriptor({ name: 'prop1', category: 'general' }),
        getMockPropertyDescriptor({ name: 'prop2', category: 'general' }),
      ];
      (globalPropertyDefinitions as PropertyDescriptor[]).push(...properties);
      mockUseSchedulerStore.mockReturnValue(createMockStore());

      render(<GlobalSettings />);

      const generalHeading = screen.getByText('general Settings').closest('div');
      expect(generalHeading).not.toHaveTextContent('Has Changes');
    });
  });

  describe('user interactions', () => {
    it('should call stageGlobalChange when property value is changed', () => {
      const properties = [getMockPropertyDescriptor({ name: 'test-property' })];
      (globalPropertyDefinitions as PropertyDescriptor[]).push(...properties);

      const mockStore = createMockStore();
      mockUseSchedulerStore.mockReturnValue(mockStore);

      render(<GlobalSettings />);

      const input = screen.getByTestId('input-test-property');

      // Simulate a real change event with final value
      fireEvent.change(input, { target: { value: 'new-value' } });

      // Verify the function was called with expected value
      expect(mockStore.stageGlobalChange).toHaveBeenCalledWith('test-property', 'new-value', []);
    });

    it('should handle multiple property changes independently', () => {
      const properties = [
        getMockPropertyDescriptor({ name: 'prop1', category: 'general' }),
        getMockPropertyDescriptor({ name: 'prop2', category: 'general' }),
      ];
      (globalPropertyDefinitions as PropertyDescriptor[]).push(...properties);

      const mockStore = createMockStore();
      mockUseSchedulerStore.mockReturnValue(mockStore);

      render(<GlobalSettings />);

      const input1 = screen.getByTestId('input-prop1');
      const input2 = screen.getByTestId('input-prop2');

      // Change first input
      fireEvent.change(input1, { target: { value: 'value1' } });

      // Change second input
      fireEvent.change(input2, { target: { value: 'value2' } });

      // Verify both properties were updated
      expect(mockStore.stageGlobalChange).toHaveBeenCalledWith('prop1', 'value1', []);
      expect(mockStore.stageGlobalChange).toHaveBeenCalledWith('prop2', 'value2', []);
    });
  });

  describe('property ordering', () => {
    it('should display categories in alphabetical order', () => {
      const properties = [
        getMockPropertyDescriptor({ category: 'advanced' }),
        getMockPropertyDescriptor({ category: 'general' }),
        getMockPropertyDescriptor({ category: 'resource' }),
      ];
      (globalPropertyDefinitions as PropertyDescriptor[]).push(...properties);
      mockUseSchedulerStore.mockReturnValue(createMockStore());

      render(<GlobalSettings />);

      const headings = screen.getAllByTestId('accordion-trigger');
      expect(headings[0]).toHaveTextContent('advanced Settings');
      expect(headings[1]).toHaveTextContent('general Settings');
      expect(headings[2]).toHaveTextContent('resource Settings');
    });

    it('should maintain property order within categories as defined', () => {
      const properties = [
        getMockPropertyDescriptor({ name: 'prop3', category: 'general' }),
        getMockPropertyDescriptor({ name: 'prop1', category: 'general' }),
        getMockPropertyDescriptor({ name: 'prop2', category: 'general' }),
      ];
      (globalPropertyDefinitions as PropertyDescriptor[]).push(...properties);
      mockUseSchedulerStore.mockReturnValue(createMockStore());

      render(<GlobalSettings />);

      const propertyInputs = screen.getAllByTestId(/^property-input-prop/);
      expect(propertyInputs[0]).toHaveAttribute('data-testid', 'property-input-prop3');
      expect(propertyInputs[1]).toHaveAttribute('data-testid', 'property-input-prop1');
      expect(propertyInputs[2]).toHaveAttribute('data-testid', 'property-input-prop2');
    });
  });

  describe('property value synchronization', () => {
    it('should request correct property values from store', () => {
      const properties = [
        getMockPropertyDescriptor({ name: 'prop1' }),
        getMockPropertyDescriptor({ name: 'prop2' }),
      ];
      (globalPropertyDefinitions as PropertyDescriptor[]).push(...properties);

      const mockStore = createMockStore();
      mockUseSchedulerStore.mockReturnValue(mockStore);

      render(<GlobalSettings />);

      expect(mockStore.getGlobalPropertyValue).toHaveBeenCalledWith('prop1');
      expect(mockStore.getGlobalPropertyValue).toHaveBeenCalledWith('prop2');
    });

    it('should pass staged status to property inputs', () => {
      const properties = [
        getMockPropertyDescriptor({ name: 'staged-prop' }),
        getMockPropertyDescriptor({ name: 'unstaged-prop' }),
      ];
      (globalPropertyDefinitions as PropertyDescriptor[]).push(...properties);

      const mockStore = createMockStore({
        getGlobalPropertyValue: vi
          .fn()
          .mockReturnValueOnce({ value: 'val1', isStaged: true })
          .mockReturnValueOnce({ value: 'val2', isStaged: false }),
      });
      mockUseSchedulerStore.mockReturnValue(mockStore);

      render(<GlobalSettings />);

      expect(screen.getByTestId('input-staged-prop')).toHaveAttribute('data-is-staged', 'true');
      expect(screen.getByTestId('input-unstaged-prop')).toHaveAttribute('data-is-staged', 'false');
    });
  });

  describe('accordion behavior', () => {
    it('should render all category accordions', () => {
      const properties = [
        getMockPropertyDescriptor({ name: 'prop1', category: 'general' }),
        getMockPropertyDescriptor({ name: 'prop2', category: 'security' }),
        getMockPropertyDescriptor({ name: 'prop3', category: 'scheduling' }),
      ];
      (globalPropertyDefinitions as PropertyDescriptor[]).push(...properties);
      mockUseSchedulerStore.mockReturnValue(createMockStore());

      render(<GlobalSettings />);

      // Verify all category accordions are rendered
      expect(screen.getByText('general Settings')).toBeInTheDocument();
      expect(screen.getByText('security Settings')).toBeInTheDocument();
      expect(screen.getByText('scheduling Settings')).toBeInTheDocument();

      // Verify correct number of accordion items
      const accordionItems = screen.getAllByTestId('accordion-item');
      expect(accordionItems).toHaveLength(3);
    });
  });

  describe('edge cases', () => {
    it('should handle empty property values gracefully', () => {
      const properties = [getMockPropertyDescriptor()];
      (globalPropertyDefinitions as PropertyDescriptor[]).push(...properties);

      const mockStore = createMockStore({
        getGlobalPropertyValue: vi.fn().mockReturnValue({ value: '', isStaged: false }),
      });
      mockUseSchedulerStore.mockReturnValue(mockStore);

      render(<GlobalSettings />);

      expect(screen.getByTestId('input-test-property')).toHaveValue('');
    });

    it('should handle properties with special characters in names', () => {
      const properties = [
        getMockPropertyDescriptor({ name: 'property-with-dashes' }),
        getMockPropertyDescriptor({ name: 'property.with.dots' }),
      ];
      (globalPropertyDefinitions as PropertyDescriptor[]).push(...properties);

      const mockStore = createMockStore();
      mockUseSchedulerStore.mockReturnValue(mockStore);

      render(<GlobalSettings />);

      const input1 = screen.getByTestId('input-property-with-dashes');
      const input2 = screen.getByTestId('input-property.with.dots');

      // Change inputs
      fireEvent.change(input1, { target: { value: 'test1' } });
      fireEvent.change(input2, { target: { value: 'test2' } });

      // Verify the property names were handled correctly
      expect(mockStore.stageGlobalChange).toHaveBeenCalledWith('property-with-dashes', 'test1', []);
      expect(mockStore.stageGlobalChange).toHaveBeenCalledWith('property.with.dots', 'test2', []);
    });

    it('should render correctly when properties have the same category', () => {
      const properties = [
        getMockPropertyDescriptor({ name: 'prop1', category: 'general' }),
        getMockPropertyDescriptor({ name: 'prop2', category: 'general' }),
        getMockPropertyDescriptor({ name: 'prop3', category: 'general' }),
      ];
      (globalPropertyDefinitions as PropertyDescriptor[]).push(...properties);
      mockUseSchedulerStore.mockReturnValue(createMockStore());

      render(<GlobalSettings />);

      // Should only have one accordion item for the general category
      expect(screen.getAllByTestId('accordion-item')).toHaveLength(1);
      expect(screen.getByText('general Settings')).toBeInTheDocument();

      // But all three properties should be rendered
      expect(screen.getByTestId('property-input-prop1')).toBeInTheDocument();
      expect(screen.getByTestId('property-input-prop2')).toBeInTheDocument();
      expect(screen.getByTestId('property-input-prop3')).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlacementRuleForm } from './PlacementRuleForm';
import type { PlacementRule } from '~/types/features/placement-rules';

// Mock the scheduler store
vi.mock('~/stores/schedulerStore', () => ({
  useSchedulerStore: () => ({
    schedulerData: {
      queueName: 'root',
      capacity: 100,
      usedCapacity: 0,
      maxCapacity: 100,
      queues: {
        queue: [
          {
            queueName: 'users',
            queuePath: 'root.users',
            capacity: 50,
            queues: {
              queue: [],
            },
          },
          {
            queueName: 'production',
            queuePath: 'root.production',
            capacity: 50,
            queues: null,
          },
        ],
      },
    },
  }),
}));

// Mock pointer capture methods for Radix UI Select component
beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

describe('PlacementRuleForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render form with default values for new rule', () => {
    render(<PlacementRuleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByText('Add Placement Rule')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /rule type/i })).toBeInTheDocument();
    // Use getAllByText since Select renders value in multiple places
    expect(screen.getAllByText('User')[0]).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /match pattern/i })).toHaveValue('*');
    expect(screen.getByRole('combobox', { name: /placement policy/i })).toBeInTheDocument();
    expect(screen.getAllByText('User Queue')[0]).toBeInTheDocument();
  });

  it('should render form with existing rule values for edit', () => {
    const existingRule: PlacementRule = {
      type: 'group',
      matches: 'production',
      policy: 'specified',
      value: 'root.production',
      create: true,
      fallbackResult: 'placeDefault',
    };

    render(
      <PlacementRuleForm
        rule={existingRule}
        ruleIndex={0}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText('Edit Placement Rule')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /rule type/i })).toBeInTheDocument();
    // Use getAllByText since Select renders value in multiple places
    expect(screen.getAllByText('Group')[0]).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /match pattern/i })).toHaveValue('production');
    expect(screen.getByRole('combobox', { name: /placement policy/i })).toBeInTheDocument();
    expect(screen.getAllByText('Specified Queue')[0]).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Queue Value' })).toBeInTheDocument();
    // The form is correctly initialized with the value 'root.production'
    // The combobox will display it if it's in the available queues
  });

  describe('dynamic field visibility', () => {
    it('should show value field when policy is specified', async () => {
      const user = userEvent.setup();
      render(<PlacementRuleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const policySelect = screen.getByRole('combobox', { name: /placement policy/i });
      await user.click(policySelect);
      await user.click(screen.getByRole('option', { name: /specified queue/i }));

      expect(screen.getByRole('combobox', { name: 'Queue Value' })).toBeInTheDocument();
    });

    it('should show parent queue field for primaryGroupUser policy', async () => {
      const user = userEvent.setup();
      render(<PlacementRuleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const policySelect = screen.getByRole('combobox', { name: /placement policy/i });
      await user.click(policySelect);
      await user.click(screen.getByRole('option', { name: /primary group → user/i }));

      expect(screen.getByRole('combobox', { name: /parent queue/i })).toBeInTheDocument();
    });

    it('should show custom placement field for custom policy', async () => {
      const user = userEvent.setup();
      render(<PlacementRuleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const policySelect = screen.getByRole('combobox', { name: /placement policy/i });
      await user.click(policySelect);
      await user.click(screen.getByRole('option', { name: /custom placement/i }));

      expect(
        screen.getByRole('textbox', { name: /custom placement pattern/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view variables/i })).toBeInTheDocument();
    });

    it('should hide create option for reject policy', async () => {
      const user = userEvent.setup();
      render(<PlacementRuleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      // Initially should show create option
      expect(screen.getByText(/create queue if it doesn't exist/i)).toBeInTheDocument();

      const policySelect = screen.getByRole('combobox', { name: /placement policy/i });
      await user.click(policySelect);
      await user.click(screen.getByRole('option', { name: /reject application/i }));

      expect(screen.queryByText(/create queue if it doesn't exist/i)).not.toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('should require match pattern', async () => {
      const user = userEvent.setup();
      render(<PlacementRuleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const matchInput = screen.getByRole('textbox', { name: /match pattern/i });
      await user.clear(matchInput);
      await user.click(screen.getByRole('button', { name: /add rule/i }));

      expect(await screen.findByText('Match pattern is required')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should require value when policy is specified', async () => {
      const user = userEvent.setup();
      render(<PlacementRuleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const policySelect = screen.getByRole('combobox', { name: /placement policy/i });
      await user.click(policySelect);
      await user.click(screen.getByRole('option', { name: /specified queue/i }));

      await user.click(screen.getByRole('button', { name: /add rule/i }));

      expect(
        await screen.findByText('Queue value is required when policy is "specified"'),
      ).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should require value when policy is setDefaultQueue', async () => {
      const user = userEvent.setup();
      render(<PlacementRuleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const policySelect = screen.getByRole('combobox', { name: /placement policy/i });
      await user.click(policySelect);
      await user.click(screen.getByRole('option', { name: /set as default queue/i }));

      await user.click(screen.getByRole('button', { name: /add rule/i }));

      expect(
        await screen.findByText('Queue value is required when policy is "setDefaultQueue"'),
      ).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should require parent queue for primaryGroupUser policy', async () => {
      const user = userEvent.setup();
      render(<PlacementRuleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const policySelect = screen.getByRole('combobox', { name: /placement policy/i });
      await user.click(policySelect);
      await user.click(screen.getByRole('option', { name: /primary group → user/i }));

      await user.click(screen.getByRole('button', { name: /add rule/i }));

      expect(
        await screen.findByText('Parent queue is required for this policy'),
      ).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should require custom placement for custom policy', async () => {
      const user = userEvent.setup();
      render(<PlacementRuleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const policySelect = screen.getByRole('combobox', { name: /placement policy/i });
      await user.click(policySelect);
      await user.click(screen.getByRole('option', { name: /custom placement/i }));

      await user.click(screen.getByRole('button', { name: /add rule/i }));

      expect(
        await screen.findByText('Custom placement pattern is required when policy is "custom"'),
      ).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('form submission', () => {
    it('should submit valid form data for new rule', async () => {
      const user = userEvent.setup();

      // Create a custom rule with specified policy to test queue value combobox
      const customRule: PlacementRule = {
        type: 'user',
        matches: 'alice',
        policy: 'specified',
        value: 'root.users',
        create: false,
      };

      render(
        <PlacementRuleForm rule={customRule} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
      );

      // The form should be pre-filled with the custom rule values
      expect(screen.getByRole('textbox', { name: /match pattern/i })).toHaveValue('alice');
      expect(screen.getByRole('combobox', { name: 'Queue Value' })).toBeInTheDocument();

      // Submit the form without changes
      await user.click(screen.getByRole('button', { name: /update rule/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          {
            type: 'user',
            matches: 'alice',
            policy: 'specified',
            value: 'root.users',
            create: false,
            fallbackResult: 'skip',
          },
          undefined,
        );
      });
    });

    it('should submit valid form data for edit with index', async () => {
      const user = userEvent.setup();
      const existingRule: PlacementRule = {
        type: 'group',
        matches: 'production',
        policy: 'primaryGroup',
        fallbackResult: 'skip',
      };

      render(
        <PlacementRuleForm
          rule={existingRule}
          ruleIndex={2}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />,
      );

      const matchInput = screen.getByRole('textbox', { name: /match pattern/i });
      await user.clear(matchInput);
      await user.type(matchInput, 'dev-team');

      await user.click(screen.getByRole('button', { name: /update rule/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          {
            type: 'group',
            matches: 'dev-team',
            policy: 'primaryGroup',
            create: false,
            fallbackResult: 'skip',
          },
          2,
        );
      });
    });

    it('should include optional fields only when they have values', async () => {
      const user = userEvent.setup();

      // Test with an existing rule that has optional fields
      const existingRule: PlacementRule = {
        type: 'user',
        matches: '*',
        policy: 'custom',
        parentQueue: 'root.users',
        customPlacement: 'root.%primary_group.%user',
        create: true,
        fallbackResult: 'skip',
      };

      render(
        <PlacementRuleForm rule={existingRule} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
      );

      // Verify the form is populated correctly
      expect(screen.getByRole('textbox', { name: /match pattern/i })).toHaveValue('*');
      expect(screen.getByRole('textbox', { name: /custom placement pattern/i })).toHaveValue(
        'root.%primary_group.%user',
      );
      expect(screen.getByRole('combobox', { name: /parent queue/i })).toBeInTheDocument();

      // Submit the form
      await user.click(screen.getByRole('button', { name: /update rule/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          {
            type: 'user',
            matches: '*',
            policy: 'custom',
            parentQueue: 'root.users',
            customPlacement: 'root.%primary_group.%user',
            create: true,
            fallbackResult: 'skip',
          },
          undefined,
        );
      });
    });
  });

  describe('cancel functionality', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<PlacementRuleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('rule type descriptions', () => {
    it('should show appropriate description for user type', async () => {
      render(<PlacementRuleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByText(/use \* to match all users/i)).toBeInTheDocument();
    });

    it('should show appropriate description for group type', async () => {
      const user = userEvent.setup();
      render(<PlacementRuleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const typeSelect = screen.getByRole('combobox', { name: /rule type/i });
      await user.click(typeSelect);
      await user.click(screen.getByRole('option', { name: /group/i }));

      expect(screen.getByText(/use \* to match all groups/i)).toBeInTheDocument();
    });

    it('should show appropriate description for application type', async () => {
      const user = userEvent.setup();
      render(<PlacementRuleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      const typeSelect = screen.getByRole('combobox', { name: /rule type/i });
      await user.click(typeSelect);
      await user.click(screen.getByRole('option', { name: /application/i }));

      expect(screen.getByText(/use \* to match all apps/i)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have accessible form labels', () => {
      render(<PlacementRuleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      expect(screen.getByLabelText(/rule type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/match pattern/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/placement policy/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/fallback behavior/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<PlacementRuleForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      // Tab through form fields
      await user.tab();
      expect(screen.getByRole('combobox', { name: /rule type/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('textbox', { name: /match pattern/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('combobox', { name: /placement policy/i })).toHaveFocus();
    });
  });
});

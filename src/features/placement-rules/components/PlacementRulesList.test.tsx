import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlacementRulesList } from './PlacementRulesList';
import { useSchedulerStore } from '~/stores/schedulerStore';
import type { PlacementRule } from '~/types/features/placement-rules';

// Mock the store
vi.mock('~/stores/schedulerStore');

// Mock the components
vi.mock('./PlacementRuleItem', () => ({
  PlacementRuleItem: vi.fn(({ rule, index, onEdit, onDelete }) => (
    <div data-testid={`rule-item-${index}`}>
      <span>{rule.type}</span>
      <span>{rule.matches}</span>
      <button onClick={onEdit}>Edit</button>
      <button onClick={onDelete}>Delete</button>
    </div>
  )),
}));

vi.mock('./PlacementRuleForm', () => ({
  PlacementRuleForm: vi.fn(({ onSubmit, onCancel, rule, ruleIndex }) => (
    <div data-testid="placement-rule-form">
      <h2>{rule ? 'Edit' : 'Add'} Rule Form</h2>
      <button
        onClick={() => onSubmit({ type: 'user', matches: 'test', policy: 'user' }, ruleIndex)}
      >
        Submit
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )),
}));

// Mock pragmatic drag and drop
vi.mock('@atlaskit/pragmatic-drag-and-drop/element/adapter', () => ({
  monitorForElements: vi.fn(() => vi.fn()),
}));

describe('PlacementRulesList', () => {
  const mockRules: PlacementRule[] = [
    {
      type: 'user',
      matches: 'alice',
      policy: 'specified',
      value: 'root.users.alice',
    },
    {
      type: 'group',
      matches: 'developers',
      policy: 'primaryGroup',
    },
  ];

  const mockStoreFunctions = {
    rules: [],
    selectedRuleIndex: null,
    addRule: vi.fn(),
    updateRule: vi.fn(),
    deleteRule: vi.fn(),
    reorderRules: vi.fn(),
    selectRule: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSchedulerStore).mockReturnValue(mockStoreFunctions);
  });

  it('should render empty state when no rules exist', () => {
    render(<PlacementRulesList />);

    expect(screen.getByText('No placement rules configured')).toBeInTheDocument();
    expect(
      screen.getByText('Applications will use the default queue assignment behavior'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add first rule/i })).toBeInTheDocument();
  });

  it('should render list of rules when rules exist', () => {
    vi.mocked(useSchedulerStore).mockReturnValue({
      ...mockStoreFunctions,
      rules: mockRules,
    });

    render(<PlacementRulesList />);

    expect(screen.getByTestId('rule-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('rule-item-1')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('developers')).toBeInTheDocument();
  });

  it('should show add form when Add Rule button is clicked', async () => {
    const user = userEvent.setup();
    render(<PlacementRulesList />);

    const addButton = screen.getByRole('button', { name: /add rule/i });
    await user.click(addButton);

    expect(screen.getByTestId('placement-rule-form')).toBeInTheDocument();
    expect(screen.getByText('Add Rule Form')).toBeInTheDocument();
  });

  it('should call addRule when form is submitted for new rule', async () => {
    const user = userEvent.setup();
    render(<PlacementRulesList />);

    // Click add button to show form
    await user.click(screen.getByRole('button', { name: /add rule/i }));

    // Submit form
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(mockStoreFunctions.addRule).toHaveBeenCalledWith({
      type: 'user',
      matches: 'test',
      policy: 'user',
    });
  });

  it('should hide form when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<PlacementRulesList />);

    // Show form
    await user.click(screen.getByRole('button', { name: /add rule/i }));
    expect(screen.getByTestId('placement-rule-form')).toBeInTheDocument();

    // Cancel form
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByTestId('placement-rule-form')).not.toBeInTheDocument();
  });

  it('should show edit form when edit is clicked on a rule', async () => {
    const user = userEvent.setup();
    vi.mocked(useSchedulerStore).mockReturnValue({
      ...mockStoreFunctions,
      rules: mockRules,
    });

    render(<PlacementRulesList />);

    // Click edit on first rule
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);

    expect(screen.getByTestId('placement-rule-form')).toBeInTheDocument();
    expect(screen.getByText('Edit Rule Form')).toBeInTheDocument();
  });

  it('should call updateRule when form is submitted for editing', async () => {
    const user = userEvent.setup();
    vi.mocked(useSchedulerStore).mockReturnValue({
      ...mockStoreFunctions,
      rules: mockRules,
    });

    render(<PlacementRulesList />);

    // Click edit
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);

    // Submit form
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(mockStoreFunctions.updateRule).toHaveBeenCalledWith(0, {
      type: 'user',
      matches: 'test',
      policy: 'user',
    });
  });

  it('should call deleteRule when delete is clicked on a rule', async () => {
    const user = userEvent.setup();
    vi.mocked(useSchedulerStore).mockReturnValue({
      ...mockStoreFunctions,
      rules: mockRules,
    });

    render(<PlacementRulesList />);

    // Click delete on first rule
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    expect(mockStoreFunctions.deleteRule).toHaveBeenCalledWith(0);
  });

  it('should display info alert about rule evaluation order', () => {
    vi.mocked(useSchedulerStore).mockReturnValue({
      ...mockStoreFunctions,
      rules: mockRules,
    });

    render(<PlacementRulesList />);

    expect(
      screen.getByText(
        'Rules are evaluated from top to bottom. The first matching rule determines the queue assignment. Drag rules to reorder them.',
      ),
    ).toBeInTheDocument();
  });

  it('should render rules without drag and drop wrappers', () => {
    vi.mocked(useSchedulerStore).mockReturnValue({
      ...mockStoreFunctions,
      rules: mockRules,
    });

    render(<PlacementRulesList />);

    // Rules should be rendered directly without DnD wrappers
    expect(screen.getByTestId('rule-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('rule-item-1')).toBeInTheDocument();
    expect(screen.queryByTestId('dnd-context')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sortable-context')).not.toBeInTheDocument();
  });
});

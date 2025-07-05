import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlacementRuleItem } from './PlacementRuleItem';
import type { PlacementRule } from '~/types/features/placement-rules';

// Mock @dnd-kit/sortable
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ''),
    },
  },
}));

describe('PlacementRuleItem', () => {
  const mockRule: PlacementRule = {
    type: 'user',
    matches: 'alice',
    policy: 'specified',
    value: 'root.users.alice',
    create: false,
    fallbackResult: 'skip',
  };

  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render rule item with basic information', () => {
    render(
      <PlacementRuleItem
        rule={mockRule}
        index={0}
        isSelected={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSelect={mockOnSelect}
      />,
    );

    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('Specified Queue')).toBeInTheDocument();
  });

  it('should expand and collapse to show/hide details', async () => {
    const user = userEvent.setup();
    render(
      <PlacementRuleItem
        rule={mockRule}
        index={0}
        isSelected={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSelect={mockOnSelect}
      />,
    );

    // Initially collapsed - details should not be visible
    expect(screen.queryByText('Queue Value:')).not.toBeInTheDocument();

    // Click expand button - find button with chevron icon
    const buttons = screen.getAllByRole('button');
    const expandButton = buttons.find((btn) =>
      btn.querySelector('svg')?.classList.contains('lucide-chevron-down'),
    );

    if (expandButton) {
      await user.click(expandButton);
    }

    // Details should now be visible
    expect(screen.getByText('Queue Value:')).toBeInTheDocument();
    expect(screen.getByText('root.users.alice')).toBeInTheDocument();
    expect(screen.getByText('Create Queue:')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('Fallback:')).toBeInTheDocument();
    expect(screen.getByText('skip')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <PlacementRuleItem
        rule={mockRule}
        index={0}
        isSelected={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSelect={mockOnSelect}
      />,
    );

    const buttons = screen.getAllByRole('button');
    const editBtn = buttons.find((btn) =>
      btn.querySelector('svg')?.classList.contains('lucide-pen'),
    );

    if (editBtn) {
      await user.click(editBtn);
      expect(mockOnEdit).toHaveBeenCalledOnce();
    }
  });

  it('should show delete confirmation dialog', async () => {
    const user = userEvent.setup();
    render(
      <PlacementRuleItem
        rule={mockRule}
        index={0}
        isSelected={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSelect={mockOnSelect}
      />,
    );

    const buttons = screen.getAllByRole('button');
    const deleteBtn = buttons.find((btn) =>
      btn.querySelector('svg')?.classList.contains('lucide-trash2'),
    );

    if (deleteBtn) {
      await user.click(deleteBtn);
      expect(screen.getByText('Delete Placement Rule')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Are you sure you want to delete this placement rule? This action will be staged and can be reverted before applying.',
        ),
      ).toBeInTheDocument();
    }
  });

  it('should call onDelete when confirmed', async () => {
    const user = userEvent.setup();
    render(
      <PlacementRuleItem
        rule={mockRule}
        index={0}
        isSelected={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSelect={mockOnSelect}
      />,
    );

    const buttons = screen.getAllByRole('button');
    const deleteBtn = buttons.find((btn) =>
      btn.querySelector('svg')?.classList.contains('lucide-trash2'),
    );

    if (deleteBtn) {
      await user.click(deleteBtn);
      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(confirmButton);
      expect(mockOnDelete).toHaveBeenCalledOnce();
    }
  });

  it('should apply selected styling when isSelected is true', () => {
    const { container } = render(
      <PlacementRuleItem
        rule={mockRule}
        index={0}
        isSelected={true}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSelect={mockOnSelect}
      />,
    );

    const card = container.querySelector('[data-slot="card"]') || container.firstElementChild;
    expect(card?.classList.contains('ring-2')).toBe(true);
    expect(card?.classList.contains('ring-primary')).toBe(true);
  });

  it('should call onSelect when card is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <PlacementRuleItem
        rule={mockRule}
        index={0}
        isSelected={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSelect={mockOnSelect}
      />,
    );

    const card = container.querySelector('[data-slot="card"]') || container.firstElementChild;
    if (card) {
      await user.click(card);
      expect(mockOnSelect).toHaveBeenCalledOnce();
    }
  });

  it('should display different rule types with appropriate colors', () => {
    const groupRule: PlacementRule = {
      type: 'group',
      matches: 'developers',
      policy: 'primaryGroup',
    };

    const { rerender } = render(
      <PlacementRuleItem
        rule={groupRule}
        index={0}
        isSelected={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSelect={mockOnSelect}
      />,
    );

    let badge = screen.getByText('group');
    expect(badge.classList.contains('bg-green-100')).toBe(true);

    const appRule: PlacementRule = {
      type: 'application',
      matches: 'spark-*',
      policy: 'defaultQueue',
    };

    rerender(
      <PlacementRuleItem
        rule={appRule}
        index={0}
        isSelected={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSelect={mockOnSelect}
      />,
    );

    badge = screen.getByText('application');
    expect(badge.classList.contains('bg-purple-100')).toBe(true);
  });

  it('should display optional fields when present', async () => {
    const user = userEvent.setup();
    const ruleWithOptionalFields: PlacementRule = {
      type: 'user',
      matches: '*',
      policy: 'custom',
      parentQueue: 'root.users',
      customPlacement: 'root.%primary_group.%user',
      create: true,
      fallbackResult: 'placeDefault',
    };

    render(
      <PlacementRuleItem
        rule={ruleWithOptionalFields}
        index={0}
        isSelected={false}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSelect={mockOnSelect}
      />,
    );

    // Expand to see details
    const buttons = screen.getAllByRole('button');
    const expandButton = buttons.find((btn) =>
      btn.querySelector('svg')?.classList.contains('lucide-chevron-down'),
    );

    if (expandButton) {
      await user.click(expandButton);
    }

    expect(screen.getByText('Parent Queue:')).toBeInTheDocument();
    expect(screen.getByText('root.users')).toBeInTheDocument();
    expect(screen.getByText('Custom Placement:')).toBeInTheDocument();
    expect(screen.getByText('root.%primary_group.%user')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument(); // create: true
    expect(screen.getByText('placeDefault')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlacementRulesMigrationDialog } from './MigrationDialog';
import { useSchedulerStore } from '~/stores/schedulerStore';
import * as migrationUtils from '../utils/migration';
import { SPECIAL_VALUES } from '~/types/constants/special-values';

// Mock the store
vi.mock('~/stores/schedulerStore');

// Mock the migration utilities
vi.mock('../utils/migration');

describe('PlacementRulesMigrationDialog', () => {
  const mockStoreState = {
    showMigrationDialog: true,
    legacyRules: 'u:alice:root.users.alice,g:developers:root.teams.dev',
    setShowMigrationDialog: vi.fn(),
    stageGlobalChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSchedulerStore).mockReturnValue(mockStoreState);
  });

  it('should render when showMigrationDialog is true', () => {
    render(<PlacementRulesMigrationDialog />);

    expect(screen.getByText('Migrate Legacy Placement Rules')).toBeInTheDocument();
    expect(screen.getByText(/Legacy placement rules have been detected/)).toBeInTheDocument();
  });

  it('should not render when showMigrationDialog is false', () => {
    vi.mocked(useSchedulerStore).mockReturnValue({
      ...mockStoreState,
      showMigrationDialog: false,
    });

    const { container } = render(<PlacementRulesMigrationDialog />);
    expect(container.firstChild).toBeNull();
  });

  it('should display legacy rules preview', () => {
    render(<PlacementRulesMigrationDialog />);

    expect(screen.getByText('Current Legacy Rules:')).toBeInTheDocument();
    expect(screen.getByText(mockStoreState.legacyRules)).toBeInTheDocument();
  });

  it('should handle successful migration', async () => {
    const user = userEvent.setup();
    const mockMigrationResult = {
      success: true,
      rules: [
        {
          type: 'user' as const,
          matches: 'alice',
          policy: 'custom' as const,
          customPlacement: 'root.users.alice',
          fallbackResult: 'placeDefault' as const,
          create: true,
        },
        {
          type: 'group' as const,
          matches: 'developers',
          policy: 'custom' as const,
          customPlacement: 'root.teams.dev',
          fallbackResult: 'placeDefault' as const,
          create: true,
        },
      ],
      errors: [],
    };

    vi.mocked(migrationUtils.migrateLegacyRules).mockReturnValue(mockMigrationResult);

    render(<PlacementRulesMigrationDialog />);

    const migrateButton = screen.getByRole('button', { name: 'Migrate to JSON' });
    await user.click(migrateButton);

    // Check that migration utility was called
    expect(migrationUtils.migrateLegacyRules).toHaveBeenCalledWith(mockStoreState.legacyRules);

    // Check that stageGlobalChange was called with correct format
    expect(mockStoreState.stageGlobalChange).toHaveBeenCalledWith(
      SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY,
      { rules: mockMigrationResult.rules },
    );

    // Check success message
    expect(screen.getByText(/Successfully converted 2 rules/)).toBeInTheDocument();
    expect(screen.getByText(/Changes have been staged for review/)).toBeInTheDocument();

    // Check that dialog closes after timeout
    await waitFor(
      () => {
        expect(mockStoreState.setShowMigrationDialog).toHaveBeenCalledWith(false);
      },
      { timeout: 2500 },
    );
  });

  it('should handle migration errors', async () => {
    const user = userEvent.setup();
    const mockMigrationResult = {
      success: false,
      rules: [],
      errors: [
        'Failed to convert rule "invalid1": Invalid rule format',
        'Failed to convert rule "invalid2": Missing matcher',
      ],
    };

    vi.mocked(migrationUtils.migrateLegacyRules).mockReturnValue(mockMigrationResult);

    render(<PlacementRulesMigrationDialog />);

    const migrateButton = screen.getByRole('button', { name: 'Migrate to JSON' });
    await user.click(migrateButton);

    // Check error display
    expect(screen.getByText('Migration failed:')).toBeInTheDocument();
    expect(screen.getByText(/Failed to convert rule "invalid1"/)).toBeInTheDocument();
    expect(screen.getByText(/Failed to convert rule "invalid2"/)).toBeInTheDocument();

    // Dialog should not close on error
    expect(mockStoreState.setShowMigrationDialog).not.toHaveBeenCalled();
  });

  it('should handle cancel button', async () => {
    const user = userEvent.setup();
    render(<PlacementRulesMigrationDialog />);

    const cancelButton = screen.getByRole('button', { name: 'Keep Legacy Rules' });
    await user.click(cancelButton);

    expect(mockStoreState.setShowMigrationDialog).toHaveBeenCalledWith(false);
  });

  it('should disable migrate button after successful migration', async () => {
    const user = userEvent.setup();
    const mockMigrationResult = {
      success: true,
      rules: [],
      errors: [],
    };

    vi.mocked(migrationUtils.migrateLegacyRules).mockReturnValue(mockMigrationResult);

    render(<PlacementRulesMigrationDialog />);

    const migrateButton = screen.getByRole('button', { name: 'Migrate to JSON' });
    await user.click(migrateButton);

    // After successful migration, button should be disabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Migrate to JSON' })).toBeDisabled();
    });
  });

  it('should handle missing legacy rules', async () => {
    vi.mocked(useSchedulerStore).mockReturnValue({
      ...mockStoreState,
      legacyRules: null,
    });

    render(<PlacementRulesMigrationDialog />);

    const migrateButton = screen.getByRole('button', { name: 'Migrate to JSON' });
    expect(migrateButton).toBeDisabled();
  });

  it('should handle exception during migration', async () => {
    const user = userEvent.setup();
    const error = new Error('Unexpected error');
    vi.mocked(migrationUtils.migrateLegacyRules).mockImplementation(() => {
      throw error;
    });

    render(<PlacementRulesMigrationDialog />);

    const migrateButton = screen.getByRole('button', { name: 'Migrate to JSON' });
    await user.click(migrateButton);

    // Check error display
    expect(screen.getByText('Migration failed:')).toBeInTheDocument();
    expect(screen.getByText('Unexpected error')).toBeInTheDocument();
  });

  it('should handle closing dialog via X button', async () => {
    const user = userEvent.setup();
    render(<PlacementRulesMigrationDialog />);

    // Find the close button (X) - it's usually in the dialog header
    const closeButton = screen.getByRole('button', { name: 'Close' });
    await user.click(closeButton);

    expect(mockStoreState.setShowMigrationDialog).toHaveBeenCalledWith(false);
  });
});

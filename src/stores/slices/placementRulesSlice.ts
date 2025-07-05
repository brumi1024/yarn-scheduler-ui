/**
 * Placement rules slice - handles state management for placement rules configuration
 */

import type { StateCreator } from 'zustand';
import type { PlacementRule } from '~/types/features/placement-rules';
import { extractPlacementRulesFromConfig } from '~/utils/placementRulesUtils';
import { SPECIAL_VALUES } from '~/types/constants/special-values';
import type { SchedulerStore } from './types';

export interface PlacementRulesSlice {
  // State
  rules: PlacementRule[];
  originalRules: PlacementRule[];
  isLoadingRules: boolean;
  rulesError: string | null;
  selectedRuleIndex: number | null;
  showMigrationDialog: boolean;
  legacyRules: string | null;

  // Actions
  loadPlacementRules: () => void;
  addRule: (rule: PlacementRule) => void;
  updateRule: (index: number, updates: Partial<PlacementRule>) => void;
  deleteRule: (index: number) => void;
  reorderRules: (fromIndex: number, toIndex: number) => void;
  selectRule: (index: number | null) => void;
  resetRulesChanges: () => void;
  setShowMigrationDialog: (show: boolean) => void;
  migrateLegacyRules: () => Promise<void>;
}

export const createPlacementRulesSlice: StateCreator<
  SchedulerStore,
  [['zustand/immer', never]],
  [],
  PlacementRulesSlice
> = (set, get) => ({
  // Initial state
  rules: [],
  originalRules: [],
  isLoadingRules: false,
  rulesError: null,
  selectedRuleIndex: null,
  showMigrationDialog: false,
  legacyRules: null,

  // Load rules from existing config data
  loadPlacementRules: () => {
    set((state) => {
      state.isLoadingRules = true;
      state.rulesError = null;
    });

    try {
      // Extract placement rules from the already-loaded config
      const configData = get().configData;
      const response = extractPlacementRulesFromConfig(configData);

      if (response.format === 'json' && response.rules) {
        const rules = response.rules;
        set((state) => {
          state.rules = rules;
          state.originalRules = rules;
          state.isLoadingRules = false;
        });
      } else if (response.format === 'legacy' && response.requiresMigration) {
        // Handle legacy format - show migration dialog
        set((state) => {
          state.rules = [];
          state.originalRules = [];
          state.isLoadingRules = false;
          state.showMigrationDialog = true;
          state.legacyRules = response.legacyRules || null;
        });
      } else {
        set((state) => {
          state.rules = [];
          state.originalRules = [];
          state.isLoadingRules = false;
        });
      }
    } catch (error) {
      set((state) => {
        state.isLoadingRules = false;
        state.rulesError =
          error instanceof Error ? error.message : 'Failed to load placement rules';
      });
    }
  },

  // Add new rule
  addRule: (rule) => {
    const { rules, stageGlobalChange } = get();
    const newRules = [...rules, rule];

    set((state) => {
      state.rules = newRules;
    });

    // Stage as global change with proper format
    const rulesConfig = { rules: newRules };
    stageGlobalChange(SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY, rulesConfig);
  },

  // Update existing rule
  updateRule: (index, updates) => {
    const { rules, stageGlobalChange } = get();
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };

    set((state) => {
      state.rules = newRules;
    });

    // Stage as global change with proper format
    const rulesConfig = { rules: newRules };
    stageGlobalChange(SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY, rulesConfig);
  },

  // Delete rule
  deleteRule: (index) => {
    const { rules, stageGlobalChange } = get();
    const newRules = rules.filter((_, i) => i !== index);

    set((state) => {
      state.rules = newRules;
      // Clear selection if the deleted rule was selected
      if (state.selectedRuleIndex === index) {
        state.selectedRuleIndex = null;
      } else if (state.selectedRuleIndex !== null && state.selectedRuleIndex > index) {
        // Adjust selection index if it's after the deleted item
        state.selectedRuleIndex = state.selectedRuleIndex - 1;
      }
    });

    // Stage as global change with proper format
    const rulesConfig = { rules: newRules };
    stageGlobalChange(SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY, rulesConfig);
  },

  // Reorder rules
  reorderRules: (fromIndex, toIndex) => {
    const { rules, stageGlobalChange } = get();
    const newRules = [...rules];
    const [removed] = newRules.splice(fromIndex, 1);
    newRules.splice(toIndex, 0, removed);

    set((state) => {
      state.rules = newRules;
      // Update selection index if needed
      if (state.selectedRuleIndex === fromIndex) {
        state.selectedRuleIndex = toIndex;
      } else if (
        state.selectedRuleIndex !== null &&
        fromIndex < state.selectedRuleIndex &&
        toIndex >= state.selectedRuleIndex
      ) {
        state.selectedRuleIndex = state.selectedRuleIndex - 1;
      } else if (
        state.selectedRuleIndex !== null &&
        fromIndex > state.selectedRuleIndex &&
        toIndex <= state.selectedRuleIndex
      ) {
        state.selectedRuleIndex = state.selectedRuleIndex + 1;
      }
    });

    // Stage as global change with proper format
    const rulesConfig = { rules: newRules };
    stageGlobalChange(SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY, rulesConfig);
  },

  // Select rule for editing
  selectRule: (index) => {
    set((state) => {
      state.selectedRuleIndex = index;
    });
  },

  // Reset to original state
  resetRulesChanges: () => {
    const { originalRules } = get();
    set((state) => {
      state.rules = originalRules;
      state.selectedRuleIndex = null;
    });
  },

  // Show/hide migration dialog
  setShowMigrationDialog: (show) => {
    set((state) => {
      state.showMigrationDialog = show;
    });
  },

  // Migrate legacy rules to JSON format
  migrateLegacyRules: async () => {
    const { stageGlobalChange } = get();

    try {
      // Migration logic will be implemented in issue #06
      // This will use a utility function to convert legacy format to JSON
      // For now, placeholder:
      const migratedRules: PlacementRule[] = []; // TODO: implement migration logic
      // const { legacyRules } = get(); // TODO: use when implementing migration

      // Stage the migration as a global change
      const rulesConfig = { rules: migratedRules };
      stageGlobalChange(SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY, rulesConfig);

      // Update local state
      set((state) => {
        state.rules = migratedRules;
        state.originalRules = migratedRules;
        state.showMigrationDialog = false;
        state.legacyRules = null;
      });
    } catch (error) {
      set((state) => {
        state.rulesError = error instanceof Error ? error.message : 'Failed to migrate rules';
        state.showMigrationDialog = false;
      });
    }
  },
});

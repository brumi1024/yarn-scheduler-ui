import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSchedulerStore } from '../schedulerStore';
import type { YarnApiClient } from '~/lib/api/YarnApiClient';
import type { PlacementRule } from '~/types/features/placement-rules';
import { SPECIAL_VALUES } from '~/types/constants/special-values';
import { extractPlacementRulesFromConfig } from '~/utils/placementRulesUtils';

// Mock the utils module
vi.mock('~/utils/placementRulesUtils');

// Create mock API client
const createMockApiClient = () => ({
  getScheduler: vi.fn(),
  getSchedulerConf: vi.fn(),
  getNodeLabels: vi.fn(),
  getNodes: vi.fn(),
  getNodeToLabels: vi.fn(),
  getSchedulerConfVersion: vi.fn(),
  updateSchedulerConf: vi.fn(),
});

// Helper to create store with mock API client
const createTestStore = () => {
  const mockApiClient = createMockApiClient();
  return createSchedulerStore(mockApiClient as unknown as YarnApiClient);
};

// Mock placement rules data
const mockPlacementRules: PlacementRule[] = [
  {
    type: 'user',
    matches: 'alice',
    policy: 'specified',
    value: 'root.users.alice',
    fallbackResult: 'skip',
  },
  {
    type: 'application',
    matches: 'spark-*',
    policy: 'specified',
    value: 'root.spark',
    fallbackResult: 'placeDefault',
  },
  {
    type: 'group',
    matches: 'production',
    policy: 'primaryGroup',
    fallbackResult: 'skip',
  },
];

describe('placementRulesSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const store = createTestStore();
      const state = store.getState();

      expect(state.rules).toEqual([]);
      expect(state.originalRules).toEqual([]);
      expect(state.isLoadingRules).toBe(false);
      expect(state.rulesError).toBeNull();
      expect(state.selectedRuleIndex).toBeNull();
      expect(state.showMigrationDialog).toBe(false);
      expect(state.legacyRules).toBeNull();
    });
  });

  describe('loadPlacementRules', () => {
    it('should load JSON format rules successfully', () => {
      const store = createTestStore();
      const mockExtract = vi.mocked(extractPlacementRulesFromConfig);

      // Mock config data
      store.setState({ configData: new Map([['test', 'value']]) });

      // Mock successful extraction
      mockExtract.mockReturnValue({
        format: 'json',
        rules: mockPlacementRules,
      });

      store.getState().loadPlacementRules();

      expect(store.getState().rules).toEqual(mockPlacementRules);
      expect(store.getState().originalRules).toEqual(mockPlacementRules);
      expect(store.getState().isLoadingRules).toBe(false);
      expect(store.getState().rulesError).toBeNull();
      expect(store.getState().showMigrationDialog).toBe(false);
    });

    it('should handle legacy format and show migration dialog', () => {
      const store = createTestStore();
      const mockExtract = vi.mocked(extractPlacementRulesFromConfig);

      store.setState({ configData: new Map() });

      mockExtract.mockReturnValue({
        format: 'legacy',
        requiresMigration: true,
        legacyRules: 'u:alice:root.users.alice\\ng:production:root.production',
      });

      store.getState().loadPlacementRules();

      expect(store.getState().rules).toEqual([]);
      expect(store.getState().originalRules).toEqual([]);
      expect(store.getState().isLoadingRules).toBe(false);
      expect(store.getState().showMigrationDialog).toBe(true);
      expect(store.getState().legacyRules).toBe(
        'u:alice:root.users.alice\\ng:production:root.production',
      );
    });

    it('should handle no rules configured', () => {
      const store = createTestStore();
      const mockExtract = vi.mocked(extractPlacementRulesFromConfig);

      store.setState({ configData: new Map() });

      mockExtract.mockReturnValue({
        format: 'none',
      });

      store.getState().loadPlacementRules();

      expect(store.getState().rules).toEqual([]);
      expect(store.getState().originalRules).toEqual([]);
      expect(store.getState().isLoadingRules).toBe(false);
      expect(store.getState().showMigrationDialog).toBe(false);
    });

    it('should handle extraction errors', () => {
      const store = createTestStore();
      const mockExtract = vi.mocked(extractPlacementRulesFromConfig);

      store.setState({ configData: new Map() });

      mockExtract.mockImplementation(() => {
        throw new Error('Failed to parse rules');
      });

      store.getState().loadPlacementRules();

      expect(store.getState().rules).toEqual([]);
      expect(store.getState().isLoadingRules).toBe(false);
      expect(store.getState().rulesError).toBe('Failed to parse rules');
    });

    it('should set loading state correctly', () => {
      const store = createTestStore();
      const mockExtract = vi.mocked(extractPlacementRulesFromConfig);

      store.setState({ configData: new Map() });

      mockExtract.mockReturnValue({
        format: 'json',
        rules: mockPlacementRules,
      });

      // Check that loading state is set initially
      const loadFn = store.getState().loadPlacementRules;

      // Manually check the loading state transition
      store.setState({ isLoadingRules: false });
      loadFn();

      // After calling load, it should complete synchronously
      expect(store.getState().isLoadingRules).toBe(false);
      expect(store.getState().rules).toEqual(mockPlacementRules);
    });
  });

  describe('addRule', () => {
    it('should add new rule and stage global change', () => {
      const store = createTestStore();
      const stageGlobalChangeSpy = vi.spyOn(store.getState(), 'stageGlobalChange');

      // Set initial rules
      store.setState({ rules: mockPlacementRules.slice(0, 2) });

      const newRule: PlacementRule = {
        type: 'user',
        matches: 'bob',
        policy: 'specified',
        value: 'root.users.bob',
        fallbackResult: 'skip',
      };

      store.getState().addRule(newRule);

      expect(store.getState().rules).toHaveLength(3);
      expect(store.getState().rules[2]).toEqual(newRule);

      expect(stageGlobalChangeSpy).toHaveBeenCalledWith(SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY, {
        rules: [...mockPlacementRules.slice(0, 2), newRule],
      });
    });

    it('should handle adding rule to empty list', () => {
      const store = createTestStore();
      const stageGlobalChangeSpy = vi.spyOn(store.getState(), 'stageGlobalChange');

      store.setState({ rules: [] });

      const newRule: PlacementRule = {
        type: 'user',
        matches: '*',
        policy: 'primaryGroup',
        fallbackResult: 'placeDefault',
      };

      store.getState().addRule(newRule);

      expect(store.getState().rules).toHaveLength(1);
      expect(store.getState().rules[0]).toEqual(newRule);

      expect(stageGlobalChangeSpy).toHaveBeenCalledWith(SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY, {
        rules: [newRule],
      });
    });
  });

  describe('updateRule', () => {
    it('should update existing rule and stage global change', () => {
      const store = createTestStore();
      const stageGlobalChangeSpy = vi.spyOn(store.getState(), 'stageGlobalChange');

      store.setState({ rules: [...mockPlacementRules] });

      const updates: Partial<PlacementRule> = {
        matches: 'alice,bob',
        value: 'root.users',
      };

      store.getState().updateRule(0, updates);

      expect(store.getState().rules[0]).toEqual({
        ...mockPlacementRules[0],
        ...updates,
      });

      const expectedRules = [...mockPlacementRules];
      expectedRules[0] = { ...expectedRules[0], ...updates };

      expect(stageGlobalChangeSpy).toHaveBeenCalledWith(SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY, {
        rules: expectedRules,
      });
    });

    it('should handle updating all fields of a rule', () => {
      const store = createTestStore();
      store.setState({ rules: [...mockPlacementRules] });

      const completeUpdate: Partial<PlacementRule> = {
        type: 'group',
        matches: 'dev-team',
        policy: 'specified',
        value: 'root.development',
        fallbackResult: 'skip',
      };

      store.getState().updateRule(1, completeUpdate);

      expect(store.getState().rules[1]).toEqual({
        ...mockPlacementRules[1],
        ...completeUpdate,
      });
    });
  });

  describe('deleteRule', () => {
    it('should delete rule and stage global change', () => {
      const store = createTestStore();
      const stageGlobalChangeSpy = vi.spyOn(store.getState(), 'stageGlobalChange');

      store.setState({ rules: [...mockPlacementRules] });

      store.getState().deleteRule(1);

      expect(store.getState().rules).toHaveLength(2);
      expect(store.getState().rules).toEqual([mockPlacementRules[0], mockPlacementRules[2]]);

      expect(stageGlobalChangeSpy).toHaveBeenCalledWith(SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY, {
        rules: [mockPlacementRules[0], mockPlacementRules[2]],
      });
    });

    it('should clear selection if deleted rule was selected', () => {
      const store = createTestStore();
      store.setState({
        rules: [...mockPlacementRules],
        selectedRuleIndex: 1,
      });

      store.getState().deleteRule(1);

      expect(store.getState().selectedRuleIndex).toBeNull();
    });

    it('should adjust selection index if after deleted rule', () => {
      const store = createTestStore();
      store.setState({
        rules: [...mockPlacementRules],
        selectedRuleIndex: 2,
      });

      store.getState().deleteRule(1);

      expect(store.getState().selectedRuleIndex).toBe(1);
    });

    it('should not adjust selection index if before deleted rule', () => {
      const store = createTestStore();
      store.setState({
        rules: [...mockPlacementRules],
        selectedRuleIndex: 0,
      });

      store.getState().deleteRule(2);

      expect(store.getState().selectedRuleIndex).toBe(0);
    });
  });

  describe('reorderRules', () => {
    it('should reorder rules and stage global change', () => {
      const store = createTestStore();
      const stageGlobalChangeSpy = vi.spyOn(store.getState(), 'stageGlobalChange');

      store.setState({ rules: [...mockPlacementRules] });

      // Move first rule to last position
      store.getState().reorderRules(0, 2);

      expect(store.getState().rules).toEqual([
        mockPlacementRules[1],
        mockPlacementRules[2],
        mockPlacementRules[0],
      ]);

      expect(stageGlobalChangeSpy).toHaveBeenCalledWith(SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY, {
        rules: [mockPlacementRules[1], mockPlacementRules[2], mockPlacementRules[0]],
      });
    });

    it('should update selection index when moving selected rule', () => {
      const store = createTestStore();
      store.setState({
        rules: [...mockPlacementRules],
        selectedRuleIndex: 0,
      });

      store.getState().reorderRules(0, 2);

      expect(store.getState().selectedRuleIndex).toBe(2);
    });

    it('should adjust selection when moving rule before selected', () => {
      const store = createTestStore();
      store.setState({
        rules: [...mockPlacementRules],
        selectedRuleIndex: 2,
      });

      // Move first rule to position after selected
      store.getState().reorderRules(0, 2);

      expect(store.getState().selectedRuleIndex).toBe(1);
    });

    it('should adjust selection when moving rule after selected', () => {
      const store = createTestStore();
      store.setState({
        rules: [...mockPlacementRules],
        selectedRuleIndex: 0,
      });

      // Move last rule to position before selected
      store.getState().reorderRules(2, 0);

      expect(store.getState().selectedRuleIndex).toBe(1);
    });
  });

  describe('selectRule', () => {
    it('should select rule by index', () => {
      const store = createTestStore();
      store.setState({ rules: [...mockPlacementRules] });

      store.getState().selectRule(1);

      expect(store.getState().selectedRuleIndex).toBe(1);
    });

    it('should clear selection when null is passed', () => {
      const store = createTestStore();
      store.setState({
        rules: [...mockPlacementRules],
        selectedRuleIndex: 1,
      });

      store.getState().selectRule(null);

      expect(store.getState().selectedRuleIndex).toBeNull();
    });
  });

  describe('resetRulesChanges', () => {
    it('should reset rules to original state', () => {
      const store = createTestStore();
      const originalRules = mockPlacementRules.slice(0, 2);
      store.setState({
        rules: [...mockPlacementRules],
        originalRules: originalRules,
        selectedRuleIndex: 1,
      });

      store.getState().resetRulesChanges();

      expect(store.getState().rules).toEqual(originalRules);
      expect(store.getState().selectedRuleIndex).toBeNull();
    });
  });

  describe('setShowMigrationDialog', () => {
    it('should show migration dialog', () => {
      const store = createTestStore();

      store.getState().setShowMigrationDialog(true);

      expect(store.getState().showMigrationDialog).toBe(true);
    });

    it('should hide migration dialog', () => {
      const store = createTestStore();
      store.setState({ showMigrationDialog: true });

      store.getState().setShowMigrationDialog(false);

      expect(store.getState().showMigrationDialog).toBe(false);
    });
  });

  describe('migrateLegacyRules', () => {
    it('should handle migration placeholder (to be implemented)', async () => {
      const store = createTestStore();
      const stageGlobalChangeSpy = vi.spyOn(store.getState(), 'stageGlobalChange');

      store.setState({
        legacyRules: 'u:alice:root.users.alice',
        showMigrationDialog: true,
      });

      await store.getState().migrateLegacyRules();

      // For now, it creates empty rules (TODO placeholder)
      expect(stageGlobalChangeSpy).toHaveBeenCalledWith(SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY, {
        rules: [],
      });

      expect(store.getState().showMigrationDialog).toBe(false);
      expect(store.getState().legacyRules).toBeNull();
    });

    it('should handle migration errors', async () => {
      const store = createTestStore();
      const stageGlobalChangeSpy = vi.spyOn(store.getState(), 'stageGlobalChange');

      // Mock stageGlobalChange to throw an error
      stageGlobalChangeSpy.mockImplementation(() => {
        throw new Error('Migration failed');
      });

      store.setState({
        legacyRules: 'invalid-format',
        showMigrationDialog: true,
      });

      await store.getState().migrateLegacyRules();

      expect(store.getState().rulesError).toBe('Migration failed');
      expect(store.getState().showMigrationDialog).toBe(false);
    });
  });

  describe('integration with staged changes', () => {
    it('should properly format rules object for staging', () => {
      const store = createTestStore();
      const stageGlobalChangeSpy = vi.spyOn(store.getState(), 'stageGlobalChange');

      const rule: PlacementRule = {
        type: 'user',
        matches: 'test',
        policy: 'primaryGroup',
        fallbackResult: 'skip',
      };

      store.getState().addRule(rule);

      expect(stageGlobalChangeSpy).toHaveBeenCalledWith(SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY, {
        rules: [rule],
      });

      // Verify the staged change is properly formatted
      const stagedChanges = store.getState().stagedChanges;
      expect(stagedChanges).toHaveLength(1);
      expect(stagedChanges[0]).toMatchObject({
        type: 'update',
        queuePath: 'global',
        property: SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY,
      });
    });

    it('should handle multiple operations in sequence', () => {
      const store = createTestStore();
      store.setState({ rules: [...mockPlacementRules] });

      // Add a rule
      const newRule: PlacementRule = {
        type: 'user',
        matches: 'test',
        policy: 'primaryGroup',
        fallbackResult: 'skip',
      };
      store.getState().addRule(newRule);

      // Update a rule
      store.getState().updateRule(0, { matches: 'alice,charlie' });

      // Delete a rule
      store.getState().deleteRule(2);

      // Reorder rules
      store.getState().reorderRules(0, 1);

      // Should have only one staged change (latest state)
      const stagedChanges = store.getState().stagedChanges;
      expect(stagedChanges).toHaveLength(1);
      expect(stagedChanges[0].property).toBe(SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY);
    });
  });

  describe('error handling', () => {
    it('should clear error when loading rules successfully', () => {
      const store = createTestStore();
      const mockExtract = vi.mocked(extractPlacementRulesFromConfig);

      store.setState({
        configData: new Map(),
        rulesError: 'Previous error',
      });

      mockExtract.mockReturnValue({
        format: 'json',
        rules: mockPlacementRules,
      });

      store.getState().loadPlacementRules();

      expect(store.getState().rulesError).toBeNull();
    });
  });
});

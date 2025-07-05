import { useSchedulerStore } from '~/stores/schedulerStore';

export function usePlacementRules() {
  const { rules, selectedRuleIndex, addRule, updateRule, selectRule, isLoadingRules, rulesError } =
    useSchedulerStore((state) => ({
      rules: state.rules,
      selectedRuleIndex: state.selectedRuleIndex,
      addRule: state.addRule,
      updateRule: state.updateRule,
      selectRule: state.selectRule,
      isLoadingRules: state.isLoadingRules,
      rulesError: state.rulesError,
    }));

  const selectedRule = selectedRuleIndex !== null ? rules[selectedRuleIndex] : null;

  return {
    rules,
    selectedRule,
    selectedRuleIndex,
    addRule,
    updateRule,
    selectRule,
    isLoadingRules,
    rulesError,
  };
}

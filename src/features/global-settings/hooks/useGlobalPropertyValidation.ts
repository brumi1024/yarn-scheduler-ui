import { useCallback } from 'react';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { businessValidation } from '~/utils/validation/businessRules/service';
import { getMergedConfigData } from '~/utils/validation/stagedChangesUtils';
import { SPECIAL_VALUES } from '~/types';
import type { BusinessValidationError } from '~/utils/validation/businessRules/types';

export function useGlobalPropertyValidation() {
  const { configData, schedulerData, stagedChanges } = useSchedulerStore();

  const validateGlobalProperty = useCallback(
    (property: string, value: string): BusinessValidationError[] => {
      // Create merged config data that includes staged changes
      const mergedConfigData = getMergedConfigData(configData, stagedChanges);

      // Determine legacy mode status from merged data
      const legacyModeEnabled =
        mergedConfigData.get('yarn.scheduler.capacity.legacy-queue-mode.enabled') !== 'false';

      // Create validation context
      const context = {
        queuePath: SPECIAL_VALUES.GLOBAL_QUEUE_PATH,
        legacyModeEnabled,
        schedulerData: schedulerData || undefined,
        configData: mergedConfigData,
        field: property,
      };

      // Validate the field
      const result = businessValidation.validateField(property, value, context);

      return result.errors;
    },
    [configData, schedulerData, stagedChanges],
  );

  return { validateGlobalProperty };
}

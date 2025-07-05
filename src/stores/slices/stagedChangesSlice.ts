/**
 * Staged changes slice - handles all change management operations
 */

import type { StateCreator } from 'zustand';
import { nanoid } from 'nanoid';
import { SPECIAL_VALUES } from '~/types';
import type { StagedChange } from '~/types';
import type {
  BusinessValidationError,
  QueueValidationContext,
} from '~/utils/validation/businessRules/types';
import {
  buildGlobalPropertyKey,
  buildNodeLabelPropertyKey,
  buildPropertyKey,
} from '~/utils/propertyUtils';
import { buildMutationRequest } from '~/features/staged-changes/utils/mutationBuilder';
import { isValidQueueName } from '~/types';
import { createStoreError, ERROR_CODES, extractErrorMessage, isNetworkError } from '~/lib/errors';
import type { StagedChangesSlice, SchedulerStore } from './types';
import { getMergedConfigData } from '~/utils/validation/stagedChangesUtils';
import { getAffectedQueuesForValidation } from '~/utils/validation/affectedQueuesUtils';
import { businessValidation } from '~/utils/validation/businessRules/service';
import { isBlockingError } from '~/utils/validation/businessRules/ruleCategories';
import {
  validateAllStagedChanges,
  selectivelyValidateStagedChanges,
} from '~/utils/validation/crossQueueValidation';

export const createStagedChangesSlice: StateCreator<
  SchedulerStore,
  [['zustand/immer', never]],
  [],
  StagedChangesSlice
> = (set, get) => ({
  stagedChanges: [],

  stageQueueChange: (queuePath, property, value, validationErrors) => {
    if (!queuePath || !queuePath.startsWith(SPECIAL_VALUES.ROOT_QUEUE_NAME)) {
      throw createStoreError(
        ERROR_CODES.INVALID_QUEUE_PATH,
        `Invalid queue path: ${queuePath}. Queue paths must start with '${SPECIAL_VALUES.ROOT_QUEUE_NAME}'`,
      );
    }

    if (!property || property.trim() === '') {
      throw createStoreError(ERROR_CODES.INVALID_PROPERTY_NAME, 'Property name cannot be empty');
    }

    set((state) => {
      const propertyKey = buildPropertyKey(queuePath, property);
      const originalValue = state.configData.get(propertyKey);

      const existingIndex = state.stagedChanges.findIndex(
        (c) => c.queuePath === queuePath && c.property === property,
      );

      // If the new value matches the original value, remove the staged change
      if (value === originalValue && existingIndex >= 0) {
        state.stagedChanges.splice(existingIndex, 1);
      } else if (existingIndex >= 0) {
        // Update existing staged change
        state.stagedChanges[existingIndex].newValue = value;
        state.stagedChanges[existingIndex].validationErrors = validationErrors;
      } else if (value !== originalValue) {
        // Only create a new staged change if the value differs from the original
        const change: StagedChange = {
          id: nanoid(),
          type: 'update',
          queuePath,
          property,
          oldValue: originalValue,
          newValue: value,
          timestamp: Date.now(),
          validationErrors,
        };
        state.stagedChanges.push(change);
      }
    });

    // Refresh validation errors for affected changes
    get().refreshAffectedValidationErrors(queuePath, property);
  },

  stageGlobalChange: (property, value, validationErrors) => {
    set((state) => {
      // For JSON properties like placement rules, stringify the value if it's an object
      let stringValue: string;
      if (property === SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY && typeof value === 'object') {
        stringValue = JSON.stringify(value);
      } else {
        stringValue = String(value);
      }

      const propertyKey = buildGlobalPropertyKey(property);
      const originalValue = state.configData.get(propertyKey);

      const existingIndex = state.stagedChanges.findIndex(
        (c) => c.queuePath === SPECIAL_VALUES.GLOBAL_QUEUE_PATH && c.property === property,
      );

      // If the new value matches the original value, remove the staged change
      if (stringValue === originalValue && existingIndex >= 0) {
        state.stagedChanges.splice(existingIndex, 1);
      } else if (existingIndex >= 0) {
        // Update existing staged change
        state.stagedChanges[existingIndex].newValue = stringValue;
        state.stagedChanges[existingIndex].validationErrors = validationErrors;
      } else if (stringValue !== originalValue) {
        // Only create a new staged change if the value differs from the original
        const change: StagedChange = {
          id: nanoid(),
          type: 'update',
          queuePath: SPECIAL_VALUES.GLOBAL_QUEUE_PATH,
          property,
          oldValue: originalValue,
          newValue: stringValue,
          timestamp: Date.now(),
          validationErrors,
        };
        state.stagedChanges.push(change);
      }
    });

    // Refresh validation errors for affected changes
    get().refreshAffectedValidationErrors(SPECIAL_VALUES.GLOBAL_QUEUE_PATH, property);
  },

  stageQueueAddition: (parentPath, queueName, config, validationErrors) => {
    if (!isValidQueueName(queueName)) {
      throw createStoreError(
        ERROR_CODES.INVALID_QUEUE_NAME,
        `Invalid queue name: "${queueName}". Queue names must contain only letters, numbers, hyphens, and underscores.`,
      );
    }

    const newQueuePath =
      parentPath === SPECIAL_VALUES.ROOT_QUEUE_NAME
        ? `${SPECIAL_VALUES.ROOT_QUEUE_NAME}.${queueName}`
        : `${parentPath}.${queueName}`;

    set((state) => {
      // Check if queue already exists
      const queue = get().getQueueByPath(newQueuePath);
      if (queue) {
        throw createStoreError(
          ERROR_CODES.QUEUE_ALREADY_EXISTS,
          `Queue "${newQueuePath}" already exists`,
        );
      }

      // Remove any existing add change for the same queue
      state.stagedChanges = state.stagedChanges.filter(
        (c) => !(c.type === 'add' && c.queuePath === newQueuePath),
      );

      const change: StagedChange = {
        id: nanoid(),
        type: 'add',
        queuePath: newQueuePath,
        property: SPECIAL_VALUES.CONFIG_PLACEHOLDER,
        config,
        timestamp: Date.now(),
        validationErrors,
      };

      state.stagedChanges.push(change);
    });
  },

  stageQueueRemoval: (queuePath, validationErrors) => {
    set((state) => {
      // Remove any existing remove change for the same queue
      state.stagedChanges = state.stagedChanges.filter(
        (c) => !(c.type === 'remove' && c.queuePath === queuePath),
      );

      const change: StagedChange = {
        id: nanoid(),
        type: 'remove',
        queuePath,
        property: SPECIAL_VALUES.CONFIG_PLACEHOLDER,
        timestamp: Date.now(),
        validationErrors,
      };

      state.stagedChanges.push(change);
    });
  },

  stageLabelQueueChange: (queuePath, label, property, value, validationErrors) => {
    if (!queuePath || !queuePath.startsWith(SPECIAL_VALUES.ROOT_QUEUE_NAME)) {
      throw createStoreError(ERROR_CODES.INVALID_QUEUE_PATH, `Invalid queue path: ${queuePath}`);
    }

    if (!label || label.trim() === '') {
      throw createStoreError(ERROR_CODES.INVALID_PROPERTY_NAME, 'Label name cannot be empty');
    }

    if (!property || property.trim() === '') {
      throw createStoreError(ERROR_CODES.INVALID_PROPERTY_NAME, 'Property name cannot be empty');
    }

    const fullPropertyName = `accessible-node-labels.${label}.${property}`;

    set((state) => {
      const propertyKey = buildNodeLabelPropertyKey(queuePath, label, property);
      const originalValue = state.configData.get(propertyKey);

      const existingIndex = state.stagedChanges.findIndex(
        (c) => c.queuePath === queuePath && c.property === fullPropertyName,
      );

      // If the new value matches the original value, remove the staged change
      if (value === originalValue && existingIndex >= 0) {
        state.stagedChanges.splice(existingIndex, 1);
      } else if (existingIndex >= 0) {
        // Update existing staged change
        state.stagedChanges[existingIndex].newValue = value;
        state.stagedChanges[existingIndex].validationErrors = validationErrors;
      } else if (value !== originalValue) {
        // Only create a new staged change if the value differs from the original
        const change: StagedChange = {
          id: nanoid(),
          type: 'update',
          queuePath,
          property: fullPropertyName,
          oldValue: originalValue,
          newValue: value,
          label,
          timestamp: Date.now(),
          validationErrors,
        };
        state.stagedChanges.push(change);
      }
    });

    // Refresh validation errors for affected changes
    get().refreshAffectedValidationErrors(queuePath, fullPropertyName);
  },

  applyChanges: async () => {
    const changes = get().stagedChanges;
    if (changes.length === 0) return;

    set((state) => {
      state.isLoading = true;
      state.error = null;
    });

    try {
      const mutationRequest = buildMutationRequest(changes);

      await get().apiClient.updateSchedulerConf(mutationRequest);

      // Reload configuration after successful update
      const [config, version] = await Promise.all([
        get().apiClient.getSchedulerConf(),
        get().apiClient.getSchedulerConfVersion(),
      ]);

      set((state) => {
        // Update config data
        state.configData = new Map(config.property.map((p) => [p.name, p.value]));
        state.configVersion = version.versionID;

        // Clear staged changes
        state.stagedChanges = [];
        state.isLoading = false;
      });

      // Refresh scheduler data to get updated queue information
      await get().refreshSchedulerData();
    } catch (error) {
      const errorMessage = extractErrorMessage(error);

      set((state) => {
        state.error = errorMessage;
        state.isLoading = false;
      });

      throw createStoreError(
        isNetworkError(error) ? ERROR_CODES.NETWORK_ERROR : ERROR_CODES.APPLY_CHANGES_FAILED,
        errorMessage,
        error,
      );
    }
  },

  revertChange: (changeId) => {
    set((state) => {
      state.stagedChanges = state.stagedChanges.filter((c) => c.id !== changeId);
    });

    // Refresh validation errors for remaining staged changes
    get().refreshValidationErrors();
  },

  clearAllChanges: () => {
    set((state) => {
      state.stagedChanges = [];
    });
  },

  clearQueueChanges: (queuePath) => {
    set((state) => {
      state.stagedChanges = state.stagedChanges.filter((c) => c.queuePath !== queuePath);
    });

    // Refresh validation errors for remaining staged changes
    get().refreshValidationErrors();
  },

  hasUnsavedChanges: () => {
    return get().stagedChanges.length > 0;
  },

  getChangesForQueue: (queuePath) => {
    return get().stagedChanges.filter((c) => c.queuePath === queuePath);
  },

  getStagedChangeById: (changeId) => {
    return get().stagedChanges.find((c) => c.id === changeId);
  },

  getLabelChangesForQueue: (queuePath, label) => {
    return get().stagedChanges.filter((c) => c.queuePath === queuePath && c.label === label);
  },

  refreshValidationErrors: () => {
    const { stagedChanges, schedulerData, configData } = get();

    if (!schedulerData || stagedChanges.length === 0) {
      return;
    }

    // Validate all staged changes using the shared logic
    const validationResults = validateAllStagedChanges({
      stagedChanges,
      schedulerData,
      configData,
    });

    set((state) => {
      // Update each staged change with its validation errors
      state.stagedChanges = state.stagedChanges.map((change) => ({
        ...change,
        validationErrors: validationResults.get(change.id),
      }));
    });
  },

  refreshAffectedValidationErrors: (triggeringQueuePath: string, triggeringProperty: string) => {
    const { stagedChanges, schedulerData, configData } = get();

    if (!schedulerData || stagedChanges.length === 0) {
      return;
    }

    // Determine which queues and properties could be affected
    const affectedQueues = getAffectedQueuesForValidation(
      triggeringProperty,
      triggeringQueuePath,
      schedulerData,
    );

    const affectedQueuePaths = new Set(affectedQueues);
    const affectedProperties = new Set<string>();

    // Some properties affect validation of other properties
    if (triggeringProperty === 'capacity') {
      affectedProperties.add('capacity');
      affectedProperties.add('maximum-capacity');
    } else if (triggeringProperty === 'yarn.scheduler.capacity.legacy-queue-mode.enabled') {
      // Legacy mode affects all capacity validations
      affectedProperties.add('capacity');
      affectedProperties.add('maximum-capacity');
      // Need to re-validate all queues when legacy mode changes
      stagedChanges.forEach((change) => {
        if (change.queuePath) {
          affectedQueuePaths.add(change.queuePath);
        }
      });
    }

    // Selectively validate only affected changes
    const validationResults = selectivelyValidateStagedChanges({
      affectedQueuePaths,
      affectedProperties,
      stagedChanges,
      schedulerData,
      configData,
    });

    set((state) => {
      // Update each staged change with its validation errors
      state.stagedChanges = state.stagedChanges.map((change) => ({
        ...change,
        validationErrors: validationResults.get(change.id),
      }));
    });
  },
});

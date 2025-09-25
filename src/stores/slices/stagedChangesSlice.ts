/**
 * Staged changes slice - handles all change management operations
 */

import type { StateCreator } from 'zustand';
import { nanoid } from 'nanoid';
import { MUTATION_OPERATIONS, SPECIAL_VALUES } from '~/types';
import type { SchedConfUpdateInfo, StagedChange } from '~/types';
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
import { getAffectedQueuesForValidation } from '~/utils/validation/affectedQueuesUtils';
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

      // Remove any existing changes for the same queue
      state.stagedChanges = state.stagedChanges.filter((c) => c.queuePath !== newQueuePath);

      // Create one staged change per property
      Object.entries(config).forEach(([property, value]) => {
        const change: StagedChange = {
          id: nanoid(),
          type: 'add',
          queuePath: newQueuePath,
          property,
          oldValue: undefined,
          newValue: value,
          timestamp: Date.now(),
          // Only attach validation errors to the first property (capacity) to avoid duplication
          validationErrors: property === 'capacity' ? validationErrors : undefined,
        };
        state.stagedChanges.push(change);
      });
    });
  },

  stageQueueRemoval: (queuePath, validationErrors) => {
    set((state) => {
      // Remove any existing changes for the same queue
      state.stagedChanges = state.stagedChanges.filter((c) => c.queuePath !== queuePath);

      const change: StagedChange = {
        id: nanoid(),
        type: 'remove',
        queuePath,
        property: SPECIAL_VALUES.QUEUE_MARKER,
        oldValue: 'exists',
        newValue: undefined,
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
        state.stagedChanges[existingIndex].label = label;
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
          timestamp: Date.now(),
          label,
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

    const mutationRequest = buildMutationRequest(changes);
    const { request: submissionRequest, childQueuesToStart } =
      prepareMutationRequestForSubmission(mutationRequest);

    const parentQueuesToStop = getParentQueuesForAdditions(
      submissionRequest[MUTATION_OPERATIONS.ADD_QUEUE],
    );
    const queuesToStopForRemoval = getQueuesForRemoval(
      submissionRequest[MUTATION_OPERATIONS.REMOVE_QUEUE],
    );

    const parentQueuesStopped = new Set<string>();
    const removalQueuesStopped = new Set<string>();
    const stoppedQueues = new Set<string>();
    const apiClient = get().apiClient;
    let mutationApplied = false;

    const applyQueueState = async (queueName: string, state: 'STOPPED' | 'RUNNING') => {
      const stateMutation: SchedConfUpdateInfo = {
        [MUTATION_OPERATIONS.UPDATE_QUEUE]: [
          {
            'queue-name': queueName,
            params: {
              entry: [{ key: 'state', value: state }],
            },
          },
        ],
      };

      await apiClient.updateSchedulerConf(stateMutation);
    };

    const stopQueueIfNeeded = async (queueName: string, trackingSet: Set<string>) => {
      if (stoppedQueues.has(queueName)) {
        return;
      }

      await applyQueueState(queueName, 'STOPPED');
      trackingSet.add(queueName);
      stoppedQueues.add(queueName);
    };

    const restartParents = async () => {
      if (parentQueuesStopped.size === 0) return;

      const queues = Array.from(parentQueuesStopped);
      for (const queueName of queues) {
        try {
          await applyQueueState(queueName, 'RUNNING');
        } catch (startError) {
          console.error(`Failed to restart queue ${queueName}:`, startError);
        } finally {
          parentQueuesStopped.delete(queueName);
        }
      }
    };

    const restartRemovalQueues = async () => {
      if (removalQueuesStopped.size === 0) return;

      const queues = Array.from(removalQueuesStopped);
      for (const queueName of queues) {
        try {
          await applyQueueState(queueName, 'RUNNING');
        } catch (startError) {
          console.error(`Failed to restart queue ${queueName}:`, startError);
        } finally {
          removalQueuesStopped.delete(queueName);
        }
      }
    };

    try {
      for (const parentQueue of parentQueuesToStop) {
        await stopQueueIfNeeded(parentQueue, parentQueuesStopped);
      }

      for (const queueName of queuesToStopForRemoval) {
        await stopQueueIfNeeded(queueName, removalQueuesStopped);
      }

      const validationResponse = await apiClient.validateSchedulerConf(submissionRequest);

      if (validationResponse.validation === 'failed') {
        const validationMessage = validationResponse.errors?.join('; ').trim();
        throw new Error(validationMessage || 'Scheduler configuration validation failed');
      }

      const mutationVersion =
        validationResponse.versionId ??
        validationResponse.mutationId ??
        validationResponse.newVersionId;

      const finalMutation = prepareMutationRequestWithVersion(submissionRequest, mutationVersion);

      await apiClient.updateSchedulerConf(finalMutation);
      mutationApplied = true;

      await restartParents();

      for (const queueName of childQueuesToStart) {
        await applyQueueState(queueName, 'RUNNING');
      }

      // Reload configuration after successful update
      const [config, version] = await Promise.all([
        apiClient.getSchedulerConf(),
        apiClient.getSchedulerConfVersion(),
      ]);

      set((state) => {
        // Update config data
        state.configData = new Map(config.property.map((p) => [p.name, p.value]));
        state.configVersion = version.versionId;

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
    } finally {
      await restartParents();
      if (!mutationApplied) {
        await restartRemovalQueues();
      }
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

const MUTATION_VERSION_PROPERTY_KEY = 'yarn.webservice.mutation-api.version';

function getParentQueuesForAdditions(
  addQueueMutations: SchedConfUpdateInfo[typeof MUTATION_OPERATIONS.ADD_QUEUE],
): string[] {
  const parents = new Set<string>();

  for (const mutation of addQueueMutations ?? []) {
    const queueName = mutation['queue-name'];
    const lastDotIndex = queueName.lastIndexOf('.');
    if (lastDotIndex <= 0) {
      continue;
    }

    const parentQueue = queueName.slice(0, lastDotIndex);
    if (parentQueue === SPECIAL_VALUES.ROOT_QUEUE_NAME) {
      continue;
    }

    parents.add(parentQueue);
  }

  return Array.from(parents);
}

function getQueuesForRemoval(
  removeQueueMutations: SchedConfUpdateInfo[typeof MUTATION_OPERATIONS.REMOVE_QUEUE],
): string[] {
  if (!removeQueueMutations) {
    return [];
  }

  if (Array.isArray(removeQueueMutations)) {
    return removeQueueMutations.filter((queue): queue is string => typeof queue === 'string');
  }

  if (typeof removeQueueMutations === 'string') {
    return [removeQueueMutations];
  }

  return [];
}

function prepareMutationRequestForSubmission(request: SchedConfUpdateInfo): {
  request: SchedConfUpdateInfo;
  childQueuesToStart: string[];
} {
  const clonedRequest = JSON.parse(JSON.stringify(request)) as SchedConfUpdateInfo;
  const childQueuesToStart: string[] = [];

  const addQueueMutations = clonedRequest[MUTATION_OPERATIONS.ADD_QUEUE] ?? [];
  for (const mutation of addQueueMutations) {
    const stateEntry = mutation.params.entry.find((entry) => entry.key === 'state');
    if (!stateEntry) continue;

    const desiredState = stateEntry.value?.toUpperCase?.();
    if (desiredState === 'RUNNING') {
      childQueuesToStart.push(mutation['queue-name']);
      stateEntry.value = 'STOPPED';
    }
  }

  const globalUpdateBlocks = clonedRequest[MUTATION_OPERATIONS.GLOBAL_UPDATES];
  if (globalUpdateBlocks) {
    for (const block of globalUpdateBlocks) {
      block.entry = block.entry.map(({ key, value }) => ({
        key: buildGlobalPropertyKey(key),
        value,
      }));
    }
  }

  return { request: clonedRequest, childQueuesToStart };
}

function prepareMutationRequestWithVersion(
  request: SchedConfUpdateInfo,
  version?: string | number,
): SchedConfUpdateInfo {
  const clonedRequest = JSON.parse(JSON.stringify(request)) as SchedConfUpdateInfo;

  const existingGlobalUpdates =
    clonedRequest[MUTATION_OPERATIONS.GLOBAL_UPDATES]?.filter((block) => block.entry.length > 0) ??
    [];

  for (const block of existingGlobalUpdates) {
    block.entry = block.entry.map(({ key, value }) => ({
      key: buildGlobalPropertyKey(key),
      value,
    }));
  }

  if (version !== undefined) {
    const versionValue = String(version);
    let versionEntryUpdated = false;

    for (const block of existingGlobalUpdates) {
      const entry = block.entry.find((item) => item.key === MUTATION_VERSION_PROPERTY_KEY);
      if (entry) {
        entry.value = versionValue;
        versionEntryUpdated = true;
        break;
      }
    }

    if (!versionEntryUpdated) {
      existingGlobalUpdates.unshift({
        entry: [{ key: MUTATION_VERSION_PROPERTY_KEY, value: versionValue }],
      });
    }
  }

  if (existingGlobalUpdates.length > 0) {
    clonedRequest[MUTATION_OPERATIONS.GLOBAL_UPDATES] = existingGlobalUpdates;
  } else {
    delete clonedRequest[MUTATION_OPERATIONS.GLOBAL_UPDATES];
  }

  return clonedRequest;
}

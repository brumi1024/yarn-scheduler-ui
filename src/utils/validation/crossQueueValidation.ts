import type { 
  BusinessValidationError, 
  QueueValidationContext 
} from './businessRules/types';
import type { StagedChange, SchedulerInfo } from '~/types';
import { businessValidation } from './businessRules/service';
import { isBlockingError } from './businessRules/ruleCategories';
import { getMergedConfigData } from './stagedChangesUtils';
import { getAffectedQueuesForValidation } from './affectedQueuesUtils';
import { createValidationContext } from './contextFactory';

interface ValidatePropertyChangeOptions {
  propertyName: string;
  propertyValue: string;
  queuePath: string;
  schedulerData: SchedulerInfo | null;
  configData: Map<string, string>;
  stagedChanges: StagedChange[];
  includeBlockingErrors?: boolean;
}

/**
 * Validates a property change and collects all cross-queue validation errors.
 * This shared logic is used by both usePropertyEditor and refreshValidationErrors.
 */
export function validatePropertyChange({
  propertyName,
  propertyValue,
  queuePath,
  schedulerData,
  configData,
  stagedChanges,
  includeBlockingErrors = false
}: ValidatePropertyChangeOptions): BusinessValidationError[] {
  if (!schedulerData) {
    return [];
  }

  // Get affected queues for this property change
  const affectedQueues = getAffectedQueuesForValidation(
    propertyName,
    queuePath,
    schedulerData
  );

  // Create merged config with this change applied
  const tempChange: StagedChange = {
    id: `temp-${Date.now()}`,
    type: 'update',
    queuePath,
    property: propertyName,
    oldValue: '',
    newValue: propertyValue,
    timestamp: Date.now()
  };

  const mergedConfig = getMergedConfigData(configData, [...stagedChanges, tempChange]);

  const allValidationErrors: BusinessValidationError[] = [];

  // For each affected queue, run validation
  affectedQueues.forEach(affectedQueuePath => {
    const context = createValidationContext({
      queuePath: affectedQueuePath,
      schedulerData,
      configData: mergedConfig,
      field: propertyName
    });

    // Run validation for the queue
    const queueResult = businessValidation.validateQueue(
      affectedQueuePath,
      { [propertyName]: propertyValue },
      context
    );

    // Filter errors based on includeBlockingErrors flag
    const filteredErrors = includeBlockingErrors 
      ? queueResult.errors
      : queueResult.errors.filter(error => 
          !isBlockingError(error.rule || '', error.severity)
        );
    
    allValidationErrors.push(...filteredErrors);
  });

  // Remove duplicates based on message and field
  const uniqueErrors = allValidationErrors.filter((error, index, self) =>
    index === self.findIndex(e => 
      e.message === error.message && e.field === error.field
    )
  );

  return uniqueErrors;
}

interface ValidateAllStagedChangesOptions {
  stagedChanges: StagedChange[];
  schedulerData: SchedulerInfo | null;
  configData: Map<string, string>;
}

/**
 * Re-validates all staged changes and returns a map of change IDs to their validation errors.
 * Used by refreshValidationErrors to efficiently update all staged changes.
 */
export function validateAllStagedChanges({
  stagedChanges,
  schedulerData,
  configData
}: ValidateAllStagedChangesOptions): Map<string, BusinessValidationError[] | undefined> {
  const validationResults = new Map<string, BusinessValidationError[] | undefined>();

  if (!schedulerData || stagedChanges.length === 0) {
    return validationResults;
  }

  // Process each staged change
  stagedChanges.forEach(change => {
    // Skip validation for 'add' and 'remove' operations
    if (change.type !== 'update' || !change.property) {
      validationResults.set(change.id, undefined);
      return;
    }

    const errors = validatePropertyChange({
      propertyName: change.property,
      propertyValue: change.newValue || '',
      queuePath: change.queuePath,
      schedulerData,
      configData,
      stagedChanges: stagedChanges.filter(c => c.id !== change.id), // Exclude current change
      includeBlockingErrors: false
    });

    validationResults.set(change.id, errors.length > 0 ? errors : undefined);
  });

  return validationResults;
}

interface SelectiveValidateOptions {
  affectedQueuePaths: Set<string>;
  affectedProperties: Set<string>;
  stagedChanges: StagedChange[];
  schedulerData: SchedulerInfo | null;
  configData: Map<string, string>;
}

/**
 * Selectively re-validates only the staged changes that could be affected by a new change.
 * This is more efficient than re-validating all changes.
 */
export function selectivelyValidateStagedChanges({
  affectedQueuePaths,
  affectedProperties,
  stagedChanges,
  schedulerData,
  configData
}: SelectiveValidateOptions): Map<string, BusinessValidationError[] | undefined> {
  const validationResults = new Map<string, BusinessValidationError[] | undefined>();

  if (!schedulerData || stagedChanges.length === 0) {
    return validationResults;
  }

  // Process each staged change
  stagedChanges.forEach(change => {
    // Skip if not affected
    const isAffected = affectedQueuePaths.has(change.queuePath) || 
                      (change.property && affectedProperties.has(change.property));
    
    if (!isAffected) {
      // Keep existing validation errors
      validationResults.set(change.id, change.validationErrors);
      return;
    }

    // Skip validation for 'add' and 'remove' operations
    if (change.type !== 'update' || !change.property) {
      validationResults.set(change.id, undefined);
      return;
    }

    const errors = validatePropertyChange({
      propertyName: change.property,
      propertyValue: change.newValue || '',
      queuePath: change.queuePath,
      schedulerData,
      configData,
      stagedChanges: stagedChanges.filter(c => c.id !== change.id), // Exclude current change
      includeBlockingErrors: false
    });

    validationResults.set(change.id, errors.length > 0 ? errors : undefined);
  });

  return validationResults;
}
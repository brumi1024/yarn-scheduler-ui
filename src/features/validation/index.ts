// Export validation feature public API

// Core validation functions
export { validateAllStagedChanges, validatePropertyChange } from './crossQueue';
export { validateQueue } from './service';

// Rule categories
export { isBlockingError } from './ruleCategories';

// Queue utilities - re-exported from centralized utils
export { findQueueByPath, getSiblingQueues } from '~/utils/queueTreeUtils';
export { getParentQueuePath as getParentPath } from '~/utils/propertyUtils';

// Affected queues calculation
export { getAffectedQueuesForValidation } from './utils/affectedQueues';

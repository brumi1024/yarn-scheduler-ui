export const QUEUE_STATES = {
  RUNNING: 'RUNNING',
  STOPPED: 'STOPPED',
  DRAINING: 'DRAINING',
} as const;

export type QueueStateValue = (typeof QUEUE_STATES)[keyof typeof QUEUE_STATES];

export const QUEUE_TYPES = {
  LEAF: 'leaf',
  PARENT: 'parent',
} as const;

export type QueueTypeValue = (typeof QUEUE_TYPES)[keyof typeof QUEUE_TYPES];

export const SCHEDULER_TYPES = {
  CAPACITY: 'capacityScheduler',
  FAIR: 'fairScheduler',
} as const;

export const CONFIG_PREFIXES = {
  BASE: 'yarn.scheduler.capacity',
  ROOT_QUEUE: 'yarn.scheduler.capacity.root',
} as const;

export const AUTO_CREATION_PROPS = {
  ELIGIBILITY: 'autoCreationEligibility',
  ELIGIBILITY_OFF: 'off',
  ELIGIBILITY_LEGACY: 'legacy',
  ELIGIBILITY_FLEXIBLE: 'flexible',
  LEGACY_ENABLED: 'auto-create-child-queue.enabled',
  FLEXIBLE_ENABLED: 'auto-queue-creation-v2.enabled',
} as const;

export const MUTATION_OPERATIONS = {
  ADD_QUEUE: 'add-queue',
  UPDATE_QUEUE: 'update-queue',
  REMOVE_QUEUE: 'remove-queue',
  GLOBAL_UPDATES: 'global-updates',
} as const;

export const SPECIAL_VALUES = {
  ROOT_QUEUE_NAME: 'root',
  GLOBAL_QUEUE_PATH: 'global',
  ALL_USERS_ACL: '*',
  DEFAULT_PARTITION: '',
} as const;

export const SCHEDULER_TYPES = {
  CAPACITY: 'capacityScheduler',
  FAIR: 'fairScheduler',
} as const;

export const CONFIG_PREFIXES = {
  BASE: 'yarn.scheduler.capacity',
  ROOT_QUEUE: 'yarn.scheduler.capacity.root',
} as const;

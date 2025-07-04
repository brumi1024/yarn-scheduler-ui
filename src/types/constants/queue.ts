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

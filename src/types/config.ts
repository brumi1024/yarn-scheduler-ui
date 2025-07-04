import { MUTATION_OPERATIONS } from './constants';

export type ConfigProperty = {
  name: string;
  value: string;
};

export type ConfigData = {
  property: ConfigProperty[];
};

export type QueueUpdateParams = {
  'queue-name': string;
  params: Record<string, string>;
};

export type GlobalUpdateParams = Record<string, string>;

export type SchedConfUpdateInfo = {
  [MUTATION_OPERATIONS.ADD_QUEUE]?: QueueUpdateParams[];
  [MUTATION_OPERATIONS.UPDATE_QUEUE]?: QueueUpdateParams[];
  [MUTATION_OPERATIONS.REMOVE_QUEUE]?: string[];
  [MUTATION_OPERATIONS.GLOBAL_UPDATES]?: GlobalUpdateParams;
};

import { MUTATION_OPERATIONS } from './constants';

export type ConfigProperty = {
  name: string;
  value: string;
};

export type ConfigData = {
  property: ConfigProperty[];
};

export type ConfigEntry = {
  key: string;
  value: string;
};

export type QueueMutationParams = {
  'queue-name': string;
  params: {
    entry: ConfigEntry[];
  };
};

export type GlobalUpdateParams = {
  entry: ConfigEntry[];
};

export type SchedConfUpdateInfo = {
  [MUTATION_OPERATIONS.ADD_QUEUE]?: QueueMutationParams[];
  [MUTATION_OPERATIONS.UPDATE_QUEUE]?: QueueMutationParams[];
  [MUTATION_OPERATIONS.REMOVE_QUEUE]?: string | string[];
  [MUTATION_OPERATIONS.GLOBAL_UPDATES]?: GlobalUpdateParams[];
};

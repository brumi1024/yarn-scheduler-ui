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
    'add-queue'?: QueueUpdateParams[];
    'update-queue'?: QueueUpdateParams[];
    'remove-queue'?: string[];
    'global-updates'?: GlobalUpdateParams;
};
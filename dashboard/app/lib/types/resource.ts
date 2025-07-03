export type ResourceInfo = {
    memory: number;
    vCores: number;
    resourceInformations?: Record<string, number>;
};

export type ResourceInformation = {
    attributes?: Record<string, string>;
    maximumAllocation: number;
    minimumAllocation: number;
    name: string;
    resourceType: string;
    units: string;
    value: number;
};
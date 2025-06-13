export const Q_PATH_PLACEHOLDER = 'Q_PATH_PLACEHOLDER';

export interface ConfigProperty {
    key: string;
    displayName: string;
    description: string;
    type: 'string' | 'number' | 'boolean' | 'enum' | 'percentage';
    defaultValue?: string | number | boolean;
    placeholder?: string;
    options?: string[];
    step?: string;
    availableInTemplate?: boolean;
    v2Property?: boolean;
    semanticRole?: string;
    unit?: string;
}

export interface ConfigGroup {
    groupName: string;
    properties: Record<string, ConfigProperty>;
}

export interface PerLabelProperties {
    [key: string]: ConfigProperty;
}

export interface NodeLabelConfigMetadata {
    perLabelProperties: PerLabelProperties;
    [key: string]: ConfigProperty | PerLabelProperties;
}

export interface SchedulerInfoField {
    displayName: string;
    unit?: string;
    memory?: { displayName: string; unit: string };
    vCores?: { displayName: string };
}

export type ConfigMetadata = ConfigGroup[] | Record<string, ConfigProperty> | NodeLabelConfigMetadata;

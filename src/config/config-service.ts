import type { ConfigProperty, ConfigGroup } from './types';
import { Q_PATH_PLACEHOLDER } from './types';
import { QUEUE_CONFIG_METADATA } from './queue-metadata';
import { GLOBAL_CONFIG_METADATA } from './global-metadata';
import { AUTO_CREATION_CONFIG_METADATA } from './auto-creation-metadata';
import { NODE_LABEL_CONFIG_METADATA } from './node-label-metadata';
import { SCHEDULER_INFO_METADATA } from './scheduler-info-metadata';

export class ConfigService {
    private static instance: ConfigService;

    public static getInstance(): ConfigService {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }

    getPropertyDefinition(key: string): ConfigProperty | undefined {
        for (const group of QUEUE_CONFIG_METADATA) {
            for (const [propKey, property] of Object.entries(group.properties)) {
                if (propKey.includes(key) || property.key === key) {
                    return property;
                }
            }
        }

        for (const group of GLOBAL_CONFIG_METADATA) {
            for (const [propKey, property] of Object.entries(group.properties)) {
                if (propKey === key || property.key === key) {
                    return property;
                }
            }
        }

        if (AUTO_CREATION_CONFIG_METADATA[key]) {
            return AUTO_CREATION_CONFIG_METADATA[key];
        }

        for (const [propKey, property] of Object.entries(NODE_LABEL_CONFIG_METADATA)) {
            if (propKey === key || (typeof property === 'object' && 'key' in property && property.key === key)) {
                return property as ConfigProperty;
            }
        }

        return undefined;
    }

    getPropertiesForGroup(groupName: string): ConfigProperty[] {
        const allGroups = [...QUEUE_CONFIG_METADATA, ...GLOBAL_CONFIG_METADATA];
        const group = allGroups.find((g) => g.groupName === groupName);
        return group ? Object.values(group.properties) : [];
    }

    getQueuePropertyGroups(): ConfigGroup[] {
        return QUEUE_CONFIG_METADATA;
    }

    getGlobalPropertyGroups(): ConfigGroup[] {
        return GLOBAL_CONFIG_METADATA;
    }

    getAutoCreationProperties(): Record<string, ConfigProperty> {
        return AUTO_CREATION_CONFIG_METADATA;
    }

    getNodeLabelProperties() {
        return NODE_LABEL_CONFIG_METADATA;
    }

    getSchedulerInfoFields() {
        return SCHEDULER_INFO_METADATA;
    }

    getTemplateProperties(): ConfigProperty[] {
        const templateProps: ConfigProperty[] = [];

        for (const group of QUEUE_CONFIG_METADATA) {
            for (const property of Object.values(group.properties)) {
                if (property.availableInTemplate) {
                    templateProps.push(property);
                }
            }
        }

        return templateProps;
    }

    validateProperty(key: string, value: any): { valid: boolean; error?: string } {
        const property = this.getPropertyDefinition(key);
        if (!property) {
            return { valid: false, error: `Unknown property: ${key}` };
        }

        if (value === undefined || value === null) {
            return { valid: true };
        }

        switch (property.type) {
            case 'boolean':
                if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
                    return { valid: false, error: 'Must be true or false' };
                }
                break;

            case 'number':
                const numValue = parseFloat(value);
                if (isNaN(numValue)) {
                    return { valid: false, error: 'Must be a valid number' };
                }
                break;

            case 'percentage':
                const pctValue = parseFloat(value);
                if (isNaN(pctValue) || pctValue < 0 || pctValue > 1) {
                    return { valid: false, error: 'Must be a number between 0 and 1' };
                }
                break;

            case 'enum':
                if (property.options && !property.options.includes(value)) {
                    return { valid: false, error: `Must be one of: ${property.options.join(', ')}` };
                }
                break;

            case 'string':
                if (typeof value !== 'string') {
                    return { valid: false, error: 'Must be a string' };
                }
                break;
        }

        return { valid: true };
    }

    resolvePropertyKey(propertyKey: string, queuePath: string): string {
        return propertyKey.replace(Q_PATH_PLACEHOLDER, queuePath);
    }

    extractQueuePath(fullPropertyKey: string): string | null {
        const prefix = 'yarn.scheduler.capacity.';
        if (!fullPropertyKey.startsWith(prefix)) {
            return null;
        }

        const afterPrefix = fullPropertyKey.substring(prefix.length);
        const parts = afterPrefix.split('.');

        if (parts.length < 2) {
            return null;
        }

        const lastPart = parts[parts.length - 1];
        const propertyName = parts.slice(-1)[0];

        if (this.isKnownPropertyName(propertyName)) {
            return parts.slice(0, -1).join('.');
        }

        return parts.slice(0, -1).join('.');
    }

    private isKnownPropertyName(name: string): boolean {
        const knownProperties = [
            'capacity',
            'maximum-capacity',
            'state',
            'user-limit-factor',
            'maximum-am-resource-percent',
            'max-parallel-apps',
            'ordering-policy',
            'disable_preemption',
            'accessible-node-labels',
            'auto-create-child-queue',
            'auto-queue-creation-v2',
            'leaf-queue-template',
            'parent-template',
            'template',
            'max-queues',
        ];

        return knownProperties.some((prop) => name.includes(prop));
    }

    getAllPropertyKeys(): string[] {
        const keys: string[] = [];

        for (const group of QUEUE_CONFIG_METADATA) {
            keys.push(...Object.keys(group.properties));
        }

        for (const group of GLOBAL_CONFIG_METADATA) {
            keys.push(...Object.keys(group.properties));
        }

        keys.push(...Object.keys(AUTO_CREATION_CONFIG_METADATA));
        keys.push(...Object.keys(NODE_LABEL_CONFIG_METADATA));

        return keys;
    }
}

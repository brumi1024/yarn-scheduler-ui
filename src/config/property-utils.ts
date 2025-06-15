import { QUEUE_PROPERTIES, AUTO_CREATION_PROPERTIES, type PropertyDefinition } from './property-definitions';

export function getQueueFormDefaults(queue: any): Record<string, any> {
    const formDefaults: Record<string, any> = {};

    // Process core queue properties
    for (const group of QUEUE_PROPERTIES) {
        for (const prop of group.properties) {
            // Map Queue object properties to form field keys
            let value: any;
            switch (prop.key) {
                case 'capacity':
                    value = `${queue.capacity}%`;
                    break;
                case 'maximum-capacity':
                    value = `${queue.maxCapacity}%`;
                    break;
                case 'state':
                    value = queue.state;
                    break;
                case 'user-limit-factor':
                    value = queue.userLimitFactor;
                    break;
                case 'maximum-am-resource-percent':
                    value = queue.maxAMResourcePercent;
                    break;
                case 'max-parallel-apps':
                    value = queue.maxApplications;
                    break;
                case 'ordering-policy':
                    value = queue.orderingPolicy;
                    break;
                case 'disable_preemption':
                    value = queue.preemptionDisabled;
                    break;
                default:
                    value = queue[prop.key];
                    break;
            }

            formDefaults[prop.key] = value ?? prop.defaultValue ?? '';
        }
    }

    // Process auto-creation properties
    for (const prop of AUTO_CREATION_PROPERTIES) {
        let value: any;
        switch (prop.key) {
            case 'auto-create-child-queue.enabled':
                value = queue.autoCreateChildQueueEnabled;
                break;
            case 'auto-queue-creation-v2.enabled':
                value = false; // Default to v1
                break;
            case 'auto-queue-creation-v2.max-queues':
                value = 1000; // Default value
                break;
            default:
                // Handle template properties
                if (prop.key.startsWith('leaf-queue-template.') && queue.leafQueueTemplate) {
                    const templateKey = prop.key.replace('leaf-queue-template.', '');
                    value = queue.leafQueueTemplate[templateKey];
                } else {
                    value = queue[prop.key];
                }
                break;
        }

        formDefaults[prop.key] = value ?? prop.defaultValue ?? '';
    }

    return formDefaults;
}

export function buildYarnPropertyKey(queuePath: string, key: string): string {
    return `yarn.scheduler.capacity.${queuePath}.${key}`;
}

export function getPropertyDefinition(key: string): PropertyDefinition | undefined {
    // Search in queue properties
    for (const group of QUEUE_PROPERTIES) {
        const property = group.properties.find((p) => p.key === key);
        if (property) return property;
    }

    // Search in auto-creation properties
    const autoProperty = AUTO_CREATION_PROPERTIES.find((p) => p.key === key);
    if (autoProperty) return autoProperty;

    return undefined;
}

export function parseSchedulerConfig(properties: Array<{ name: string; value: string }>) {
    const queueMap: Record<string, Record<string, string>> = {};

    for (const { name, value } of properties) {
        if (!name.startsWith('yarn.scheduler.capacity.')) continue;
        const rest = name.slice('yarn.scheduler.capacity.'.length);

        if (!rest.startsWith('root')) continue; // skip global props

        const parts = rest.split('.');
        const queuePath = parts.slice(0, -1).join('.');
        const propName = parts[parts.length - 1];

        if (!queueMap[queuePath]) queueMap[queuePath] = {};
        queueMap[queuePath][propName] = value;
    }

    return queueMap;
}

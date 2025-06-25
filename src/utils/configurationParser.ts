import { ConfigParser } from '../yarn-parser/ConfigParser';
import type { ConfigurationResponse } from '../types/Configuration';
import type { ParsedQueue } from '../types/Queue';

/**
 * Parsed configuration structure used by stores
 */
export interface ParsedConfiguration {
    queues?: ParsedQueue[];
    global?: Record<string, unknown>;
    isLegacyMode?: boolean;
}

/**
 * Parses a configuration response from the API into a hierarchical structure
 * suitable for the application stores.
 *
 * @param response The configuration response from the API
 * @returns A parsed configuration with hierarchical queue structure
 */
export function parseConfiguration(response: ConfigurationResponse): ParsedConfiguration {
    // Create a flat configuration object from the property array
    const flatConfig: Record<string, string> = {};

    response.property.forEach((prop) => {
        if (prop.name && prop.value !== undefined) {
            flatConfig[prop.name] = prop.value;
        }
    });

    // Use ConfigParser to parse the flat configuration
    const parseResult = ConfigParser.parse(flatConfig);

    // Extract global properties (those that don't belong to queues)
    const globalProps: Record<string, any> = {};
    Object.entries(parseResult.globalProperties).forEach(([key, value]) => {
        // Remove yarn.scheduler. prefix for the global config structure
        const cleanKey = key.replace('yarn.scheduler.', '');
        globalProps[cleanKey] = value;
    });

    return {
        queues: parseResult.queues,
        global: globalProps,
        isLegacyMode: parseResult.isLegacyMode,
    };
}

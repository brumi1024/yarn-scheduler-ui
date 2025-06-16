// src/utils/validation.ts
import type { ConfigurationResponse, ParsedQueue } from '../types/Queue';
import { ConfigParser } from '../yarn-parser/ConfigParser';

export type ValidationError = {
    path: string; // e.g., 'root.default.capacity'
    message: string;
    severity: 'error' | 'warning';
};

export interface ValidationResult {
    errors: ValidationError[];
    warnings: ValidationError[];
    isValid: boolean;
}

export function validateConfiguration(config: ConfigurationResponse): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
        // Convert ConfigurationResponse to flat Configuration format for parser
        const flatConfig: Record<string, string> = {};
        config.property.forEach((prop) => {
            flatConfig[prop.name] = prop.value;
        });

        // Parse the configuration to get the queue structure
        const parseResult = ConfigParser.parse(flatConfig);

        // Add parser errors to our validation errors
        parseResult.errors.forEach((error) => {
            errors.push({
                path: 'configuration',
                message: error,
                severity: 'error',
            });
        });

        // Add parser warnings to our validation warnings
        parseResult.warnings.forEach((warning) => {
            warnings.push({
                path: 'configuration',
                message: warning,
                severity: 'warning',
            });
        });

        // Only continue with queue validation if parsing succeeded
        if (parseResult.queues.length > 0) {
            const rootQueue = parseResult.queues[0];

            // Validate queue hierarchy
            validateQueueHierarchy(rootQueue, errors, warnings);

            // Apply legacy mode specific validations
            if (parseResult.isLegacyMode) {
                validateLegacyModeConstraints(rootQueue, errors, warnings);
            }

            // Validate global configuration properties
            validateGlobalProperties(parseResult.globalProperties, errors, warnings);
        }
    } catch (error) {
        errors.push({
            path: 'configuration',
            message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
            severity: 'error',
        });
    }

    return {
        errors,
        warnings,
        isValid: errors.length === 0,
    };
}

function validateQueueHierarchy(queue: ParsedQueue, errors: ValidationError[], warnings: ValidationError[]): void {
    // Validate capacity values
    if (queue.capacity.mode === 'percentage') {
        const value = queue.capacity.numericValue || 0;
        if (value < 0) {
            errors.push({
                path: `${queue.path}.capacity`,
                message: `Capacity cannot be negative: ${value}%`,
                severity: 'error',
            });
        }
        if (value > 100) {
            errors.push({
                path: `${queue.path}.capacity`,
                message: `Capacity cannot exceed 100%: ${value}%`,
                severity: 'error',
            });
        }
    }

    // Validate maximum capacity values
    if (queue.maxCapacity.mode === 'percentage') {
        const maxValue = queue.maxCapacity.numericValue || 0;
        const capacityValue = queue.capacity.numericValue || 0;

        if (maxValue < 0) {
            errors.push({
                path: `${queue.path}.maximum-capacity`,
                message: `Maximum capacity cannot be negative: ${maxValue}%`,
                severity: 'error',
            });
        }
        if (maxValue > 100) {
            errors.push({
                path: `${queue.path}.maximum-capacity`,
                message: `Maximum capacity cannot exceed 100%: ${maxValue}%`,
                severity: 'error',
            });
        }
        if (queue.capacity.mode === 'percentage' && maxValue < capacityValue) {
            warnings.push({
                path: `${queue.path}.maximum-capacity`,
                message: `Maximum capacity (${maxValue}%) is less than capacity (${capacityValue}%)`,
                severity: 'warning',
            });
        }
    }

    // Validate state values
    if (queue.state && !['RUNNING', 'STOPPED'].includes(queue.state)) {
        errors.push({
            path: `${queue.path}.state`,
            message: `Invalid queue state: ${queue.state}. Must be RUNNING or STOPPED`,
            severity: 'error',
        });
    }

    // Validate numeric properties
    if (queue.maxApplications !== undefined && queue.maxApplications < -1) {
        errors.push({
            path: `${queue.path}.maximum-applications`,
            message: `Maximum applications must be -1 (unlimited) or positive: ${queue.maxApplications}`,
            severity: 'error',
        });
    }

    if (
        queue.maxAMResourcePercent !== undefined &&
        (queue.maxAMResourcePercent < 0 || queue.maxAMResourcePercent > 1)
    ) {
        errors.push({
            path: `${queue.path}.maximum-am-resource-percent`,
            message: `Maximum AM resource percent must be between 0 and 1: ${queue.maxAMResourcePercent}`,
            severity: 'error',
        });
    }

    if (
        queue.minimumUserLimitPercent !== undefined &&
        (queue.minimumUserLimitPercent <= 0 || queue.minimumUserLimitPercent > 100)
    ) {
        errors.push({
            path: `${queue.path}.minimum-user-limit-percent`,
            message: `Minimum user limit percent must be between 1 and 100: ${queue.minimumUserLimitPercent}`,
            severity: 'error',
        });
    }

    if (queue.userLimitFactor !== undefined && queue.userLimitFactor <= 0) {
        errors.push({
            path: `${queue.path}.user-limit-factor`,
            message: `User limit factor must be positive: ${queue.userLimitFactor}`,
            severity: 'error',
        });
    }

    // Recursively validate children
    for (const child of queue.children) {
        validateQueueHierarchy(child, errors, warnings);
    }
}

function validateLegacyModeConstraints(
    queue: ParsedQueue,
    errors: ValidationError[],
    warnings: ValidationError[]
): void {
    if (queue.children.length === 0) return;

    // In legacy mode, check if percentage-based children sum to 100%
    const percentageChildren = queue.children.filter((child) => child.capacity.mode === 'percentage');

    if (percentageChildren.length > 1) {
        const totalCapacity = percentageChildren.reduce((sum, child) => {
            return sum + (child.capacity.numericValue || 0);
        }, 0);

        const tolerance = 0.01; // Allow small floating point errors
        if (Math.abs(totalCapacity - 100) > tolerance) {
            warnings.push({
                path: queue.path,
                message: `Legacy mode: Children capacities sum to ${totalCapacity.toFixed(1)}%, expected 100%`,
                severity: 'warning',
            });
        }
    }

    // Check for mixed capacity modes in legacy mode
    const capacityModes = new Set(queue.children.map((child) => child.capacity.mode));
    if (capacityModes.size > 1) {
        warnings.push({
            path: queue.path,
            message: `Legacy mode: Mixed capacity modes found in children (${Array.from(capacityModes).join(', ')}). This may cause unexpected behavior.`,
            severity: 'warning',
        });
    }

    // Recursively validate children
    for (const child of queue.children) {
        validateLegacyModeConstraints(child, errors, warnings);
    }
}

function validateGlobalProperties(
    globalProps: Record<string, string>,
    errors: ValidationError[],
    warnings: ValidationError[]
): void {
    // Validate resource calculator setting
    const resourceCalculator = globalProps['yarn.scheduler.capacity.resource-calculator'];
    if (
        resourceCalculator &&
        !['DefaultResourceCalculator', 'DominantResourceCalculator'].includes(resourceCalculator)
    ) {
        warnings.push({
            path: 'yarn.scheduler.capacity.resource-calculator',
            message: `Unknown resource calculator: ${resourceCalculator}. Expected DefaultResourceCalculator or DominantResourceCalculator.`,
            severity: 'warning',
        });
    }

    // Validate maximum applications setting
    const maxApps = globalProps['yarn.scheduler.capacity.maximum-applications'];
    if (maxApps) {
        const maxAppsNum = parseInt(maxApps, 10);
        if (isNaN(maxAppsNum) || maxAppsNum < 1) {
            errors.push({
                path: 'yarn.scheduler.capacity.maximum-applications',
                message: `Maximum applications must be a positive integer: ${maxApps}`,
                severity: 'error',
            });
        }
    }

    // Validate node locality delay setting
    const localityDelay = globalProps['yarn.scheduler.capacity.node-locality-delay'];
    if (localityDelay) {
        const localityDelayNum = parseInt(localityDelay, 10);
        if (isNaN(localityDelayNum) || localityDelayNum < -1) {
            errors.push({
                path: 'yarn.scheduler.capacity.node-locality-delay',
                message: `Node locality delay must be -1 (unlimited) or positive: ${localityDelay}`,
                severity: 'error',
            });
        }
    }

    // Validate rack locality delay setting
    const rackLocalityDelay = globalProps['yarn.scheduler.capacity.rack-locality-additional-delay'];
    if (rackLocalityDelay) {
        const rackLocalityDelayNum = parseInt(rackLocalityDelay, 10);
        if (isNaN(rackLocalityDelayNum) || rackLocalityDelayNum < -1) {
            errors.push({
                path: 'yarn.scheduler.capacity.rack-locality-additional-delay',
                message: `Rack locality delay must be -1 (unlimited) or positive: ${rackLocalityDelay}`,
                severity: 'error',
            });
        }
    }
}

/**
 * Validate a specific configuration change before applying it
 */
export function validateConfigurationChange(
    currentConfig: ConfigurationResponse,
    key: string,
    newValue: string
): ValidationResult {
    // Convert to flat format and create updated config
    const flatConfig: Record<string, string> = {};
    currentConfig.property.forEach((prop) => {
        flatConfig[prop.name] = prop.value;
    });

    // Apply the change
    flatConfig[key] = newValue;

    // Convert back to ConfigurationResponse format
    const updatedConfig: ConfigurationResponse = {
        property: Object.entries(flatConfig).map(([name, value]) => ({ name, value })),
    };

    // Validate the entire configuration with the change
    const result = validateConfiguration(updatedConfig);

    // Filter results to focus on issues that might be related to this change
    // For now, return all results, but this could be enhanced to be more specific
    return result;
}

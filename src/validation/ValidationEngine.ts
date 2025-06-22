import { ValidationRule, ValidationContext, ValidationIssue, ValidationResult } from './types';
import { CapacitySumRule } from './rules/CapacitySumRule';
import { MaxCapacityRule } from './rules/MaxCapacityRule';
import { QueueNameRule } from './rules/QueueNameRule';
import { AclFormatRule } from './rules/AclFormatRule';
import { ResourceLimitRule } from './rules/ResourceLimitRule';
import { ConfigParser } from '../yarn-parser/ConfigParser';

export class ValidationEngine {
    private rules: ValidationRule[] = [
        new CapacitySumRule(),
        new MaxCapacityRule(),
        new QueueNameRule(),
        new AclFormatRule(),
        new ResourceLimitRule(),
    ];

    validate(configuration: Record<string, string>): ValidationResult {
        // Parse configuration first
        const parseResult = ConfigParser.parse(configuration);

        const context: ValidationContext = {
            configuration,
            queues: parseResult.queues,
            isLegacyMode: parseResult.isLegacyMode,
        };

        // Run all validation rules
        const allIssues: ValidationIssue[] = [];

        for (const rule of this.rules) {
            try {
                const issues = rule.validate(context);
                allIssues.push(...issues);
            } catch (error) {
                console.error(`Rule ${rule.name} failed:`, error);
            }
        }

        // Separate errors and warnings
        const errors = allIssues.filter((i) => i.severity === 'error');
        const warnings = allIssues.filter((i) => i.severity === 'warning');

        return {
            errors,
            warnings,
            isValid: errors.length === 0,
        };
    }

    // Add method to validate single property change
    validatePropertyChange(
        configuration: Record<string, string>,
        propertyKey: string,
        newValue: string
    ): ValidationIssue[] {
        // Create updated configuration
        const updatedConfig = { ...configuration, [propertyKey]: newValue };

        // Run validation
        const result = this.validate(updatedConfig);

        // Filter to issues related to this property
        return [...result.errors, ...result.warnings].filter((issue) => issue.path.includes(propertyKey));
    }
}

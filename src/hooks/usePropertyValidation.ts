import { useState, useEffect } from 'react';
import { ValidationEngine, type ValidationIssue } from '../validation';
import { useDataStore } from '../store/dataStore';
import { useChangesStore } from '../store/changesStore';

export interface PropertyValidationResult {
    isValid: boolean;
    issues: ValidationIssue[];
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
}

export function usePropertyValidation(
    queuePath: string,
    propertyKey: string,
    currentValue: string
): PropertyValidationResult {
    const { configuration } = useDataStore();
    const { stagedChanges } = useChangesStore();
    const [validationResult, setValidationResult] = useState<PropertyValidationResult>({
        isValid: true,
        issues: [],
        errors: [],
        warnings: [],
    });

    useEffect(() => {
        if (!configuration) {
            setValidationResult({
                isValid: true,
                issues: [],
                errors: [],
                warnings: [],
            });
            return;
        }

        // Convert configuration to flat format
        const flatConfig: Record<string, string> = {};
        configuration.property.forEach((prop) => {
            flatConfig[prop.name] = prop.value;
        });

        // Apply staged changes
        stagedChanges.forEach((change) => {
            flatConfig[change.key] = change.value;
        });

        // Build full property key for validation
        const fullPropertyKey = queuePath
            ? `yarn.scheduler.capacity.${queuePath}.${propertyKey}`
            : `yarn.scheduler.capacity.${propertyKey}`;

        try {
            const validationEngine = new ValidationEngine();
            const issues = validationEngine.validatePropertyChange(flatConfig, fullPropertyKey, currentValue);

            const errors = issues.filter((i) => i.severity === 'error');
            const warnings = issues.filter((i) => i.severity === 'warning');

            setValidationResult({
                isValid: errors.length === 0,
                issues,
                errors,
                warnings,
            });
        } catch (error) {
            console.error('Property validation failed:', error);
            setValidationResult({
                isValid: false,
                issues: [
                    {
                        path: fullPropertyKey,
                        message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
                        severity: 'error',
                        rule: 'system',
                    },
                ],
                errors: [
                    {
                        path: fullPropertyKey,
                        message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
                        severity: 'error',
                        rule: 'system',
                    },
                ],
                warnings: [],
            });
        }
    }, [configuration, stagedChanges, queuePath, propertyKey, currentValue]);

    return validationResult;
}

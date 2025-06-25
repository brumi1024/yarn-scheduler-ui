import { useState, useEffect } from 'react';
import { ValidationEngine, type ValidationIssue } from '../validation';
import { useConfigStore } from '../store/configStore';

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
    const validateField = useConfigStore((state) => state.validateField);
    const computedVersion = useConfigStore((state) => state.computedVersion);
    const [validationResult, setValidationResult] = useState<PropertyValidationResult>({
        isValid: true,
        issues: [],
        errors: [],
        warnings: [],
    });

    useEffect(() => {
        // Build full property key for validation
        const fullPropertyKey = queuePath
            ? `yarn.scheduler.capacity.${queuePath}.${propertyKey}`
            : `yarn.scheduler.capacity.${propertyKey}`;

        try {
            // Use the store's validation method
            const issues = validateField(fullPropertyKey);

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
    }, [validateField, computedVersion, queuePath, propertyKey, currentValue]);

    return validationResult;
}

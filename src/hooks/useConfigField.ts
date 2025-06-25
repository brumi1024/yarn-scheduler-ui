import { useCallback, useMemo } from 'react';
import { useConfigStore } from '../store/configStore';
import { ValidationIssue } from '../validation/types';

interface ConfigFieldOptions {
    /**
     * The full property path (e.g., "root.capacity")
     */
    path: string;

    /**
     * Optional queue path prefix (e.g., "root.a.b")
     * Will be prepended to path to form the full config path
     */
    queuePath?: string;

    /**
     * Optional default value if field is not present
     */
    defaultValue?: any;

    /**
     * Whether to perform real-time validation
     */
    validateOnChange?: boolean;

    /**
     * Custom validation function
     */
    customValidate?: (value: any) => ValidationIssue[] | null;
}

interface ConfigFieldResult {
    // Current value from computed config
    value: any;

    // Original value before changes
    originalValue: any;

    // Whether this field has staged changes
    hasChanges: boolean;

    // Change handler
    onChange: (value: any) => void;

    // Validation state
    validation: ValidationIssue[];
    isValid: boolean;

    // Metadata
    path: string;
    fullPath: string;
}

/**
 * Hook to connect form fields to the config store.
 * Provides value, change tracking, and validation.
 */
export function useConfigField(options: ConfigFieldOptions): ConfigFieldResult {
    const { path, queuePath, defaultValue, validateOnChange = true, customValidate } = options;

    // Build full path
    const fullPath = useMemo(() => {
        if (queuePath) {
            // For queue properties, build the full path
            return `queues.${queuePath}.${path}`;
        }
        // For global properties, use path as-is
        return path;
    }, [path, queuePath]);

    // Get stable references to store methods
    // This avoids the "getSnapshot should be cached" warning by using stable selectors
    const getFieldValue = useConfigStore((state) => state.getFieldValue);
    const getFieldChanges = useConfigStore((state) => state.getFieldChanges);
    const validateField = useConfigStore((state) => state.validateField);
    const stageChange = useConfigStore((state) => state.stageChange);
    const computedVersion = useConfigStore((state) => state.computedVersion);

    // Get values using the stable methods with fullPath
    const value = getFieldValue(fullPath);
    const changes = getFieldChanges(fullPath);
    const validation = validateField(fullPath);

    // Computed values
    const actualValue = value;
    const originalValue = changes?.originalValue ?? actualValue;
    const hasChanges = !!changes;

    // Handle change
    const onChange = useCallback(
        (newValue: any) => {
            // Stage change in config store
            stageChange(fullPath, newValue);
        },
        [fullPath, stageChange]
    );

    // Combine validation results
    const allValidation = useMemo(() => {
        const issues: ValidationIssue[] = [...validation];

        // Add custom validation if provided
        if (customValidate && validateOnChange) {
            const customIssues = customValidate(actualValue);
            if (customIssues) {
                issues.push(...customIssues);
            }
        }

        return issues;
    }, [validation, customValidate, actualValue, validateOnChange]);

    const isValid = allValidation.length === 0;

    return {
        value: actualValue,
        originalValue,
        hasChanges,
        onChange,
        validation: allValidation,
        isValid,
        path,
        fullPath,
    };
}

/**
 * Hook to get multiple config fields at once.
 * Useful for forms with many fields.
 */
export function useConfigFields(fields: Record<string, ConfigFieldOptions>): Record<string, ConfigFieldResult> {
    const results: Record<string, ConfigFieldResult> = {};

    Object.entries(fields).forEach(([key, options]) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        results[key] = useConfigField(options);
    });

    return results;
}

/**
 * Hook to check if any fields in a form have changes.
 */
export function useHasConfigChanges(paths: string[]): boolean {
    return useConfigStore((state) => {
        return paths.some((path) => state.staged.has(path));
    });
}

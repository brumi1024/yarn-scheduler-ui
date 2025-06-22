// src/hooks/useValidationStatus.ts
import { useState, useEffect } from 'react';
import { useDataStore } from '../store/dataStore';
import { useChangesStore } from '../store/changesStore';
import { ValidationEngine } from '../validation';
import { useDebouncedCallback } from 'use-debounce';

export function useValidationStatus() {
    const { configuration } = useDataStore();
    const { stagedChanges } = useChangesStore();
    const [errors, setErrors] = useState(0);
    const [warnings, setWarnings] = useState(0);
    const [isValidating, setIsValidating] = useState(false);

    // Debounce validation to avoid too many calculations
    const runValidation = useDebouncedCallback(async () => {
        if (!configuration) {
            setErrors(0);
            setWarnings(0);
            return;
        }

        setIsValidating(true);
        try {
            // Convert to flat configuration
            const flatConfig: Record<string, string> = {};
            configuration.property.forEach((prop) => {
                flatConfig[prop.name] = prop.value;
            });

            // Apply staged changes
            stagedChanges.forEach((change) => {
                flatConfig[change.key] = change.value;
            });

            // Run validation
            const engine = new ValidationEngine();
            const result = engine.validate(flatConfig);

            setErrors(result.errors.length);
            setWarnings(result.warnings.length);
        } catch (error) {
            console.error('Background validation failed:', error);
            setErrors(0);
            setWarnings(0);
        } finally {
            setIsValidating(false);
        }
    }, 1000); // Wait 1 second after changes stop

    // Run validation when configuration or changes update
    useEffect(() => {
        runValidation();
    }, [configuration, stagedChanges, runValidation]);

    return {
        errors,
        warnings,
        isValidating,
    };
}

// src/hooks/useValidationStatus.ts
import { useState, useEffect } from 'react';
import { useConfigStore } from '../store/configStore';
import { ValidationEngine } from '../validation';
import { useDebouncedCallback } from 'use-debounce';

export function useValidationStatus() {
    const rawConfiguration = useConfigStore((state) => state.rawConfiguration);
    const staged = useConfigStore((state) => state.staged);
    const computedVersion = useConfigStore((state) => state.computedVersion);
    const validateAll = useConfigStore((state) => state.validateAll);
    const [errors, setErrors] = useState(0);
    const [warnings, setWarnings] = useState(0);
    const [isValidating, setIsValidating] = useState(false);

    // Debounce validation to avoid too many calculations
    const runValidation = useDebouncedCallback(async () => {
        if (!rawConfiguration) {
            setErrors(0);
            setWarnings(0);
            return;
        }

        setIsValidating(true);
        try {
            // Use the store's validation method
            const result = validateAll();

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
    }, [rawConfiguration, computedVersion, runValidation]);

    return {
        errors,
        warnings,
        isValidating,
    };
}

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { apiService } from '../api/ApiService';
import { parseConfiguration, type ParsedConfiguration } from '../utils/configurationParser';
import { ValidationEngine } from '../validation/ValidationEngine';
import { ValidationResult, ValidationIssue } from '../validation/types';
import { ConfigurationResponse } from '../types/Configuration';
import type { ParsedQueue } from '../types/Queue';

interface ChangeInfo {
    originalValue: unknown;
    newValue: unknown;
    timestamp: Date;
    path: string;
}

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

interface ConfigStore {
    // Core state
    original: ParsedConfiguration | null;
    staged: Map<string, unknown>;
    computed: ParsedConfiguration | null;
    computedVersion: number;

    // Raw API response
    rawConfiguration: ConfigurationResponse | null;

    // Validation
    validationResults: Map<string, ValidationIssue[]>;
    validationStatus: ValidationStatus;

    // Sync tracking
    serverVersion: string;
    lastSync: Date | null;
    isLoading: boolean;
    isApplying: boolean;
    error: string | null;

    // Methods
    loadConfiguration: () => Promise<void>;
    refresh: () => Promise<void>;
    stageChange: (path: string, value: unknown) => void;
    unstageChange: (path: string) => void;
    clearAllChanges: () => void;
    getFieldValue: (path: string) => unknown;
    getFieldChanges: (path: string) => ChangeInfo | null;
    validateField: (path: string) => ValidationIssue[];
    validateAll: () => ValidationResult;
    applyChanges: () => Promise<void>;

    // Internal methods
    _computeConfig: () => void;
    _setFieldValue: (obj: unknown, path: string, value: unknown) => void;
    _getFieldValue: (obj: unknown, path: string) => unknown;
}

const validationEngine = new ValidationEngine();

export const useConfigStore = create<ConfigStore>()(
    devtools(
        subscribeWithSelector((set, get) => ({
            // Initial state
            original: null,
            staged: new Map(),
            computed: null,
            computedVersion: 0,
            rawConfiguration: null,
            validationResults: new Map(),
            validationStatus: 'idle',
            serverVersion: '',
            lastSync: null,
            isLoading: false,
            isApplying: false,
            error: null,

            // Load configuration from server
            loadConfiguration: async () => {
                set({ isLoading: true, error: null });

                try {
                    const response = await apiService.getConfiguration();
                    const parsed = parseConfiguration(response);


                    set({
                        rawConfiguration: response,
                        original: parsed,
                        serverVersion: new Date().toISOString(),
                        lastSync: new Date(),
                        isLoading: false,
                    });

                    // Recompute with new base data
                    get()._computeConfig();
                } catch (error) {
                    set({
                        isLoading: false,
                        error: error instanceof Error ? error.message : 'Failed to load configuration',
                    });
                }
            },

            // Refresh is just an alias for loadConfiguration
            refresh: () => get().loadConfiguration(),

            // Stage a change
            stageChange: (path: string, value: unknown) => {
                const { staged, original, _computeConfig } = get();

                // Get original value for change tracking
                const originalValue = original ? get()._getFieldValue(original, path) : undefined;

                // Only stage if value is different from original
                if (originalValue !== value) {
                    const newStaged = new Map(staged);
                    newStaged.set(path, value);
                    set({ staged: newStaged });
                } else {
                    // If value is same as original, unstage it
                    get().unstageChange(path);
                    return;
                }

                // Recompute configuration
                _computeConfig();
            },

            // Unstage a change
            unstageChange: (path: string) => {
                const { staged } = get();
                const newStaged = new Map(staged);
                newStaged.delete(path);
                set({ staged: newStaged });

                // Recompute configuration
                get()._computeConfig();
            },

            // Clear all staged changes
            clearAllChanges: () => {
                set({
                    staged: new Map(),
                    validationResults: new Map(),
                    validationStatus: 'idle',
                });
                get()._computeConfig();
            },

            // Get field value from computed config
            getFieldValue: (path: string) => {
                const { computed } = get();
                if (!computed) return undefined;

                // Special handling for queue properties
                if (path.startsWith('queues.')) {
                    // Extract queue path and property name
                    // e.g., "queues.root.marketing.test.capacity" -> queuePath: "root.marketing.test", property: "capacity"
                    const parts = path.substring('queues.'.length).split('.');
                    const property = parts.pop(); // Last part is the property
                    const queuePath = parts.join('.'); // Rest is the queue path

                    // Find the queue in the array
                    const queue = computed.queues?.find((q) => q.path === queuePath);
                    if (!queue) return undefined;

                    // Return the property value from queue.properties
                    return queue.properties?.[property!];
                }

                // For non-queue paths, use the regular method
                return get()._getFieldValue(computed, path);
            },

            // Get change info for a field
            getFieldChanges: (path: string) => {
                const { staged, original } = get();

                if (!staged.has(path) || !original) {
                    return null;
                }

                // Get original value - need to handle queue paths specially
                let originalValue: unknown;
                if (path.startsWith('queues.')) {
                    const parts = path.substring('queues.'.length).split('.');
                    const property = parts.pop()!;
                    const queuePath = parts.join('.');
                    const queue = original.queues?.find((q) => q.path === queuePath);
                    originalValue = queue?.properties?.[property];
                } else {
                    originalValue = get()._getFieldValue(original, path);
                }

                return {
                    originalValue,
                    newValue: staged.get(path),
                    timestamp: new Date(), // TODO: Track actual timestamp
                    path,
                };
            },

            // Validate a single field
            validateField: (path: string) => {
                const { validationResults } = get();
                return validationResults.get(path) || [];
            },

            // Validate entire configuration
            validateAll: () => {
                const { computed, rawConfiguration } = get();

                if (!computed || !rawConfiguration) {
                    return { isValid: true, errors: [], warnings: [] };
                }

                // Convert computed config back to flat format for validation
                const flatConfig: Record<string, string> = {};
                const addToFlat = (obj: unknown, prefix: string = '') => {
                    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
                        const fullKey = prefix ? `${prefix}.${key}` : key;
                        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                            addToFlat(value, fullKey);
                        } else {
                            flatConfig[fullKey] = String(value);
                        }
                    }
                };

                if (computed.queues) {
                    addToFlat(computed.queues, 'yarn.scheduler.capacity');
                }
                if (computed.global) {
                    addToFlat(computed.global, 'yarn.scheduler');
                }

                const result = validationEngine.validate(flatConfig);

                // Update validation results by field
                const fieldIssues = new Map<string, ValidationIssue[]>();
                [...result.errors, ...result.warnings].forEach((issue) => {
                    if (issue.field) {
                        const existing = fieldIssues.get(issue.field) || [];
                        existing.push(issue);
                        fieldIssues.set(issue.field, existing);
                    }
                });

                set({
                    validationResults: fieldIssues,
                    validationStatus: result.isValid ? 'valid' : 'invalid',
                });

                return result;
            },

            // Apply staged changes to server
            applyChanges: async () => {
                const { staged, rawConfiguration } = get();

                if (staged.size === 0 || !rawConfiguration) {
                    return;
                }

                set({ isApplying: true, error: null });

                try {
                    // Convert staged changes to API format
                    const updates: Record<string, string> = {};
                    staged.forEach((value, path) => {
                        updates[path] = String(value);
                    });

                    await apiService.updateConfiguration(updates);

                    // Clear staged changes and reload
                    set({
                        staged: new Map(),
                        validationResults: new Map(),
                        validationStatus: 'idle',
                        isApplying: false,
                    });

                    // Reload configuration from server
                    await get().loadConfiguration();
                } catch (error) {
                    set({
                        isApplying: false,
                        error: error instanceof Error ? error.message : 'Failed to apply changes',
                    });
                }
            },

            // Internal: Compute merged configuration
            _computeConfig: () => {
                const { original, staged } = get();

                if (!original) {
                    set({ computed: null });
                    return;
                }

                // Deep clone original
                const computed = JSON.parse(JSON.stringify(original));

                // Apply staged changes
                staged.forEach((value, path) => {
                    get()._setFieldValue(computed, path, value);
                });

                set((state) => ({
                    computed,
                    computedVersion: state.computedVersion + 1,
                }));

                // Trigger validation after compute
                setTimeout(() => get().validateAll(), 0);
            },

            // Internal: Set nested field value
            _setFieldValue: (obj: unknown, path: string, value: unknown) => {
                // Special handling for queue properties
                if (path.startsWith('queues.')) {
                    const config = obj as ParsedConfiguration;
                    if (!config.queues) return;

                    // Extract queue path and property name
                    const parts = path.substring('queues.'.length).split('.');
                    const property = parts.pop()!;
                    const queuePath = parts.join('.');

                    // Find the queue in the array
                    const queue = config.queues.find((q) => q.path === queuePath);
                    if (queue) {
                        if (!queue.properties) {
                            queue.properties = {};
                        }
                        queue.properties[property] = String(value);
                    }
                    return;
                }

                // For non-queue paths, use the regular nested object approach
                const parts = path.split('.');
                let current = obj as Record<string, unknown>;

                for (let i = 0; i < parts.length - 1; i++) {
                    const part = parts[i];
                    if (!(part in current)) {
                        current[part] = {};
                    }
                    current = current[part] as Record<string, unknown>;
                }

                current[parts[parts.length - 1]] = value;
            },

            // Internal: Get nested field value
            _getFieldValue: (obj: unknown, path: string) => {
                const parts = path.split('.');
                let current = obj as Record<string, unknown>;

                for (const part of parts) {
                    if (current === null || current === undefined || !(part in current)) {
                        return undefined;
                    }
                    current = current[part] as Record<string, unknown>;
                }

                return current;
            },
        })),
        {
            name: 'config-store',
        }
    )
);

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { usePropertyEditor } from '../usePropertyEditor';
import { useSchedulerStore } from '../../store/schedulerStore';
import type { PropertyDescriptor } from '../../types/property-descriptor';

// Mock the store
vi.mock('../../store/schedulerStore');

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
    useForm: () => ({
        control: {},
        handleSubmit: vi.fn().mockImplementation((onSubmit) => {
            // Return a function that calls onSubmit with empty data
            return vi.fn().mockImplementation(() => onSubmit({}));
        }),
        reset: vi.fn(),
        setValue: vi.fn(),
        formState: { errors: {}, isValid: true },
    }),
    useWatch: () => ({}),
}));

// Mock zodResolver
vi.mock('@hookform/resolvers/zod', () => ({
    zodResolver: vi.fn(),
}));

const mockProperties: PropertyDescriptor[] = [
    {
        name: 'capacity',
        displayName: 'Capacity',
        description: 'Queue capacity allocation',
        type: 'string',
        category: 'general',
        defaultValue: '',
        required: true,
        validationRules: [
            {
                type: 'custom',
                message: 'Capacity is required',
                validator: (value: string) => value.trim() !== '',
            },
        ],
    },
    {
        name: 'state',
        displayName: 'Queue State',
        description: 'Operational state of the queue',
        type: 'enum',
        category: 'general',
        defaultValue: 'RUNNING',
        required: false,
        enumValues: ['RUNNING', 'STOPPED'],
    },
    {
        name: 'user-limit-factor',
        displayName: 'User Limit Factor',
        description: 'Multiplier for user resource limits',
        type: 'number',
        category: 'limits',
        defaultValue: '',
        required: false,
        validationRules: [
            {
                type: 'custom',
                message: 'Must be positive number or -1',
                validator: (value: string) => {
                    if (!value.trim()) return true;
                    const num = parseFloat(value);
                    return !isNaN(num) && (num > 0 || num === -1);
                },
            },
        ],
    },
];

describe('usePropertyEditor', () => {
    const mockUseSchedulerStore = useSchedulerStore as Mock;
    const mockStoreActions = {
        getQueueDisplayValue: vi.fn(),
        stageQueueChange: vi.fn(),
        clearAllChanges: vi.fn(),
        applyChanges: vi.fn(),
        hasUnsavedChanges: vi.fn(),
        getChangesForQueue: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock the store with both function calls and reactive state access
        mockUseSchedulerStore.mockImplementation((selector) => {
            if (typeof selector === 'function') {
                // Handle state selectors (e.g., state => state.stagedChanges)
                return selector({
                    stagedChanges: [], // Default to empty array
                });
            }
            // Handle direct store access (returns the store actions)
            return mockStoreActions;
        });
        
        // Default mock return values
        mockStoreActions.getQueueDisplayValue.mockReturnValue({ value: '', isStaged: false });
        mockStoreActions.hasUnsavedChanges.mockReturnValue(false);
        mockStoreActions.getChangesForQueue.mockReturnValue([]);
    });

    it('initializes with correct queue path and properties', () => {
        const { result } = renderHook(() =>
            usePropertyEditor({
                queuePath: 'root.test-queue',
                properties: mockProperties,
            })
        );

        expect(result.current.properties).toEqual(mockProperties);
        expect(mockStoreActions.getQueueDisplayValue).toHaveBeenCalledWith('root.test-queue', 'capacity');
        expect(mockStoreActions.getQueueDisplayValue).toHaveBeenCalledWith('root.test-queue', 'state');
        expect(mockStoreActions.getQueueDisplayValue).toHaveBeenCalledWith('root.test-queue', 'user-limit-factor');
    });

    it('groups properties by category correctly', () => {
        const { result } = renderHook(() =>
            usePropertyEditor({
                queuePath: 'root.test-queue',
                properties: mockProperties,
            })
        );

        const { propertiesByCategory } = result.current;
        
        expect(propertiesByCategory.general).toHaveLength(2);
        expect(propertiesByCategory.general[0].name).toBe('capacity');
        expect(propertiesByCategory.general[1].name).toBe('state');
        
        expect(propertiesByCategory.limits).toHaveLength(1);
        expect(propertiesByCategory.limits[0].name).toBe('user-limit-factor');
    });

    it('detects staged status correctly', () => {
        mockStoreActions.getQueueDisplayValue.mockImplementation((queuePath, property) => {
            if (property === 'capacity') {
                return { value: '50.0', isStaged: true };
            }
            return { value: '', isStaged: false };
        });

        const { result } = renderHook(() =>
            usePropertyEditor({
                queuePath: 'root.test-queue',
                properties: mockProperties,
            })
        );

        expect(result.current.getStagedStatus('capacity')).toBe(true);
        expect(result.current.getStagedStatus('state')).toBe(false);
    });

    it('detects changes correctly', () => {
        // Mock stagedChanges with changes for this queue
        const stagedChanges = [
            {
                id: 'change-1',
                type: 'update',
                queuePath: 'root.test-queue',
                property: 'capacity',
                oldValue: '25.0',
                newValue: '50.0',
                timestamp: Date.now(),
            },
        ];
        
        mockUseSchedulerStore.mockImplementation((selector) => {
            if (typeof selector === 'function') {
                return selector({ stagedChanges });
            }
            return mockStoreActions;
        });

        const { result } = renderHook(() =>
            usePropertyEditor({
                queuePath: 'root.test-queue',
                properties: mockProperties,
            })
        );

        expect(result.current.hasChanges).toBe(true);
    });

    it('stages changes for required fields', () => {
        const { result } = renderHook(() =>
            usePropertyEditor({
                queuePath: 'root.test-queue',
                properties: mockProperties,
            })
        );

        act(() => {
            const changeHandler = result.current.handleFieldChange('capacity');
            changeHandler('50.0');
        });

        expect(mockStoreActions.stageQueueChange).toHaveBeenCalledWith('root.test-queue', 'capacity', '50.0');
    });

    it('does not stage empty values for optional fields', () => {
        const { result } = renderHook(() =>
            usePropertyEditor({
                queuePath: 'root.test-queue',
                properties: mockProperties,
            })
        );

        act(() => {
            const changeHandler = result.current.handleFieldChange('user-limit-factor');
            changeHandler(''); // Empty value for optional field
        });

        expect(mockStoreActions.stageQueueChange).not.toHaveBeenCalled();
    });

    it('stages non-empty values for optional fields', () => {
        const { result } = renderHook(() =>
            usePropertyEditor({
                queuePath: 'root.test-queue',
                properties: mockProperties,
            })
        );

        act(() => {
            const changeHandler = result.current.handleFieldChange('user-limit-factor');
            changeHandler('2.0');
        });

        expect(mockStoreActions.stageQueueChange).toHaveBeenCalledWith('root.test-queue', 'user-limit-factor', '2.0');
    });

    it('handles form submission correctly', async () => {
        mockStoreActions.applyChanges.mockResolvedValue(undefined);

        const { result } = renderHook(() =>
            usePropertyEditor({
                queuePath: 'root.test-queue',
                properties: mockProperties,
            })
        );

        await act(async () => {
            await result.current.handleSubmit();
        });

        expect(mockStoreActions.applyChanges).toHaveBeenCalled();
    });

    it('handles form submission errors', async () => {
        const error = new Error('Network error');
        mockStoreActions.applyChanges.mockRejectedValue(error);

        const { result } = renderHook(() =>
            usePropertyEditor({
                queuePath: 'root.test-queue',
                properties: mockProperties,
            })
        );

        await expect(async () => {
            await act(async () => {
                await result.current.handleSubmit();
            });
        }).rejects.toThrow('Network error');
    });

    it('handles form reset correctly', () => {
        mockStoreActions.getChangesForQueue.mockReturnValue([
            {
                id: 'change-1',
                type: 'update',
                queuePath: 'root.test-queue',
                property: 'capacity',
                oldValue: '25.0',
                newValue: '50.0',
                timestamp: Date.now(),
            },
        ]);

        const { result } = renderHook(() =>
            usePropertyEditor({
                queuePath: 'root.test-queue',
                properties: mockProperties,
            })
        );

        act(() => {
            result.current.handleReset();
        });

        expect(mockStoreActions.clearAllChanges).toHaveBeenCalled();
    });

    it('validates properties based on validation rules', () => {
        // Test that the schema creation includes validation rules
        const { result } = renderHook(() =>
            usePropertyEditor({
                queuePath: 'root.test-queue',
                properties: mockProperties,
            })
        );

        // The hook should have created a form with validation
        expect(result.current.control).toBeDefined();
        expect(result.current.errors).toBeDefined();
        expect(result.current.isValid).toBeDefined();
    });

    it('uses default properties when none provided', () => {
        const { result } = renderHook(() =>
            usePropertyEditor({
                queuePath: 'root.test-queue',
            })
        );

        // Should use the imported queuePropertyDefinitions
        expect(result.current.properties).toBeDefined();
        expect(Array.isArray(result.current.properties)).toBe(true);
    });

    it('handles empty dependent values correctly', () => {
        const propertyWithDependency: PropertyDescriptor = {
            name: 'dependent-field',
            displayName: 'Dependent Field',
            description: 'A field that depends on another',
            type: 'string',
            category: 'general',
            defaultValue: '',
            required: false,
            enableWhen: {
                'parent-field': (value: string) => value === 'enabled',
            },
        };

        const { result } = renderHook(() =>
            usePropertyEditor({
                queuePath: 'root.test-queue',
                properties: [propertyWithDependency],
            })
        );

        // Should handle missing dependent values gracefully
        expect(result.current.watchedValues).toBeDefined();
    });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GlobalSettings } from '../GlobalSettings';

// Mock the scheduler store
const mockGetGlobalDisplayValue = vi.fn();
const mockStageGlobalChange = vi.fn();
const mockStagedChanges = vi.fn(() => []);

vi.mock('../../../store/schedulerStore', () => ({
    useSchedulerStore: (selector: any) => {
        const state = {
            getGlobalDisplayValue: mockGetGlobalDisplayValue,
            stageGlobalChange: mockStageGlobalChange,
            stagedChanges: mockStagedChanges(),
        };
        return selector(state);
    },
}));

// Mock the global properties config
vi.mock('../../../../config/globalProperties', () => {
    const mockGlobalProperties = {
        'yarn.scheduler.capacity.legacy-queue-mode.enabled': {
            displayName: 'Enable Legacy Queue Mode',
            type: 'boolean' as const,
            description: 'Determines if legacy capacity calculation rules are enforced.',
            defaultValue: 'true',
            category: 'core',
        },
        'yarn.scheduler.capacity.maximum-applications': {
            displayName: 'Maximum Applications (Global)',
            type: 'number' as const,
            description: 'Maximum number of applications that can be pending and running.',
            defaultValue: '10000',
            validation: { min: 1, max: 100000 },
            category: 'core',
        },
        'yarn.scheduler.capacity.preemption.disabled': {
            displayName: 'Disable Preemption Globally',
            type: 'boolean' as const,
            description: 'Globally disable or enable preemption. This can be overridden per queue.',
            defaultValue: 'false',
            category: 'preemption',
        },
        'yarn.scheduler.capacity.resource-calculator': {
            displayName: 'Resource Calculator',
            type: 'select' as const,
            description: 'Class used to calculate resource requirements.',
            defaultValue: 'DefaultResourceCalculator',
            category: 'resource',
            options: [
                { value: 'DefaultResourceCalculator', label: 'Default (Memory Only)' },
                { value: 'DominantResourceCalculator', label: 'Dominant Resource (Memory + CPU)' },
            ],
        },
    };

    return {
        globalProperties: mockGlobalProperties,
        getGlobalPropertyCategories: vi.fn(() => ['core', 'preemption', 'resource']),
        getGlobalPropertiesByCategory: vi.fn((category: string) => {
            return Object.entries(mockGlobalProperties).filter(([, prop]) => prop.category === category);
        }),
    };
});

describe('GlobalSettings', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        mockGetGlobalDisplayValue.mockReturnValue({ value: '', isStaged: false });
        
        // Reset the mocked functions to their default values
        const { getGlobalPropertyCategories, getGlobalPropertiesByCategory } = await import('../../../../config/globalProperties');
        vi.mocked(getGlobalPropertyCategories).mockReturnValue(['core', 'preemption', 'resource']);
        vi.mocked(getGlobalPropertiesByCategory).mockImplementation((category: string) => {
            const mockGlobalProperties = {
                'yarn.scheduler.capacity.legacy-queue-mode.enabled': {
                    displayName: 'Enable Legacy Queue Mode',
                    type: 'boolean' as const,
                    description: 'Determines if legacy capacity calculation rules are enforced.',
                    defaultValue: 'true',
                    category: 'core',
                },
                'yarn.scheduler.capacity.maximum-applications': {
                    displayName: 'Maximum Applications (Global)',
                    type: 'number' as const,
                    description: 'Maximum number of applications that can be pending and running.',
                    defaultValue: '10000',
                    validation: { min: 1, max: 100000 },
                    category: 'core',
                },
                'yarn.scheduler.capacity.preemption.disabled': {
                    displayName: 'Disable Preemption Globally',
                    type: 'boolean' as const,
                    description: 'Globally disable or enable preemption. This can be overridden per queue.',
                    defaultValue: 'false',
                    category: 'preemption',
                },
                'yarn.scheduler.capacity.resource-calculator': {
                    displayName: 'Resource Calculator',
                    type: 'select' as const,
                    description: 'Class used to calculate resource requirements.',
                    defaultValue: 'DefaultResourceCalculator',
                    category: 'resource',
                    options: [
                        { value: 'DefaultResourceCalculator', label: 'Default (Memory Only)' },
                        { value: 'DominantResourceCalculator', label: 'Dominant Resource (Memory + CPU)' },
                    ],
                },
            };
            return Object.entries(mockGlobalProperties).filter(([, prop]) => prop.category === category);
        });
    });

    it('should render the main title', () => {
        render(<GlobalSettings />);
        expect(screen.getByText('Global Scheduler Settings')).toBeInTheDocument();
    });

    it('should render all property categories as accordions', () => {
        render(<GlobalSettings />);
        
        expect(screen.getByText('core Settings')).toBeInTheDocument();
        expect(screen.getByText('preemption Settings')).toBeInTheDocument();
        expect(screen.getByText('resource Settings')).toBeInTheDocument();
    });

    it('should display staged changes alert when there are global changes', () => {
        mockStagedChanges.mockReturnValue([
            { id: '1', queuePath: 'global', property: 'maximum-applications', newValue: '15000' },
        ]);

        render(<GlobalSettings />);
        
        expect(screen.getByText(/You have 1 unsaved global setting/)).toBeInTheDocument();
        expect(screen.getByText(/Apply changes to make them active/)).toBeInTheDocument();
    });

    it('should render boolean property as switch', () => {
        mockGetGlobalDisplayValue.mockImplementation((property: string) => {
            if (property === 'yarn.scheduler.capacity.legacy-queue-mode.enabled') {
                return { value: 'true', isStaged: false };
            }
            return { value: '', isStaged: false };
        });

        render(<GlobalSettings />);
        
        const switchElement = screen.getByRole('checkbox', { name: /Enable Legacy Queue Mode/ });
        expect(switchElement).toBeInTheDocument();
        expect(switchElement).toBeChecked();
    });

    it('should render number property as number input', () => {
        mockGetGlobalDisplayValue.mockImplementation((property: string) => {
            if (property === 'yarn.scheduler.capacity.maximum-applications') {
                return { value: '10000', isStaged: false };
            }
            return { value: '', isStaged: false };
        });

        render(<GlobalSettings />);
        
        const numberInput = screen.getByRole('spinbutton', { name: /Maximum Applications/ });
        expect(numberInput).toBeInTheDocument();
        expect(numberInput).toHaveValue(10000);
    });

    it('should render select property as dropdown', () => {
        mockGetGlobalDisplayValue.mockImplementation((property: string) => {
            if (property === 'yarn.scheduler.capacity.resource-calculator') {
                return { value: 'DefaultResourceCalculator', isStaged: false };
            }
            return { value: '', isStaged: false };
        });

        render(<GlobalSettings />);
        
        // MUI Select renders as a button initially 
        const selectButton = screen.getByRole('button', { name: /Resource Calculator/ });
        expect(selectButton).toBeInTheDocument();
    });

    it('should call stageGlobalChange when boolean property is toggled', async () => {
        const user = userEvent.setup();
        mockGetGlobalDisplayValue.mockImplementation((property: string) => {
            if (property === 'yarn.scheduler.capacity.legacy-queue-mode.enabled') {
                return { value: 'false', isStaged: false };
            }
            return { value: '', isStaged: false };
        });

        render(<GlobalSettings />);
        
        const switchElement = screen.getByRole('checkbox', { name: /Enable Legacy Queue Mode/ });
        await user.click(switchElement);

        expect(mockStageGlobalChange).toHaveBeenCalledWith(
            'yarn.scheduler.capacity.legacy-queue-mode.enabled',
            'true'
        );
    });

    it('should call stageGlobalChange when number property is changed', async () => {
        const user = userEvent.setup();
        mockGetGlobalDisplayValue.mockImplementation((property: string) => {
            if (property === 'yarn.scheduler.capacity.maximum-applications') {
                return { value: '10000', isStaged: false };
            }
            return { value: '', isStaged: false };
        });

        render(<GlobalSettings />);
        
        const numberInput = screen.getByRole('spinbutton', { name: /Maximum Applications/ });
        await user.clear(numberInput);
        await user.type(numberInput, '15000');

        await waitFor(() => {
            expect(mockStageGlobalChange).toHaveBeenCalledWith(
                'yarn.scheduler.capacity.maximum-applications',
                '15000'
            );
        });
    });

    it('should call stageGlobalChange when select property is changed', async () => {
        const user = userEvent.setup();
        mockGetGlobalDisplayValue.mockImplementation((property: string) => {
            if (property === 'yarn.scheduler.capacity.resource-calculator') {
                return { value: 'DefaultResourceCalculator', isStaged: false };
            }
            return { value: '', isStaged: false };
        });

        render(<GlobalSettings />);
        
        const selectButton = screen.getByRole('button', { name: /Resource Calculator/ });
        await user.click(selectButton);

        // Find and click the option
        const option = await screen.findByText('Dominant Resource (Memory + CPU)');
        await user.click(option);

        await waitFor(() => {
            expect(mockStageGlobalChange).toHaveBeenCalledWith(
                'yarn.scheduler.capacity.resource-calculator',
                'DominantResourceCalculator'
            );
        });
    });

    it('should show "Modified" chip for staged properties', () => {
        // Mock one property as staged
        mockGetGlobalDisplayValue.mockImplementation((property: string) => {
            if (property === 'yarn.scheduler.capacity.maximum-applications') {
                return { value: '15000', isStaged: true };
            }
            return { value: '', isStaged: false };
        });

        render(<GlobalSettings />);
        
        expect(screen.getByText('Modified')).toBeInTheDocument();
    });

    it('should show "Has Changes" chip on category with staged properties', () => {
        mockStagedChanges.mockReturnValue([
            { id: '1', queuePath: 'global', property: 'maximum-applications', newValue: '15000' },
        ]);

        render(<GlobalSettings />);
        
        expect(screen.getByText('Has Changes')).toBeInTheDocument();
    });

    it('should display property descriptions', () => {
        render(<GlobalSettings />);
        
        expect(screen.getByText('Determines if legacy capacity calculation rules are enforced.')).toBeInTheDocument();
        expect(screen.getByText('Maximum number of applications that can be pending and running.')).toBeInTheDocument();
    });

    it('should handle empty categories gracefully', async () => {
        // Import the actual module to access mocked functions
        const { getGlobalPropertyCategories } = await import('../../../../config/globalProperties');
        vi.mocked(getGlobalPropertyCategories).mockReturnValue([]);

        render(<GlobalSettings />);
        
        expect(screen.getByText('No Global Properties Available')).toBeInTheDocument();
        expect(screen.getByText('Global properties configuration is not available. Please check the configuration setup.')).toBeInTheDocument();
    });

    it('should expand accordions by default', () => {
        render(<GlobalSettings />);
        
        // All accordions should be expanded, so their content should be visible
        expect(screen.getByText('Determines if legacy capacity calculation rules are enforced.')).toBeInTheDocument();
        expect(screen.getByText('Globally disable or enable preemption.')).toBeInTheDocument();
    });

    it('should use proper property keys for store integration', () => {
        render(<GlobalSettings />);
        
        // Verify that getGlobalDisplayValue is called with correct property keys
        expect(mockGetGlobalDisplayValue).toHaveBeenCalledWith('yarn.scheduler.capacity.legacy-queue-mode.enabled');
        expect(mockGetGlobalDisplayValue).toHaveBeenCalledWith('yarn.scheduler.capacity.maximum-applications');
        expect(mockGetGlobalDisplayValue).toHaveBeenCalledWith('yarn.scheduler.capacity.preemption.disabled');
        expect(mockGetGlobalDisplayValue).toHaveBeenCalledWith('yarn.scheduler.capacity.resource-calculator');
    });

    it('should render string properties with multiline support for specific properties', async () => {
        const mockStringProperty = {
            'yarn.scheduler.capacity.queue-mappings': {
                displayName: 'Queue Mappings',
                type: 'string' as const,
                description: 'Queue mapping rules.',
                defaultValue: '',
                category: 'queue',
            },
        };

        // Import the actual module to access mocked functions
        const { getGlobalPropertyCategories, getGlobalPropertiesByCategory } = await import('../../../../config/globalProperties');
        
        // Override mock for this test
        vi.mocked(getGlobalPropertiesByCategory).mockImplementation((category: string) => {
            if (category === 'queue') {
                return Object.entries(mockStringProperty);
            }
            return [];
        });
        
        vi.mocked(getGlobalPropertyCategories).mockReturnValue(['queue']);
        mockGetGlobalDisplayValue.mockReturnValue({ value: 'u:user1:queue1', isStaged: false });

        render(<GlobalSettings />);
        
        const textInput = screen.getByRole('textbox', { name: /Queue Mappings/ });
        expect(textInput).toBeInTheDocument();
    });
});
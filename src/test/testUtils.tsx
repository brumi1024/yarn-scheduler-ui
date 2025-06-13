/**
 * Shared test utilities and common patterns
 */
import React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { theme } from '../theme';
import type { ConfigProperty } from '../config';

// Common test setup patterns
export const commonTestSetup = {
    beforeEach: () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });
    },

    mockOnChange: () => vi.fn(),

    user: () => userEvent.setup(),
};

// Wrapper component for tests that need theme
interface TestWrapperProps {
    children: React.ReactNode;
}

export const TestWrapper: React.FC<TestWrapperProps> = ({ children }) => {
    return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

// Custom render function with default wrappers
export const renderWithTheme = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>): RenderResult => {
    return render(ui, {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
        ...options,
    });
};

// Common test prop factories
export const testPropFactories = {
    configProperty: (overrides: Partial<ConfigProperty> = {}): ConfigProperty => ({
        key: 'test-property',
        displayName: 'Test Property',
        description: 'Test property description',
        type: 'string',
        defaultValue: 'test-default',
        ...overrides,
    }),

    booleanProperty: (overrides: Partial<ConfigProperty> = {}): ConfigProperty => ({
        key: 'test-boolean',
        displayName: 'Test Boolean',
        description: 'Test boolean property',
        type: 'boolean',
        defaultValue: false,
        ...overrides,
    }),

    enumProperty: (overrides: Partial<ConfigProperty> = {}): ConfigProperty => ({
        key: 'test-enum',
        displayName: 'Test Enum',
        description: 'Test enum property',
        type: 'enum',
        options: ['option1', 'option2', 'option3'],
        defaultValue: 'option1',
        ...overrides,
    }),

    numberProperty: (overrides: Partial<ConfigProperty> = {}): ConfigProperty => ({
        key: 'test-number',
        displayName: 'Test Number',
        description: 'Test number property',
        type: 'number',
        defaultValue: '10',
        step: '1',
        ...overrides,
    }),

    percentageProperty: (overrides: Partial<ConfigProperty> = {}): ConfigProperty => ({
        key: 'test-percentage',
        displayName: 'Test Percentage',
        description: 'Test percentage property',
        type: 'percentage',
        defaultValue: '0.1',
        ...overrides,
    }),

    capacityProperty: (overrides: Partial<ConfigProperty> = {}): ConfigProperty => ({
        key: 'capacity',
        displayName: 'Capacity',
        description: 'Queue capacity setting',
        type: 'string',
        defaultValue: '10%',
        ...overrides,
    }),
};

// Common test scenarios
export const testScenarios = {
    /**
     * Standard component rendering test
     */
    componentRenders: (componentName: string, renderComponent: () => React.ReactElement, expectedText?: string) => {
        return it(`renders ${componentName} correctly`, () => {
            const { container } = renderWithTheme(renderComponent());
            expect(container).toBeInTheDocument();

            if (expectedText) {
                expect(container).toHaveTextContent(expectedText);
            }
        });
    },

    /**
     * Event handler test pattern
     */
    eventHandlerTest: (
        eventName: string,
        triggerEvent: (user: ReturnType<typeof userEvent.setup>) => Promise<void>,
        mockHandler: ReturnType<typeof vi.fn>,
        expectedCalls: number = 1
    ) => {
        return it(`handles ${eventName} events`, async () => {
            const user = userEvent.setup();
            await triggerEvent(user);
            expect(mockHandler).toHaveBeenCalledTimes(expectedCalls);
        });
    },

    /**
     * Disabled state test pattern
     */
    disabledStateTest: (
        componentName: string,
        renderDisabledComponent: () => React.ReactElement,
        elementSelector: string
    ) => {
        return it(`${componentName} is disabled when prop is set`, () => {
            renderWithTheme(renderDisabledComponent());
            const element = document.querySelector(elementSelector);
            expect(element).toBeDisabled();
        });
    },

    /**
     * Error display test pattern
     */
    errorDisplayTest: (
        componentName: string,
        renderComponentWithError: (error: string) => React.ReactElement,
        errorMessage: string = 'Test error message'
    ) => {
        return it(`${componentName} displays error correctly`, () => {
            const { getByText } = renderWithTheme(renderComponentWithError(errorMessage));
            expect(getByText(errorMessage)).toBeInTheDocument();
        });
    },
};

// Mock factories for common objects
export const mockFactories = {
    capacityEditor: () => ({
        CapacityEditor: ({ label, value, onChange, error, siblings }: any) => (
            <div data-testid="capacity-editor">
                <label>{label}</label>
                <input value={value || ''} onChange={(e) => onChange(e.target.value)} data-testid="capacity-input" />
                {error && <span data-testid="capacity-error">{error}</span>}
                {siblings && <div data-testid="siblings-info">Siblings: {siblings.length}</div>}
            </div>
        ),
    }),
};

// Common assertions
export const commonAssertions = {
    hasTextContent: (element: HTMLElement, text: string) => {
        expect(element).toHaveTextContent(text);
    },

    isDisabled: (element: HTMLElement) => {
        expect(element).toBeDisabled();
    },

    isVisible: (element: HTMLElement) => {
        expect(element).toBeVisible();
    },

    hasClass: (element: HTMLElement, className: string) => {
        expect(element).toHaveClass(className);
    },

    hasAttribute: (element: HTMLElement, attribute: string, value?: string) => {
        if (value !== undefined) {
            expect(element).toHaveAttribute(attribute, value);
        } else {
            expect(element).toHaveAttribute(attribute);
        }
    },
};

// Re-export commonly used testing utilities
export { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

export { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

export { userEvent };

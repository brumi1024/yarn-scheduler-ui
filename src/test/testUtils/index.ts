/**
 * Centralized test utilities - Phase 3: Test Utility Consolidation
 * 
 * This module provides a single import point for all test utilities,
 * mock factories, and render helpers.
 */

// Re-export render helpers with providers
export {
    renderWithProviders,
    renderWithTheme,
    renderWithForm,
    render, // Re-exported with providers as default
    screen,
    fireEvent,
    waitFor,
    act,
    cleanup,
} from './renderHelpers';

// Re-export mock factories
export {
    createMockQueue,
    createMockParsedQueue,
    createMockConfiguration,
    createMockConfigProperty,
    createMockPropertyDefinition,
    createMockChildQueue,
    createMockParsedChildQueue,
    createMockQueueHierarchy,
    createMockParsedQueueHierarchy,
    createMockFormData,
    createMockSiblings,
} from './mockFactories';

// Re-export testing framework utilities
export {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
    beforeAll,
    afterAll,
} from 'vitest';

// Re-export user event for interactions
export { default as userEvent } from '@testing-library/user-event';

// Export commonly used test patterns
export const testHelpers = {
    /**
     * Create a mock onChange handler for form testing
     */
    mockOnChange: () => vi.fn(),

    /**
     * Create a user event setup for interactions
     */
    user: () => userEvent.setup(),

    /**
     * Common setup for clearing mocks
     */
    clearMocks: () => {
        vi.clearAllMocks();
    },

    /**
     * Helper for testing async operations
     */
    waitForNextTick: () => new Promise(resolve => setTimeout(resolve, 0)),

    /**
     * Helper for testing error boundaries
     */
    suppressConsoleError: () => {
        const originalError = console.error;
        beforeEach(() => {
            console.error = vi.fn();
        });
        afterEach(() => {
            console.error = originalError;
        });
    },
};

// Export custom matchers and assertions
export const customMatchers = {
    /**
     * Check if element has specific text content
     */
    toHaveTextContent: (element: HTMLElement, text: string) => {
        expect(element).toHaveTextContent(text);
    },

    /**
     * Check if element is disabled
     */
    toBeDisabled: (element: HTMLElement) => {
        expect(element).toBeDisabled();
    },

    /**
     * Check if element is visible
     */
    toBeVisible: (element: HTMLElement) => {
        expect(element).toBeVisible();
    },

    /**
     * Check if element has specific class
     */
    toHaveClass: (element: HTMLElement, className: string) => {
        expect(element).toHaveClass(className);
    },

    /**
     * Check if element has specific attribute
     */
    toHaveAttribute: (element: HTMLElement, attribute: string, value?: string) => {
        if (value !== undefined) {
            expect(element).toHaveAttribute(attribute, value);
        } else {
            expect(element).toHaveAttribute(attribute);
        }
    },
};

// Export test scenarios for common patterns
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
     * Form validation test pattern
     */
    formValidationTest: (
        fieldName: string,
        invalidValue: string,
        expectedErrorMessage: string,
        renderForm: () => React.ReactElement
    ) => {
        return it(`validates ${fieldName} field`, async () => {
            const user = userEvent.setup();
            renderWithProviders(renderForm());

            const field = screen.getByLabelText(new RegExp(fieldName, 'i'));
            await user.clear(field);
            await user.type(field, invalidValue);

            await waitFor(() => {
                expect(screen.getByText(expectedErrorMessage)).toBeInTheDocument();
            });
        });
    },

    /**
     * Accessibility test pattern
     */
    accessibilityTest: (
        componentName: string,
        renderComponent: () => React.ReactElement,
        expectedLabels: string[]
    ) => {
        return it(`${componentName} has proper accessibility attributes`, () => {
            renderWithTheme(renderComponent());

            expectedLabels.forEach(label => {
                expect(screen.getByLabelText(label)).toBeInTheDocument();
            });
        });
    },
};
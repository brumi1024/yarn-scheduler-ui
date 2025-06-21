import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { theme } from '../../theme';

// Create a custom render function that includes all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    queryClient?: QueryClient;
    formMethods?: UseFormReturn<Record<string, unknown>>;
}

export function renderWithProviders(
    ui: React.ReactElement,
    {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false },
            },
        }),
        formMethods,
        ...renderOptions
    }: CustomRenderOptions = {}
) {
    function Wrapper({ children }: { children: React.ReactNode }) {
        let content = children;

        // Wrap with FormProvider if form methods are provided
        if (formMethods) {
            content = <FormProvider {...formMethods}>{content}</FormProvider>;
        }

        // Always wrap with QueryClient and Theme providers
        return (
            <QueryClientProvider client={queryClient}>
                <ThemeProvider theme={theme}>{content}</ThemeProvider>
            </QueryClientProvider>
        );
    }

    return {
        ...render(ui, { wrapper: Wrapper, ...renderOptions }),
        queryClient,
    };
}

// Convenience function for components that need only theme
export function renderWithTheme(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
    return render(ui, {
        wrapper: ({ children }) => <ThemeProvider theme={theme}>{children}</ThemeProvider>,
        ...options,
    });
}

// Convenience function for form components
export function renderWithForm(
    ui: React.ReactElement,
    formMethods: UseFormReturn<Record<string, unknown>>,
    options?: CustomRenderOptions
) {
    return renderWithProviders(ui, {
        formMethods,
        ...options,
    });
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { renderWithProviders as render };
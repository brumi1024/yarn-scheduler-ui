import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
    { ignores: ['dist', 'build', 'node_modules', 'temp-vite', 'coverage', '*.log', 'eslint-results.sarif'] },

    // TypeScript and React files
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'no-debugger': 'warn',
            curly: ['error', 'all'],
            'prefer-const': ['warn', { destructuring: 'all' }],
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    vars: 'local',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_|^[A-Z_][A-Z0-9_]*$|^[A-Z][a-zA-Z0-9]*$',
                },
            ],
            // Type safety rules
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/explicit-function-return-type': [
                'warn',
                {
                    allowExpressions: true,
                    allowTypedFunctionExpressions: true,
                },
            ],
        },
    },

    // Mock files - allow console statements
    {
        files: ['**/mocks/**/*.{ts,tsx,js}'],
        rules: {
            'no-console': 'off',
        },
    },

    // Legacy JavaScript files
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                app: 'writable',
            },
        },
        rules: {
            'no-unused-vars': [
                'error',
                {
                    vars: 'local',
                    args: 'after-used',
                    varsIgnorePattern: '^_|^[A-Z_][A-Z0-9_]*$|^[A-Z][a-zA-Z0-9]*$',
                },
            ],
            'no-console': 'warn',
            'no-debugger': 'warn',
            curly: ['error', 'all'],
            'no-var': 'error',
            'prefer-const': ['warn', { destructuring: 'all' }],
        },
    },

    prettierConfig
);

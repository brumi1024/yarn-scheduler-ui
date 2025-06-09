import globals from 'globals';
import js from '@eslint/js'; // ESLint's recommended rules
import htmlPlugin from 'eslint-plugin-html';
import unicornPlugin from 'eslint-plugin-unicorn';
import prettierConfig from 'eslint-config-prettier'; // Disables ESLint rules that conflict with Prettier

export default [
    {
        // Global ignores for all configurations
        ignores: ['node_modules/', 'dist/', 'build/', 'coverage/', '*.log', 'eslint-results.sarif'],
    },

    // Base ESLint recommended rules applied globally
    js.configs.recommended,

    // Unicorn plugin configurations applied globally
    unicornPlugin.configs.recommended,

    {
        files: ['**/*.js', '**/*.jsx'], // Target JS and JSX files
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.es2021,

                // Custom globals from your project (loaded via <script> tags in index.html)
                app: 'writable',

            },
        },
        rules: {
            'no-unused-vars': [
                'error',
                {
                    vars: 'local',
                    args: 'after-used', // Ignore unused function arguments unless they are after the last used argument
                    varsIgnorePattern: '^_|^[A-Z_][A-Z0-9_]*$|^[A-Z][a-zA-Z0-9]*$', // Ignore unused variables:
                    // 1. Starting with _
                    // 2. ALL_CAPS_SNAKE_CASE (constants)
                    // 3. PascalCase (constructors/classes)
                },
            ],
            'unicorn/prevent-abbreviations': 'off',
            'unicorn/no-null': 'off',
            'unicorn/prefer-module': 'off',
            'unicorn/prefer-event-target': 'off', // Not applicable in this context
            'unicorn/consistent-function-scoping': [
                'error',
                {
                    checkArrowFunctions: false,
                },
            ],
            'unicorn/no-array-for-each': 'off', // Allow forEach for better readability in some cases
            'unicorn/filename-case': [
                'error',
                {
                    cases: {
                        kebabCase: true,
                        pascalCase: true,
                    },
                },
            ],
        },
    },

    // Configuration for processing HTML files
    {
        files: ['**/*.html'],
        plugins: {
            html: htmlPlugin,
        },
        rules: {},
    },

    {
        rules: {
            'no-console': 'off', // TODO: Enable in production
            'no-debugger': 'warn',
            curly: ['error', 'all'],
            'no-var': 'error',
            'prefer-const': [
                'warn',
                {
                    destructuring: 'all',
                },
            ],
        },
    },

    prettierConfig,
];

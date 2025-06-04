import globals from "globals";
import js from "@eslint/js"; // ESLint's recommended rules
import htmlPlugin from "eslint-plugin-html";
import unicornPlugin from "eslint-plugin-unicorn";
import prettierConfig from "eslint-config-prettier"; // Disables ESLint rules that conflict with Prettier

export default [ // Flat config is an array of configuration objects
    {
        // Global ignores for all configurations
        ignores: [
            "node_modules/",
            "dist/",
            "build/",
            "coverage/",
            "*.log",
            "eslint-results.sarif",
        ],
    },

    // Base ESLint recommended rules applied globally (to JS found by other configs)
    js.configs.recommended,

    // Unicorn plugin configurations applied globally
    unicornPlugin.configs.recommended,

    {
        files: ["**/*.js", "**/*.jsx"], // Target JS and JSX files
        languageOptions: {
            ecmaVersion: "latest", // Use the latest ECMAScript standards
            sourceType: "module",  // Use ES modules (import/export)
            globals: {
                ...globals.browser, // For browser environment global variables
                ...globals.node,    // For Node.js environment global variables (if you have scripts)
                ...globals.es2021,  // Or globals.es2022, globals.esNext etc.
            },
        },
        rules: {
            // 'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
        },
    },

    // Configuration for processing HTML files
    // eslint-plugin-html will extract JS from <script> tags.
    // The extracted JavaScript will then be linted by the JavaScript configuration above.
    {
        files: ["**/*.html"],
        plugins: {
            html: htmlPlugin,
        },
    },

    {
        rules: {
            'no-console': 'warn',
            'no-debugger': 'warn',
            'curly': ['error', 'all'],
            'no-var': 'error',
            'prefer-const': 'warn',
        },
    },

    prettierConfig,
];
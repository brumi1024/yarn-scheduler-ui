// eslint.config.js
import globals from "globals";
import js from "@eslint/js"; // ESLint's recommended rules
import htmlPlugin from "eslint-plugin-html";
import unicornPlugin from "eslint-plugin-unicorn";

export default tseslint.config( // `tseslint.config` is a helper for easier TS setup
    {
      // Global ignores
      ignores: [
        "*.log",
        "eslint-results.sarif",
      ],
    },

    // Base ESLint recommended rules
    js.configs.recommended,

    // Unicorn plugin configurations
    unicornPlugin.configs.recommended,

    // Configuration for JavaScript files (.js, .jsx)
    {
      files: ["**/*.js", "**/*.jsx"],
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        globals: {
          ...globals.browser,
          ...globals.node,
          ...globals.es2021, // Or globals.esNext
        },
        parserOptions: { // For JSX if not using TypeScript for these files
          ecmaFeatures: {
            jsx: true,
          },
        },
      },
      rules: {
      },
    },

    // Configuration for processing HTML files
    // eslint-plugin-html will extract JS from <script> tags
    // The extracted JS will then be linted by the JS/TS configs above.
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
      },
    },
);
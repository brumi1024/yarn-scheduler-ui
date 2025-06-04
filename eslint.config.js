// eslint.config.js
import globals from "globals";
import js from "@eslint/js"; // ESLint's recommended rules
import tseslint from "typescript-eslint"; // For TypeScript
import htmlPlugin from "eslint-plugin-html";
import unicornPlugin from "eslint-plugin-unicorn";
import prettierConfig from "eslint-config-prettier"; // Disables ESLint rules that conflict with Prettier

export default tseslint.config( // `tseslint.config` is a helper for easier TS setup
    {
      // Global ignores
      ignores: [
        "node_modules/",
        "dist/",
        "build/",
        "coverage/",
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
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
        },
      },
      rules: {
      },
    },

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

    // Prettier config should be LAST to override any conflicting styling rules
    // from other configs (js.configs.recommended, tseslint, unicorn, etc.)
    prettierConfig
);
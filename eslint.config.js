import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'build',
      '.react-router',
      'node_modules',
      'coverage',
      '*.log',
      'eslint-results.sarif',
      'src/components/ui/**',
    ],
  },

  // TypeScript and React files
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      react: react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // React 17+ new JSX transform rules
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',

      // Modern React rules
      'react/jsx-key': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/no-children-prop': 'error',
      'react/no-danger-with-children': 'error',
      'react/no-deprecated': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/no-find-dom-node': 'error',
      'react/no-is-mounted': 'error',
      'react/no-render-return-value': 'error',
      'react/no-string-refs': 'error',
      'react/no-unescaped-entities': 'off',
      'react/no-unknown-property': 'error',
      'react/require-render-return': 'error',
      'react/jsx-no-target-blank': 'warn',

      // TypeScript handles these, so we disable them
      'react/prop-types': 'off',
      'react/display-name': 'off',

      // React Refresh
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // General rules
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
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  // Mock files - allow console statements
  {
    files: ['**/mocks/**/*.{ts,tsx,js}'],
    rules: {
      'no-console': 'off',
    },
  },

  // Test files - relax some rules
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  prettierConfig,
);

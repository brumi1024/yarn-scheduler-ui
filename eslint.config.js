import { defineConfig } from "eslint/config";
import eslintPluginUnicorn from 'eslint-plugin-unicorn';

export default defineConfig([
    eslintPluginUnicorn.configs.recommended,
  {
    rules: {
      'unicorn/better-regex': 'warn',
    },
  },
]);
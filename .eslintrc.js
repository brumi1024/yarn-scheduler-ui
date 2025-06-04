module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:unicorn/recommended', // Recommended rules from eslint-plugin-unicorn
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    'html',
    'unicorn',
  ],
  rules: {
    // --- Your Custom Rules ---
    'no-console': 'warn',
    'no-debugger': 'warn',
  },
  overrides: [],
  settings: {},
};

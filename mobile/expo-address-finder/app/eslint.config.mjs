import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'prefer-const': 'warn',
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
    // Metro and Babel load their configs as CommonJS.
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**'],
  },
]

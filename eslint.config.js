import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config(
  { ignores: ['dist/**', 'node_modules/**', 'public/vendor/**'] },
  js.configs.recommended,
  {
    files: ['public/*.js'],
    languageOptions: {
      globals: Object.fromEntries(
        [
          'window',
          'document',
          'navigator',
          'Option',
          'URLSearchParams',
          'fetch',
          'performance',
          'AbortController',
          'setTimeout',
          'clearTimeout',
          'requestAnimationFrame',
        ].map((key) => [key, 'readonly']),
      ),
    },
  },
  ...ts.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      'no-control-regex': 'off',
    },
  },
  {
    files: ['scripts/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
  },
);

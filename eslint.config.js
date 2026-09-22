import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// This is deliberately the standard, minimal-friction ruleset a Vite +
// React + TypeScript project scaffolds with (recommended JS/TS rules plus
// the two React-specific plugins that catch real bugs — stale closures over
// hook dependencies, and components that break Fast Refresh) rather than a
// broader style guide. The goal here is "linting exists and catches real
// mistakes going forward," not relitigating this codebase's existing
// formatting conventions — see README.md's Development section for how this
// is scoped relative to `npm run typecheck`.
export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // TypeScript's own noUnusedLocals-equivalent isn't enabled in
      // tsconfig.json (see the Development section in README.md for why),
      // so this is the one place that check runs at all. A leading
      // underscore opts an intentionally-unused parameter out, matching the
      // convention `catch (_e)` and similar already use in this codebase.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // This codebase intentionally uses `any` in a handful of narrow,
      // already-commented spots (e.g. third-party shapes not worth a full
      // type). Downgraded to a warning rather than disabled outright, so
      // new occurrences are still visible without blocking CI on existing
      // ones.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
);

import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginOxlint from 'eslint-plugin-oxlint'
import pluginBoundaries from 'eslint-plugin-boundaries'
import skipFormatting from 'eslint-config-prettier/flat'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

// The feature folders under each package's src/, and the features each one may import.
// A feature missing from this list can't be imported by any other feature.
const packageFeatures: Record<string, Record<string, string[]>> = {
  schema: {
    shared: [],
    definition: ['shared'],
    rules: ['shared', 'definition'],
    'field-types': ['shared', 'definition'],
    builder: ['shared', 'definition', 'rules', 'field-types'],
  },
}

// UI frameworks belong in frameworks/ and apps/, never in the core packages.
const uiFrameworks = ['vue', '@vue/*', 'react', 'react-dom', 'react/*', '@angular/*', 'svelte']

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  ...pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  {
    name: 'app/boundaries',
    plugins: { boundaries: pluginBoundaries },
    settings: {
      'import/resolver': {
        typescript: { project: '**/tsconfig*.json', noWarnOnMultipleProjects: true },
      },
      'boundaries/elements': [
        { type: 'app', pattern: 'apps/*', capture: ['app'] },
        { type: 'framework', pattern: 'frameworks/*', capture: ['framework'] },
        { type: 'package-feature', pattern: 'packages/*/src/*', capture: ['pkg', 'feature'] },
        // Files directly in src/ (index.ts) that are not inside a feature folder.
        { type: 'package-entry', pattern: 'packages/*/src', capture: ['pkg'] },
        { type: 'package-tests', pattern: 'packages/*/tests', capture: ['pkg'] },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          checkAllOrigins: true,
          policies: [
            { allow: { to: { module: { origin: ['external', 'core'] } } } },
            {
              from: { element: { type: 'app' } },
              allow: {
                to: [
                  {
                    element: { type: 'app', captured: { app: '{{ from.element.captured.app }}' } },
                  },
                  { element: { types: ['framework', 'package-entry'] } },
                ],
              },
            },
            {
              from: { element: { type: 'framework' } },
              allow: {
                to: [
                  {
                    element: {
                      type: 'framework',
                      captured: { framework: '{{ from.element.captured.framework }}' },
                    },
                  },
                  { element: { type: 'package-entry' } },
                ],
              },
            },
            {
              from: { element: { type: 'package-entry' } },
              allow: {
                to: {
                  element: {
                    type: 'package-feature',
                    captured: { pkg: '{{ from.element.captured.pkg }}' },
                  },
                },
              },
            },
            ...Object.entries(packageFeatures).flatMap(([pkg, features]) =>
              Object.entries(features).map(([feature, imports]) => ({
                from: { element: { type: 'package-feature', captured: { pkg, feature } } },
                allow: {
                  to: {
                    element: {
                      type: 'package-feature',
                      captured: { pkg, feature: [feature, ...imports] },
                    },
                  },
                },
              })),
            ),
            {
              from: { element: { type: 'package-tests' } },
              allow: {
                to: {
                  element: {
                    types: ['package-entry', 'package-tests'],
                    captured: { pkg: '{{ from.element.captured.pkg }}' },
                  },
                },
              },
            },
            {
              from: { element: { types: ['package-entry', 'package-feature'] } },
              disallow: {
                to: [
                  { module: { origin: 'core' } },
                  { module: { origin: 'external', source: uiFrameworks } },
                ],
              },
            },
          ],
        },
      ],
    },
  },

  {
    name: 'app/package-tests',
    files: ['packages/*/tests/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/src', '**/src/**'],
              message: 'Import the package by its name, the way its users do.',
            },
          ],
        },
      ],
    },
  },

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting,
)

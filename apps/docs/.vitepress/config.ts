import { defineConfig, type DefaultTheme } from 'vitepress'

// GitHub Pages serves the site at https://whatsaaaa.github.io/form-builder/
const base = '/form-builder/'

const guide: DefaultTheme.SidebarItem[] = [
  {
    text: 'Get started',
    items: [
      { text: 'Introduction', link: '/guide/' },
      { text: 'Installation', link: '/guide/installation' },
      { text: 'Getting started', link: '/guide/getting-started' },
    ],
  },
  {
    text: 'Main concepts',
    items: [
      { text: 'Define your form', link: '/guide/define-your-form' },
      { text: 'Field types', link: '/guide/field-types' },
      { text: 'Validation rules', link: '/guide/rules' },
      { text: 'Form rules', link: '/guide/form-rules' },
      { text: 'Layout', link: '/guide/layout' },
      { text: 'Steps', link: '/guide/steps' },
      { text: 'Conditions', link: '/guide/conditions' },
    ],
  },
  {
    text: 'Advanced guides',
    items: [
      { text: 'Checking definitions', link: '/guide/checking-definitions' },
      { text: 'Messages and i18n', link: '/guide/messages' },
      { text: 'TypeScript', link: '/guide/typescript' },
      { text: 'JSON Schema', link: '/guide/json-schema' },
      { text: 'Custom field types', link: '/guide/custom-field-types' },
      { text: 'Custom rules', link: '/guide/custom-rules' },
      { text: 'Extensions', link: '/guide/extensions' },
    ],
  },
  {
    text: 'Upgrading',
    items: [{ text: 'Migrating to 1.0', link: '/guide/migrating-to-1.0' }],
  },
]

const frameworks: DefaultTheme.SidebarItem[] = [
  {
    text: 'Overview',
    items: [{ text: 'Choose your framework', link: '/frameworks/' }],
  },
  {
    text: 'Vue and React adapters',
    items: [
      { text: 'Vue', link: '/frameworks/vue' },
      { text: 'React', link: '/frameworks/react' },
      { text: 'Field components', link: '/frameworks/field-components' },
      { text: 'Layout components', link: '/frameworks/layout-components' },
      { text: 'Multi-step forms', link: '/frameworks/multi-step-forms' },
      { text: 'Placing fields', link: '/frameworks/placing-fields' },
    ],
  },
  {
    text: 'Formisch bindings',
    items: [
      { text: 'Rendering with Formisch', link: '/frameworks/formisch' },
      { text: 'Preact', link: '/frameworks/preact' },
      { text: 'Solid', link: '/frameworks/solid' },
      { text: 'Svelte', link: '/frameworks/svelte' },
      { text: 'Qwik', link: '/frameworks/qwik' },
      { text: 'Angular', link: '/frameworks/angular' },
    ],
  },
]

const link = (pkg: string, names: readonly string[]): DefaultTheme.SidebarItem[] =>
  names.map((name) => ({ text: name, link: `/api/${pkg}/${name}` }))

const schemaApi: DefaultTheme.SidebarItem[] = [
  { text: 'Builder', items: link('schema', ['createSchemaBuilder', 'SchemaBuilder']) },
  {
    text: 'Definition',
    items: link('schema', ['isRequired']),
  },
  {
    text: 'Registries',
    items: [
      ...link('schema', [
        'defineFieldType',
        'defineRule',
        'defineFormRule',
        'createBuildContext',
        'defaultFieldTypes',
        'defaultKinds',
        'defaultRules',
        'defaultFormRules',
      ]),
      { text: 'Reserved keys', link: '/api/schema/reserved-keys' },
    ],
  },
  {
    text: 'Rendering',
    items: link('schema', [
      'allFields',
      'checkComponents',
      'checkLayoutComponents',
      'coerceInput',
      'dotPathOf',
      'fieldPathsOf',
      'findField',
      'issuesOfStep',
      'selectFields',
      'shownNodes',
      'toFieldPath',
    ]),
  },
  { text: 'Errors', items: link('schema', ['DefinitionError', 'formatPath']) },
  { text: 'JSON Schema', items: link('schema', ['toJsonSchema']) },
  {
    text: 'Types',
    items: link('schema', [
      'BuiltSchema',
      'DefinitionIssue',
      'FieldNode',
      'FieldTypeDef',
      'FormLayout',
      'FormRuleDef',
      'JsonField',
      'JsonForm',
      'JsonFormRule',
      'JsonFormSchema',
      'JsonLayout',
      'JsonRule',
      'KindDef',
      'MessageContext',
      'RuleDef',
      'SchemaBuilderOptions',
      'SchemaExtension',
      'TypedForm',
      'TypedJsonFormSchema',
      'ValueKind',
      'Visibility',
      'WalkedField',
    ]),
  },
  {
    text: 'Built-ins',
    items: [
      { text: 'Field types', link: '/api/schema/field-types' },
      { text: 'Rules', link: '/api/schema/rules' },
    ],
  },
]

const affectsApi: DefaultTheme.SidebarItem[] = [
  { text: 'Functions', items: link('affects', ['affects']) },
  { text: 'Types', items: link('affects', ['Affect', 'AffectsExtension', 'Condition']) },
]

/** The Vue and React adapters have the same API. */
const adapterApi = (pkg: 'vue' | 'react'): DefaultTheme.SidebarItem[] => [
  { text: pkg === 'vue' ? 'Composables' : 'Hooks', items: link(pkg, ['useJsonForm']) },
  { text: 'Components', items: link(pkg, ['JsonFields', 'JsonField']) },
  {
    text: 'Types',
    items: link(pkg, [
      'FieldComponents',
      'JsonFormInstance',
      'JsonFormSteps',
      'LayoutComponents',
      'UseJsonFormOptions',
    ]),
  },
]

const packages = [
  { text: 'Schema', link: '/api/schema/', activeMatch: '/api/schema/' },
  { text: 'Affects', link: '/api/affects/', activeMatch: '/api/affects/' },
  { text: 'Vue', link: '/api/vue/', activeMatch: '/api/vue/' },
  { text: 'React', link: '/api/react/', activeMatch: '/api/react/' },
]

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'form-builder',
  description: 'Describe forms in JSON and get validated Formisch forms out.',
  base,
  cleanUrls: true,
  lastUpdated: true,

  // The SVG for browsers that take one, and PNG renders of it for the others and for home screens.
  head: [
    ['link', { rel: 'icon', href: `${base}favicon.ico`, sizes: '32x32' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }],
    ['link', { rel: 'apple-touch-icon', href: `${base}apple-touch-icon.png` }],
  ],

  // https://vitepress.dev/reference/default-theme-config
  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/', activeMatch: '/guide/' },
      { text: 'Frameworks', link: '/frameworks/', activeMatch: '/frameworks/' },
      { text: 'API', items: packages, activeMatch: '/api/' },
    ],

    sidebar: {
      '/guide/': guide,
      '/frameworks/': frameworks,
      '/api/schema/': schemaApi,
      '/api/affects/': affectsApi,
      '/api/vue/': adapterApi('vue'),
      '/api/react/': adapterApi('react'),
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/whatsaaaa/form-builder' }],

    editLink: {
      pattern: 'https://github.com/whatsaaaa/form-builder/edit/main/apps/docs/:path',
    },

    search: {
      provider: 'local',
    },
  },
})

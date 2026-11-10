import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'form-builder',
  description: 'Describe forms in JSON and get validated Formisch forms out.',
  cleanUrls: true,
  lastUpdated: true,

  // https://vitepress.dev/reference/default-theme-config
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/', activeMatch: '/guide/' },
      { text: 'Packages', link: '/packages/schema', activeMatch: '/packages/' },
      { text: 'Frameworks', link: '/frameworks/vue', activeMatch: '/frameworks/' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/guide/' },
          { text: 'Getting started', link: '/guide/getting-started' },
        ],
      },
      {
        text: 'Packages',
        items: [
          { text: 'Schema', link: '/packages/schema' },
          { text: 'Affects', link: '/packages/affects' },
        ],
      },
      {
        text: 'Frameworks',
        items: [
          { text: 'Vue', link: '/frameworks/vue' },
          { text: 'React', link: '/frameworks/react' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/whatsaaaa/form-builder' }],

    editLink: {
      pattern: 'https://github.com/whatsaaaa/form-builder/edit/main/apps/docs/:path',
    },

    search: {
      provider: 'local',
    },
  },
})

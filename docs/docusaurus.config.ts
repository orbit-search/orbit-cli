import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Orbit',
  tagline: 'The people search engine — CLI & API docs',
  favicon: 'img/favicon.ico',
  url: 'https://docs.orbitsearch.com',
  baseUrl: '/',
  organizationName: 'orbit-search',
  projectName: 'orbit-cli',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'Orbit',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/orbit-search/orbit-cli',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://orbitsearch.com',
          label: 'Orbit',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/' },
            { label: 'CLI Reference', to: '/cli/search' },
            { label: 'API Reference', to: '/api/overview' },
          ],
        },
        {
          title: 'Links',
          items: [
            { label: 'Orbit', href: 'https://orbitsearch.com' },
            { label: 'GitHub', href: 'https://github.com/orbit-search/orbit-cli' },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Orbit Intelligence`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'index',
    'installation',
    'authentication',
    {
      type: 'category',
      label: 'CLI Reference',
      items: [
        'cli/search',
        'cli/lookup',
        'cli/profile',
        'cli/connections',
        'cli/compare',
        'cli/me',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/overview',
        'api/authentication',
        'api/search',
        'api/profiles',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/search-patterns',
        'guides/scripting',
        'guides/agents',
      ],
    },
    'data-model',
  ],
};

export default sidebars;

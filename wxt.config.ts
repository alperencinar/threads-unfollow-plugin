import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'Threads.com Unfollower Tracker (Safe & Local)',
    version: '1.0.0',
    description: 'threads.com üzerinde sizi takipten çıkanları yerel, gizli ve güvenli şekilde analiz edin.',
    permissions: ['storage', 'sidePanel'],
    host_permissions: [
      '*://*.threads.com/*',
      '*://*.threads.net/*'
    ],
    action: {
      default_title: 'Threads.com Takipçi Analizcisi'
    },
    side_panel: {
      default_path: 'sidepanel/index.html'
    },
    web_accessible_resources: [
      {
        resources: ['main-world-bridge.js'],
        matches: ['*://*.threads.com/*', '*://*.threads.net/*'],
      },
    ],
  },
  modules: ['@wxt-dev/module-react'],
});

import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'Threads.com Unfollower Tracker (Safe & Local)',
    version: '1.0.0',
    description: 'See who unfollows you on threads.com safely, locally and privately.',
    permissions: ['storage', 'sidePanel', 'tabs', 'declarativeNetRequest'],
    host_permissions: [
      '*://*.threads.com/*',
      '*://*.threads.net/*',
      '*://*.cdninstagram.com/*',
      '*://*.fbcdn.net/*'
    ],
    action: {
      default_title: 'Threads Takipçi Analizcisi / Unfollower Tracker'
    },
    side_panel: {
      default_path: 'sidepanel/index.html'
    },
  },
  modules: ['@wxt-dev/module-react'],
});

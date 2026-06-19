import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'Tidy — clipboard, but smart',
  short_name: 'Tidy',
  version: pkg.version,
  description: 'Copy anywhere, transform, paste. Clean text, change tone, summarize, extract — without leaving your clipboard.',
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Tidy',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
    },
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/inject.ts'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ],
  commands: {
    'open-tidy': {
      suggested_key: {
        default: 'Ctrl+Shift+Y',
        mac: 'Command+Shift+Y',
      },
      description: 'Open Tidy chip on the active tab',
    },
  },
  permissions: ['storage', 'activeTab'],
  host_permissions: [],
});

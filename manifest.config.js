import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  icons: {
    48: 'public/douyin.png',
  },
  action: {
    default_icon: {
      48: 'public/douyin.png',
    },
    default_popup: 'src/popup/index.html',
  },
  content_scripts: [{
    js: ['src/content/main.js'],
    matches: [
      'https://*/*',
      '*://localhost/*',
      '*://*/*',
      '<all_urls>'
    ],
  }],
  permissions: [
    'sidePanel',
    'contentSettings',
    'activeTab',
    'contextMenus',
    'downloads',
    'scripting',
    'tabs',
    'webRequest',
    'storage',
    'offscreen',
    'notifications'
  ],
  host_permissions: [
    'http://www.douyin.com/*',
    'https://www.douyin.com/*'
  ],
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  commands: {
    RUN_ALT_S: {
      'suggested_key': {
        'default': 'Alt+1',
        'mac': 'Alt+1'
      },
      description: 'Run \"run alt 1\" on the current page.'
    },
    RUN_ALT_L: {
      'suggested_key': {
        'default': 'Alt+L',
        'mac': 'Alt+L'
      },
      description: 'Run \"run alt l\" on the current page.'
    },
    RUN_ALT_A: {
      "suggested_key": {
        "default": "Alt+A",
        "mac": "Alt+A"
      },
      description: "Run \"run alt a\" on the current page."
    },
    RUN_ALT_T: {
      "suggested_key": {
        "default": "Alt+T",
        "mac": "Alt+T"
      },
      description: "Run \"run alt a\" on the current page."
    }
  },
  background: {
    service_worker: 'src/background/index.js',
    type: 'module',
  },
})

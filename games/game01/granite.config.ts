import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'workers-nightmare',
  brand: {
    displayName: '',
    primaryColor: '#000000',
    icon: '',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'tsc -b && vite build',
    },
  },
  navigationBar: {
    withBackButton: false,
    withHomeButton: false,
  },
  permissions: [],
  outdir: 'dist',
});

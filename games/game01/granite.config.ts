import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'worker-nightmare',
  brand: {
    displayName: '직장인 잔혹사 : 퇴근길',
    primaryColor: '#000000',
    icon: './icon.png',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite --base /',
      build: 'tsc -b && vite build --outDir dist --base /',
    },
  },
  navigationBar: {
    withBackButton: false,
    withHomeButton: false,
  },
  permissions: [],
  outdir: 'dist',
});

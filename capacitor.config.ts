import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dragonnine.game01',
  appName: '직장인 잔혹사',
  webDir: 'dist',
  android: {
    backgroundColor: '#0a0a14',
    allowMixedContent: true,
    captureInput: false,
    webContentsDebuggingEnabled: true,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'disable',
      style: 'DARK',
    },
  },
};

export default config;

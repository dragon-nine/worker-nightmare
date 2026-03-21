import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dragonnine.workernightmare',
  appName: '직장인 잔혹사',
  webDir: 'dist',
  android: {
    backgroundColor: '#0a0a14',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;

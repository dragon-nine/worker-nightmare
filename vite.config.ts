import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }

// 빌드 시점 (KST, MM/DD HH:mm 형식)
const buildTime = (() => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('month')}/${get('day')} ${get('hour')}:${get('minute')}`;
})();

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  server: {
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Phaser 게임 특성상 메인 청크가 1.5MB대가 정상 (Phaser ~280KB gz, gzip 총 435KB).
    // 기본 500KB 임계치는 콘텐츠 사이트 기준이라 게임엔 너무 빡빡함. 1700KB로 상향.
    chunkSizeWarningLimit: 1700,
  },
})

import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'worker-nightmare',
  brand: {
    displayName: '직장인 잔혹사 : 퇴근길',
    primaryColor: '#000000',
    icon: 'https://static.toss.im/appsintoss/28357/49b9471f-9a7f-43d6-8675-d5bbe0fdfaec.png',
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
  // 게임 환경에 맞는 WebView 설정 — 모든 네이티브 제스처 비활성화로
  // 빠른 연타 시 edge swipe/pull-to-refresh 등으로 터치 이벤트 드롭되는 현상 방지.
  // (카카오 웹뷰처럼 커스텀 WKWebView 환경 근접)
  webViewProps: {
    allowsBackForwardNavigationGestures: false,  // iOS 엣지 뒤로/앞으로 스와이프 차단
    bounces: false,                              // iOS 바운스 스크롤 차단
    pullToRefreshEnabled: false,                 // iOS 당겨서 새로고침 차단
    overScrollMode: 'never',                     // Android 오버스크롤 차단
  },
  permissions: [],
  outdir: 'dist',
});

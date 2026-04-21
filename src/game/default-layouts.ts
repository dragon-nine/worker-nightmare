import type { ScreenLayout } from './layout-types'
import { DESIGN_W } from './layout-types'

export const DEFAULT_LAYOUTS: Record<string, ScreenLayout> = {
  'main-screen': {
    screen: 'main-screen',
    designWidth: DESIGN_W,
    groupVAlign: 'top',
    padding: { top: 140, right: 24, bottom: 80, left: 24 },
    elements: [
      { id: 'main-text', positioning: 'group', type: 'image', order: 0, gapPx: 0, widthPx: 331 },
      { id: 'main-btn', positioning: 'group', type: 'image', order: 1, gapPx: 40, widthPx: 214 },
      { id: 'bestScore', positioning: 'group', type: 'text', order: 2, gapPx: 20, widthPx: 200, label: '최고기록 0', textStyle: { fontSizePx: 22, color: '#ffffff', strokeColor: '#000000', strokeWidth: 4 } },
      { id: 'btn-settings', positioning: 'anchor', type: 'image', anchor: 'top-right', offsetX: 15, offsetY: 10, widthPx: 40 },
    ],
  },
  'game-over': {
    screen: 'game-over',
    designWidth: DESIGN_W,
    elements: [
      { id: 'bestText', positioning: 'group', type: 'text', order: 0, gapPx: 0, widthPx: 234, label: '최고기록 0', textStyle: { fontSizePx: 22, color: '#ffffff' } },
      { id: 'scoreText', positioning: 'group', type: 'text', order: 1, gapPx: 12, widthPx: 156, label: '0', textStyle: { fontSizePx: 72, color: '#ffffff' } },
      { id: 'go-rabbit', positioning: 'group', type: 'image', order: 2, gapPx: 16, widthPx: 175 },
      { id: 'quoteText', positioning: 'group', type: 'text', order: 3, gapPx: 16, widthPx: 273, label: '퇴근은 쉬운게 아니야...\n인생이 원래 그래', textStyle: { fontSizePx: 18, color: '#ffffff', gradientColors: ['#e5332f', '#771615'] } },
      { id: 'go-btn-revive', positioning: 'group', type: 'text', order: 4, gapPx: 24, widthPx: 342, label: '광고보고 부활' },
      { id: 'go-btn-home', positioning: 'group', type: 'text', order: 5, gapPx: 8, widthPx: 342, label: '홈으로 가기' },
      { id: 'go-btn-challenge', positioning: 'group', type: 'text', order: 6, gapPx: 8, widthPx: 167, label: '🔥 도전장 보내기' },
      { id: 'go-btn-ranking', positioning: 'group', type: 'text', order: 6, gapPx: 8, widthPx: 167, label: '🏆 랭킹 보기' },
    ],
  },
  'gameplay': {
    screen: 'gameplay',
    designWidth: DESIGN_W,
    groupVAlign: 'top',
    elements: [
      // 상단 그룹 (top 정렬) — gauge + pause 같은 행, score 아래 행
      { id: 'gauge-bar', positioning: 'group', type: 'image', order: 0, gapPx: 15, widthPx: 290, hGapPx: 10 },
      { id: 'btn-pause', positioning: 'group', type: 'image', order: 0, gapPx: 15, widthPx: 40, hGapPx: 10 },
      { id: 'scoreText', positioning: 'group', type: 'text', order: 1, gapPx: 8, widthPx: 390, label: '0', textStyle: { fontSizePx: 90, color: '#ffffff', strokeColor: '#000000', strokeWidth: 6 } },
      // 하단 앵커 — 좌하단/우하단 기준
      { id: 'btn-switch', positioning: 'anchor', type: 'image', anchor: 'bottom-left', offsetX: 10, offsetY: 85, widthPx: 140 },
      { id: 'btn-forward', positioning: 'anchor', type: 'image', anchor: 'bottom-right', offsetX: 10, offsetY: 85, widthPx: 140 },
    ],
  },
  'settings': {
    screen: 'settings',
    designWidth: DESIGN_W,
    groupVAlign: 'top',
    elements: [
      { id: 'settings-title', positioning: 'group', type: 'text', order: 0, gapPx: 0, widthPx: 200, label: '설정', textStyle: { fontSizePx: 32, color: '#ffffff' } },
      { id: 'bgm-toggle', positioning: 'group', type: 'text', order: 1, gapPx: 20, widthPx: 240, label: '음악 OFF', textStyle: { fontSizePx: 28, color: '#ffffff' } },
      { id: 'sfx-toggle', positioning: 'group', type: 'text', order: 2, gapPx: 20, widthPx: 240, label: '효과음 OFF', textStyle: { fontSizePx: 28, color: '#ffffff' } },
    ],
  },
}

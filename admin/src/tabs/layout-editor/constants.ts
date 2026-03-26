/** 레이아웃 에디터 상수 */

export const DESIGN_W = 390
export const DESIGN_H = 844

export const PHONE_PREVIEW_W = 320
export const PHONE_PREVIEW_H = Math.round(PHONE_PREVIEW_W * (DESIGN_H / DESIGN_W))

export const R2_LAYOUT_PREFIX = 'game01/layout/'
export const R2_LAYOUT_INDEX_KEY = 'layout-editor/game01-index'
export const R2_ASSET_PREFIX = 'game01/'

export const SCREEN_PADDING_X = 24
export const MIN_ELEMENT_SIZE = 20
export const RESIZE_HANDLE_SIZE = 8
export const DEFAULT_ELEMENT_WIDTH = DESIGN_W - SCREEN_PADDING_X * 2  // 342px
export const DEFAULT_GAP = 16

export const DEFAULT_SCREENS = [
  { key: 'main-screen', label: '메인 화면' },
  { key: 'gameplay', label: '게임플레이' },
  { key: 'game-over', label: '게임오버' },
]

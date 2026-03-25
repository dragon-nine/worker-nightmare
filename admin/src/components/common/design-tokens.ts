/** 직장인 잔혹사 디자인 시스템 토큰 */

export const colors = {
  // 배경
  dark: '#2d2d2d',
  darker: '#1a1a1f',
  modalBg: '#2a292e',
  black: '#000000',

  // 강조
  red: '#c41e1e',
  redLight: '#e53935',
  redDark: '#8b1a1a',
  cyan: '#00e5ff',
  blue: '#1a6fc4',
  blueLight: '#7ec8e3',

  // 중성
  blueGray: '#4a5a6a',
  blueGrayLight: '#5a7080',
  blueGrayDark: '#3a4a5a',
  gray: '#3c3c44',
  grayText: '#969696',
  white: '#ffffff',
  stroke: '#000000',
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const

export const font = {
  primary: '"Black Han Sans", "GMarketSans", sans-serif',
  weight: {
    bold: 700,
    black: 900,
  },
} as const

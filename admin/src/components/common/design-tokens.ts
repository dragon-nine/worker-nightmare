/** 직장인 잔혹사 디자인 시스템 토큰 */

export const colors = {
  white: '#ffffff',
  black: '#000000',
  charcoal: '#1a1a1f',
  slate: '#3c3c44',
  silver: '#969696',
  ash: '#2a292e',
  graphite: '#24282c',
  cocoa: '#231816',
  bronze: '#4d4340',
  steel: '#434750',
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const

export const spacing = {
  '2xs': 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const

export const font = {
  primary: 'GMarketSans, sans-serif',
  weight: {
    regular: 400,
    bold: 700,
    black: 900,
  },
} as const

/**
 * 타입 스케일 — 6단계 크기 시스템 (2xl ~ xs)
 * 모든 텍스트는 이 스케일 안에서 선택. 용도는 매핑으로 관리.
 */
export const typeScale = {
  '3xl': { fontSize: 76, fontWeight: 900, stroke: 6 },
  '2xl': { fontSize: 56, fontWeight: 900, stroke: 6 },
  xl: { fontSize: 44, fontWeight: 900, stroke: 4 },
  lg: { fontSize: 32, fontWeight: 900, stroke: 3 },
  md: { fontSize: 28, fontWeight: 900, stroke: 3 },
  sm: { fontSize: 20, fontWeight: 700, stroke: 2 },
  xs: { fontSize: 16, fontWeight: 700, stroke: 0 },
  '2xs': { fontSize: 13, fontWeight: 400, stroke: 0 },
} as const

/** 버튼 스타일 기본값 */
export const buttonStyleDefaults = {
  flat: {
    borderWidth: 0,
    borderColor: 'transparent',
    innerLineWidth: 0,
    innerLineColor: 'transparent',
    borderRadius: 12,
  },
  outline: {
    borderWidth: 3,
    borderColor: '#000000',
    innerLineWidth: 0,
    innerLineColor: 'transparent',
    borderRadius: 12,
  },
  doubleLine: {
    borderWidth: 3,
    borderColor: '#000000',
    innerLineWidth: 2,
    innerLineColor: '#4d4340', // bronze
    borderRadius: 12,
  },
} as const

/** 그라데이션 토큰 */
export const gradients = {
  'White → Ice Blue': { from: '#ffffff', to: '#c1e5ff', direction: 'to bottom' },
  'Crimson → Maroon': { from: '#e5332f', to: '#771615', direction: '135deg' },
  'Wine → Black': { from: '#2a0c10', to: '#000000', direction: 'to bottom' },
} as const

export type GradientKey = keyof typeof gradients

/** 용도별 스케일 매핑 */
export const typeUsage: Record<string, { scale: keyof typeof typeScale; usages: string[] }> = {
  '3xl': { scale: '3xl', usages: ['게임 점수'] },
  '2xl': { scale: '2xl', usages: ['메인 타이틀'] },
  xl: { scale: 'xl', usages: ['서브 타이틀, 강조 텍스트'] },
  lg: { scale: 'lg', usages: ['대형 버튼'] },
  md: { scale: 'md', usages: ['중형 버튼'] },
  sm: { scale: 'sm', usages: ['소형 버튼, 서브타이틀'] },
  xs: { scale: 'xs', usages: ['CTA, 멘트'] },
  '2xs': { scale: '2xs', usages: ['가이드, 라벨'] },
}

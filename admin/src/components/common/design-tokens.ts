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
  primary: '"Black Han Sans", "GMarketSans", sans-serif',
  secondary: '"Pretendard Variable", -apple-system, sans-serif',
  weight: {
    regular: 400,
    bold: 700,
    black: 900,
  },
} as const

/** 텍스트 스타일 토큰 — 각 용도별 정의 */
export const textStyles = {
  /** 메인 타이틀 1줄 (직장인 잔혹사) */
  titleLarge: {
    fontSize: 56,
    fontWeight: 900,
    strokeWidth: 6,
    outerStrokeWidth: 3,
    color: 'gradient',
    usage: '메인 화면 타이틀',
  },
  /** 메인 타이틀 2줄 (당신의 하루를...) */
  titleSub: {
    fontSize: 24,
    fontWeight: 700,
    strokeWidth: 4,
    outerStrokeWidth: 2,
    color: '#ffffff',
    usage: '메인 화면 서브타이틀',
  },
  /** 점수 (게임오버/도전장) */
  score: {
    fontSize: 72,
    fontWeight: 900,
    strokeWidth: 6,
    outerStrokeWidth: 0,
    color: '#ffffff',
    usage: '점수 표시 (게임오버, 도전장)',
  },
  /** 버튼 텍스트 (대형) */
  buttonLarge: {
    fontSize: 28,
    fontWeight: 900,
    strokeWidth: 3,
    outerStrokeWidth: 0,
    color: '#ffffff',
    usage: '홈으로 가기, 광고보고 부활',
  },
  /** 버튼 텍스트 (중형) */
  buttonMedium: {
    fontSize: 22,
    fontWeight: 900,
    strokeWidth: 2.5,
    outerStrokeWidth: 0,
    color: '#ffffff',
    usage: '도전장 보내기, 랭킹 보기',
  },
  /** 버튼 텍스트 (CTA) */
  buttonCTA: {
    fontSize: 16,
    fontWeight: 700,
    strokeWidth: 0,
    outerStrokeWidth: 0,
    color: '#ffffff',
    usage: '카카오톡으로 도전장 보내기',
  },
  /** 본문 (멘트 카드) */
  body: {
    fontSize: 14,
    fontWeight: 400,
    strokeWidth: 0,
    outerStrokeWidth: 0,
    color: '#ffffff',
    usage: '게임오버 멘트, 모달 본문',
  },
  /** 라벨 (보조 텍스트) */
  label: {
    fontSize: 13,
    fontWeight: 700,
    strokeWidth: 0,
    outerStrokeWidth: 0,
    color: '#969696',
    usage: '다른 멘트로 바꾸기, 최고기록',
  },
  /** HUD 점수 */
  hudScore: {
    fontSize: 90,
    fontWeight: 900,
    strokeWidth: 6,
    outerStrokeWidth: 0,
    color: '#ffffff',
    usage: '인게임 점수 표시',
  },
  /** 튜토리얼 가이드 */
  guide: {
    fontSize: 13,
    fontWeight: 700,
    strokeWidth: 0,
    outerStrokeWidth: 0,
    color: '#ffffff',
    usage: '앞으로 한 칸 이동, 회전하고 이동',
  },
} as const

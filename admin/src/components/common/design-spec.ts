/** 디자인 시스템 스펙 — R2에 JSON으로 저장/로드 */

export interface ComponentSpec {
  fontSize: number
  fontWeight: number
  strokeWidth: number
  borderRadius: number
  borderWidth: number
  paddingX: number
  paddingY: number
  [key: string]: number | string | undefined
}

export interface DesignSpec {
  darkButton: ComponentSpec & { bgColor: string; borderColor: string }
  redButton: ComponentSpec & { gradientFrom: string; gradientTo: string; borderColor: string }
  iconButton: ComponentSpec & { bgColor: string; borderColor: string; outlineColor: string }
  stoneButton: ComponentSpec & { bgColor: string; borderColor: string }
  circleButton: { size: number; iconSize: number }
  gaugeBar: { height: number; borderWidth: number; fillColor: string }
  mainTitle: {
    line1Size: number
    line2Size: number
    strokeWidth: number
    gradientFrom: string
    gradientTo: string
    line2Color: string
  }
  challengeModal: {
    width: number
    borderRadius: number
    paddingX: number
    paddingY: number
    gap: number
    bgColor: string
    scoreFontSize: number
    messageFontSize: number
    ctaFontSize: number
  }
}

export const DEFAULT_SPEC: DesignSpec = {
  darkButton: {
    fontSize: 28,
    fontWeight: 900,
    strokeWidth: 3,
    borderRadius: 16,
    borderWidth: 3,
    paddingX: 24,
    paddingY: 14,
    bgColor: '#2d2d2d',
    borderColor: '#000000',
  },
  redButton: {
    fontSize: 28,
    fontWeight: 900,
    strokeWidth: 3,
    borderRadius: 16,
    borderWidth: 3,
    paddingX: 24,
    paddingY: 14,
    gradientFrom: '#e53935',
    gradientTo: '#8b1a1a',
    borderColor: '#8b1a1a',
  },
  iconButton: {
    fontSize: 22,
    fontWeight: 900,
    strokeWidth: 2.5,
    borderRadius: 12,
    borderWidth: 3,
    paddingX: 20,
    paddingY: 12,
    bgColor: '#1a1a1f',
    borderColor: '#333333',
    outlineColor: '#555555',
  },
  stoneButton: {
    fontSize: 26,
    fontWeight: 900,
    strokeWidth: 3,
    borderRadius: 16,
    borderWidth: 4,
    paddingX: 40,
    paddingY: 16,
    bgColor: '#4a5a6a',
    borderColor: '#3a4a5a',
  },
  circleButton: {
    size: 80,
    iconSize: 38,
  },
  gaugeBar: {
    height: 28,
    borderWidth: 3,
    fillColor: '#c41e1e',
  },
  mainTitle: {
    line1Size: 56,
    line2Size: 24,
    strokeWidth: 6,
    gradientFrom: '#1a6fc4',
    gradientTo: '#7ec8e3',
    line2Color: '#ffffff',
  },
  challengeModal: {
    width: 360,
    borderRadius: 20,
    paddingX: 12,
    paddingY: 26,
    gap: 16,
    bgColor: '#2a292e',
    scoreFontSize: 72,
    messageFontSize: 14,
    ctaFontSize: 16,
  },
}

export const R2_KEY = 'design-system/spec.json'

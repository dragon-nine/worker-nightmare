/** 디자인 시스템 스펙 — R2에 JSON으로 저장/로드 */

import type { typeScale } from './design-tokens'

export type TypeScaleKey = keyof typeof typeScale
export type ButtonStyleType = 'flat' | 'outline' | 'doubleLine'

export interface ButtonSpec {
  scale: TypeScaleKey
  buttonStyle: ButtonStyleType
  bgColor: string
  [key: string]: number | string | undefined
}

export interface DesignSpec {
  darkButton: ButtonSpec
  redButton: ButtonSpec & { gradientFrom: string; gradientTo: string }
  iconButton: ButtonSpec
  stoneButton: ButtonSpec
  circleButton: { size: number; iconSize: number }
  gaugeBar: { height: number; borderWidth: number; fillColor: string }
  mainTitle: {
    line1Scale: TypeScaleKey
    line2Scale: TypeScaleKey
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
    scoreScale: TypeScaleKey
    messageScale: TypeScaleKey
    ctaScale: TypeScaleKey
  }
}

export const DEFAULT_SPEC: DesignSpec = {
  darkButton: {
    scale: 'lg',
    buttonStyle: 'outline',
    bgColor: '#24282c',
  },
  redButton: {
    scale: 'lg',
    buttonStyle: 'flat',
    bgColor: '#c41e1e',
    gradientFrom: '#e53935',
    gradientTo: '#8b1a1a',
  },
  iconButton: {
    scale: 'md',
    buttonStyle: 'doubleLine',
    bgColor: '#231816',
  },
  stoneButton: {
    scale: 'lg',
    buttonStyle: 'outline',
    bgColor: '#4a5a6a',
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
    line1Scale: 'xl',
    line2Scale: 'md',
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
    scoreScale: '3xl',
    messageScale: 'xs',
    ctaScale: 'xs',
  },
}

export const R2_KEY = 'design-system/spec.json'

/** 레이아웃 에디터 데이터 모델 — game01 layout-types.ts와 호환 */

import type { TypeScaleKey } from '../../components/common/design-spec'

export type AnchorCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type ButtonStyleType = 'flat' | 'outline' | 'doubleLine'

export interface TextStyle {
  fontSizePx?: number
  scaleKey?: TypeScaleKey
  color?: string
  strokeColor?: string
  strokeWidth?: number
  gradientColors?: [string, string]
}

export interface ButtonStyle {
  styleType: ButtonStyleType
  bgColor?: string
  scaleKey?: TypeScaleKey
}

interface LayoutElementBase {
  id: string
  type: 'text' | 'image' | 'button'
  widthMode?: 'full' | 'fixed'
  widthPx: number
  heightPx?: number
  label?: string
  textStyle?: TextStyle
  buttonStyle?: ButtonStyle
  assetKey?: string
  visible?: boolean
  locked?: boolean
}

export interface GroupElement extends LayoutElementBase {
  positioning: 'group'
  order: number
  gapPx: number
  hGapPx?: number
}

export interface AnchorElement extends LayoutElementBase {
  positioning: 'anchor'
  anchor: AnchorCorner
  offsetX: number
  offsetY: number
}

export type LayoutElement = GroupElement | AnchorElement

export interface ScreenLayout {
  screen: string
  designWidth: number
  elements: LayoutElement[]
  groupVAlign?: 'center' | 'top'
  padding?: { top: number; right: number; bottom: number; left: number }
  bgType?: 'transparent' | 'solid' | 'gradient'
  bgColor?: string
  bgGradient?: string
  bgAssetKey?: string
}

export interface LayoutIndex {
  screens: { key: string; label: string; updatedAt: string }[]
}

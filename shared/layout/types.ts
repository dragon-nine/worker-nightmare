/** Shared layout types — single source of truth for admin & game */

/** Design reference width — all px values are based on this */
export const DESIGN_W = 390

export type AnchorCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface TextStyle {
  fontSizePx?: number
  scaleKey?: string
  color?: string
  strokeColor?: string
  strokeWidth?: number
  gradientColors?: [string, string]  // [top, bottom] 세로 그라데이션
}

export type ButtonStyleType = 'flat' | 'outline' | 'doubleLine' | 'pill'

export interface ButtonStyle {
  styleType?: ButtonStyleType | string
  bgColor?: string
  bgGradient?: string
  scaleKey?: string
}

interface LayoutElementBase {
  id: string
  type: string   // text, image, button, card, modal, toggle, close, gauge, circle-btn
  widthPx: number
  widthMode?: 'full' | 'fixed'
  heightPx?: number
  parentId?: string
  innerPadding?: { top: number; right: number; bottom: number; left: number }
  label?: string
  textStyle?: TextStyle
  buttonStyle?: ButtonStyle
  assetKey?: string
  visible?: boolean
  locked?: boolean
}

export interface GroupElement extends LayoutElementBase {
  positioning: 'group'
  order: number     // same order = horizontal row
  gapPx: number     // px gap above this element (from previous row)
  hGapPx?: number   // 같은 행에 2개 요소일 때 가로 간격 (기본 8)
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
  bgType?: 'transparent' | 'solid' | 'gradient' | 'image'
  bgColor?: string
  bgGradient?: string
  bgAssetKey?: string
}

export interface LayoutIndex {
  screens: { key: string; label: string; updatedAt: string }[]
}

/** Computed position for a single element */
export interface ComputedPosition {
  id: string
  x: number
  y: number
  displayWidth: number
  displayHeight: number
  originX: number
  originY: number
}

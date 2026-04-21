/** Game-local layout types so game01 can live without repo-level shared code. */

export const DESIGN_W = 390

export type AnchorCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface TextStyle {
  fontSizePx?: number
  scaleKey?: string
  color?: string
  strokeColor?: string
  strokeWidth?: number
  gradientColors?: [string, string]
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
  type: string
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
  bgType?: 'transparent' | 'solid' | 'gradient' | 'image'
  bgColor?: string
  bgGradient?: string
  bgAssetKey?: string
}

export interface ComputedPosition {
  id: string
  x: number
  y: number
  displayWidth: number
  displayHeight: number
  originX: number
  originY: number
}

export { computeLayout } from './layout-compute'

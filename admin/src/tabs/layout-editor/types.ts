/**
 * 레이아웃 에디터 타입 — shared/layout/types.ts 기반
 * admin 전용 타입 축소(TypeScaleKey 등)만 여기서 재정의
 */

// shared에서 공통 타입 re-export
export type {
  AnchorCorner,
  ButtonStyleType,
  GroupElement,
  AnchorElement,
  LayoutElement,
  ScreenLayout,
  LayoutIndex,
  ComputedPosition,
} from '../../../../shared/layout/types'

export { DESIGN_W } from '../../../../shared/layout/types'

// admin 전용: TypeScaleKey로 축소된 스타일 타입
import type { TypeScaleKey } from '../../components/common/design-spec'

export interface TextStyle {
  fontSizePx?: number
  scaleKey?: TypeScaleKey
  color?: string
  strokeColor?: string
  strokeWidth?: number
  gradientColors?: [string, string]
}

export interface ButtonStyle {
  styleType: 'flat' | 'outline' | 'doubleLine'
  bgColor?: string
  bgGradient?: string
  scaleKey?: TypeScaleKey
}

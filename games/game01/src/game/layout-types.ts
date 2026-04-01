/** Re-export shared layout types & compute — single source of truth in shared/layout */

export { DESIGN_W } from '../../../../shared/layout/types.ts'
export type {
  AnchorCorner,
  TextStyle,
  ButtonStyle,
  GroupElement,
  AnchorElement,
  LayoutElement,
  ScreenLayout,
  ComputedPosition,
} from '../../../../shared/layout/types.ts'

export { computeLayout } from '../../../../shared/layout/compute.ts'

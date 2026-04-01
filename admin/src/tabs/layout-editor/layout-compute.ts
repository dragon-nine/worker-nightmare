/** 레이아웃 위치 계산 — shared/layout/compute.ts의 래퍼 */

import type { LayoutElement } from './types'
import { computeLayout } from '../../../../shared/layout/compute.ts'
import { DESIGN_W } from './constants'

/** Admin preview용 ComputedPos (w/h 필드 사용) */
export interface ComputedPos {
  id: string
  x: number
  y: number
  w: number
  h: number
  originX: number
  originY: number
}

export function computePreviewLayout(
  elements: LayoutElement[],
  screenW: number,
  screenH: number,
  imageSizes: Record<string, { w: number; h: number }>,
  groupVAlign: 'center' | 'top' = 'center',
  padding = { top: 60, right: 24, bottom: 40, left: 24 },
  _allElements?: LayoutElement[],
  _designW?: number,
): ComputedPos[] {
  const allElements = _allElements || elements

  // Record → callback 어댑터
  const getImageSize = (id: string) => imageSizes[id] || null

  const { positions } = computeLayout(
    elements,
    screenW,
    screenH,
    getImageSize,
    null,           // getTextSize
    [],             // excludeIds
    groupVAlign,
    padding,
    allElements,
    _designW || DESIGN_W,
  )

  // ComputedPosition → ComputedPos 변환 (displayWidth/Height → w/h)
  return positions.map((p) => ({
    id: p.id,
    x: p.x,
    y: p.y,
    w: p.displayWidth,
    h: p.displayHeight,
    originX: p.originX,
    originY: p.originY,
  }))
}

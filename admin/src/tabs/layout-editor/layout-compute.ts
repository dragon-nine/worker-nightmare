/** 레이아웃 위치 계산 — game01 layout-types.ts computeLayout과 동일 알고리즘 */

import type { LayoutElement, GroupElement, AnchorElement } from './types'
import { DESIGN_W } from './constants'

export interface ComputedPos {
  id: string
  x: number
  y: number
  w: number
  h: number
  originX: number
  originY: number
}

function calcTextHeight(el: LayoutElement, scale: number): number {
  const fontSizePx = el.textStyle?.fontSizePx || 14
  const text = el.label || el.id
  const lines = text.split('\n').length
  return fontSizePx * scale * 1.4 * lines
}

export function computePreviewLayout(
  elements: LayoutElement[],
  screenW: number,
  screenH: number,
  imageSizes: Record<string, { w: number; h: number }>,
  groupVAlign: 'center' | 'top' = 'center',
): ComputedPos[] {
  const scale = screenW / DESIGN_W
  const results: ComputedPos[] = []

  // Group elements
  const groupEls = elements.filter(
    (e): e is GroupElement => e.positioning === 'group' && e.visible !== false,
  )
  const rowMap = new Map<number, GroupElement[]>()
  for (const el of groupEls) {
    const row = rowMap.get(el.order) || []
    row.push(el)
    rowMap.set(el.order, row)
  }
  const rowOrders = [...rowMap.keys()].sort((a, b) => a - b)

  interface RowInfo { elements: GroupElement[]; height: number; gapPx: number }
  const rows: RowInfo[] = []

  for (const order of rowOrders) {
    const rowEls = rowMap.get(order)!
    const gapPx = rowEls[0].gapPx
    let maxH = 0
    for (const el of rowEls) {
      const elW = el.widthPx * scale
      if (el.type === 'image' && imageSizes[el.id]) {
        maxH = Math.max(maxH, imageSizes[el.id].h * (elW / imageSizes[el.id].w))
      } else if (el.heightPx) {
        maxH = Math.max(maxH, el.heightPx * scale)
      } else {
        maxH = Math.max(maxH, calcTextHeight(el, scale))
      }
    }
    rows.push({ elements: rowEls, height: maxH, gapPx })
  }

  const firstGap = rows.length > 0 ? rows[0].gapPx * scale : 0
  const totalH = rows.reduce((sum, r, i) => sum + r.height + (i > 0 ? r.gapPx * scale : 0), 0)
  let curY = groupVAlign === 'top' ? firstGap : (screenH - totalH) / 2 + firstGap

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri]
    if (ri > 0) curY += row.gapPx * scale
    const cy = curY + row.height / 2

    if (row.elements.length === 1) {
      const el = row.elements[0]
      const elW = el.widthPx * scale
      const elH = el.type === 'image' && imageSizes[el.id]
        ? imageSizes[el.id].h * (elW / imageSizes[el.id].w)
        : el.heightPx ? el.heightPx * scale : row.height
      results.push({ id: el.id, x: screenW / 2, y: cy, w: elW, h: elH, originX: 0.5, originY: 0.5 })
    } else {
      const totalRowW = row.elements.reduce((s, el) => s + el.widthPx * scale, 0)
      const hGap = (row.elements[0].hGapPx ?? 8) * scale
      const totalWithGaps = totalRowW + hGap * (row.elements.length - 1)
      let cx = (screenW - totalWithGaps) / 2
      for (const el of row.elements) {
        const elW = el.widthPx * scale
        const elH = el.type === 'image' && imageSizes[el.id]
          ? imageSizes[el.id].h * (elW / imageSizes[el.id].w)
          : el.heightPx ? el.heightPx * scale : row.height
        results.push({ id: el.id, x: cx + elW / 2, y: cy, w: elW, h: elH, originX: 0.5, originY: 0.5 })
        cx += elW + hGap
      }
    }
    curY += row.height
  }

  // Anchor elements
  const anchorEls = elements.filter(
    (e): e is AnchorElement => e.positioning === 'anchor' && e.visible !== false,
  )
  for (const el of anchorEls) {
    const elW = el.widthPx * scale
    const ox = el.offsetX * scale
    const oy = el.offsetY * scale
    let elH = el.type === 'image' && imageSizes[el.id]
      ? imageSizes[el.id].h * (elW / imageSizes[el.id].w)
      : el.heightPx ? el.heightPx * scale : elW

    let x: number, y: number, originX: number, originY: number
    switch (el.anchor) {
      case 'top-left': x = ox; y = oy; originX = 0; originY = 0; break
      case 'top-right': x = screenW - ox; y = oy; originX = 1; originY = 0; break
      case 'bottom-left': x = ox; y = screenH - oy; originX = 0; originY = 1; break
      case 'bottom-right': x = screenW - ox; y = screenH - oy; originX = 1; originY = 1; break
    }
    results.push({ id: el.id, x, y, w: elW, h: elH, originX, originY })
  }

  return results
}

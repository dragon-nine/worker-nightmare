/** 레이아웃 위치 계산 — game01 layout-types.ts computeLayout과 동일 알고리즘 */

import type { LayoutElement, GroupElement, AnchorElement } from './types'
import { DESIGN_W } from './constants'
import { typeScale } from '../../components/common/design-tokens'

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

function calcButtonHeight(el: LayoutElement, scale: number): number {
  const scaleKey = el.buttonStyle?.scaleKey || 'lg'
  const ts = typeScale[scaleKey]
  const fontSize = ts.fontSize * scale
  return fontSize + 24 * scale  // font + vertical padding
}

export function computePreviewLayout(
  elements: LayoutElement[],
  screenW: number,
  screenH: number,
  imageSizes: Record<string, { w: number; h: number }>,
  groupVAlign: 'center' | 'top' = 'center',
  padding = { top: 60, right: 24, bottom: 40, left: 24 },
): ComputedPos[] {
  const scale = screenW / DESIGN_W
  const results: ComputedPos[] = []
  const contentW = DESIGN_W - padding.left - padding.right
  const contentLeft = padding.left * scale

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

  /** full 모드 요소의 너비 계산 — 같은 행에 여러 개면 균등 분할 */
  function resolveElWidth(el: GroupElement, rowCount: number): number {
    if (el.widthMode === 'fixed') return el.widthPx * scale
    if (rowCount <= 1) return contentW * scale
    const hGap = (el.hGapPx ?? 8)
    return (contentW - hGap * (rowCount - 1)) / rowCount * scale
  }

  for (const order of rowOrders) {
    const rowEls = rowMap.get(order)!
    const gapPx = rowEls[0].gapPx
    const n = rowEls.length
    let maxH = 0
    for (const el of rowEls) {
      const elW = resolveElWidth(el, n)
      if (el.type === 'image' && imageSizes[el.id]) {
        maxH = Math.max(maxH, imageSizes[el.id].h * (elW / imageSizes[el.id].w))
      } else if (el.heightPx) {
        maxH = Math.max(maxH, el.heightPx * scale)
      } else if (el.type === 'button') {
        maxH = Math.max(maxH, calcButtonHeight(el, scale))
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
    const n = row.elements.length

    const calcElH = (el: LayoutElement, elW: number) => {
      if (el.type === 'image' && imageSizes[el.id]) return imageSizes[el.id].h * (elW / imageSizes[el.id].w)
      if (el.heightPx) return el.heightPx * scale
      if (el.type === 'button') return calcButtonHeight(el, scale)
      return row.height
    }

    if (n === 1) {
      const el = row.elements[0]
      const elW = resolveElWidth(el, 1)
      const cx = el.widthMode === 'fixed' ? screenW / 2 : contentLeft + contentW * scale / 2
      results.push({ id: el.id, x: cx, y: cy, w: elW, h: calcElH(el, elW), originX: 0.5, originY: 0.5 })
    } else {
      const hGap = (row.elements[0].hGapPx ?? 8) * scale
      let cx = contentLeft
      for (const el of row.elements) {
        const elW = resolveElWidth(el, n)
        results.push({ id: el.id, x: cx + elW / 2, y: cy, w: elW, h: calcElH(el, elW), originX: 0.5, originY: 0.5 })
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
    let elH: number
    if (el.type === 'image' && imageSizes[el.id]) {
      elH = imageSizes[el.id].h * (elW / imageSizes[el.id].w)
    } else if (el.heightPx) {
      elH = el.heightPx * scale
    } else if (el.type === 'button') {
      elH = calcButtonHeight(el, scale)
    } else if (el.type === 'text') {
      elH = calcTextHeight(el, scale)
    } else {
      elH = elW
    }

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

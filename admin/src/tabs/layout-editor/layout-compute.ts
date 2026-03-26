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
  const padY = Math.max(20, Math.round(ts.fontSize * 0.45)) * scale
  return fontSize + padY * 2  // font + 상하 패딩
}

/** 카드/모달 높이를 자식 기반으로 재귀 계산 */
function calcContainerHeight(
  el: LayoutElement,
  allElements: LayoutElement[],
  imageSizes: Record<string, { w: number; h: number }>,
  scale: number,
): number {
  const children = allElements.filter((e) => e.parentId === el.id && e.visible !== false)
  const ip = el.innerPadding || { top: 16, right: 16, bottom: 16, left: 16 }

  if (children.length === 0) return (ip.top + ip.bottom + 40) * scale

  const groups = children.filter((c): c is GroupElement => c.positioning === 'group')
  const rowMap = new Map<number, GroupElement[]>()
  for (const c of groups) {
    const r = rowMap.get(c.order) || []
    r.push(c)
    rowMap.set(c.order, r)
  }
  const orders = [...rowMap.keys()].sort((a, b) => a - b)

  let totalH = 0
  for (let i = 0; i < orders.length; i++) {
    const row = rowMap.get(orders[i])!
    if (i > 0) totalH += (row[0].gapPx || 0) * scale

    let rowH = 0
    for (const c of row) {
      if (c.type === 'card' || c.type === 'modal') {
        // 재귀: 중첩된 카드/모달
        rowH = Math.max(rowH, calcContainerHeight(c, allElements, imageSizes, scale))
      } else if (c.type === 'image' && imageSizes[c.id]) {
        const cw = (c.widthMode === 'fixed' ? c.widthPx : 100) * scale
        rowH = Math.max(rowH, imageSizes[c.id].h * (cw / imageSizes[c.id].w))
      } else if (c.heightPx) {
        rowH = Math.max(rowH, c.heightPx * scale)
      } else if (c.type === 'button') {
        rowH = Math.max(rowH, calcButtonHeight(c, scale))
      } else {
        rowH = Math.max(rowH, calcTextHeight(c, scale))
      }
    }
    totalH += rowH
  }

  return totalH + (ip.top + ip.bottom) * scale
}

export function computePreviewLayout(
  elements: LayoutElement[],
  screenW: number,
  screenH: number,
  imageSizes: Record<string, { w: number; h: number }>,
  groupVAlign: 'center' | 'top' = 'center',
  padding = { top: 60, right: 24, bottom: 40, left: 24 },
  _allElements?: LayoutElement[],
  _designW?: number,  // 내부 재귀용 — 기준 디자인 너비
): ComputedPos[] {
  const allElements = _allElements || elements
  const designW = _designW || DESIGN_W
  const scale = screenW / designW
  const results: ComputedPos[] = []
  const contentW = designW - padding.left - padding.right
  const contentLeft = padding.left * scale

  // Group elements (현재 전달된 elements만, parentId 필터 없음)
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
      if (el.type === 'card' || el.type === 'modal') {
        maxH = Math.max(maxH, calcContainerHeight(el, allElements, imageSizes, scale))
      } else if (el.type === 'image' && imageSizes[el.id]) {
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

  const padTop = padding.top * scale
  const padBottom = padding.bottom * scale
  const contentAreaH = screenH - padTop - padBottom

  // totalH = 모든 행 높이 + 행 사이 간격 (첫 행의 gapPx는 제외)
  const totalH = rows.reduce((sum, r, i) => sum + r.height + (i > 0 ? r.gapPx * scale : 0), 0)
  let curY = groupVAlign === 'top'
    ? padTop
    : Math.max(padTop, padTop + (contentAreaH - totalH) / 2)

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

  // ── Pass 2: 자식 요소 ──
  // allElements에서 현재 결과에 있는 부모의 자식을 찾음
  const parentIds = new Set(results.map((r) => r.id))
  const childEls = allElements.filter((e) => e.parentId && parentIds.has(e.parentId) && e.visible !== false)
  if (childEls.length > 0) {
    const childByParent = new Map<string, LayoutElement[]>()
    for (const el of childEls) {
      const list = childByParent.get(el.parentId!) || []
      list.push(el)
      childByParent.set(el.parentId!, list)
    }

    for (const [parentId, children] of childByParent) {
      const parentPos = results.find((p) => p.id === parentId)
      const parentEl = allElements.find((e) => e.id === parentId)
      if (!parentPos || !parentEl) continue

      const ip = parentEl.innerPadding || { top: 16, right: 16, bottom: 16, left: 16 }
      const parentLeft = parentPos.x - parentPos.w * parentPos.originX
      const parentTop = parentPos.y - parentPos.h * parentPos.originY

      // 자식 레이아웃: 부모 내부를 하나의 화면처럼 취급
      const innerDesignW = (parentPos.w / scale) - ip.left - ip.right
      const innerScreenW = innerDesignW * scale
      const innerScreenH = parentPos.h - (ip.top + ip.bottom) * scale

      const childrenClean = children.map((c) => ({ ...c, parentId: undefined }))
      const childPositions = computePreviewLayout(
        childrenClean, innerScreenW, innerScreenH, imageSizes, 'top',
        { top: 0, right: 0, bottom: 0, left: 0 }, allElements, innerDesignW,
      )

      // 부모 위치 기준으로 오프셋
      for (const cp of childPositions) {
        results.push({
          ...cp,
          x: cp.x + parentLeft + ip.left * scale,
          y: cp.y + parentTop + ip.top * scale,
        })
      }
    }
  }

  return results
}

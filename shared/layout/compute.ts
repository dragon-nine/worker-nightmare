/** Shared layout computation — single source of truth for admin & game */

import type { LayoutElement, GroupElement, AnchorElement, ComputedPosition } from './types.ts'
import { DESIGN_W } from './types.ts'

// 컴포넌트 고정 크기 (디자인 단위)
const COMPONENT_SIZES: Record<string, { w: number; h: number }> = {
  toggle: { w: 77, h: 44 },
  close: { w: 32, h: 32 },
  'circle-btn': { w: 80, h: 80 },
}

function calcTextHeight(el: LayoutElement, scale: number): number {
  const fontSizePx = el.textStyle?.fontSizePx || 14
  const text = el.label || el.id
  const lines = text.split('\n').length
  return fontSizePx * scale * 1.4 * lines
}

/** 컨테이너(card/modal) 높이 — 자식 기반 재귀 계산 */
function calcContainerHeight(
  el: LayoutElement,
  allElements: LayoutElement[],
  getImageSize: (id: string) => { w: number; h: number } | null,
  scale: number,
): number {
  const children = allElements.filter((e) => e.parentId === el.id && e.visible !== false)
  const ip = el.innerPadding || { top: 16, right: 16, bottom: 16, left: 16 }

  if (children.length === 0) return (ip.top + ip.bottom) * scale

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
      if (COMPONENT_SIZES[c.type]) {
        rowH = Math.max(rowH, COMPONENT_SIZES[c.type].h * scale)
      } else if (c.type === 'card' || c.type === 'modal') {
        rowH = Math.max(rowH, calcContainerHeight(c, allElements, getImageSize, scale))
      } else if (c.type === 'image') {
        const cw = c.widthPx * scale
        const size = getImageSize(c.id)
        if (size) rowH = Math.max(rowH, size.h * (cw / size.w))
      } else if (c.type === 'button') {
        const fs = (c.textStyle?.fontSizePx || c.buttonStyle?.scaleKey === 'md' ? 22 : 18) * scale
        const padY = Math.max(20, Math.round(22 * 0.45)) * scale
        rowH = Math.max(rowH, fs + padY * 2)
      } else if (c.heightPx) {
        rowH = Math.max(rowH, c.heightPx * scale)
      } else {
        rowH = Math.max(rowH, calcTextHeight(c, scale))
      }
    }
    totalH += rowH
  }

  return totalH + (ip.top + ip.bottom) * scale
}

/**
 * Compute layout positions for all elements.
 * Supports containers (card, modal) with children (parentId).
 */
export function computeLayout(
  elements: LayoutElement[],
  screenW: number,
  screenH: number,
  getImageSize: (id: string) => { w: number; h: number } | null,
  getTextSize?: ((id: string) => { w: number; h: number } | null) | null,
  excludeIds: string[] = [],
  groupVAlign: 'center' | 'top' = 'center',
  padding = { top: 0, right: 0, bottom: 0, left: 0 },
  _allElements?: LayoutElement[],
  _designW?: number,
): { positions: ComputedPosition[]; scale: number } {
  const allElements = _allElements || elements
  const designW = _designW || DESIGN_W
  const scale = screenW / designW
  const results: ComputedPosition[] = []
  const excluded = new Set(excludeIds)

  const contentW = designW - padding.left - padding.right
  const contentLeft = padding.left * scale

  // ── Root group elements (no parentId) ──
  const groupEls = elements
    .filter((e): e is GroupElement => e.positioning === 'group' && !excluded.has(e.id) && !e.parentId && e.visible !== false)

  const rowMap = new Map<number, GroupElement[]>()
  for (const el of groupEls) {
    const row = rowMap.get(el.order) || []
    row.push(el)
    rowMap.set(el.order, row)
  }
  const rowOrders = [...rowMap.keys()].sort((a, b) => a - b)

  interface RowInfo { order: number; elements: GroupElement[]; height: number; gapPx: number }

  function calcElHeight(el: LayoutElement, elW: number): number {
    if (COMPONENT_SIZES[el.type]) return COMPONENT_SIZES[el.type].h * scale
    if (el.type === 'card' || el.type === 'modal') return calcContainerHeight(el, allElements, getImageSize, scale)
    if (el.type === 'image') {
      const size = getImageSize(el.id)
      if (size) return size.h * (elW / size.w)
    }
    if (el.heightPx) return el.heightPx * scale
    if (el.type === 'button') {
      const fontSize = (el.textStyle?.fontSizePx || 18) * scale
      const padY = Math.max(20, Math.round((el.textStyle?.fontSizePx || 18) * 0.45)) * scale
      return fontSize + padY * 2
    }
    const size = getTextSize?.(el.id)
    return size ? size.h : calcTextHeight(el, scale)
  }

  function resolveElWidth(el: GroupElement, rowEls: GroupElement[]): number {
    if (COMPONENT_SIZES[el.type]) return COMPONENT_SIZES[el.type].w * scale
    if (el.widthMode === 'fixed' || rowEls.length <= 1) {
      return (el.widthMode === 'fixed' ? el.widthPx : contentW) * scale
    }
    const hGap = el.hGapPx ?? 8
    const totalGap = hGap * (rowEls.length - 1)
    let fixedTotal = 0, fullCount = 0
    for (const r of rowEls) {
      if (COMPONENT_SIZES[r.type]) fixedTotal += COMPONENT_SIZES[r.type].w
      else if (r.widthMode === 'fixed') fixedTotal += r.widthPx
      else fullCount++
    }
    const remaining = contentW - totalGap - fixedTotal
    return (fullCount > 0 ? remaining / fullCount : remaining) * scale
  }

  const rows: RowInfo[] = []
  for (const order of rowOrders) {
    const rowEls = rowMap.get(order)!
    const gapPx = rowEls[0].gapPx
    let maxH = 0
    for (const el of rowEls) {
      const elW = resolveElWidth(el, rowEls)
      maxH = Math.max(maxH, calcElHeight(el, elW))
    }
    rows.push({ order, elements: rowEls, height: maxH, gapPx })
  }

  const padTop = padding.top * scale
  const padBottom = padding.bottom * scale
  const contentAreaH = screenH - padTop - padBottom
  const totalH = rows.reduce((sum, r, i) => sum + r.height + (i > 0 ? r.gapPx * scale : 0), 0)

  let curY = groupVAlign === 'top'
    ? padTop
    : Math.max(padTop, padTop + (contentAreaH - totalH) / 2)

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri]
    if (ri > 0) curY += row.gapPx * scale
    const cy = curY + row.height / 2

    if (row.elements.length === 1) {
      const el = row.elements[0]
      const elW = resolveElWidth(el, row.elements)
      const elH = calcElHeight(el, elW)
      const cx = (COMPONENT_SIZES[el.type] || el.widthMode === 'fixed') ? screenW / 2 : contentLeft + contentW * scale / 2
      results.push({ id: el.id, x: cx, y: cy, displayWidth: elW, displayHeight: elH, originX: 0.5, originY: 0.5 })
    } else {
      const hGap = (row.elements[0].hGapPx ?? 8) * scale
      let cx = contentLeft
      for (const el of row.elements) {
        const elW = resolveElWidth(el, row.elements)
        const elH = calcElHeight(el, elW)
        results.push({ id: el.id, x: cx + elW / 2, y: cy, displayWidth: elW, displayHeight: elH, originX: 0.5, originY: 0.5 })
        cx += elW + hGap
      }
    }
    curY += row.height
  }

  // ── Anchor elements ──
  const anchorEls = elements
    .filter((e): e is AnchorElement => e.positioning === 'anchor' && !excluded.has(e.id) && !e.parentId && e.visible !== false)

  for (const el of anchorEls) {
    const elW = el.widthPx * scale
    const ox = el.offsetX * scale
    const oy = el.offsetY * scale
    let elH = elW
    if (el.type === 'image') {
      const size = getImageSize(el.id)
      if (size) elH = size.h * (elW / size.w)
    } else if (el.type === 'text') {
      elH = calcTextHeight(el, scale)
    }

    let x: number, y: number, originX: number, originY: number
    switch (el.anchor) {
      case 'top-left': x = ox; y = oy; originX = 0; originY = 0; break
      case 'top-right': x = screenW - ox; y = oy; originX = 1; originY = 0; break
      case 'bottom-left': x = ox; y = screenH - oy; originX = 0; originY = 1; break
      case 'bottom-right': x = screenW - ox; y = screenH - oy; originX = 1; originY = 1; break
    }
    results.push({ id: el.id, x, y, displayWidth: elW, displayHeight: elH, originX, originY })
  }

  // ── Pass 2: 자식 요소 (containers) ──
  const parentIds = new Set(results.map((r) => r.id))
  const childEls = allElements.filter((e) => e.parentId && parentIds.has(e.parentId) && e.visible !== false && !excluded.has(e.id))

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
      const parentLeft = parentPos.x - parentPos.displayWidth * parentPos.originX
      const parentTop = parentPos.y - parentPos.displayHeight * parentPos.originY

      const innerDesignW = (parentPos.displayWidth / scale) - ip.left - ip.right
      const innerScreenW = innerDesignW * scale
      const innerScreenH = parentPos.displayHeight - (ip.top + ip.bottom) * scale

      const childrenClean = children.map((c) => ({ ...c, parentId: undefined }))
      const childResult = computeLayout(
        childrenClean, innerScreenW, innerScreenH, getImageSize, getTextSize,
        excludeIds, 'top',
        { top: 0, right: 0, bottom: 0, left: 0 },
        allElements, innerDesignW,
      )

      for (const cp of childResult.positions) {
        results.push({
          ...cp,
          x: cp.x + parentLeft + ip.left * scale,
          y: cp.y + parentTop + ip.top * scale,
        })
      }
    }
  }

  return { positions: results, scale }
}

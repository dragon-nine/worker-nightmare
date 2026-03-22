/** Design reference width — all px values are based on this */
export const DESIGN_W = 390

export type AnchorCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

interface LayoutElementBase {
  id: string
  type: 'text' | 'image'
  widthPx: number
  label?: string
}

export interface GroupElement extends LayoutElementBase {
  positioning: 'group'
  order: number     // same order = horizontal row
  gapPx: number     // px gap above this element (from previous row)
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

/**
 * Compute layout positions for all elements.
 * Pure function — used by both game (Phaser) and admin (React).
 *
 * @param elements   Layout elements
 * @param screenW    Actual screen width
 * @param screenH    Actual screen height
 * @param getImageSize  Returns { w, h } for image element IDs (natural size)
 * @param getTextSize   Returns { w, h } for text element IDs (rendered size at scale 1)
 * @param excludeIds    IDs to skip (e.g., conditional revive button)
 */
export function computeLayout(
  elements: LayoutElement[],
  screenW: number,
  screenH: number,
  getImageSize: (id: string) => { w: number; h: number } | null,
  getTextSize: (id: string) => { w: number; h: number } | null,
  excludeIds: string[] = [],
): ComputedPosition[] {
  const scale = screenW / DESIGN_W
  const results: ComputedPosition[] = []
  const excluded = new Set(excludeIds)

  // ── Group elements ──
  const groupEls = elements
    .filter((e): e is GroupElement => e.positioning === 'group' && !excluded.has(e.id))

  // Group into rows by order
  const rowMap = new Map<number, GroupElement[]>()
  for (const el of groupEls) {
    const row = rowMap.get(el.order) || []
    row.push(el)
    rowMap.set(el.order, row)
  }
  const rowOrders = [...rowMap.keys()].sort((a, b) => a - b)

  // Compute row heights and total height
  interface RowInfo { order: number; elements: GroupElement[]; height: number; gapPx: number }
  const rows: RowInfo[] = []

  for (let i = 0; i < rowOrders.length; i++) {
    const order = rowOrders[i]
    const rowEls = rowMap.get(order)!
    let maxH = 0
    // Gap = max gapPx of elements in this row (use first element's gap for simplicity)
    const gapPx = rowEls[0].gapPx

    for (const el of rowEls) {
      const elW = el.widthPx * scale
      let elH = 0
      if (el.type === 'image') {
        const size = getImageSize(el.id)
        if (size) elH = size.h * (elW / size.w)
      } else {
        const size = getTextSize(el.id)
        if (size) elH = size.h
      }
      maxH = Math.max(maxH, elH)
    }

    rows.push({ order, elements: rowEls, height: maxH, gapPx })
  }

  const firstGap = rows.length > 0 ? rows[0].gapPx * scale : 0
  const totalH = rows.reduce((sum, r, i) => sum + r.height + (i > 0 ? r.gapPx * scale : 0), 0)
  let curY = (screenH - totalH) / 2 + firstGap

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri]
    if (ri > 0) curY += row.gapPx * scale
    const cy = curY + row.height / 2

    if (row.elements.length === 1) {
      const el = row.elements[0]
      const elW = el.widthPx * scale
      let elH = row.height
      if (el.type === 'image') {
        const size = getImageSize(el.id)
        if (size) elH = size.h * (elW / size.w)
      }
      results.push({ id: el.id, x: screenW / 2, y: cy, displayWidth: elW, displayHeight: elH, originX: 0.5, originY: 0.5 })
    } else {
      // Multiple elements in same row — distribute horizontally around center
      const totalRowW = row.elements.reduce((s, el) => s + el.widthPx * scale, 0)
      const rowGap = 8 * scale // horizontal gap between side-by-side elements
      const totalWithGaps = totalRowW + rowGap * (row.elements.length - 1)
      let cx = (screenW - totalWithGaps) / 2

      for (const el of row.elements) {
        const elW = el.widthPx * scale
        let elH = row.height
        if (el.type === 'image') {
          const size = getImageSize(el.id)
          if (size) elH = size.h * (elW / size.w)
        }
        results.push({ id: el.id, x: cx + elW / 2, y: cy, displayWidth: elW, displayHeight: elH, originX: 0.5, originY: 0.5 })
        cx += elW + rowGap
      }
    }

    curY += row.height
  }

  // ── Anchor elements ──
  const anchorEls = elements
    .filter((e): e is AnchorElement => e.positioning === 'anchor' && !excluded.has(e.id))

  for (const el of anchorEls) {
    const elW = el.widthPx * scale
    const ox = el.offsetX * scale
    const oy = el.offsetY * scale
    let elH = elW // default square
    if (el.type === 'image') {
      const size = getImageSize(el.id)
      if (size) elH = size.h * (elW / size.w)
    }

    let x: number, y: number, originX: number, originY: number

    switch (el.anchor) {
      case 'top-left':
        x = ox; y = oy; originX = 0; originY = 0; break
      case 'top-right':
        x = screenW - ox; y = oy; originX = 1; originY = 0; break
      case 'bottom-left':
        x = ox; y = screenH - oy; originX = 0; originY = 1; break
      case 'bottom-right':
        x = screenW - ox; y = screenH - oy; originX = 1; originY = 1; break
    }

    results.push({ id: el.id, x, y, displayWidth: elW, displayHeight: elH, originX, originY })
  }

  return results
}

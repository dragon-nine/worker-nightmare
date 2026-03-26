/** Design reference width — all px values are based on this */
export const DESIGN_W = 390

export type AnchorCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface TextStyle {
  fontSizePx?: number
  color?: string
  strokeColor?: string
  strokeWidth?: number
  gradientColors?: [string, string]  // [top, bottom] 세로 그라데이션
}

interface LayoutElementBase {
  id: string
  type: 'text' | 'image'
  widthPx: number
  label?: string
  textStyle?: TextStyle
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
  groupVAlign?: 'center' | 'top'  // 그룹 세로 정렬: center(기본) 또는 top(상단 고정)
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
 * 텍스트 높이 계산 — admin computePreviewLayout과 동일한 공식
 * fontSizePx * scale * 1.4 * lineCount
 */
function calcTextHeight(el: LayoutElement, scale: number): number {
  const fontSizePx = el.textStyle?.fontSizePx || 14
  const text = el.label || el.id
  const lines = text.split('\n').length
  return fontSizePx * scale * 1.4 * lines
}

/**
 * Compute layout positions for all elements.
 * Pure function — used by both game (React) and admin.
 * 텍스트 높이는 textStyle.fontSizePx에서 자동 계산 (admin과 동일).
 *
 * @param elements   Layout elements (with optional textStyle)
 * @param screenW    Actual screen width
 * @param screenH    Actual screen height
 * @param getImageSize  Returns { w, h } for image element IDs (natural size)
 * @param getTextSize   (deprecated) Returns { w, h } for text — null이면 textStyle에서 자동 계산
 * @param excludeIds    IDs to skip (e.g., conditional revive button)
 */
export function computeLayout(
  elements: LayoutElement[],
  screenW: number,
  screenH: number,
  getImageSize: (id: string) => { w: number; h: number } | null,
  getTextSize?: ((id: string) => { w: number; h: number } | null) | null,
  excludeIds: string[] = [],
  groupVAlign: 'center' | 'top' = 'center',
): ComputedPosition[] {
  const widthScale = screenW / DESIGN_W
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

  // 1차 패스: widthScale 기준으로 전체 높이 계산
  interface RowInfo { order: number; elements: GroupElement[]; height: number; gapPx: number }

  function computeRows(s: number): RowInfo[] {
    const r: RowInfo[] = []
    for (let i = 0; i < rowOrders.length; i++) {
      const order = rowOrders[i]
      const rowEls = rowMap.get(order)!
      let maxH = 0
      const gapPx = rowEls[0].gapPx
      for (const el of rowEls) {
        const elW = el.widthPx * s
        let elH = 0
        if (el.type === 'image') {
          const size = getImageSize(el.id)
          if (size) elH = size.h * (elW / size.w)
        } else {
          const size = getTextSize?.(el.id)
          elH = size ? size.h : calcTextHeight(el, s)
        }
        maxH = Math.max(maxH, elH)
      }
      r.push({ order, elements: rowEls, height: maxH, gapPx })
    }
    return r
  }

  // 세로 오버플로우 보정: 전체 높이가 화면을 넘으면 scale 축소
  const testRows = computeRows(widthScale)
  const testTotalH = testRows.reduce((sum, r, i) => sum + r.height + (i > 0 ? r.gapPx * widthScale : 0), 0)
  const scale = testTotalH > screenH ? Math.min(widthScale, screenH / (testTotalH / widthScale)) : widthScale

  const rows = scale === widthScale ? testRows : computeRows(scale)

  const firstGap = rows.length > 0 ? rows[0].gapPx * scale : 0
  const totalH = rows.reduce((sum, r, i) => sum + r.height + (i > 0 ? r.gapPx * scale : 0), 0)
  let curY = groupVAlign === 'top'
    ? firstGap                          // top: 첫 행의 gapPx가 상단으로부터의 거리
    : (screenH - totalH) / 2 + firstGap // center: 세로 중앙 정렬

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
      const totalRowW = row.elements.reduce((s, el) => s + el.widthPx * scale, 0)
      const hGap = (row.elements[0].hGapPx ?? 8) * scale
      const totalWithGaps = totalRowW + hGap * (row.elements.length - 1)
      let cx = (screenW - totalWithGaps) / 2

      for (const el of row.elements) {
        const elW = el.widthPx * scale
        let elH = row.height
        if (el.type === 'image') {
          const size = getImageSize(el.id)
          if (size) elH = size.h * (elW / size.w)
        }
        results.push({ id: el.id, x: cx + elW / 2, y: cy, displayWidth: elW, displayHeight: elH, originX: 0.5, originY: 0.5 })
        cx += elW + hGap
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

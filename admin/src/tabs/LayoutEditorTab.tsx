import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { listBlobs, uploadBlob } from '../api'

/* ── Shared types (mirrors game/layout-types.ts) ── */

const DESIGN_W = 390
const DESIGN_H = 844 // preview reference height

type AnchorCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

interface TextStyle {
  fontSizePx?: number
  color?: string
  strokeColor?: string
  strokeWidth?: number
}

interface GroupElement {
  id: string; positioning: 'group'; type: 'text' | 'image'
  order: number; gapPx: number; widthPx: number; label?: string; textStyle?: TextStyle
}
interface AnchorElement {
  id: string; positioning: 'anchor'; type: 'text' | 'image'
  anchor: AnchorCorner; offsetX: number; offsetY: number; widthPx: number; label?: string; textStyle?: TextStyle
}
type LayoutElement = GroupElement | AnchorElement

interface ScreenLayout {
  screen: string; designWidth: number; elements: LayoutElement[]
}

interface ComputedPos {
  id: string; x: number; y: number; w: number; h: number; originX: number; originY: number
}

/* ── Layout computation (same algorithm as game engine) ── */

function computePreviewLayout(
  elements: LayoutElement[],
  screenW: number, screenH: number,
  imageSizes: Record<string, { w: number; h: number }>,
): ComputedPos[] {
  const scale = screenW / DESIGN_W
  const results: ComputedPos[] = []

  // Group elements
  const groupEls = elements.filter((e): e is GroupElement => e.positioning === 'group')
  const rowMap = new Map<number, GroupElement[]>()
  for (const el of groupEls) {
    const row = rowMap.get(el.order) || []
    row.push(el)
    rowMap.set(el.order, row)
  }
  const rowOrders = [...rowMap.keys()].sort((a, b) => a - b)

  interface RowInfo { elements: GroupElement[]; height: number; gapPx: number }
  const rows: RowInfo[] = []

  for (let i = 0; i < rowOrders.length; i++) {
    const order = rowOrders[i]
    const rowEls = rowMap.get(order)!
    const gapPx = i === 0 ? 0 : rowEls[0].gapPx
    let maxH = 0
    for (const el of rowEls) {
      const elW = el.widthPx * scale
      if (el.type === 'image' && imageSizes[el.id]) {
        maxH = Math.max(maxH, imageSizes[el.id].h * (elW / imageSizes[el.id].w))
      } else {
        const fontSize = (el.textStyle?.fontSizePx || 14) * scale
        const lines = (el.label || el.id).split('\n').length
        maxH = Math.max(maxH, fontSize * 1.4 * lines)
      }
    }
    rows.push({ elements: rowEls, height: maxH, gapPx })
  }

  const totalH = rows.reduce((sum, r, i) => sum + r.height + (i > 0 ? r.gapPx * scale : 0), 0)
  let curY = (screenH - totalH) / 2

  for (const row of rows) {
    if (row !== rows[0]) curY += row.gapPx * scale
    const cy = curY + row.height / 2

    if (row.elements.length === 1) {
      const el = row.elements[0]
      const elW = el.widthPx * scale
      const elH = el.type === 'image' && imageSizes[el.id]
        ? imageSizes[el.id].h * (elW / imageSizes[el.id].w) : row.height
      results.push({ id: el.id, x: screenW / 2, y: cy, w: elW, h: elH, originX: 0.5, originY: 0.5 })
    } else {
      const totalRowW = row.elements.reduce((s, el) => s + el.widthPx * scale, 0)
      const rowGap = 8 * scale
      const totalWithGaps = totalRowW + rowGap * (row.elements.length - 1)
      let cx = (screenW - totalWithGaps) / 2
      for (const el of row.elements) {
        const elW = el.widthPx * scale
        const elH = el.type === 'image' && imageSizes[el.id]
          ? imageSizes[el.id].h * (elW / imageSizes[el.id].w) : row.height
        results.push({ id: el.id, x: cx + elW / 2, y: cy, w: elW, h: elH, originX: 0.5, originY: 0.5 })
        cx += elW + rowGap
      }
    }
    curY += row.height
  }

  // Anchor elements
  const anchorEls = elements.filter((e): e is AnchorElement => e.positioning === 'anchor')
  for (const el of anchorEls) {
    const elW = el.widthPx * scale
    const ox = el.offsetX * scale
    const oy = el.offsetY * scale
    const elH = el.type === 'image' && imageSizes[el.id]
      ? imageSizes[el.id].h * (elW / imageSizes[el.id].w) : elW
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

/* ── Constants ── */

const SCREEN_OPTIONS = [
  { key: 'main-screen', label: '메인 스크린' },
  { key: 'game-over', label: '게임오버 스크린' },
]

const SCREEN_DEFAULTS: Record<string, LayoutElement[]> = {
  'main-screen': [
    { id: 'main-text', positioning: 'group', type: 'image', order: 0, gapPx: 0, widthPx: 331 },
    { id: 'main-char', positioning: 'group', type: 'image', order: 1, gapPx: 24, widthPx: 175 },
    { id: 'bestScore', positioning: 'group', type: 'text', order: 2, gapPx: 20, widthPx: 200, label: '최고기록 0', textStyle: { fontSizePx: 22, color: '#ffffff', strokeColor: '#000000', strokeWidth: 4 } },
    { id: 'main-btn', positioning: 'group', type: 'image', order: 3, gapPx: 20, widthPx: 214 },
    { id: 'btn-settings', positioning: 'anchor', type: 'image', anchor: 'top-right', offsetX: 20, offsetY: 20, widthPx: 35 },
  ],
  'game-over': [
    { id: 'bestText', positioning: 'group', type: 'text', order: 0, gapPx: 0, widthPx: 234, label: '최고기록 0', textStyle: { fontSizePx: 22, color: '#ffffff' } },
    { id: 'scoreText', positioning: 'group', type: 'text', order: 1, gapPx: 12, widthPx: 156, label: '0', textStyle: { fontSizePx: 72, color: '#ffffff' } },
    { id: 'go-rabbit', positioning: 'group', type: 'image', order: 2, gapPx: 16, widthPx: 175 },
    { id: 'quoteText', positioning: 'group', type: 'text', order: 3, gapPx: 16, widthPx: 273, label: '퇴근은 쉬운게 아니야...\n인생이 원래 그래', textStyle: { fontSizePx: 18, color: '#ffffff' } },
    { id: 'go-btn-revive', positioning: 'group', type: 'image', order: 4, gapPx: 24, widthPx: 331 },
    { id: 'go-btn-home', positioning: 'group', type: 'image', order: 5, gapPx: 16, widthPx: 331 },
    { id: 'go-btn-challenge', positioning: 'group', type: 'image', order: 6, gapPx: 16, widthPx: 156 },
    { id: 'go-btn-ranking', positioning: 'group', type: 'image', order: 6, gapPx: 16, widthPx: 156 },
  ],
}

const SCREEN_BG: Record<string, { bgPath: string; bgColor: string }> = {
  'main-screen': { bgPath: 'game01/main-screen/main-bg.png', bgColor: '#0a0a14' },
  'game-over': { bgPath: '', bgColor: '#000000' },
}

const SCREEN_ASSET_PREFIXES: Record<string, string[]> = {
  'main-screen': ['game01/main-screen/', 'game01/ui/'],
  'game-over': ['game01/game-over-screen/'],
}

const ASSET_ID_TO_PATH: Record<string, Record<string, string>> = {
  'main-screen': {
    'main-text': 'game01/main-screen/main-text.png',
    'main-char': 'game01/main-screen/main-char.png',
    'main-btn': 'game01/main-screen/main-btn.png',
    'btn-settings': 'game01/ui/btn-settings.png',
  },
  'game-over': {
    'go-rabbit': 'game01/game-over-screen/gameover-rabbit.png',
    'go-btn-revive': 'game01/game-over-screen/btn-revive.png',
    'go-btn-home': 'game01/game-over-screen/btn-home.png',
    'go-btn-challenge': 'game01/game-over-screen/btn-challenge.png',
    'go-btn-ranking': 'game01/game-over-screen/btn-ranking.png',
  },
}

/* ── Props ── */

interface Props {
  gameId: string
  gameName: string
  onBanner: (type: 'success' | 'error', message: string) => void
}

/* ── Component ── */

export default function LayoutEditorTab({ gameId, onBanner }: Props) {
  const [screen, setScreen] = useState('main-screen')
  const [elements, setElements] = useState<LayoutElement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({})
  const [bgUrl, setBgUrl] = useState<string | null>(null)
  const [imageSizes, setImageSizes] = useState<Record<string, { w: number; h: number }>>({})
  const [saving, setSaving] = useState(false)
  const [showGuides, setShowGuides] = useState(true)
  const phoneRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    id: string; startX: number; startY: number
    startGapPx?: number; startOffsetX?: number; startOffsetY?: number
  } | null>(null)

  // Phone preview scale
  const previewW = 300
  const previewH = previewW * (DESIGN_H / DESIGN_W)
  const previewScale = previewW / DESIGN_W

  // Load asset URLs
  useEffect(() => {
    async function loadAssets() {
      const prefixes = SCREEN_ASSET_PREFIXES[screen] || []
      const urls: Record<string, string> = {}
      try {
        for (const prefix of prefixes) {
          const blobs = await listBlobs(prefix)
          const pathMap = ASSET_ID_TO_PATH[screen] || {}
          for (const [id, path] of Object.entries(pathMap)) {
            const blob = blobs.find((b) => b.pathname === path)
            if (blob) urls[id] = blob.url
          }
        }
      } catch { /* ignore */ }
      setAssetUrls(urls)

      // Load background image
      const bgConf = SCREEN_BG[screen]
      if (bgConf?.bgPath) {
        try {
          const prefix = bgConf.bgPath.substring(0, bgConf.bgPath.lastIndexOf('/') + 1)
          const bgBlobs = await listBlobs(prefix)
          const bgBlob = bgBlobs.find((b) => b.pathname === bgConf.bgPath)
          setBgUrl(bgBlob?.url || null)
        } catch { setBgUrl(null) }
      } else {
        setBgUrl(null)
      }
    }
    loadAssets()
  }, [gameId, screen])

  // Load image natural sizes
  useEffect(() => {
    const sizes: Record<string, { w: number; h: number }> = {}
    let loaded = 0
    const entries = Object.entries(assetUrls)
    if (entries.length === 0) return
    for (const [id, url] of entries) {
      const img = new Image()
      img.onload = () => {
        sizes[id] = { w: img.naturalWidth, h: img.naturalHeight }
        loaded++
        if (loaded === entries.length) setImageSizes({ ...sizes })
      }
      img.onerror = () => { loaded++; if (loaded === entries.length) setImageSizes({ ...sizes }) }
      img.src = url
    }
  }, [assetUrls])

  // Load layout from Blob or use defaults
  useEffect(() => {
    async function loadLayout() {
      try {
        const blobs = await listBlobs(`${gameId}/layout/`)
        const layoutBlob = blobs.find((b) => b.pathname === `${gameId}/layout/${screen}.json`)
        if (layoutBlob) {
          const res = await fetch(layoutBlob.url + '?v=' + Date.now())
          const data: ScreenLayout = await res.json()
          // Merge labels + migrate old fontSizePx to textStyle
          const defaults = SCREEN_DEFAULTS[screen] || []
          const els = data.elements.map((el) => {
            const def = defaults.find((d) => d.id === el.id)
            const merged = { ...el, label: def?.label ?? el.label } as LayoutElement & { fontSizePx?: number }
            // Migrate old fontSizePx → textStyle
            if (merged.fontSizePx && !merged.textStyle) {
              merged.textStyle = { fontSizePx: merged.fontSizePx, ...(def?.textStyle || {}) }
              delete merged.fontSizePx
            }
            if (!merged.textStyle && def?.textStyle) {
              merged.textStyle = { ...def.textStyle }
            }
            return merged as LayoutElement
          })
          setElements(els)
          return
        }
      } catch { /* ignore */ }
      setElements([...(SCREEN_DEFAULTS[screen] || [])])
    }
    loadLayout()
  }, [screen, gameId])

  // Update element
  const updateEl = useCallback((id: string, patch: Partial<LayoutElement>) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...patch } as LayoutElement : el)))
  }, [])

  // Compute preview positions
  const positions = useMemo(() =>
    computePreviewLayout(elements, previewW, previewH, imageSizes),
    [elements, previewW, previewH, imageSizes],
  )

  // ── Drag handlers ──
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      setSelectedId(id)
      const el = elements.find((el) => el.id === id)
      if (!el) return
      if (el.positioning === 'group') {
        dragRef.current = { id, startX: e.clientX, startY: e.clientY, startGapPx: el.gapPx }
      } else {
        dragRef.current = { id, startX: e.clientX, startY: e.clientY, startOffsetX: el.offsetX, startOffsetY: el.offsetY }
      }
    },
    [elements],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return
      const el = elements.find((el) => el.id === dragRef.current!.id)
      if (!el) return
      const dy = e.clientY - dragRef.current.startY

      if (el.positioning === 'group') {
        // Vertical drag changes gapPx
        const deltaPx = dy / previewScale
        const newGap = (dragRef.current.startGapPx ?? 0) + deltaPx
        updateEl(el.id, { gapPx: Math.round(newGap) })
      } else {
        // Anchor drag changes offsets
        const dx = e.clientX - dragRef.current.startX
        const dxPx = dx / previewScale
        const dyPx = dy / previewScale
        const anchor = el.anchor
        const signX = anchor.includes('right') ? -1 : 1
        const signY = anchor.includes('bottom') ? -1 : 1
        updateEl(el.id, {
          offsetX: Math.max(0, Math.round((dragRef.current.startOffsetX ?? 0) + dxPx * signX)),
          offsetY: Math.max(0, Math.round((dragRef.current.startOffsetY ?? 0) + dyPx * signY)),
        })
      }
    },
    [elements, previewScale, updateEl],
  )

  const handlePointerUp = useCallback(() => { dragRef.current = null }, [])

  // Reset & Save
  const resetDefaults = () => {
    setElements([...(SCREEN_DEFAULTS[screen] || [])])
    setSelectedId(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const layout: ScreenLayout = {
        screen,
        designWidth: DESIGN_W,
        elements: elements.map((el) => {
          const { label: _, ...rest } = el as LayoutElement & { label?: string }
          return rest
        }),
      }
      const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' })
      const file = new File([blob], `${screen}.json`, { type: 'application/json' })
      await uploadBlob(file, `${gameId}/layout/`, `${screen}.json`)
      onBanner('success', '레이아웃이 저장되었습니다')
    } catch (err) {
      onBanner('error', `저장 실패: ${(err as Error).message}`)
    }
    setSaving(false)
  }

  const selected = elements.find((el) => el.id === selectedId)

  return (
    <div className="le">
      <div className="le-header">
        <h2>레이아웃 편집</h2>
        <select value={screen} onChange={(e) => { setScreen(e.target.value); setSelectedId(null) }}>
          {SCREEN_OPTIONS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="le-toolbar">
        <div className="le-toolbar-group">
          <span className="le-toolbar-label">간격</span>
          <button className="le-btn" onClick={() => {
            setElements((prev) => prev.map((el) => el.positioning === 'group' && el.order > 0 ? { ...el, gapPx: el.gapPx + 4 } : el))
          }}>+ 4px</button>
          <button className="le-btn" onClick={() => {
            setElements((prev) => prev.map((el) => el.positioning === 'group' && el.order > 0 ? { ...el, gapPx: el.gapPx - 4 } : el))
          }}>- 4px</button>
        </div>
        <div className="le-toolbar-group le-toolbar-actions">
          <button className={`le-btn${showGuides ? ' le-btn-active' : ''}`} onClick={() => setShowGuides(!showGuides)}>
            {showGuides ? '가이드 ON' : '가이드 OFF'}
          </button>
          <button className="le-btn le-btn-ghost" onClick={resetDefaults}>↺ 초기화</button>
          <button className="le-btn le-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div className="le-body">
        {/* Phone Preview */}
        <div className="le-phone-wrap">
          <div className="le-phone-bezel">
            <div className="le-phone-notch" />
            <div
              className="le-phone-screen"
              ref={phoneRef}
              style={{
                width: previewW, height: previewH,
                background: SCREEN_BG[screen]?.bgColor || '#000',
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onClick={() => { /* keep selection */ }}
            >
              {bgUrl && (
                <img src={bgUrl} alt="bg" style={{
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                  objectFit: 'cover', pointerEvents: 'none',
                }} />
              )}
              {screen === 'game-over' && (
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'linear-gradient(180deg, #2a0c10 0%, #000000 100%)', opacity: 0.9,
                }} />
              )}
              {positions.map((pos) => {
                const el = elements.find((e) => e.id === pos.id)
                if (!el) return null
                const left = pos.x - pos.w * pos.originX
                const top = pos.y - pos.h * pos.originY
                return (
                  <div
                    key={pos.id}
                    className={`le-el${pos.id === selectedId ? ' le-el-selected' : ''}${el.positioning === 'anchor' ? ' le-el-anchor' : ''}${!showGuides ? ' le-el-no-guide' : ''}`}
                    style={{ position: 'absolute', left, top, width: pos.w, height: pos.h }}
                    onPointerDown={(e) => handlePointerDown(e, pos.id)}
                  >
                    {el.type === 'image' && assetUrls[el.id] ? (
                      <img src={assetUrls[el.id]} alt={el.id} draggable={false} />
                    ) : (
                      <div className="le-el-text" style={{
                        fontSize: `${Math.max(6, (el.textStyle?.fontSizePx || 14) * previewScale)}px`,
                        color: el.textStyle?.color || '#fff',
                        WebkitTextStroke: el.textStyle?.strokeWidth
                          ? `${el.textStyle.strokeWidth * previewScale}px ${el.textStyle.strokeColor || '#000'}`
                          : undefined,
                      }}>{el.label || el.id}</div>
                    )}
                    {showGuides && el.positioning === 'group' && el.gapPx > 0 && (
                      <div className="le-el-gap" data-gap={`${el.gapPx}px`}
                        style={{ top: -el.gapPx * previewScale, height: el.gapPx * previewScale }} />
                    )}
                    {showGuides && el.positioning === 'anchor' && (
                      <>
                        <div className="le-el-offset-v" style={{ height: el.offsetY * previewScale }}
                          data-offset={`${el.offsetY}px`} />
                        <div className="le-el-offset-h" style={{ width: el.offsetX * previewScale }}
                          data-offset={`${el.offsetX}px`} />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="le-phone-home" />
          </div>
          <div className="le-phone-ref">기준: {DESIGN_W}×{DESIGN_H}px</div>
        </div>

        {/* Inspector */}
        <div className="le-inspector">
          <h3>속성</h3>
          {selected ? (
            <div className="le-fields">
              <div className="le-field">
                <label>ID</label>
                <span className="le-field-val">{selected.id}</span>
              </div>
              <div className="le-field">
                <label>타입</label>
                <span className="le-field-val">{selected.positioning === 'group' ? '그룹' : '앵커'}</span>
              </div>
              <div className="le-field">
                <label>너비</label>
                <div className="le-field-row">
                  <input type="number" min={10} max={390} step={1}
                    value={selected.widthPx}
                    onChange={(e) => updateEl(selected.id, { widthPx: parseInt(e.target.value) || 100 })}
                  />
                  <span className="le-field-px">px</span>
                </div>
              </div>

              {selected.positioning === 'group' && (
                <>
                  <div className="le-field">
                    <label>순서</label>
                    <div className="le-field-row">
                      <input type="number" min={0} max={20} step={1}
                        value={selected.order}
                        onChange={(e) => updateEl(selected.id, { order: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="le-field">
                    <label>위 간격</label>
                    <div className="le-field-row">
                      <input type="number" min={-200} max={200} step={1}
                        value={selected.gapPx}
                        onChange={(e) => updateEl(selected.id, { gapPx: parseInt(e.target.value) || 0 })}
                      />
                      <span className="le-field-px">px</span>
                    </div>
                  </div>
                </>
              )}

              {selected.positioning === 'anchor' && (
                <>
                  <div className="le-field">
                    <label>기준 모서리</label>
                    <select value={selected.anchor}
                      onChange={(e) => updateEl(selected.id, { anchor: e.target.value as AnchorCorner })}>
                      <option value="top-left">좌상단</option>
                      <option value="top-right">우상단</option>
                      <option value="bottom-left">좌하단</option>
                      <option value="bottom-right">우하단</option>
                    </select>
                  </div>
                  <div className="le-field">
                    <label>X 오프셋</label>
                    <div className="le-field-row">
                      <input type="number" min={0} max={200} step={1}
                        value={selected.offsetX}
                        onChange={(e) => updateEl(selected.id, { offsetX: parseInt(e.target.value) || 0 })}
                      />
                      <span className="le-field-px">px</span>
                    </div>
                  </div>
                  <div className="le-field">
                    <label>Y 오프셋</label>
                    <div className="le-field-row">
                      <input type="number" min={0} max={200} step={1}
                        value={selected.offsetY}
                        onChange={(e) => updateEl(selected.id, { offsetY: parseInt(e.target.value) || 0 })}
                      />
                      <span className="le-field-px">px</span>
                    </div>
                  </div>
                </>
              )}

              {selected.type === 'text' && (
                <>
                  <h4 style={{ marginTop: 12, marginBottom: 4, fontSize: 12, color: 'var(--text-secondary)' }}>텍스트 스타일</h4>
                  <div className="le-field">
                    <label>폰트 크기</label>
                    <div className="le-field-row">
                      <input type="number" min={8} max={120} step={1}
                        value={selected.textStyle?.fontSizePx || 14}
                        onChange={(e) => updateEl(selected.id, { textStyle: { ...selected.textStyle, fontSizePx: parseInt(e.target.value) || 14 } })}
                      />
                      <span className="le-field-px">px</span>
                    </div>
                  </div>
                  <div className="le-field">
                    <label>폰트 색상</label>
                    <div className="le-field-row">
                      <input type="color"
                        value={selected.textStyle?.color || '#ffffff'}
                        onChange={(e) => updateEl(selected.id, { textStyle: { ...selected.textStyle, color: e.target.value } })}
                      />
                      <span className="le-field-px">{selected.textStyle?.color || '#ffffff'}</span>
                    </div>
                  </div>
                  <div className="le-field">
                    <label>테두리 굵기</label>
                    <div className="le-field-row">
                      <input type="number" min={0} max={20} step={1}
                        value={selected.textStyle?.strokeWidth || 0}
                        onChange={(e) => updateEl(selected.id, { textStyle: { ...selected.textStyle, strokeWidth: parseInt(e.target.value) || 0 } })}
                      />
                      <span className="le-field-px">px</span>
                    </div>
                  </div>
                  {(selected.textStyle?.strokeWidth || 0) > 0 && (
                    <div className="le-field">
                      <label>테두리 색상</label>
                      <div className="le-field-row">
                        <input type="color"
                          value={selected.textStyle?.strokeColor || '#000000'}
                          onChange={(e) => updateEl(selected.id, { textStyle: { ...selected.textStyle, strokeColor: e.target.value } })}
                        />
                        <span className="le-field-px">{selected.textStyle?.strokeColor || '#000000'}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <p className="le-hint">요소를 클릭하여 선택하세요</p>
          )}

          {/* Element list */}
          <h3 style={{ marginTop: 20 }}>요소 목록</h3>
          <div className="le-el-list">
            {elements.map((el) => (
              <div key={el.id}
                className={`le-el-item${el.id === selectedId ? ' active' : ''}`}
                onClick={() => setSelectedId(el.id)}>
                <span className="le-el-item-type">{el.type === 'image' ? '🖼' : 'T'}</span>
                <span className="le-el-item-id">{el.id}</span>
                <span className="le-el-item-pos">
                  {el.positioning === 'group'
                    ? `ord:${el.order} gap:${el.gapPx}`
                    : `${el.anchor} ${el.offsetX},${el.offsetY}`
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useMemo } from 'react'
import { getLocalAssetUrl } from '../local-assets'

const ROAD_TILES = [
  { key: 'straight', label: '직선 도로' },
  { key: 'corner-tl', label: '코너 좌상' },
  { key: 'corner-tr', label: '코너 우상' },
  { key: 'corner-bl', label: '코너 좌하' },
  { key: 'corner-br', label: '코너 우하' },
  { key: 'bg-tile', label: '배경 타일' },
]

const CHAR_DIRS = [
  { key: 'rabbit-front', label: '정면' },
  { key: 'rabbit-back', label: '뒷면' },
  { key: 'rabbit-side', label: '옆면' },
]

const UPLOAD_SLOTS = [
  { key: 'straight', label: '직선 도로', category: 'map' },
  { key: 'corner-tl', label: '코너 좌상', category: 'map' },
  { key: 'corner-tr', label: '코너 우상', category: 'map' },
  { key: 'corner-bl', label: '코너 좌하', category: 'map' },
  { key: 'corner-br', label: '코너 우하', category: 'map' },
  { key: 'bg-tile', label: '배경 타일', category: 'map' },
  { key: 'rabbit-front', label: '캐릭터 정면', category: 'character' },
  { key: 'rabbit-back', label: '캐릭터 뒷면', category: 'character' },
  { key: 'rabbit-side', label: '캐릭터 옆면', category: 'character' },
]

function defaultUrl(key: string): string {
  if (key.startsWith('rabbit')) return getLocalAssetUrl(`character/${key}.png`)
  return getLocalAssetUrl(`map/${key}.png`)
}

export default function AssetPreviewTab({ gameId: _gameId }: { gameId: string }) {
  const [offsetY, setOffsetY] = useState(0)
  const [charScale, setCharScale] = useState(120)
  const [showGuides, setShowGuides] = useState(true)
  const [charDir, setCharDir] = useState('rabbit-front')
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  const getUrl = (key: string) => overrides[key] || defaultUrl(key)

  const handleFileChange = (key: string, file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setOverrides((prev) => ({ ...prev, [key]: e.target?.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const resetOverride = (key: string) => {
    setOverrides((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const scale = charScale / 100

  const tilePreview = useMemo(() => (tile: { key: string; label: string }) => {
    const boxSize = 180
    const charSize = boxSize * scale
    const charLeft = (boxSize - charSize) / 2
    const charTop = (boxSize - charSize) / 2 + offsetY
    return (
      <div key={tile.key} className="preview-tile-card">
        <h3>{tile.label}</h3>
        <div className="preview-tile-box">
          <img className="road-tile" src={getUrl(tile.key)} alt={tile.key} />
          {showGuides && <div className="preview-guide-line" style={{ top: '50%' }} />}
          <img
            className="character"
            src={getUrl(charDir)}
            alt="character"
            style={{ width: charSize, height: charSize, left: charLeft, top: charTop }}
          />
        </div>
      </div>
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offsetY, scale, showGuides, charDir, overrides])

  return (
    <div>
      <h1 className="page-title">에셋 프리뷰</h1>
      <p className="page-subtitle">디자이너용: 도로 타일 위 캐릭터 위치 확인 및 커스텀 에셋 테스트</p>

      {/* Upload slots */}
      <div className="card">
        <div className="card-title">커스텀 에셋 업로드</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {UPLOAD_SLOTS.map((slot) => (
            <div key={slot.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 100 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{slot.label}</span>
              <label style={{
                width: 80, height: 80, border: '2px dashed var(--border)', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', background: slot.category === 'map' ? '#1a1a2e' : '#f8f8fa',
                overflow: 'hidden', position: 'relative',
              }}>
                <img
                  src={getUrl(slot.key)}
                  alt={slot.key}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
                />
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileChange(slot.key, e.target.files?.[0] || null)}
                />
              </label>
              {overrides[slot.key] && (
                <button
                  onClick={() => resetOverride(slot.key)}
                  style={{
                    fontSize: 10, padding: '2px 8px', background: 'var(--surface-secondary)',
                    border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer',
                    color: 'var(--text-secondary)',
                  }}
                >
                  초기화
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="preview-controls">
        <label>
          캐릭터 Y 오프셋
          <input type="range" min={-100} max={50} value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))} />
          <span className="value">{offsetY}px</span>
        </label>
        <label>
          캐릭터 크기 (레인 대비 %)
          <input type="range" min={50} max={150} step={5} value={charScale} onChange={(e) => setCharScale(Number(e.target.value))} />
          <span className="value">{charScale}%</span>
        </label>
        <label>
          가이드라인
          <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} />
        </label>
        <label>
          캐릭터 방향
          <div className="char-select">
            {CHAR_DIRS.map((d) => (
              <button key={d.key} className={charDir === d.key ? 'active' : ''} onClick={() => setCharDir(d.key)}>
                {d.label}
              </button>
            ))}
          </div>
        </label>
      </div>

      {/* Tile grid */}
      <div className="card" style={{ background: '#0d0d1a' }}>
        <div className="card-title" style={{ color: 'var(--game-accent)' }}>도로 타일별 캐릭터 배치</div>
        <div className="preview-grid">
          {ROAD_TILES.map((tile) => tilePreview(tile))}
        </div>
      </div>

      {/* Multi-tile preview */}
      <div className="card" style={{ background: '#0d0d1a' }}>
        <div className="card-title" style={{ color: 'var(--game-accent)' }}>3칸 연속 도로</div>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* Straight 3-tile */}
          <div className="preview-tile-card">
            <h3>직선 도로 3칸</h3>
            <div className="preview-tile-box" style={{ height: 360 }}>
              {[0, 1, 2].map((i) => (
                <img key={i} className="road-tile" src={getUrl('straight')} alt="straight"
                  style={{ left: 0, top: i * 120, width: 180, height: 121 }} />
              ))}
              {showGuides && <div className="preview-guide-line" style={{ top: 180 }} />}
              <img className="character" src={getUrl(charDir)} alt="char"
                style={{
                  width: 180 * scale, height: 180 * scale,
                  left: (180 - 180 * scale) / 2,
                  top: 180 - (180 * scale) / 2 + offsetY,
                }}
              />
            </div>
          </div>
          {/* Corner transition */}
          <div className="preview-tile-card">
            <h3>코너 전환 (좌→우)</h3>
            <div className="preview-tile-box" style={{ height: 360 }}>
              {[
                { src: 'straight', x: 0, y: 0 },
                { src: 'bg-tile', x: 90, y: 0 },
                { src: 'corner-tl', x: 0, y: 120 },
                { src: 'corner-br', x: 90, y: 120 },
                { src: 'bg-tile', x: 0, y: 240 },
                { src: 'straight', x: 90, y: 240 },
              ].map((t, i) => (
                <img key={i} className="road-tile" src={getUrl(t.src)} alt={t.src}
                  style={{ left: t.x, top: t.y, width: 90, height: 121 }} />
              ))}
              <img className="character" src={getUrl(charDir)} alt="char"
                style={{
                  width: 90 * scale, height: 90 * scale,
                  left: 90 - (90 * scale) / 2,
                  top: 180 - (90 * scale) / 2 + offsetY,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

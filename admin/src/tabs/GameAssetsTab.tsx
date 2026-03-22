import { useState, useEffect, useCallback, useRef } from 'react'
import type { BlobItem } from '../types'
import { listBlobs, uploadBlob, deleteBlob } from '../api'
import LazyImage from '../components/LazyImage'

interface Props {
  gameId: string
  gameName: string
  onBanner: (type: 'success' | 'error', message: string) => void
}

/** 메인 화면 에셋 역할 정의 */
const MAIN_SCREEN_ASSETS = [
  { key: 'main-bg', label: '배경', role: 'bg' as const },
  { key: 'main-text', label: '타이틀 텍스트', role: 'text' as const },
  { key: 'main-char', label: '캐릭터', role: 'char' as const },
  { key: 'main-btn', label: '시작 버튼', role: 'btn' as const },
]

type AssetRole = 'bg' | 'text' | 'char' | 'btn'

function getFilename(pathname: string): string {
  return pathname.split('/').pop() || pathname
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function matchRole(pathname: string): AssetRole | null {
  const name = getFilename(pathname).replace(/\.[^.]+$/, '')
  const entry = MAIN_SCREEN_ASSETS.find((a) => a.key === name)
  return entry?.role ?? null
}

interface ScreenAsset {
  role: AssetRole
  blob: BlobItem
  url: string // with cache bust
}

function MainScreenGroup({ gameId, onBanner }: { gameId: string; onBanner: Props['onBanner'] }) {
  const prefix = `${gameId}/main-screen/`
  const [assets, setAssets] = useState<ScreenAsset[]>([])
  const [loaded, setLoaded] = useState(false)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const addRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    try {
      const blobs = await listBlobs(prefix)
      const mapped: ScreenAsset[] = []
      for (const b of blobs) {
        const role = matchRole(b.pathname)
        if (role) {
          const cacheBust = b.uploadedAt ? `?t=${new Date(b.uploadedAt).getTime()}` : ''
          mapped.push({ role, blob: b, url: b.url + cacheBust })
        }
      }
      setAssets(mapped)
    } catch {
      // API unavailable
    } finally {
      setLoaded(true)
    }
  }, [prefix])

  useEffect(() => { refresh() }, [refresh])

  const getAsset = (role: AssetRole) => assets.find((a) => a.role === role)

  const handleReplace = async (file: File, role: AssetRole) => {
    const existing = getAsset(role)
    try {
      // 기존 에셋 삭제 후 새로 업로드
      if (existing) await deleteBlob(existing.blob.url)
      await uploadBlob(file, prefix)
      onBanner('success', `"${file.name}" 교체 완료`)
      refresh()
    } catch (err) {
      onBanner('error', `교체 실패: ${(err as Error).message}`)
    }
  }

  const handleDelete = async (role: AssetRole) => {
    const existing = getAsset(role)
    if (!existing) return
    if (!confirm(`"${getFilename(existing.blob.pathname)}" 삭제하시겠습니까?`)) return
    try {
      await deleteBlob(existing.blob.url)
      onBanner('success', '삭제 완료')
      refresh()
    } catch (err) {
      onBanner('error', `삭제 실패: ${(err as Error).message}`)
    }
  }

  const handleAdd = async (files: FileList) => {
    for (const file of Array.from(files)) {
      try {
        await uploadBlob(file, prefix)
      } catch (err) {
        onBanner('error', `"${file.name}" 업로드 실패: ${(err as Error).message}`)
        return
      }
    }
    onBanner('success', `${files.length}개 파일 업로드 완료`)
    refresh()
  }

  const bg = getAsset('bg')
  const text = getAsset('text')
  const char = getAsset('char')
  const btn = getAsset('btn')

  if (!loaded) {
    return (
      <div className="card">
        <div className="card-title">메인 화면</div>
        <div className="screen-preview-skeleton">
          <div className="img-placeholder" style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="category-header">
        <div className="card-title" style={{ marginBottom: 0 }}>메인 화면</div>
        <button
          className="category-add-btn"
          onClick={() => addRef.current?.click()}
          title="새 에셋 추가"
        >+</button>
        <input
          ref={addRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files?.length) handleAdd(e.target.files); e.target.value = '' }}
        />
      </div>

      {/* 프리뷰 */}
      <div className="screen-preview">
        {bg ? (
          <img className="screen-preview-bg" src={bg.url} alt="배경" />
        ) : (
          <div className="screen-preview-bg-empty">배경 없음</div>
        )}
        <div className="screen-preview-overlay">
          {text && <img className="screen-preview-text" src={text.url} alt="텍스트" />}
          {char && <img className="screen-preview-char" src={char.url} alt="캐릭터" />}
          {btn && <img className="screen-preview-btn" src={btn.url} alt="버튼" />}
        </div>
      </div>

      {/* 개별 에셋 카드 */}
      <div className="screen-assets-grid">
        {MAIN_SCREEN_ASSETS.map((def) => {
          const asset = getAsset(def.role)
          return (
            <div key={def.key} className="screen-asset-card">
              <div
                className={`screen-asset-thumb${def.role === 'bg' ? '' : ' dark-bg'} clickable`}
                onClick={() => fileRefs.current[def.role]?.click()}
              >
                {asset ? (
                  <LazyImage src={asset.url} alt={def.label} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <span className="screen-asset-empty">+</span>
                )}
                <div className="asset-card-overlay">클릭하여 교체</div>
              </div>
              <input
                ref={(el) => { fileRefs.current[def.role] = el }}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleReplace(file, def.role)
                  e.target.value = ''
                }}
              />
              <div className="screen-asset-info">
                <div className="screen-asset-label">{def.label}</div>
                {asset && (
                  <div className="asset-card-meta">
                    <span>{formatSize(asset.blob.size)}</span>
                    <button className="asset-card-delete" onClick={() => handleDelete(def.role)} title="삭제">&#x2715;</button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function GameAssetsTab({ gameId, gameName, onBanner }: Props) {
  return (
    <div>
      <h1 className="page-title">{gameId} 에셋 관리</h1>
      <p className="page-subtitle">{gameName} — 게임 에셋을 업로드하고 관리합니다</p>
      <MainScreenGroup gameId={gameId} onBanner={onBanner} />
    </div>
  )
}

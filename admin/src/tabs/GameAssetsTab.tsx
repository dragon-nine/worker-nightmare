import { useState, useEffect, useCallback, useRef } from 'react'
import type { BlobItem } from '../types'
import { listBlobs, uploadBlob, deleteBlob } from '../api'
import { getLocalAssetsByCategory, getLocalAssetUrl } from '../local-assets'
import AssetCard from '../components/AssetCard'
import LaunchPrepTab from './LaunchPrepTab'

interface CategoryDef {
  key: string
  label: string
  prefix: string
  accept: string
  darkBg?: boolean
}

interface TabDef {
  id: string
  label: string
  categories: Omit<CategoryDef, 'prefix'>[]
}

const TABS: TabDef[] = [
  {
    id: 'new',
    label: 'NEW',
    categories: [
      { key: 'new', label: 'NEW', accept: 'image/*,audio/*', darkBg: true },
    ],
  },
  {
    id: 'common',
    label: '공통',
    categories: [
      { key: 'character', label: '캐릭터', accept: 'image/*', darkBg: true },
      { key: 'ui', label: 'UI', accept: 'image/*' },
      { key: 'audio', label: '오디오', accept: 'audio/*' },
    ],
  },
  {
    id: 'main',
    label: '메인',
    categories: [
      { key: 'main-screen', label: '메인 화면', accept: 'image/*', darkBg: true },
    ],
  },
  {
    id: 'game',
    label: '게임',
    categories: [
      { key: 'map', label: '맵 타일', accept: 'image/*', darkBg: true },
      { key: 'background', label: '배경', accept: 'image/*', darkBg: true },
    ],
  },
  {
    id: 'gameover',
    label: '게임오버',
    categories: [
      { key: 'game-over-screen', label: '게임오버 스크린', accept: 'image/*', darkBg: true },
    ],
  },
  {
    id: 'challenge',
    label: '도전',
    categories: [
      { key: 'challenge', label: '도전장 이미지', accept: 'image/*', darkBg: true },
    ],
  },
  {
    id: 'launch',
    label: '출시',
    categories: [],
  },
]

function buildCategories(gameId: string, tab: TabDef): CategoryDef[] {
  return tab.categories.map((c) => ({
    ...c,
    prefix: c.key.startsWith('launch/') ? `${c.key.replace('launch/', `launch/${gameId}/`)}/` : `${gameId}/${c.key}/`,
  }))
}

interface Props {
  gameId: string
  gameName: string
  onBanner: (type: 'success' | 'error', message: string) => void
}

function isAudio(name: string) {
  return /\.(mp3|ogg|wav|m4a)$/i.test(name)
}


function LocalAssetCard({ asset, darkBg, prefix, onBanner, onReplaced }: {
  asset: { path: string; filename: string }
  darkBg?: boolean
  prefix: string
  onBanner: Props['onBanner']
  onReplaced: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dims, setDims] = useState('')
  const [replacing, setReplacing] = useState(false)
  const url = getLocalAssetUrl(asset.path)
  const audio = isAudio(asset.filename)

  const handleReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setReplacing(true)
    try {
      await uploadBlob(file, prefix)
      onBanner('success', `"${asset.filename}" 교체 업로드 완료`)
      onReplaced()
    } catch (err) {
      onBanner('error', `교체 실패: ${(err as Error).message}`)
    } finally {
      setReplacing(false)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className={`asset-card clickable${replacing ? ' busy' : ''}`} onClick={() => !replacing && fileRef.current?.click()}>
      <div className={`asset-card-preview${darkBg ? ' dark-bg' : ''}${audio ? ' audio' : ''}`}>
        {audio ? (
          <span>&#9835;</span>
        ) : (
          <img
            src={url}
            alt={asset.filename}
            loading="lazy"
            onLoad={(e) => {
              const img = e.currentTarget
              setDims(`${img.naturalWidth}x${img.naturalHeight}`)
            }}
          />
        )}
        {replacing && <div className="asset-card-overlay busy-overlay"><div className="upload-spinner" />교체 중...</div>}
        {!replacing && <div className="asset-card-overlay">클릭하여 교체</div>}
      </div>
      <input ref={fileRef} type="file" accept="image/*,audio/*" style={{ display: 'none' }} onChange={handleReplace} />
      <div className="asset-card-info">
        <div className="asset-card-name" title={asset.path}>{asset.filename}</div>
        <div className="asset-card-meta">
          <span>{dims || ''}</span>
        </div>
      </div>
    </div>
  )
}

async function downloadFile(url: string, filename: string) {
  const res = await fetch(url)
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
}


function UploadingCard({ filename }: { filename: string }) {
  return (
    <div className="asset-card uploading">
      <div className="asset-card-preview">
        <div className="upload-spinner" />
      </div>
      <div className="asset-card-info">
        <div className="asset-card-name">{filename}</div>
        <div className="asset-card-meta"><span className="uploading-text">업로드 중...</span></div>
      </div>
    </div>
  )
}

function CategorySection({ cat, onBanner }: { cat: CategoryDef; onBanner: Props['onBanner'] }) {
  const addRef = useRef<HTMLInputElement>(null)
  const [blobs, setBlobs] = useState<BlobItem[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [apiAvailable, setApiAvailable] = useState(false)
  const [uploading, setUploading] = useState<string[]>([])
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const [, setReplacing] = useState<Set<string>>(new Set())
  const [downloadingAll, setDownloadingAll] = useState(false)
  const localAssets = getLocalAssetsByCategory(cat.key)

  const refresh = useCallback(async () => {
    try {
      const items = await listBlobs(cat.prefix)
      setBlobs(items)
      setApiAvailable(true)
    } catch {
      // API not available (local dev)
    } finally {
      setLoaded(true)
    }
  }, [cat.prefix])

  useEffect(() => { refresh() }, [refresh])

  const handleUpload = useCallback(async (files: File[]) => {
    const names = files.map((f) => f.name)
    setUploading(names)
    for (const file of files) {
      try {
        await uploadBlob(file, cat.prefix)
      } catch (err) {
        onBanner('error', `"${file.name}" 업로드 실패: ${(err as Error).message}`)
        setUploading([])
        return
      }
    }
    setUploading([])
    onBanner('success', `${files.length}개 파일 업로드 완료`)
    refresh()
  }, [cat.prefix, onBanner, refresh])

  const handleDelete = useCallback(async (url: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    setDeleting((prev) => new Set(prev).add(url))
    try {
      await deleteBlob(url)
      onBanner('success', '삭제 완료')
      refresh()
    } catch (err) {
      onBanner('error', `삭제 실패: ${(err as Error).message}`)
    } finally {
      setDeleting((prev) => { const next = new Set(prev); next.delete(url); return next })
    }
  }, [onBanner, refresh])

  const handleReplace = useCallback(async (blobUrl: string, file: File, pathname: string) => {
    const prefix = pathname.substring(0, pathname.lastIndexOf('/') + 1)
    const originalName = pathname.split('/').pop() || file.name
    setReplacing((prev) => new Set(prev).add(blobUrl))
    try {
      await deleteBlob(blobUrl)
      await uploadBlob(file, prefix, originalName)
      onBanner('success', `"${originalName}" 교체 완료`)
      refresh()
    } catch (err) {
      onBanner('error', `교체 실패: ${(err as Error).message}`)
    } finally {
      setReplacing((prev) => { const next = new Set(prev); next.delete(blobUrl); return next })
    }
  }, [onBanner, refresh])

  const handleDownloadAll = useCallback(async () => {
    if (downloadingAll || blobs.length === 0) return
    setDownloadingAll(true)
    onBanner('success', `${blobs.length}개 파일 다운로드 시작...`)
    for (const b of blobs) {
      const filename = b.pathname.split('/').pop() || 'file'
      await downloadFile(b.downloadUrl || b.url, filename)
      await new Promise((r) => setTimeout(r, 300))
    }
    setDownloadingAll(false)
  }, [blobs, downloadingAll, onBanner])

  // 로컬 에셋은 API 없을 때(로컬 dev)만 표시
  const showLocal = !apiAvailable
  const visibleLocal = showLocal ? localAssets : []
  const totalCount = visibleLocal.length + blobs.length

  return (
    <div className="card">
      <div className="category-header">
        <button className="category-toggle" onClick={() => setCollapsed(!collapsed)}>
          <span className={`sidebar-chevron${collapsed ? '' : ' open'}`}>&#9656;</span>
          <span className="card-title" style={{ marginBottom: 0 }}>{cat.label}</span>
          <span className="section-count">{totalCount}개</span>
        </button>
        {blobs.length > 0 && (
          <button
            className="category-download-btn"
            onClick={(e) => { e.stopPropagation(); handleDownloadAll() }}
            title="전체 다운로드"
            disabled={downloadingAll}
          >{downloadingAll ? '...' : '↓'}</button>
        )}
        <button
          className="category-add-btn"
          onClick={(e) => { e.stopPropagation(); addRef.current?.click() }}
          title="새 에셋 추가"
          disabled={uploading.length > 0}
        >+</button>
        <input
          ref={addRef}
          type="file"
          accept={cat.accept}
          multiple
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files) handleUpload(Array.from(e.target.files)); e.target.value = '' }}
        />
      </div>
      {!collapsed && !loaded && (
        <div className="asset-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="asset-card">
              <div className="asset-card-preview"><div className="img-placeholder" style={{ width: '100%', height: '100%' }} /></div>
              <div className="asset-card-info"><div className="img-placeholder" style={{ width: '60%', height: 12, borderRadius: 4 }} /></div>
            </div>
          ))}
        </div>
      )}
      {!collapsed && loaded && (
        <div className="asset-grid">
          {uploading.map((name) => (
            <UploadingCard key={name} filename={name} />
          ))}
          {visibleLocal.map((a) => (
            <LocalAssetCard
              key={a.path}
              asset={a}
              darkBg={cat.darkBg}
              prefix={cat.prefix}
              onBanner={onBanner}
              onReplaced={refresh}
            />
          ))}
          {blobs.map((b) => (
            <AssetCard
              key={b.url}
              blob={b}
              isDeleting={deleting.has(b.url)}
              onDelete={handleDelete}
              onReplace={(file, pathname) => handleReplace(b.url, file, pathname)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function GameAssetsTab({ gameId, gameName, onBanner }: Props) {
  const [activeTab, setActiveTab] = useState(TABS[0].id)
  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0]
  const categories = buildCategories(gameId, currentTab)

  return (
    <div>
      <h1 className="page-title">{gameId} 에셋 관리</h1>
      <p className="page-subtitle">{gameName} — 게임 에셋을 업로드하고 관리합니다</p>

      <div style={{
        display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)',
        paddingBottom: 0,
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 150ms',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'launch' ? (
        <LaunchPrepTab gameId={gameId} gameName={gameName} onBanner={onBanner} embedded />
      ) : (
        categories.map((cat) => (
          <CategorySection key={cat.key} cat={cat} onBanner={onBanner} />
        ))
      )}
    </div>
  )
}

import { useState, useEffect, useCallback, useRef } from 'react'
import { Download } from 'lucide-react'
import type { BlobItem } from '../../types'
import { listBlobs, uploadBlob, deleteBlob } from '../../api'
import { useBatchUpload } from '../../hooks/useUpload'
import { getLocalAssetsByCategory } from '../../local-assets'
import AssetCard from '../../components/AssetCard'
import type { CategoryDef } from './types'
import { downloadFile } from './helpers'
import LocalAssetCard from './LocalAssetCard'
import UploadingCard from './UploadingCard'

interface Props {
  cat: CategoryDef
  onBanner: (type: 'success' | 'error', message: string) => void
}

export default function CategorySection({ cat, onBanner }: Props) {
  const addRef = useRef<HTMLInputElement>(null)
  const [blobs, setBlobs] = useState<BlobItem[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [apiAvailable, setApiAvailable] = useState(false)
  const { uploading, uploadAll } = useBatchUpload(onBanner)
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
    const ok = await uploadAll(files, cat.prefix)
    if (ok) refresh()
  }, [cat.prefix, uploadAll, refresh])

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
          >{downloadingAll ? '...' : <Download size={14} />}</button>
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

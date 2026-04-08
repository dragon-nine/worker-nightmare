import { useState, useCallback, useRef, useEffect } from 'react'
import type { BlobItem } from '../../types'
import { listBlobs, deleteBlob } from '../../api'
import { useUpload } from '../../hooks/useUpload'
import ImageCropper from '../../components/ImageCropper'
import DownloadCropper from '../../components/DownloadCropper'
import LazyImage from '../../components/LazyImage'
import type { AssetGroup, DownloadOption } from './types'
import { formatSize, getFilename, downloadOriginal, downloadResized, downloadCircle } from './helpers'

interface Props {
  group: AssetGroup
  onBanner: (type: 'success' | 'error', message: string) => void
}

export default function LaunchGroup({ group, onBanner }: Props) {
  const addRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [blobs, setBlobs] = useState<BlobItem[]>([])
  const [loading, setLoading] = useState(true)
  const { uploading, upload } = useUpload(onBanner)
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [downloadCropUrl, setDownloadCropUrl] = useState<{ url: string; filename: string; opt: DownloadOption } | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const items = await listBlobs(group.prefix)
      setBlobs(items)
    } catch {
      // API unavailable
    } finally {
      setLoading(false)
    }
  }, [group.prefix])

  useEffect(() => { refresh() }, [refresh])

  const doUpload = useCallback(async (file: File) => {
    if (uploading) return
    try {
      // exactOnly + maxCount 1 → 기존 파일 삭제 후 업로드
      if (group.exactOnly && blobs.length > 0) {
        for (const b of blobs) {
          await deleteBlob(b.url)
        }
      }
      const result = await upload(file, group.prefix, file.name)
      if (result) {
        onBanner('success', '등록 완료')
        await refresh()
      }
    } catch (err) {
      onBanner('error', `삭제 실패: ${(err as Error).message}`)
    }
  }, [uploading, blobs, group.exactOnly, group.prefix, upload, onBanner, refresh])

  const handleReplace = useCallback(() => {
    if (uploading) return
    replaceRef.current?.click()
  }, [uploading])

  const handleFileSelected = useCallback((files: File[], replacing = false) => {
    if (uploading) return
    if (!replacing && blobs.length + files.length > group.maxCount) {
      onBanner('error', `최대 ${group.maxCount}개까지`)
      return
    }
    const file = files[0]
    if (!file) return

    if (group.exactOnly) {
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(img.src)
        if (img.naturalWidth !== group.storeWidth || img.naturalHeight !== group.storeHeight) {
          onBanner('error', `${group.storeWidth}x${group.storeHeight} 이미지만 업로드 가능합니다 (현재: ${img.naturalWidth}x${img.naturalHeight})`)
          return
        }
        const ext = file.name.match(/\.\w+$/)?.[0] || '.png'
        const renamed = new File([file], `${group.fileBaseName}${ext}`, { type: file.type })
        doUpload(renamed)
      }
      img.src = URL.createObjectURL(file)
    } else {
      setCropFile(file)
    }
  }, [uploading, blobs, group.maxCount, group.exactOnly, group.storeWidth, group.storeHeight, group.fileBaseName, onBanner, doUpload])

  const handleCropped = useCallback((croppedFile: File) => {
    setCropFile(null)
    const ext = croppedFile.name.match(/\.\w+$/)?.[0] || '.png'
    const num = String(blobs.length + 1).padStart(2, '0')
    const named = new File([croppedFile], `${group.fileBaseName}_${num}${ext}`, { type: croppedFile.type })
    doUpload(named)
  }, [blobs.length, group.fileBaseName, doUpload])

  const handleDelete = useCallback(async (url: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    setDeleting(prev => new Set(prev).add(url))
    try {
      await deleteBlob(url)
      onBanner('success', '삭제 완료')
      await refresh()
    } catch (err) {
      onBanner('error', `삭제 실패: ${(err as Error).message}`)
    } finally {
      setDeleting(prev => { const next = new Set(prev); next.delete(url); return next })
    }
  }, [onBanner, refresh])

  const handleDownload = useCallback(async (blob: BlobItem, opt: DownloadOption) => {
    const key = `${blob.url}-${opt.platform}`
    if (downloading) return
    setDownloading(key)
    try {
      const dlUrl = blob.downloadUrl || blob.url
      const origName = getFilename(blob.pathname)
      const ext = origName.match(/\.\w+$/)?.[0] || '.png'
      const platformTag = opt.platform === '토스' ? 'toss' : opt.platform === 'Google Play 원형' ? 'google_play_round' : 'google_play'
      const baseName = `${group.fileBaseName}_${platformTag}`
      if (opt.mode === 'circle') {
        await downloadCircle(dlUrl, `${baseName}.png`, opt.width)
      } else if (opt.width === group.storeWidth && opt.height === group.storeHeight) {
        await downloadOriginal(dlUrl, `${baseName}${ext}`)
      } else if (opt.mode === 'resize') {
        await downloadResized(dlUrl, `${baseName}.png`, opt.width, opt.height)
      } else {
        setDownloadCropUrl({ url: dlUrl, filename: `${baseName}.png`, opt })
      }
    } finally {
      setDownloading(null)
    }
  }, [group.storeWidth, group.storeHeight, group.fileBaseName, downloading])

  const handleDownloadOriginal = useCallback(async (blob: BlobItem) => {
    const key = `${blob.url}-original`
    if (downloading) return
    setDownloading(key)
    try {
      const dlUrl = blob.downloadUrl || blob.url
      const fname = getFilename(blob.pathname)
      await downloadOriginal(dlUrl, fname)
    } finally {
      setDownloading(null)
    }
  }, [downloading])

  return (
    <div className="card">
      <div className="category-header">
        <button className="category-toggle" onClick={() => setCollapsed(!collapsed)}>
          <span className={`sidebar-chevron${collapsed ? '' : ' open'}`}>&#9656;</span>
          <span className="card-title" style={{ marginBottom: 0 }}>{group.label}</span>
          {group.desc && <span className="spec-badge">{group.desc}</span>}
          {!group.exactOnly && <span className="section-count">{blobs.length} / {group.maxCount}</span>}
        </button>
        {blobs.length < group.maxCount && (
          <>
            <button className="category-add-btn"
              onClick={(e) => { e.stopPropagation(); addRef.current?.click() }}
              disabled={uploading}
              title="추가">{uploading ? '...' : '+'}</button>
            <input ref={addRef} type="file" accept={group.accept}
              multiple={group.maxCount > 1} style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files) handleFileSelected(Array.from(e.target.files)); e.target.value = '' }} />
          </>
        )}
        <input ref={replaceRef} type="file" accept={group.accept}
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files) handleFileSelected(Array.from(e.target.files), true); e.target.value = '' }} />
      </div>

      {!collapsed && (
        loading ? (
          <div className="empty">로딩 중...</div>
        ) : blobs.length === 0 ? (
          <div className="empty">업로드된 이미지가 없습니다</div>
        ) : (
          <div className="lp-cards">
            {blobs.map((b) => {
              const fname = getFilename(b.pathname)
              const isBusyDelete = deleting.has(b.url)
              return (
                <div key={b.url} className={`lp-card${isBusyDelete ? ' busy' : ''}`}>
                  <div className="lp-card-preview clickable" onClick={handleReplace}>
                    <LazyImage src={b.url} alt={fname}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    <div className="replace-overlay">클릭하여 교체</div>
                    <button className="lp-delete-corner" onClick={(e) => { e.stopPropagation(); handleDelete(b.url) }}
                      disabled={isBusyDelete} title="삭제">&times;</button>
                  </div>
                  <div className="lp-card-body">
                    {!group.exactOnly && (
                      <div className="lp-card-info">
                        <span className="lp-card-name" title={fname}>{fname}</span>
                        <span className="lp-card-meta">{group.storeWidth}x{group.storeHeight} / {formatSize(b.size)}</span>
                      </div>
                    )}
                    <div className="lp-card-downloads">
                      {group.downloads.length > 0 ? group.downloads.map((opt) => {
                        const dlKey = `${b.url}-${opt.platform}`
                        const isBusy = downloading === dlKey
                        return (
                          <button key={opt.platform} className="lp-dl-btn"
                            onClick={() => handleDownload(b, opt)}
                            title={`${opt.platform} ${opt.width}x${opt.height}`}
                            disabled={!!downloading}>
                            <span className="lp-dl-platform">{isBusy ? '...' : opt.platform}</span>
                            <span className="lp-dl-size">{opt.width}x{opt.height}</span>
                            {opt.mode === 'crop' && <span className="lp-dl-crop">위치 조정</span>}
                          </button>
                        )
                      }) : (
                        <button className="lp-dl-btn"
                          onClick={() => handleDownloadOriginal(b)}
                          title="다운로드"
                          disabled={!!downloading}>
                          <span className="lp-dl-platform">{downloading === `${b.url}-original` ? '...' : '다운로드'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {uploading && (
        <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-secondary)' }}>
          <div className="upload-spinner" style={{ display: 'inline-block', marginRight: 8 }} />
          업로드 중...
        </div>
      )}

      {cropFile && (
        <ImageCropper
          file={cropFile}
          targetWidth={group.storeWidth}
          targetHeight={group.storeHeight}
          onCropped={handleCropped}
          onCancel={() => setCropFile(null)}
        />
      )}

      {downloadCropUrl && (
        <DownloadCropper
          imageUrl={downloadCropUrl.url}
          sourceWidth={group.storeWidth}
          sourceHeight={group.storeHeight}
          targetWidth={downloadCropUrl.opt.width}
          targetHeight={downloadCropUrl.opt.height}
          filename={downloadCropUrl.filename}
          onDone={() => setDownloadCropUrl(null)}
        />
      )}
    </div>
  )
}

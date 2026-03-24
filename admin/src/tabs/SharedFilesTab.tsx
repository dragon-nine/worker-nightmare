import { useState, useEffect, useCallback, useRef } from 'react'
import type { BlobItem } from '../types'
import { listBlobs, uploadBlob, deleteBlob } from '../api'

interface Props {
  onBanner: (type: 'success' | 'error', message: string) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function getFilename(pathname: string): string {
  return pathname.split('/').pop() || pathname
}

function getFileIcon(name: string): string {
  if (/\.(xlsx?|csv)$/i.test(name)) return '📊'
  if (/\.(docx?|txt)$/i.test(name)) return '📄'
  if (/\.(pptx?|key)$/i.test(name)) return '📑'
  if (/\.(pdf)$/i.test(name)) return '📕'
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(name)) return '🖼'
  if (/\.(mp3|ogg|wav|m4a)$/i.test(name)) return '🎵'
  if (/\.(mp4|mov|avi|webm)$/i.test(name)) return '🎬'
  if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) return '📦'
  return '📎'
}

function isImage(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(name)
}

export default function SharedFilesTab({ onBanner }: Props) {
  const prefix = 'shared/'
  const addRef = useRef<HTMLInputElement>(null)
  const [blobs, setBlobs] = useState<BlobItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [uploading, setUploading] = useState<string[]>([])
  const [deleting, setDeleting] = useState<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    try {
      const items = await listBlobs(prefix)
      setBlobs(items)
    } catch {
      // API unavailable
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleUpload = async (files: FileList) => {
    const names = Array.from(files).map((f) => f.name)
    setUploading(names)
    for (const file of Array.from(files)) {
      try {
        await uploadBlob(file, prefix)
      } catch (err) {
        onBanner('error', `"${file.name}" 업로드 실패: ${(err as Error).message}`)
        setUploading([])
        return
      }
    }
    setUploading([])
    onBanner('success', `${files.length}개 파일 업로드 완료`)
    refresh()
  }

  const handleDelete = async (blob: BlobItem) => {
    const name = getFilename(blob.pathname)
    if (!confirm(`"${name}" 삭제하시겠습니까?`)) return
    setDeleting((prev) => new Set(prev).add(blob.url))
    try {
      await deleteBlob(blob.url)
      onBanner('success', '삭제 완료')
      refresh()
    } catch (err) {
      onBanner('error', `삭제 실패: ${(err as Error).message}`)
    } finally {
      setDeleting((prev) => { const next = new Set(prev); next.delete(blob.url); return next })
    }
  }

  return (
    <div>
      <h1 className="page-title">공유 파일</h1>
      <p className="page-subtitle">모든 파일 형식 업로드 가능 (엑셀, 이미지, 문서 등)</p>

      <div className="card">
        <div className="category-header">
          <div className="card-title" style={{ marginBottom: 0 }}>파일 목록</div>
          <span className="section-count">{blobs.length}개</span>
          <button
            className="category-add-btn"
            onClick={() => addRef.current?.click()}
            title="파일 업로드"
            disabled={uploading.length > 0}
          >{uploading.length > 0 ? '...' : '+'}</button>
          <input
            ref={addRef}
            type="file"
            accept="*/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files?.length) handleUpload(e.target.files); e.target.value = '' }}
          />
        </div>

        {!loaded && (
          <div className="asset-grid">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="asset-card">
                <div className="asset-card-preview"><div className="img-placeholder" style={{ width: '100%', height: '100%' }} /></div>
                <div className="asset-card-info"><div className="img-placeholder" style={{ width: '60%', height: 12, borderRadius: 4 }} /></div>
              </div>
            ))}
          </div>
        )}

        {loaded && blobs.length === 0 && uploading.length === 0 && (
          <div className="empty">아직 업로드된 파일이 없습니다</div>
        )}

        {loaded && (
          <div className="asset-grid">
            {uploading.map((name) => (
              <div key={name} className="asset-card uploading">
                <div className="asset-card-preview">
                  <div className="upload-spinner" />
                </div>
                <div className="asset-card-info">
                  <div className="asset-card-name">{name}</div>
                  <div className="asset-card-meta"><span className="uploading-text">업로드 중...</span></div>
                </div>
              </div>
            ))}
            {blobs.map((b) => {
              const name = getFilename(b.pathname)
              const icon = getFileIcon(name)
              const cacheBust = b.uploadedAt ? `?t=${new Date(b.uploadedAt).getTime()}` : ''
              const isBusy = deleting.has(b.url)
              return (
                <div key={b.url} className={`asset-card${isBusy ? ' busy' : ''}`}>
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener"
                    className="asset-card-preview"
                    style={{ textDecoration: 'none', cursor: isBusy ? 'default' : 'pointer' }}
                    onClick={(e) => { if (isBusy) e.preventDefault() }}
                  >
                    {isImage(name) ? (
                      <img
                        src={b.url + cacheBust}
                        alt={name}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{ fontSize: 40 }}>{icon}</span>
                    )}
                    {isBusy && <div className="asset-card-overlay busy-overlay"><div className="upload-spinner" />삭제 중...</div>}
                  </a>
                  <div className="asset-card-info">
                    <div className="asset-card-name" title={name}>{name}</div>
                    <div className="asset-card-meta">
                      <span>{formatSize(b.size)}</span>
                      <button
                        className="asset-card-delete"
                        onClick={() => handleDelete(b)}
                        title="삭제"
                        disabled={isBusy}
                      >&#x2715;</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

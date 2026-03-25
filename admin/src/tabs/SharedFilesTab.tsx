import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import {
  Download, Trash2, FolderPlus, Upload, X,
  Folder, Image, FileText, FileSpreadsheet, FileIcon,
  Film, Music, Archive, Paperclip, Presentation,
} from 'lucide-react'
import type { BlobItem } from '../types'
import { listFolder, uploadBlob, deleteBlob } from '../api'

interface Props {
  onBanner: (type: 'success' | 'error', message: string) => void
}

const ROOT = 'shared/'
const IC = 16

type FileCategory = 'image' | 'document' | 'media' | 'archive' | 'other'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function getFilename(pathname: string): string {
  return pathname.split('/').pop() || pathname
}

function getFolderName(folderPath: string): string {
  const parts = folderPath.replace(/\/$/, '').split('/')
  return parts[parts.length - 1]
}

function getFileIcon(name: string): ReactNode {
  if (/\.(xlsx?|csv)$/i.test(name)) return <FileSpreadsheet size={32} />
  if (/\.(docx?|txt|hwp)$/i.test(name)) return <FileText size={32} />
  if (/\.(pptx?|key)$/i.test(name)) return <Presentation size={32} />
  if (/\.(pdf)$/i.test(name)) return <FileText size={32} />
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(name)) return <Image size={32} />
  if (/\.(mp3|ogg|wav|m4a)$/i.test(name)) return <Music size={32} />
  if (/\.(mp4|mov|avi|webm)$/i.test(name)) return <Film size={32} />
  if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) return <Archive size={32} />
  return <FileIcon size={32} />
}

function isImage(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(name)
}

function getFileCategory(name: string): FileCategory {
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(name)) return 'image'
  if (/\.(xlsx?|csv|docx?|txt|pptx?|key|pdf|hwp)$/i.test(name)) return 'document'
  if (/\.(mp3|ogg|wav|m4a|mp4|mov|avi|webm)$/i.test(name)) return 'media'
  if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) return 'archive'
  return 'other'
}

const CATEGORY_META: Record<FileCategory, { label: string; icon: ReactNode }> = {
  image: { label: '이미지', icon: <Image size={IC} /> },
  document: { label: '문서', icon: <FileText size={IC} /> },
  media: { label: '미디어', icon: <Music size={IC} /> },
  archive: { label: '압축 파일', icon: <Archive size={IC} /> },
  other: { label: '기타', icon: <Paperclip size={IC} /> },
}

const CATEGORY_ORDER: FileCategory[] = ['image', 'document', 'media', 'archive', 'other']

function groupByCategory(blobs: BlobItem[]): { category: FileCategory; items: BlobItem[] }[] {
  const map = new Map<FileCategory, BlobItem[]>()
  for (const b of blobs) {
    const name = getFilename(b.pathname)
    if (name === '.folder') continue
    const cat = getFileCategory(name)
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(b)
  }
  return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({ category: c, items: map.get(c)! }))
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

function getBreadcrumbs(currentPath: string): { label: string; path: string }[] {
  const crumbs: { label: string; path: string }[] = [{ label: '공유 파일', path: ROOT }]
  if (currentPath === ROOT) return crumbs

  const relative = currentPath.slice(ROOT.length)
  const parts = relative.replace(/\/$/, '').split('/')
  let accumulated = ROOT
  for (const part of parts) {
    accumulated += part + '/'
    crumbs.push({ label: part, path: accumulated })
  }
  return crumbs
}

function cacheBustUrl(b: BlobItem): string {
  if (!b.uploadedAt) return b.url
  const sep = b.url.includes('?') ? '&' : '?'
  return b.url + sep + 't=' + new Date(b.uploadedAt).getTime()
}

export default function SharedFilesTab({ onBanner }: Props) {
  const addRef = useRef<HTMLInputElement>(null)
  const [currentPath, setCurrentPath] = useState(ROOT)
  const [blobs, setBlobs] = useState<BlobItem[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)
  const [uploading, setUploading] = useState<string[]>([])
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState<Set<string>>(new Set())
  const [newFolderName, setNewFolderName] = useState<string | null>(null)
  const [previewBlob, setPreviewBlob] = useState<BlobItem | null>(null)

  const refresh = useCallback(async () => {
    setLoaded(false)
    try {
      const data = await listFolder(currentPath)
      setBlobs(data.blobs)
      setFolders(data.folders)
    } catch {
      // API unavailable
    } finally {
      setLoaded(true)
    }
  }, [currentPath])

  useEffect(() => { refresh() }, [refresh])

  const handleUpload = async (files: FileList) => {
    const names = Array.from(files).map((f) => f.name)
    setUploading(names)
    for (const file of Array.from(files)) {
      try {
        await uploadBlob(file, currentPath)
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

  const handleCreateFolder = async () => {
    if (!newFolderName?.trim()) {
      setNewFolderName(null)
      return
    }
    const folderName = newFolderName.trim().replace(/\//g, '')
    if (!folderName) {
      setNewFolderName(null)
      return
    }
    const placeholder = new File([''], '.folder', { type: 'application/octet-stream' })
    try {
      await uploadBlob(placeholder, `${currentPath}${folderName}/`)
      onBanner('success', `"${folderName}" 폴더 생성 완료`)
      setNewFolderName(null)
      refresh()
    } catch (err) {
      onBanner('error', `폴더 생성 실패: ${(err as Error).message}`)
    }
  }

  const handleDownload = async (b: BlobItem) => {
    const name = getFilename(b.pathname)
    setDownloading((prev) => new Set(prev).add(b.url))
    try {
      await downloadFile(b.downloadUrl || b.url, name)
    } catch (err) {
      onBanner('error', `다운로드 실패: ${(err as Error).message}`)
    } finally {
      setDownloading((prev) => { const next = new Set(prev); next.delete(b.url); return next })
    }
  }

  const breadcrumbs = getBreadcrumbs(currentPath)
  const fileGroups = groupByCategory(blobs)
  const visibleFiles = blobs.filter((b) => getFilename(b.pathname) !== '.folder')

  const renderFileCard = (b: BlobItem) => {
    const name = getFilename(b.pathname)
    const icon = getFileIcon(name)
    const isBusy = deleting.has(b.url)
    const isDl = downloading.has(b.url)
    return (
      <div key={b.url} className={`asset-card${isBusy ? ' busy' : ''}`}>
        <div
          className="asset-card-preview"
          style={{ cursor: isBusy ? 'default' : isImage(name) ? 'pointer' : 'default' }}
          onClick={() => { if (!isBusy && isImage(name)) setPreviewBlob(b) }}
        >
          {isImage(name) ? (
            <img
              src={cacheBustUrl(b)}
              alt={name}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          ) : (
            <span className="sf-file-icon">{icon}</span>
          )}
          {isBusy && <div className="asset-card-overlay busy-overlay"><div className="upload-spinner" />삭제 중...</div>}
        </div>
        <div className="asset-card-info">
          <div className="asset-card-name" title={name}>{name}</div>
          <div className="asset-card-meta">
            <span>{formatSize(b.size)}</span>
            <button
              className="asset-card-download"
              onClick={() => handleDownload(b)}
              title="다운로드"
              disabled={isBusy || isDl}
            >{isDl ? '...' : <Download size={14} />}</button>
            <button
              className="asset-card-delete"
              onClick={() => handleDelete(b)}
              title="삭제"
              disabled={isBusy}
            ><Trash2 size={14} /></button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="card">
        <div className="category-header">
          <div className="sf-breadcrumbs">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.path}>
                {i > 0 && <span className="sf-breadcrumb-sep">/</span>}
                {i === breadcrumbs.length - 1 ? (
                  <span className="sf-breadcrumb-current">{crumb.label}</span>
                ) : (
                  <button className="sf-breadcrumb-btn" onClick={() => setCurrentPath(crumb.path)}>
                    {crumb.label}
                  </button>
                )}
              </span>
            ))}
          </div>
          <span className="section-count">{visibleFiles.length}개 파일</span>
          <button
            className="category-add-btn"
            onClick={() => setNewFolderName('')}
            title="새 폴더"
          ><FolderPlus size={16} /></button>
          <button
            className="category-add-btn"
            onClick={() => addRef.current?.click()}
            title="파일 업로드"
            disabled={uploading.length > 0}
          >{uploading.length > 0 ? '...' : <Upload size={16} />}</button>
          <input
            ref={addRef}
            type="file"
            accept="*/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files?.length) handleUpload(e.target.files); e.target.value = '' }}
          />
        </div>

        {newFolderName !== null && (
          <div className="sf-new-folder">
            <Folder size={20} />
            <input
              className="sf-new-folder-input"
              autoFocus
              placeholder="폴더 이름"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder()
                if (e.key === 'Escape') setNewFolderName(null)
              }}
            />
            <button className="sf-new-folder-ok" onClick={handleCreateFolder}>생성</button>
            <button className="sf-new-folder-cancel" onClick={() => setNewFolderName(null)}>취소</button>
          </div>
        )}

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

        {loaded && folders.length === 0 && visibleFiles.length === 0 && uploading.length === 0 && (
          <div className="empty">아직 업로드된 파일이 없습니다</div>
        )}

        {loaded && (
          <>
            {/* 폴더 섹션 */}
            {folders.filter((f) => getFolderName(f) !== '').length > 0 && (
              <div className="sf-section">
                <div className="sf-section-header">
                  <span className="sf-section-icon"><Folder size={IC} /></span>
                  <span className="sf-section-label">폴더</span>
                  <span className="sf-section-count">{folders.filter((f) => getFolderName(f) !== '').length}</span>
                </div>
                <div className="asset-grid">
                  {folders.map((folder) => {
                    const name = getFolderName(folder)
                    if (name === '') return null
                    return (
                      <div
                        key={folder}
                        className="asset-card clickable"
                        onClick={() => setCurrentPath(folder)}
                      >
                        <div className="asset-card-preview" style={{ background: 'var(--surface-secondary)' }}>
                          <Folder size={40} />
                        </div>
                        <div className="asset-card-info">
                          <div className="asset-card-name" title={name}>{name}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 업로드 중 */}
            {uploading.length > 0 && (
              <div className="asset-grid" style={{ marginTop: 12 }}>
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
              </div>
            )}

            {/* 종류별 파일 섹션 */}
            {fileGroups.map(({ category, items }) => {
              const meta = CATEGORY_META[category]
              return (
                <div key={category} className="sf-section">
                  <div className="sf-section-header">
                    <span className="sf-section-icon">{meta.icon}</span>
                    <span className="sf-section-label">{meta.label}</span>
                    <span className="sf-section-count">{items.length}</span>
                  </div>
                  <div className="asset-grid">
                    {items.map(renderFileCard)}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* 이미지 미리보기 모달 */}
      {previewBlob && (
        <div className="sf-preview-overlay" onClick={() => setPreviewBlob(null)}>
          <div className="sf-preview-modal" onClick={(e) => e.stopPropagation()}>
            <img
              src={cacheBustUrl(previewBlob)}
              alt={getFilename(previewBlob.pathname)}
            />
            <div className="sf-preview-info">
              <span className="sf-preview-name">{getFilename(previewBlob.pathname)}</span>
              <span className="sf-preview-size">{formatSize(previewBlob.size)}</span>
              <button className="sf-preview-download" onClick={() => handleDownload(previewBlob)}><Download size={14} /> 다운로드</button>
              <button className="sf-preview-close" onClick={() => setPreviewBlob(null)}><X size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

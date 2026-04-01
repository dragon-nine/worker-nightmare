import { useState, useEffect, useCallback, useRef } from 'react'
import { FolderPlus, Upload, Folder } from 'lucide-react'
import type { BlobItem } from '../types'
import { listFolder, uploadBlob, deleteBlob } from '../api'
import { useBatchUpload } from '../hooks/useUpload'
import {
  getFilename, getFolderName, getBreadcrumbs, groupByCategory, downloadFile,
} from './shared-files/utils'
import { FolderSection } from './shared-files/FolderSection'
import { FileSectionGroup } from './shared-files/FileSectionGroup'
import { ImagePreviewModal } from './shared-files/ImagePreviewModal'

interface Props {
  onBanner: (type: 'success' | 'error', message: string) => void
}

const ROOT = 'shared/'

export default function SharedFilesTab({ onBanner }: Props) {
  const addRef = useRef<HTMLInputElement>(null)
  const [currentPath, setCurrentPath] = useState(ROOT)
  const [blobs, setBlobs] = useState<BlobItem[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)
  const { uploading, uploadAll } = useBatchUpload(onBanner)
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
    const ok = await uploadAll(Array.from(files), currentPath)
    if (ok) refresh()
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

  const breadcrumbs = getBreadcrumbs(currentPath, ROOT)
  const fileGroups = groupByCategory(blobs)
  const visibleFiles = blobs.filter((b) => getFilename(b.pathname) !== '.folder')

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="sf-page-header">
        <div className="sf-header-left">
          <h1 className="page-title" style={{ marginBottom: 0 }}>공유 파일</h1>
          {currentPath !== ROOT && (
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
          )}
        </div>
        <div className="sf-header-actions">
          <span className="sf-file-count">{visibleFiles.length}개 파일</span>
          <button
            className="sf-action-btn"
            onClick={() => setNewFolderName('')}
            title="새 폴더"
          ><FolderPlus size={16} /> 새 폴더</button>
          <button
            className="sf-action-btn primary"
            onClick={() => addRef.current?.click()}
            title="파일 업로드"
            disabled={uploading.length > 0}
          >{uploading.length > 0 ? '...' : <><Upload size={16} /> 업로드</>}</button>
          <input
            ref={addRef}
            type="file"
            accept="*/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files?.length) handleUpload(e.target.files); e.target.value = '' }}
          />
        </div>
      </div>

      {newFolderName !== null && (
        <div className="sf-new-folder" style={{ marginBottom: 16 }}>
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

      <div className="card">

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
            <FolderSection folders={folders} onNavigate={setCurrentPath} />

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
            <FileSectionGroup
              fileGroups={fileGroups}
              deleting={deleting}
              downloading={downloading}
              onPreview={setPreviewBlob}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          </>
        )}
      </div>

      {/* 이미지 미리보기 모달 */}
      {previewBlob && (
        <ImagePreviewModal
          blob={previewBlob}
          onClose={() => setPreviewBlob(null)}
          onDownload={handleDownload}
        />
      )}
    </div>
  )
}

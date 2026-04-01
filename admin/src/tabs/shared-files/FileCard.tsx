import { Download, Trash2 } from 'lucide-react'
import type { BlobItem } from '../../types'
import { formatSize, getFilename, getFileIcon, isImage, cacheBustUrl } from './utils'

interface FileCardProps {
  blob: BlobItem
  deleting: boolean
  downloading: boolean
  onPreview: (b: BlobItem) => void
  onDownload: (b: BlobItem) => void
  onDelete: (b: BlobItem) => void
}

export function FileCard({ blob, deleting, downloading, onPreview, onDownload, onDelete }: FileCardProps) {
  const name = getFilename(blob.pathname)
  const icon = getFileIcon(name)
  return (
    <div className={`asset-card${deleting ? ' busy' : ''}`}>
      <div
        className="asset-card-preview"
        style={{ cursor: deleting ? 'default' : isImage(name) ? 'pointer' : 'default' }}
        onClick={() => { if (!deleting && isImage(name)) onPreview(blob) }}
      >
        {isImage(name) ? (
          <img
            src={cacheBustUrl(blob)}
            alt={name}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        ) : (
          <span className="sf-file-icon">{icon}</span>
        )}
        {deleting && <div className="asset-card-overlay busy-overlay"><div className="upload-spinner" />삭제 중...</div>}
      </div>
      <div className="asset-card-info">
        <div className="asset-card-name" title={name}>{name}</div>
        <div className="asset-card-meta">
          <span>{formatSize(blob.size)}</span>
          <button
            className="asset-card-download"
            onClick={() => onDownload(blob)}
            title="다운로드"
            disabled={deleting || downloading}
          >{downloading ? '...' : <Download size={14} />}</button>
          <button
            className="asset-card-delete"
            onClick={() => onDelete(blob)}
            title="삭제"
            disabled={deleting}
          ><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  )
}

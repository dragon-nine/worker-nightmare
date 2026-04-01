import { Download, X } from 'lucide-react'
import type { BlobItem } from '../../types'
import { formatSize, getFilename, cacheBustUrl } from './utils'

interface ImagePreviewModalProps {
  blob: BlobItem
  onClose: () => void
  onDownload: (b: BlobItem) => void
}

export function ImagePreviewModal({ blob, onClose, onDownload }: ImagePreviewModalProps) {
  return (
    <div className="sf-preview-overlay" onClick={onClose}>
      <div className="sf-preview-modal" onClick={(e) => e.stopPropagation()}>
        <img
          src={cacheBustUrl(blob)}
          alt={getFilename(blob.pathname)}
        />
        <div className="sf-preview-info">
          <span className="sf-preview-name">{getFilename(blob.pathname)}</span>
          <span className="sf-preview-size">{formatSize(blob.size)}</span>
          <button className="sf-preview-download" onClick={() => onDownload(blob)}><Download size={14} /> 다운로드</button>
          <button className="sf-preview-close" onClick={onClose}><X size={16} /></button>
        </div>
      </div>
    </div>
  )
}

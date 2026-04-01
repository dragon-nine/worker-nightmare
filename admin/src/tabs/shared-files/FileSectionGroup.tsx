import type { BlobItem } from '../../types'
import type { FileCategory } from './utils'
import { CATEGORY_META } from './utils'
import { FileCard } from './FileCard'

interface FileSectionGroupProps {
  fileGroups: { category: FileCategory; items: BlobItem[] }[]
  deleting: Set<string>
  downloading: Set<string>
  onPreview: (b: BlobItem) => void
  onDownload: (b: BlobItem) => void
  onDelete: (b: BlobItem) => void
}

export function FileSectionGroup({ fileGroups, deleting, downloading, onPreview, onDownload, onDelete }: FileSectionGroupProps) {
  return (
    <>
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
              {items.map((b) => (
                <FileCard
                  key={b.url}
                  blob={b}
                  deleting={deleting.has(b.url)}
                  downloading={downloading.has(b.url)}
                  onPreview={onPreview}
                  onDownload={onDownload}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}

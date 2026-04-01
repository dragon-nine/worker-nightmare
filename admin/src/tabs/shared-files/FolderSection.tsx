import { Folder } from 'lucide-react'
import { getFolderName } from './utils'

const IC = 16

interface FolderSectionProps {
  folders: string[]
  onNavigate: (path: string) => void
}

export function FolderSection({ folders, onNavigate }: FolderSectionProps) {
  const visibleFolders = folders.filter((f) => getFolderName(f) !== '')
  if (visibleFolders.length === 0) return null

  return (
    <div className="sf-section">
      <div className="sf-section-header">
        <span className="sf-section-icon"><Folder size={IC} /></span>
        <span className="sf-section-label">폴더</span>
        <span className="sf-section-count">{visibleFolders.length}</span>
      </div>
      <div className="asset-grid">
        {folders.map((folder) => {
          const name = getFolderName(folder)
          if (name === '') return null
          return (
            <div
              key={folder}
              className="asset-card clickable"
              onClick={() => onNavigate(folder)}
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
  )
}

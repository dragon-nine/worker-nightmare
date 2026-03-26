import type { LayoutElement } from './types'
import { Eye, EyeOff, Lock, Unlock, Copy, Trash2 } from 'lucide-react'

interface Props {
  elements: LayoutElement[]
  selectedId: string | null
  onSelect: (id: string) => void
  onUpdate: (id: string, patch: Partial<LayoutElement>) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
}

export default function ElementList({ elements, selectedId, onSelect, onUpdate, onRemove, onDuplicate }: Props) {
  const sorted = [...elements].sort((a, b) => {
    if (a.positioning === 'group' && b.positioning === 'group') return a.order - b.order
    if (a.positioning === 'group') return -1
    return 1
  })

  return (
    <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>요소 목록 ({elements.length})</span>
      </div>
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {sorted.map((el) => (
          <div
            key={el.id}
            onClick={() => onSelect(el.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px',
              background: selectedId === el.id ? '#e8f0fe' : 'transparent',
              cursor: 'pointer', borderBottom: '1px solid #f0f0f0',
            }}
          >
            <TypeIcon type={el.type} />
            <span style={{ fontSize: 12, color: '#333', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {el.label || el.id}
            </span>
            <span style={{ fontSize: 10, color: '#bbb' }}>{el.positioning === 'group' ? `#${(el as any).order}` : el.positioning}</span>
            <IconBtn onClick={(e) => { e.stopPropagation(); onUpdate(el.id, { visible: el.visible === false ? true : false }) }}>
              {el.visible === false ? <EyeOff size={12} /> : <Eye size={12} />}
            </IconBtn>
            <IconBtn onClick={(e) => { e.stopPropagation(); onUpdate(el.id, { locked: !el.locked }) }}>
              {el.locked ? <Lock size={12} /> : <Unlock size={12} />}
            </IconBtn>
            <IconBtn onClick={(e) => { e.stopPropagation(); onDuplicate(el.id) }}>
              <Copy size={12} />
            </IconBtn>
            <IconBtn onClick={(e) => { e.stopPropagation(); onRemove(el.id) }}>
              <Trash2 size={12} />
            </IconBtn>
          </div>
        ))}
        {elements.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: '#bbb' }}>
            요소가 없습니다. 툴바에서 추가하세요.
          </div>
        )}
      </div>
    </div>
  )
}

function TypeIcon({ type }: { type: string }) {
  const colors: Record<string, string> = { text: '#3182f6', image: '#e53935', button: '#111' }
  return (
    <div style={{
      width: 18, height: 18, borderRadius: 4,
      background: colors[type] || '#999',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, color: '#fff', fontWeight: 700, flexShrink: 0,
    }}>
      {type[0].toUpperCase()}
    </div>
  )
}

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: 2, background: 'transparent', border: 'none',
        color: '#999', cursor: 'pointer', display: 'flex',
      }}
    >
      {children}
    </button>
  )
}

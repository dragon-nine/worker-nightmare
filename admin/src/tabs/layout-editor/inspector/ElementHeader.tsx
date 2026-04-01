import type { LayoutElement } from '../types'
import { TypeBadge, Tag, ActionBtn, Field, selectStyle } from './shared'

interface ElementHeaderProps {
  element: LayoutElement
  elements: LayoutElement[]
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onSetParent: (childId: string, parentId: string | undefined) => void
}

export function ElementHeader({ element: el, elements, onRemove, onDuplicate, onSetParent }: ElementHeaderProps) {
  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TypeBadge type={el.type} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{el.label || el.id}</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <ActionBtn label="복제" onClick={() => onDuplicate(el.id)} />
          <ActionBtn label="삭제" onClick={() => onRemove(el.id)} danger />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <Tag>{el.positioning}</Tag>
      </div>

      {/* Parent */}
      {el.type !== 'card' && el.type !== 'modal' && (() => {
        const containers = elements.filter((e) => (e.type === 'card' || e.type === 'modal') && e.id !== el.id)
        if (containers.length === 0) return null
        return (
          <Field label="부모 요소">
            <select
              value={el.parentId || ''}
              onChange={(e) => onSetParent(el.id, e.target.value || undefined)}
              style={selectStyle}
            >
              <option value="">없음 (루트)</option>
              {containers.map((c) => <option key={c.id} value={c.id}>{c.label || c.id} ({c.type})</option>)}
            </select>
          </Field>
        )
      })()}
    </>
  )
}

import { useState } from 'react'
import type { LayoutIndex } from './types'

interface Props {
  screens: LayoutIndex['screens']
  activeKey: string
  onSelect: (key: string) => void
  onCreate: (key: string, label: string) => void
}

export default function ScreenSelector({ screens, activeKey, onSelect, onCreate }: Props) {
  const [showNew, setShowNew] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newLabel, setNewLabel] = useState('')

  const handleCreate = () => {
    if (!newKey.trim()) return
    onCreate(newKey.trim(), newLabel.trim() || newKey.trim())
    setNewKey('')
    setNewLabel('')
    setShowNew(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
      {screens.map((s) => (
        <button
          key={s.key}
          onClick={() => onSelect(s.key)}
          style={{
            padding: '6px 14px', borderRadius: 8, border: 'none',
            background: activeKey === s.key ? '#111' : '#f0f0f0',
            color: activeKey === s.key ? '#fff' : '#666',
            fontWeight: activeKey === s.key ? 700 : 400,
            fontSize: 13, cursor: 'pointer',
          }}
        >
          {s.label}
        </button>
      ))}
      {showNew ? (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            placeholder="key (예: intro)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12, width: 100 }}
            autoFocus
          />
          <input
            placeholder="이름"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12, width: 80 }}
          />
          <button onClick={handleCreate} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#111', color: '#fff', fontSize: 12, cursor: 'pointer' }}>추가</button>
          <button onClick={() => setShowNew(false)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', fontSize: 12, cursor: 'pointer' }}>취소</button>
        </div>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px dashed #ccc', background: 'transparent', color: '#999', fontSize: 13, cursor: 'pointer' }}
        >
          +
        </button>
      )}
    </div>
  )
}

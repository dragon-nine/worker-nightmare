import { useState, useRef, useEffect } from 'react'

interface Props {
  onAddElement: (type: string, positioning: 'group' | 'anchor') => void
  onOpenAssetPicker: () => void
  onAutoFit: () => void
}

const ITEMS = [
  { label: '텍스트', type: 'text' },
  { label: '이미지', type: 'image' },
  { label: '버튼', type: 'button' },
  { label: '카드', type: 'card' },
  { label: '모달', type: 'modal' },
  { label: '토글', type: 'toggle' },
  { label: '게이지', type: 'gauge' },
  { label: '원형 버튼', type: 'circle-btn' },
]

export default function Toolbar({ onAddElement, onOpenAssetPicker, onAutoFit }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSelect = (type: string) => {
    if (type === 'image') onOpenAssetPicker()
    else onAddElement(type, 'group')
    setOpen(false)
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            padding: '6px 14px', borderRadius: 8,
            border: '1px solid #ddd', background: '#111', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          + 요소 추가
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 20,
            background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)', overflow: 'hidden', minWidth: 140,
          }}>
            {ITEMS.map((item) => (
              <button
                key={item.type}
                onClick={() => handleSelect(item.type)}
                style={{
                  display: 'block', width: '100%', padding: '9px 16px', border: 'none',
                  background: '#fff', fontSize: 13, color: '#333', cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f5f5f5' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={onAutoFit}
        style={{
          padding: '6px 14px', borderRadius: 8,
          border: '1px solid #e8e8e8', background: '#f5f5f5', color: '#999',
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
        }}
      >
        자동 맞춤
      </button>
    </div>
  )
}

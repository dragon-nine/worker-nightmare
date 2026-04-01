import { useState, useEffect } from 'react'
import { colors, typeScale, gradients, type GradientKey } from '../../../components/common/design-tokens'
import type { TypeScaleKey } from '../../../components/common/design-spec'

export const GRADIENT_KEYS = Object.keys(gradients) as GradientKey[]
export const SCALE_KEYS = Object.keys(typeScale) as TypeScaleKey[]
export const COLOR_ENTRIES = Object.entries(colors) as [string, string][]
export const R2_PUBLIC = 'https://pub-a6e8e0aec44d4a69ae3ed4e096c5acc5.r2.dev'

export type BgType = 'transparent' | 'solid' | 'gradient' | 'image'

export const selectStyle: React.CSSProperties = {
  padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd',
  background: '#fff', color: '#333', fontSize: 13, width: '100%',
}

export const selectStyleInline: React.CSSProperties = {
  padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd',
  background: '#fff', color: '#333', fontSize: 13,
}

export function Panel({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#fafafa', borderRadius: 12, padding: 16, border: '1px solid #eee' }}>{children}</div>
}

export function PanelTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: '0 0 12px' }}>{children}</h3>
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #eee' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>{label}</div>
      {children}
    </div>
  )
}

export function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(value))
  useEffect(() => { setText(String(value)) }, [value])
  return (
    <input
      type="text" value={text}
      onChange={(e) => {
        setText(e.target.value)
        const n = Number(e.target.value)
        if (e.target.value !== '' && !isNaN(n)) onChange(n)
      }}
      onBlur={() => {
        const n = Number(text)
        if (!isNaN(n)) onChange(n)
        else setText(String(value))
      }}
      style={{ ...selectStyle, width: 60 }}
    />
  )
}

export function TypeBadge({ type }: { type: string }) {
  const bg: Record<string, string> = { text: '#3182f6', image: '#e53935', button: '#111', card: '#8b5cf6', modal: '#f59e0b', toggle: '#434750', close: '#666', gauge: '#c41e1e', 'circle-btn': '#4a5a6a' }
  return <span style={{ fontSize: 10, background: bg[type] || '#999', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{type}</span>
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10, color: '#666', background: '#f0f0f0', padding: '1px 6px', borderRadius: 4, fontWeight: 500 }}>{children}</span>
}

export function ActionBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: '3px 8px', borderRadius: 4, border: '1px solid #eee',
      background: danger ? '#fff5f5' : '#fff', color: danger ? '#e53935' : '#555',
      fontSize: 11, cursor: 'pointer', fontWeight: 500,
    }}>
      {label}
    </button>
  )
}

export function MiniToggle({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 10px', borderRadius: 6,
      border: active ? '1px solid #111' : '1px solid #ddd',
      background: active ? '#111' : '#fff',
      color: active ? '#fff' : '#999',
      fontSize: 11, fontWeight: 600, cursor: 'pointer',
    }}>
      {label}
    </button>
  )
}

export function UnifiedColorSelect({ value, onChange }: {
  value: string
  onChange: (val: string, type: 'solid' | 'gradient') => void
}) {
  const isGradient = GRADIENT_KEYS.includes(value as GradientKey)
  const matchedGradient = isGradient ? gradients[value as GradientKey] : null
  const matchedColor = !isGradient ? COLOR_ENTRIES.find(([name]) => name === value) : null
  const previewBg = matchedGradient
    ? `linear-gradient(${matchedGradient.direction}, ${matchedGradient.from}, ${matchedGradient.to})`
    : matchedColor ? matchedColor[1] : '#ffffff'

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <div style={{ width: 24, height: 24, borderRadius: 6, background: previewBg, border: '1px solid #ddd', flexShrink: 0 }} />
      <select
        value={value}
        onChange={(e) => {
          const v = e.target.value
          if (GRADIENT_KEYS.includes(v as GradientKey)) {
            onChange(v, 'gradient')
          } else {
            onChange(v, 'solid')
          }
        }}
        style={{ ...selectStyleInline, flex: 1 }}
      >
        <optgroup label="단색">
          {COLOR_ENTRIES.map(([name, hex]) => (
            <option key={name} value={name}>{name} — {hex}</option>
          ))}
        </optgroup>
        <optgroup label="그라데이션">
          {GRADIENT_KEYS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </optgroup>
      </select>
    </div>
  )
}

export function BgSelect({ bgType, bgColor, bgGradient, bgAssetKey, onChange, onPickImage }: {
  bgType: BgType
  bgColor: string
  bgGradient: string
  bgAssetKey: string
  onChange: (patch: { bgType?: BgType; bgColor?: string; bgGradient?: string; bgAssetKey?: string }) => void
  onPickImage: () => void
}) {
  const selectValue = bgType === 'transparent' ? '__transparent'
    : bgType === 'image' ? '__image'
    : bgType === 'gradient' ? `grad:${bgGradient}`
    : COLOR_ENTRIES.find(([, hex]) => hex === bgColor)?.[0] || '__custom'

  const previewBg = bgType === 'transparent'
    ? 'repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 0 0 / 12px 12px'
    : bgType === 'image' && bgAssetKey
    ? `url(${R2_PUBLIC}/${bgAssetKey}) center/cover`
    : bgType === 'gradient'
    ? (() => { const g = gradients[bgGradient as GradientKey]; return g ? `linear-gradient(${g.direction}, ${g.from}, ${g.to})` : bgColor })()
    : bgColor

  const handleChange = (val: string) => {
    if (val === '__transparent') {
      onChange({ bgType: 'transparent' })
    } else if (val === '__image') {
      onChange({ bgType: 'image' })
      onPickImage()
    } else if (val.startsWith('grad:')) {
      const key = val.slice(5)
      onChange({ bgType: 'gradient', bgGradient: key })
    } else {
      const hex = colors[val as keyof typeof colors]
      if (hex) onChange({ bgType: 'solid', bgColor: hex })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: previewBg, border: '1px solid #ddd', flexShrink: 0 }} />
        <select
          value={selectValue}
          onChange={(e) => handleChange(e.target.value)}
          style={{ ...selectStyleInline, flex: 1 }}
        >
          <option value="__transparent">투명</option>
          <option value="__image">이미지</option>
          <optgroup label="단색">
            {COLOR_ENTRIES.map(([name, hex]) => (
              <option key={name} value={name}>{name} — {hex}</option>
            ))}
          </optgroup>
          <optgroup label="그라데이션">
            {GRADIENT_KEYS.map((k) => (
              <option key={k} value={`grad:${k}`}>{k}</option>
            ))}
          </optgroup>
        </select>
      </div>
      {bgType === 'image' && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#999', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bgAssetKey ? bgAssetKey.split('/').pop() : '이미지 없음'}
          </span>
          <button
            onClick={onPickImage}
            style={{
              padding: '3px 10px', borderRadius: 6, border: '1px solid #ddd',
              background: '#fff', color: '#333', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            변경
          </button>
        </div>
      )}
    </div>
  )
}

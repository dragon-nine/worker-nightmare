import { colors, typeScale } from '../../components/common/design-tokens'
import type { TypeScaleKey } from '../../components/common/design-spec'

/* ═══════════════════════════════════════════
   SHARED HELPERS
   ═══════════════════════════════════════════ */

export function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: '0 0 4px' }}>{title}</h3>
      <p style={{ fontSize: 13, color: '#888', margin: 0 }}>{desc}</p>
    </div>
  )
}

export function ComponentBlock({ name, category, desc, preview, original, originalBg, controls, tokens }: {
  name: string; category: string; desc: string
  preview: React.ReactNode; original?: string; originalBg?: string
  controls: React.ReactNode; tokens?: string[]
}) {
  return (
    <div style={{ borderBottom: '1px solid #eee', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: 0 }}>{name}</h3>
          <span style={{ fontSize: 11, color: '#999', background: '#f0f0f0', padding: '1px 8px', borderRadius: 4, fontWeight: 500 }}>{category}</span>
        </div>
        <p style={{ fontSize: 13, color: '#888', margin: 0 }}>{desc}</p>
        {tokens && tokens.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: '#bbb' }}>Tokens:</span>
            {tokens.map((t) => (
              <span key={t} style={{ fontSize: 11, fontFamily: 'monospace', color: '#666', background: '#f5f5f5', padding: '1px 6px', borderRadius: 3 }}>{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 400px' }}>
          {preview}
          {original && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 11, color: '#bbb', fontWeight: 500 }}>Original Asset</span>
              <div style={{ background: originalBg || '#fff', borderRadius: 8, padding: 12, marginTop: 4, display: 'inline-flex', border: '1px solid #e8e8e8' }}>
                <img src={original} alt="" style={{ maxWidth: '100%', height: 'auto', maxHeight: 80 }} />
              </div>
            </div>
          )}
        </div>
        {controls && (
          <div style={controlsBox}>
            {controls}
          </div>
        )}
      </div>
    </div>
  )
}

export function Preview({ bg, minH, children }: { bg: string; minH?: number; children: React.ReactNode }) {
  return (
    <div style={{
      background: bg, borderRadius: 12, padding: 32,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: minH ?? 100,
      border: '1px solid #e8e8e8',
    }}>
      {children}
    </div>
  )
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10, color: '#666', background: '#f0f0f0', padding: '1px 6px', borderRadius: 4, fontWeight: 500 }}>{children}</span>
}

export function NumField({ label, value, onChange, min = 0, max = 100, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number
}) {
  return (
    <label style={labelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'monospace', color: '#999', fontSize: 12 }}>{value}{!label.includes('Weight') ? 'px' : ''}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ width: '100%', accentColor: '#111' }}
      />
    </label>
  )
}

const SCALE_KEYS = Object.keys(typeScale) as TypeScaleKey[]

export function ScaleField({ label, value, onChange }: { label: string; value: TypeScaleKey; onChange: (v: TypeScaleKey) => void }) {
  const s = typeScale[value]
  return (
    <label style={labelStyle}>
      <span>{label}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as TypeScaleKey)}
          style={{ ...inputStyle, flex: 1 }}
        >
          {SCALE_KEYS.map((k) => (
            <option key={k} value={k}>{k} — {typeScale[k].fontSize}px / stroke {typeScale[k].stroke}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        <span style={{ fontSize: 10, color: '#999', background: '#f0f0f0', padding: '1px 6px', borderRadius: 3 }}>{s.fontSize}px</span>
        <span style={{ fontSize: 10, color: '#999', background: '#f0f0f0', padding: '1px 6px', borderRadius: 3 }}>w{s.fontWeight}</span>
        {s.stroke > 0 && <span style={{ fontSize: 10, color: '#999', background: '#f0f0f0', padding: '1px 6px', borderRadius: 3 }}>stroke {s.stroke}</span>}
      </div>
    </label>
  )
}

const COLOR_ENTRIES = Object.entries(colors) as [string, string][]

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const matchedName = COLOR_ENTRIES.find(([, hex]) => hex === value)?.[0]
  return (
    <label style={labelStyle}>
      <span>{label}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: value, border: '1px solid #ddd', flexShrink: 0 }} />
        <select
          value={matchedName ?? '__custom'}
          onChange={(e) => {
            if (e.target.value === '__custom') return
            const hex = colors[e.target.value as keyof typeof colors]
            if (hex) onChange(hex)
          }}
          style={{ ...inputStyle, flex: 1 }}
        >
          {!matchedName && <option value="__custom">{value} (커스텀)</option>}
          {COLOR_ENTRIES.map(([name, hex]) => (
            <option key={name} value={name}>{name} — {hex}</option>
          ))}
        </select>
      </div>
    </label>
  )
}

export function InputRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={labelStyle}><span>{label}</span><input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} /></label>
  )
}

export const controlsBox: React.CSSProperties = { flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: 10, background: '#fafafa', borderRadius: 12, padding: 16, border: '1px solid #eee' }
export const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#555' }
export const inputStyle: React.CSSProperties = { padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#333', fontSize: 14 }

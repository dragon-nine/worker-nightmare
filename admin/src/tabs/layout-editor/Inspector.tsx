import type { LayoutElement, GroupElement, AnchorElement } from './types'
import { colors, typeScale } from '../../components/common/design-tokens'
import type { TypeScaleKey, ButtonStyleType } from '../../components/common/design-spec'

const SCALE_KEYS = Object.keys(typeScale) as TypeScaleKey[]
const COLOR_ENTRIES = Object.entries(colors) as [string, string][]

interface Props {
  element: LayoutElement | null
  onUpdate: (id: string, patch: Partial<LayoutElement>) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  bgColor: string
  onBgColorChange: (c: string) => void
  groupVAlign: 'center' | 'top'
  onGroupVAlignChange: (v: 'center' | 'top') => void
}

export default function Inspector({
  element, onUpdate, onRemove, onDuplicate,
  bgColor, onBgColorChange, groupVAlign, onGroupVAlignChange,
}: Props) {
  if (!element) {
    return (
      <div style={panelStyle}>
        <h3 style={titleStyle}>화면 설정</h3>
        <Field label="배경색">
          <ColorSelect value={bgColor} onChange={onBgColorChange} />
        </Field>
        <Field label="그룹 정렬">
          <select value={groupVAlign} onChange={(e) => onGroupVAlignChange(e.target.value as 'center' | 'top')} style={inputStyle}>
            <option value="center">세로 중앙</option>
            <option value="top">상단 고정</option>
          </select>
        </Field>
        <p style={{ fontSize: 12, color: '#999', marginTop: 16 }}>요소를 클릭하면 속성을 편집할 수 있습니다.</p>
      </div>
    )
  }

  const el = element
  const update = (patch: Partial<LayoutElement>) => onUpdate(el.id, patch)

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ ...titleStyle, margin: 0 }}>{el.id}</h3>
        <div style={{ display: 'flex', gap: 4 }}>
          <SmallBtn label="복제" onClick={() => onDuplicate(el.id)} />
          <SmallBtn label="삭제" onClick={() => onRemove(el.id)} danger />
        </div>
      </div>

      {/* Type badge */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <Badge>{el.type}</Badge>
        <Badge>{el.positioning}</Badge>
        {el.locked && <Badge>잠금</Badge>}
      </div>

      {/* Common */}
      <Field label="너비 (px)">
        <NumInput value={el.widthPx} onChange={(v) => update({ widthPx: v })} />
      </Field>
      {el.heightPx !== undefined && (
        <Field label="높이 (px)">
          <NumInput value={el.heightPx} onChange={(v) => update({ heightPx: v })} />
        </Field>
      )}

      {/* Label */}
      {(el.type === 'text' || el.type === 'button') && (
        <Field label="텍스트">
          <textarea
            value={el.label || ''}
            onChange={(e) => update({ label: e.target.value })}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Field>
      )}

      {/* Group fields */}
      {el.positioning === 'group' && (
        <>
          <Field label="순서 (order)">
            <NumInput value={(el as GroupElement).order} onChange={(v) => update({ order: v })} />
          </Field>
          <Field label="위 간격 (gapPx)">
            <NumInput value={(el as GroupElement).gapPx} onChange={(v) => update({ gapPx: v })} />
          </Field>
        </>
      )}

      {/* Anchor fields */}
      {el.positioning === 'anchor' && (
        <>
          <Field label="앵커">
            <select
              value={(el as AnchorElement).anchor}
              onChange={(e) => update({ anchor: e.target.value as AnchorElement['anchor'] })}
              style={inputStyle}
            >
              <option value="top-left">상단 좌측</option>
              <option value="top-right">상단 우측</option>
              <option value="bottom-left">하단 좌측</option>
              <option value="bottom-right">하단 우측</option>
            </select>
          </Field>
          <Field label="offsetX">
            <NumInput value={(el as AnchorElement).offsetX} onChange={(v) => update({ offsetX: v })} />
          </Field>
          <Field label="offsetY">
            <NumInput value={(el as AnchorElement).offsetY} onChange={(v) => update({ offsetY: v })} />
          </Field>
        </>
      )}

      {/* Text style */}
      {el.type === 'text' && (
        <>
          <h4 style={subTitleStyle}>텍스트 스타일</h4>
          <Field label="Type Scale">
            <select
              value={el.textStyle?.scaleKey || ''}
              onChange={(e) => {
                const key = e.target.value as TypeScaleKey
                const ts = typeScale[key]
                update({ textStyle: { ...el.textStyle, scaleKey: key, fontSizePx: ts.fontSize, strokeWidth: ts.stroke } })
              }}
              style={inputStyle}
            >
              <option value="">커스텀</option>
              {SCALE_KEYS.map((k) => <option key={k} value={k}>{k} — {typeScale[k].fontSize}px</option>)}
            </select>
          </Field>
          <Field label="폰트 크기">
            <NumInput value={el.textStyle?.fontSizePx || 14} onChange={(v) => update({ textStyle: { ...el.textStyle, fontSizePx: v } })} />
          </Field>
          <Field label="색상">
            <ColorSelect value={el.textStyle?.color || '#ffffff'} onChange={(v) => update({ textStyle: { ...el.textStyle, color: v } })} />
          </Field>
          <Field label="Stroke 두께">
            <NumInput value={el.textStyle?.strokeWidth || 0} onChange={(v) => update({ textStyle: { ...el.textStyle, strokeWidth: v } })} />
          </Field>
        </>
      )}

      {/* Button style */}
      {el.type === 'button' && (
        <>
          <h4 style={subTitleStyle}>버튼 스타일</h4>
          <Field label="유형">
            <select
              value={el.buttonStyle?.styleType || 'outline'}
              onChange={(e) => update({ buttonStyle: { styleType: e.target.value as ButtonStyleType, bgColor: el.buttonStyle?.bgColor || '#24282c', scaleKey: el.buttonStyle?.scaleKey || 'lg' } })}
              style={inputStyle}
            >
              <option value="flat">Flat</option>
              <option value="outline">Outline</option>
              <option value="doubleLine">Double Line</option>
            </select>
          </Field>
          <Field label="Type Scale">
            <select
              value={el.buttonStyle?.scaleKey || 'lg'}
              onChange={(e) => update({ buttonStyle: { styleType: el.buttonStyle?.styleType || 'outline', bgColor: el.buttonStyle?.bgColor, scaleKey: e.target.value as TypeScaleKey } })}
              style={inputStyle}
            >
              {SCALE_KEYS.map((k) => <option key={k} value={k}>{k} — {typeScale[k].fontSize}px</option>)}
            </select>
          </Field>
          <Field label="배경색">
            <ColorSelect value={el.buttonStyle?.bgColor || '#24282c'} onChange={(v) => update({ buttonStyle: { styleType: el.buttonStyle?.styleType || 'outline', scaleKey: el.buttonStyle?.scaleKey || 'lg', bgColor: v } })} />
          </Field>
        </>
      )}

      {/* Visibility / Lock */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <label style={{ fontSize: 12, color: '#666', display: 'flex', gap: 4, alignItems: 'center' }}>
          <input type="checkbox" checked={el.visible !== false} onChange={(e) => update({ visible: e.target.checked })} />
          표시
        </label>
        <label style={{ fontSize: 12, color: '#666', display: 'flex', gap: 4, alignItems: 'center' }}>
          <input type="checkbox" checked={!!el.locked} onChange={(e) => update({ locked: e.target.checked })} />
          잠금
        </label>
      </div>
    </div>
  )
}

/* Helpers */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>{label}</div>
      {children}
    </div>
  )
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => { const n = Number(e.target.value); if (!isNaN(n)) onChange(n) }}
      style={{ ...inputStyle, width: 80 }}
    />
  )
}

function ColorSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const matched = COLOR_ENTRIES.find(([, hex]) => hex === value)?.[0]
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <div style={{ width: 20, height: 20, borderRadius: 4, background: value, border: '1px solid #ddd', flexShrink: 0 }} />
      <select
        value={matched ?? '__custom'}
        onChange={(e) => {
          if (e.target.value === '__custom') return
          const hex = colors[e.target.value as keyof typeof colors]
          if (hex) onChange(hex)
        }}
        style={{ ...inputStyle, flex: 1 }}
      >
        {!matched && <option value="__custom">{value}</option>}
        {COLOR_ENTRIES.map(([name, hex]) => (
          <option key={name} value={name}>{name} — {hex}</option>
        ))}
      </select>
    </div>
  )
}

function SmallBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 8px', borderRadius: 4, border: '1px solid #ddd',
        background: danger ? '#fee' : '#fff', color: danger ? '#e53935' : '#333',
        fontSize: 11, cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10, background: '#f0f0f0', color: '#666', padding: '1px 6px', borderRadius: 3 }}>{children}</span>
}

const panelStyle: React.CSSProperties = { width: 280, background: '#fafafa', borderRadius: 12, padding: 16, border: '1px solid #eee', overflowY: 'auto', maxHeight: '80vh' }
const titleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: '#111', margin: '0 0 12px' }
const subTitleStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#555', margin: '12px 0 6px', borderTop: '1px solid #eee', paddingTop: 10 }
const inputStyle: React.CSSProperties = { padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#333', fontSize: 13, width: '100%' }

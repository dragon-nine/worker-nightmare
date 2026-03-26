import type { LayoutElement, GroupElement, AnchorElement } from './types'
import { colors, typeScale, gradients, type GradientKey } from '../../components/common/design-tokens'
import type { TypeScaleKey, ButtonStyleType } from '../../components/common/design-spec'

const GRADIENT_KEYS = Object.keys(gradients) as GradientKey[]

const SCALE_KEYS = Object.keys(typeScale) as TypeScaleKey[]
const COLOR_ENTRIES = Object.entries(colors) as [string, string][]

type BgType = 'transparent' | 'solid' | 'gradient'

interface Props {
  element: LayoutElement | null
  onUpdate: (id: string, patch: Partial<LayoutElement>) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  padding: { top: number; right: number; bottom: number; left: number }
  onPaddingUpdate: (patch: Partial<{ top: number; right: number; bottom: number; left: number }>) => void
  bgType: BgType
  bgColor: string
  bgGradient: string
  onBgUpdate: (patch: { bgType?: BgType; bgColor?: string; bgGradient?: string }) => void
}

export default function Inspector({
  element, onUpdate, onRemove, onDuplicate,
  padding, onPaddingUpdate,
  bgType, bgColor, bgGradient, onBgUpdate,
}: Props) {
  if (!element) {
    return (
      <Panel>
        <PanelTitle>화면 설정</PanelTitle>
        <Section title="패딩">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <Field label="상"><NumInput value={padding.top} onChange={(v) => onPaddingUpdate({ top: v })} /></Field>
            <Field label="하"><NumInput value={padding.bottom} onChange={(v) => onPaddingUpdate({ bottom: v })} /></Field>
            <Field label="좌"><NumInput value={padding.left} onChange={(v) => onPaddingUpdate({ left: v })} /></Field>
            <Field label="우"><NumInput value={padding.right} onChange={(v) => onPaddingUpdate({ right: v })} /></Field>
          </div>
        </Section>
        <Field label="배경">
          <select value={bgType} onChange={(e) => onBgUpdate({ bgType: e.target.value as BgType })} style={selectStyle}>
            <option value="transparent">투명</option>
            <option value="solid">단색</option>
            <option value="gradient">그라데이션</option>
          </select>
        </Field>
        {bgType === 'solid' && (
          <Field label="배경색"><ColorSelect value={bgColor} onChange={(v) => onBgUpdate({ bgColor: v })} /></Field>
        )}
        {bgType === 'gradient' && (
          <Field label="그라데이션">
            <select value={bgGradient} onChange={(e) => onBgUpdate({ bgGradient: e.target.value })} style={selectStyle}>
              {GRADIENT_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
        )}
        <p style={{ fontSize: 12, color: '#999', marginTop: 16 }}>요소를 클릭하면 속성을 편집할 수 있습니다.</p>
      </Panel>
    )
  }

  const el = element
  const update = (patch: Partial<LayoutElement>) => onUpdate(el.id, patch)

  return (
    <Panel>
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
        {el.locked && <Tag>잠금</Tag>}
      </div>

      {/* Size */}
      <Field label="너비">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            value={el.widthMode || 'full'}
            onChange={(e) => update({ widthMode: e.target.value as 'full' | 'fixed' })}
            style={{ ...selectStyle, width: 80 }}
          >
            <option value="full">자동</option>
            <option value="fixed">고정</option>
          </select>
          {(el.widthMode === 'fixed') && <NumInput value={el.widthPx} onChange={(v) => update({ widthPx: v })} />}
          {(el.widthMode !== 'fixed') && <span style={{ fontSize: 11, color: '#999' }}>패딩 기준 풀 너비</span>}
        </div>
      </Field>
      {el.heightPx !== undefined && <Field label="높이 (px)"><NumInput value={el.heightPx} onChange={(v) => update({ heightPx: v })} /></Field>}

      {/* Label */}
      {(el.type === 'text' || el.type === 'button') && (
        <Field label="텍스트">
          <textarea value={el.label || ''} onChange={(e) => update({ label: e.target.value })} rows={2} style={{ ...selectStyle, resize: 'vertical' }} />
        </Field>
      )}

      {/* Group */}
      {el.positioning === 'group' && (
        <Section title="그룹 배치">
          <Field label="위 간격"><NumInput value={(el as GroupElement).gapPx} onChange={(v) => update({ gapPx: v })} /></Field>
          <p style={{ fontSize: 11, color: '#bbb', margin: '4px 0 0' }}>순서/행 변경은 요소 목록에서 드래그</p>
        </Section>
      )}

      {/* Anchor */}
      {el.positioning === 'anchor' && (
        <Section title="앵커 배치">
          <Field label="위치">
            <select value={(el as AnchorElement).anchor} onChange={(e) => update({ anchor: e.target.value as AnchorElement['anchor'] })} style={selectStyle}>
              <option value="top-left">상단 좌측</option>
              <option value="top-right">상단 우측</option>
              <option value="bottom-left">하단 좌측</option>
              <option value="bottom-right">하단 우측</option>
            </select>
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <Field label="X"><NumInput value={(el as AnchorElement).offsetX} onChange={(v) => update({ offsetX: v })} /></Field>
            <Field label="Y"><NumInput value={(el as AnchorElement).offsetY} onChange={(v) => update({ offsetY: v })} /></Field>
          </div>
        </Section>
      )}

      {/* Text style */}
      {el.type === 'text' && (
        <Section title="텍스트 스타일">
          <Field label="Type Scale">
            <select
              value={el.textStyle?.scaleKey || ''}
              onChange={(e) => {
                const key = e.target.value as TypeScaleKey
                const ts = typeScale[key]
                update({ textStyle: { ...el.textStyle, scaleKey: key, fontSizePx: ts.fontSize, strokeWidth: ts.stroke } })
              }}
              style={selectStyle}
            >
              <option value="">커스텀</option>
              {SCALE_KEYS.map((k) => <option key={k} value={k}>{k} — {typeScale[k].fontSize}px</option>)}
            </select>
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <Field label="크기"><NumInput value={el.textStyle?.fontSizePx || 14} onChange={(v) => update({ textStyle: { ...el.textStyle, fontSizePx: v } })} /></Field>
            <Field label="Stroke"><NumInput value={el.textStyle?.strokeWidth || 0} onChange={(v) => update({ textStyle: { ...el.textStyle, strokeWidth: v } })} /></Field>
          </div>
          <Field label="색상"><ColorSelect value={el.textStyle?.color || '#ffffff'} onChange={(v) => update({ textStyle: { ...el.textStyle, color: v } })} /></Field>
        </Section>
      )}

      {/* Button style */}
      {el.type === 'button' && (
        <Section title="버튼 스타일">
          <Field label="유형">
            <select
              value={el.buttonStyle?.styleType || 'outline'}
              onChange={(e) => update({ buttonStyle: { styleType: e.target.value as ButtonStyleType, bgColor: el.buttonStyle?.bgColor || '#24282c', scaleKey: el.buttonStyle?.scaleKey || 'lg' } })}
              style={selectStyle}
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
              style={selectStyle}
            >
              {SCALE_KEYS.map((k) => <option key={k} value={k}>{k} — {typeScale[k].fontSize}px</option>)}
            </select>
          </Field>
          <Field label="배경색"><ColorSelect value={el.buttonStyle?.bgColor || '#24282c'} onChange={(v) => update({ buttonStyle: { styleType: el.buttonStyle?.styleType || 'outline', scaleKey: el.buttonStyle?.scaleKey || 'lg', bgColor: v } })} /></Field>
        </Section>
      )}

      {/* Toggles */}
      <div style={{ display: 'flex', gap: 12, marginTop: 14, paddingTop: 12, borderTop: '1px solid #eee' }}>
        <label style={{ fontSize: 12, color: '#666', display: 'flex', gap: 4, alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={el.visible !== false} onChange={(e) => update({ visible: e.target.checked })} /> 표시
        </label>
        <label style={{ fontSize: 12, color: '#666', display: 'flex', gap: 4, alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!el.locked} onChange={(e) => update({ locked: e.target.checked })} /> 잠금
        </label>
      </div>
    </Panel>
  )
}

/* ── Shared components ── */

function Panel({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#fafafa', borderRadius: 12, padding: 16, border: '1px solid #eee' }}>{children}</div>
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111', margin: '0 0 12px' }}>{children}</h3>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #eee' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}

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
      type="text" value={value}
      onChange={(e) => { const n = Number(e.target.value); if (!isNaN(n)) onChange(n) }}
      style={{ ...selectStyle, width: 70 }}
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
        onChange={(e) => { if (e.target.value !== '__custom') { const hex = colors[e.target.value as keyof typeof colors]; if (hex) onChange(hex) } }}
        style={{ ...selectStyle, flex: 1 }}
      >
        {!matched && <option value="__custom">{value}</option>}
        {COLOR_ENTRIES.map(([name, hex]) => <option key={name} value={name}>{name} — {hex}</option>)}
      </select>
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const bg: Record<string, string> = { text: '#3182f6', image: '#e53935', button: '#111' }
  return <span style={{ fontSize: 10, background: bg[type] || '#999', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{type}</span>
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10, color: '#666', background: '#f0f0f0', padding: '1px 6px', borderRadius: 4, fontWeight: 500 }}>{children}</span>
}

function ActionBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
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

const selectStyle: React.CSSProperties = {
  padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd',
  background: '#fff', color: '#333', fontSize: 13, width: '100%',
}

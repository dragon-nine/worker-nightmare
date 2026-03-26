import { useState, useEffect } from 'react'
import type { LayoutElement, GroupElement, AnchorElement } from './types'
import { colors, typeScale, gradients, type GradientKey } from '../../components/common/design-tokens'
import type { TypeScaleKey, ButtonStyleType } from '../../components/common/design-spec'

const GRADIENT_KEYS = Object.keys(gradients) as GradientKey[]

const SCALE_KEYS = Object.keys(typeScale) as TypeScaleKey[]
const COLOR_ENTRIES = Object.entries(colors) as [string, string][]

type BgType = 'transparent' | 'solid' | 'gradient' | 'image'

interface Props {
  elements: LayoutElement[]
  element: LayoutElement | null
  onUpdate: (id: string, patch: Partial<LayoutElement>) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onSetParent: (childId: string, parentId: string | undefined) => void
  padding: { top: number; right: number; bottom: number; left: number }
  onPaddingUpdate: (patch: Partial<{ top: number; right: number; bottom: number; left: number }>) => void
  bgType: BgType
  bgColor: string
  bgGradient: string
  bgAssetKey: string
  onBgUpdate: (patch: { bgType?: BgType; bgColor?: string; bgGradient?: string; bgAssetKey?: string }) => void
  onOpenAssetPicker: (target: 'bg') => void
}

export default function Inspector({
  elements, element, onUpdate, onRemove, onDuplicate, onSetParent,
  padding, onPaddingUpdate,
  bgType, bgColor, bgGradient, bgAssetKey, onBgUpdate, onOpenAssetPicker,
}: Props) {
  if (!element) {
    return (
      <Panel>
        <PanelTitle>화면 설정</PanelTitle>
        <Field label="패딩 (상/하/좌/우)">
          <div style={{ display: 'flex', gap: 4 }}>
            <NumInput value={padding.top} onChange={(v) => onPaddingUpdate({ top: v })} />
            <NumInput value={padding.bottom} onChange={(v) => onPaddingUpdate({ bottom: v })} />
            <NumInput value={padding.left} onChange={(v) => onPaddingUpdate({ left: v })} />
            <NumInput value={padding.right} onChange={(v) => onPaddingUpdate({ right: v })} />
          </div>
        </Field>
        <Field label="배경">
          <BgSelect
            bgType={bgType}
            bgColor={bgColor}
            bgGradient={bgGradient}
            bgAssetKey={bgAssetKey}
            onChange={onBgUpdate}
            onPickImage={() => onOpenAssetPicker('bg')}
          />
        </Field>
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

      {/* Inner Padding (for card/modal) — compact */}
      {(el.type === 'card' || el.type === 'modal') && el.innerPadding && (
        <Field label="내부 패딩 (상/하/좌/우)">
          <div style={{ display: 'flex', gap: 4 }}>
            <NumInput value={el.innerPadding.top} onChange={(v) => update({ innerPadding: { ...el.innerPadding!, top: v } })} />
            <NumInput value={el.innerPadding.bottom} onChange={(v) => update({ innerPadding: { ...el.innerPadding!, bottom: v } })} />
            <NumInput value={el.innerPadding.left} onChange={(v) => update({ innerPadding: { ...el.innerPadding!, left: v } })} />
            <NumInput value={el.innerPadding.right} onChange={(v) => update({ innerPadding: { ...el.innerPadding!, right: v } })} />
          </div>
        </Field>
      )}

      {el.heightPx !== undefined && el.type !== 'card' && el.type !== 'modal' && (
        <Field label="높이 (px)"><NumInput value={el.heightPx} onChange={(v) => update({ heightPx: v })} /></Field>
      )}

      {/* Label */}
      {(el.type === 'text' || el.type === 'button') && (
        <Field label="텍스트">
          <textarea value={el.label || ''} onChange={(e) => update({ label: e.target.value })} rows={2} style={{ ...selectStyle, resize: 'vertical' }} />
        </Field>
      )}

      {/* Group */}
      {el.positioning === 'group' && (() => {
        const ge = el as GroupElement
        const sameRow = elements.filter((e): e is GroupElement => e.positioning === 'group' && e.id !== el.id && e.order === ge.order)
        return (
          <Section title="그룹 배치">
            <Field label="위 간격"><NumInput value={ge.gapPx} onChange={(v) => update({ gapPx: v })} /></Field>
            {sameRow.length > 0 && (
              <Field label="항목 간 간격"><NumInput value={ge.hGapPx ?? 8} onChange={(v) => update({ hGapPx: v })} /></Field>
            )}
            <p style={{ fontSize: 11, color: '#bbb', margin: '4px 0 0' }}>순서/행 변경은 요소 목록에서 드래그</p>
          </Section>
        )
      })()}

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
      {el.type === 'text' && (() => {
        const ts = el.textStyle || {}
        const scaleKey = ts.scaleKey || 'sm'
        const scaleVal = typeScale[scaleKey]
        const hasStroke = (ts.strokeWidth ?? scaleVal.stroke) > 0

        // 현재 선택된 색상값 (단색 or 그라데이션 키)
        const currentColorValue = ts.gradientColors
          ? GRADIENT_KEYS.find((k) => gradients[k].from === ts.gradientColors![0] && gradients[k].to === ts.gradientColors![1]) || GRADIENT_KEYS[0]
          : COLOR_ENTRIES.find(([, hex]) => hex === ts.color)?.[0] || '__white'

        return (
          <Section title="텍스트 스타일">
            <Field label="Type Scale">
              <select
                value={scaleKey}
                onChange={(e) => {
                  const key = e.target.value as TypeScaleKey
                  const s = typeScale[key]
                  update({ textStyle: { ...ts, scaleKey: key, fontSizePx: s.fontSize, strokeWidth: hasStroke ? s.stroke : 0 } })
                }}
                style={selectStyle}
              >
                {SCALE_KEYS.map((k) => <option key={k} value={k}>{k} — {typeScale[k].fontSize}px</option>)}
              </select>
            </Field>
            {/* Color: 단색 + 그라데이션 통합 */}
            <Field label="색상">
              <UnifiedColorSelect
                value={currentColorValue}
                onChange={(val, type) => {
                  if (type === 'gradient') {
                    const g = gradients[val as GradientKey]
                    update({ textStyle: { ...ts, gradientColors: [g.from, g.to], color: undefined } })
                  } else {
                    const hex = colors[val as keyof typeof colors] || val
                    update({ textStyle: { ...ts, color: hex, gradientColors: undefined } })
                  }
                }}
              />
            </Field>
            {/* Stroke: 있음/없음 */}
            <Field label="외곽선">
              <div style={{ display: 'flex', gap: 6 }}>
                <MiniToggle active={!hasStroke} label="없음" onClick={() => update({ textStyle: { ...ts, strokeWidth: 0 } })} />
                <MiniToggle active={hasStroke} label="적용" onClick={() => update({ textStyle: { ...ts, strokeWidth: scaleVal.stroke } })} />
              </div>
            </Field>
          </Section>
        )
      })()}

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
          <Field label="배경색">
            <UnifiedColorSelect
              value={
                el.buttonStyle?.bgGradient
                  ? el.buttonStyle.bgGradient
                  : COLOR_ENTRIES.find(([, hex]) => hex === (el.buttonStyle?.bgColor || '#24282c'))?.[0] || 'graphite'
              }
              onChange={(val, type) => {
                const base = { styleType: el.buttonStyle?.styleType || 'outline' as const, scaleKey: el.buttonStyle?.scaleKey || 'lg' as const }
                if (type === 'gradient') {
                  update({ buttonStyle: { ...base, bgColor: el.buttonStyle?.bgColor || '#24282c', bgGradient: val } })
                } else {
                  const hex = colors[val as keyof typeof colors] || val
                  update({ buttonStyle: { ...base, bgColor: hex, bgGradient: undefined } })
                }
              }}
            />
          </Field>
        </Section>
      )}

      {/* Card style */}
      {el.type === 'card' && (
        <Section title="카드 스타일">
          <Field label="배경색">
            <UnifiedColorSelect
              value={COLOR_ENTRIES.find(([, hex]) => hex === (el.buttonStyle?.bgColor || '#2a292e'))?.[0] || 'ash'}
              onChange={(val, type) => {
                const hex = type === 'gradient' ? val : (colors[val as keyof typeof colors] || val)
                update({ buttonStyle: { styleType: 'flat', bgColor: hex } as any })
              }}
            />
          </Field>
        </Section>
      )}

      {/* Modal — 고정 스타일, 높이만 조정 */}
      {el.type === 'modal' && (
        <Section title="모달">
          <p style={{ fontSize: 11, color: '#999', margin: 0 }}>배경 ash (#2a292e) + X 버튼 고정</p>
        </Section>
      )}

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


function TypeBadge({ type }: { type: string }) {
  const bg: Record<string, string> = { text: '#3182f6', image: '#e53935', button: '#111', card: '#8b5cf6', modal: '#f59e0b', toggle: '#434750', close: '#666', gauge: '#c41e1e', 'circle-btn': '#4a5a6a' }
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

function UnifiedColorSelect({ value, onChange }: {
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

const selectStyleInline: React.CSSProperties = {
  padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd',
  background: '#fff', color: '#333', fontSize: 13,
}

function MiniToggle({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
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

const R2_PUBLIC = 'https://pub-a6e8e0aec44d4a69ae3ed4e096c5acc5.r2.dev'

function BgSelect({ bgType, bgColor, bgGradient, bgAssetKey, onChange, onPickImage }: {
  bgType: BgType
  bgColor: string
  bgGradient: string
  bgAssetKey: string
  onChange: (patch: { bgType?: BgType; bgColor?: string; bgGradient?: string; bgAssetKey?: string }) => void
  onPickImage: () => void
}) {
  // Compute unified select value
  const selectValue = bgType === 'transparent' ? '__transparent'
    : bgType === 'image' ? '__image'
    : bgType === 'gradient' ? `grad:${bgGradient}`
    : COLOR_ENTRIES.find(([, hex]) => hex === bgColor)?.[0] || '__custom'

  // Preview
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

const selectStyle: React.CSSProperties = {
  padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd',
  background: '#fff', color: '#333', fontSize: 13, width: '100%',
}

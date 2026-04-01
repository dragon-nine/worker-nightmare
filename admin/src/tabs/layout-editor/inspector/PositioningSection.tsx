import type { LayoutElement, GroupElement, AnchorElement } from '../types'
import { Section, Field, NumInput, MiniToggle, selectStyle } from './shared'

interface PositioningSectionProps {
  element: LayoutElement
  elements: LayoutElement[]
  onUpdate: (patch: Partial<LayoutElement>) => void
}

export function PositioningSection({ element: el, elements, onUpdate: update }: PositioningSectionProps) {
  return (
    <>
      {/* Inner Padding (for card/modal) */}
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

      {/* 너비 */}
      {el.type === 'image' && (
        <Section title="크기">
          <Field label="너비 모드">
            <div style={{ display: 'flex', gap: 6 }}>
              <MiniToggle active={el.widthMode === 'full'} label="전체" onClick={() => update({ widthMode: 'full' })} />
              <MiniToggle active={el.widthMode !== 'full'} label="고정" onClick={() => update({ widthMode: 'fixed' })} />
            </div>
          </Field>
          {el.widthMode !== 'full' && (
            <Field label="너비 (px)"><NumInput value={el.widthPx} onChange={(v) => update({ widthPx: v })} /></Field>
          )}
        </Section>
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
    </>
  )
}

import type { LayoutElement } from '../types'
import { colors, typeScale, gradients, type GradientKey } from '../../../components/common/design-tokens'
import type { TypeScaleKey } from '../../../components/common/design-spec'
import { Section, Field, MiniToggle, UnifiedColorSelect, GRADIENT_KEYS, SCALE_KEYS, COLOR_ENTRIES } from './shared'

interface TextStyleSectionProps {
  element: LayoutElement
  onUpdate: (patch: Partial<LayoutElement>) => void
}

export function TextStyleSection({ element: el, onUpdate: update }: TextStyleSectionProps) {
  if (el.type !== 'text') return null

  const ts = el.textStyle || {}
  const scaleKey = ts.scaleKey || 'sm'
  const scaleVal = typeScale[scaleKey]
  const hasStroke = (ts.strokeWidth ?? scaleVal.stroke) > 0

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
          style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#333', fontSize: 13, width: '100%' }}
        >
          {SCALE_KEYS.map((k) => <option key={k} value={k}>{k} — {typeScale[k].fontSize}px</option>)}
        </select>
      </Field>
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
      <Field label="외곽선">
        <div style={{ display: 'flex', gap: 6 }}>
          <MiniToggle active={!hasStroke} label="없음" onClick={() => update({ textStyle: { ...ts, strokeWidth: 0 } })} />
          <MiniToggle active={hasStroke} label="적용" onClick={() => update({ textStyle: { ...ts, strokeWidth: scaleVal.stroke } })} />
        </div>
      </Field>
    </Section>
  )
}

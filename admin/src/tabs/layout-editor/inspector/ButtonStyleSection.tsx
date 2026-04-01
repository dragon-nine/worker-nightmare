import type { LayoutElement } from '../types'
import { colors, typeScale } from '../../../components/common/design-tokens'
import type { TypeScaleKey, ButtonStyleType } from '../../../components/common/design-spec'
import { Section, Field, UnifiedColorSelect, selectStyle, SCALE_KEYS, COLOR_ENTRIES } from './shared'

interface ButtonStyleSectionProps {
  element: LayoutElement
  onUpdate: (patch: Partial<LayoutElement>) => void
}

export function ButtonStyleSection({ element: el, onUpdate: update }: ButtonStyleSectionProps) {
  if (el.type !== 'button') return null

  return (
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
          <option value="pill">Pill</option>
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
  )
}

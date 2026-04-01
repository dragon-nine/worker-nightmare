import type { LayoutElement } from '../types'
import { colors } from '../../../components/common/design-tokens'
import { Section, Field, UnifiedColorSelect, COLOR_ENTRIES } from './shared'

interface CardModalSectionProps {
  element: LayoutElement
  onUpdate: (patch: Partial<LayoutElement>) => void
}

export function CardModalSection({ element: el, onUpdate: update }: CardModalSectionProps) {
  if (el.type === 'card') {
    return (
      <Section title="카드 스타일">
        <Field label="배경색">
          <UnifiedColorSelect
            value={COLOR_ENTRIES.find(([, hex]) => hex === (el.buttonStyle?.bgColor || '#2a292e'))?.[0] || 'ash'}
            onChange={(val, type) => {
              const hex = type === 'gradient' ? val : (colors[val as keyof typeof colors] || val)
              update({ buttonStyle: { styleType: 'flat', bgColor: hex } })
            }}
          />
        </Field>
      </Section>
    )
  }

  if (el.type === 'modal') {
    return (
      <Section title="모달">
        <p style={{ fontSize: 11, color: '#999', margin: 0 }}>배경 ash (#2a292e) + X 버튼 고정</p>
      </Section>
    )
  }

  return null
}

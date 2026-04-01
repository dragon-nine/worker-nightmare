import type { LayoutElement } from './types'
import { Panel } from './inspector/shared'
import type { BgType } from './inspector/shared'
import { ScreenSettingsPanel } from './inspector/ScreenSettingsPanel'
import { ElementHeader } from './inspector/ElementHeader'
import { PositioningSection } from './inspector/PositioningSection'
import { TextStyleSection } from './inspector/TextStyleSection'
import { ButtonStyleSection } from './inspector/ButtonStyleSection'
import { CardModalSection } from './inspector/CardModalSection'

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
      <ScreenSettingsPanel
        padding={padding}
        onPaddingUpdate={onPaddingUpdate}
        bgType={bgType}
        bgColor={bgColor}
        bgGradient={bgGradient}
        bgAssetKey={bgAssetKey}
        onBgUpdate={onBgUpdate}
        onOpenAssetPicker={onOpenAssetPicker}
      />
    )
  }

  const el = element
  const update = (patch: Partial<LayoutElement>) => onUpdate(el.id, patch)

  return (
    <Panel>
      <ElementHeader
        element={el}
        elements={elements}
        onRemove={onRemove}
        onDuplicate={onDuplicate}
        onSetParent={onSetParent}
      />
      <PositioningSection
        element={el}
        elements={elements}
        onUpdate={update}
      />
      <TextStyleSection
        element={el}
        onUpdate={update}
      />
      <ButtonStyleSection
        element={el}
        onUpdate={update}
      />
      <CardModalSection
        element={el}
        onUpdate={update}
      />
    </Panel>
  )
}

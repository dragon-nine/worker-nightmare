import { Panel, PanelTitle, Field, NumInput, BgSelect, type BgType } from './shared'

interface ScreenSettingsPanelProps {
  padding: { top: number; right: number; bottom: number; left: number }
  onPaddingUpdate: (patch: Partial<{ top: number; right: number; bottom: number; left: number }>) => void
  bgType: BgType
  bgColor: string
  bgGradient: string
  bgAssetKey: string
  onBgUpdate: (patch: { bgType?: BgType; bgColor?: string; bgGradient?: string; bgAssetKey?: string }) => void
  onOpenAssetPicker: (target: 'bg') => void
}

export function ScreenSettingsPanel({
  padding, onPaddingUpdate,
  bgType, bgColor, bgGradient, bgAssetKey, onBgUpdate, onOpenAssetPicker,
}: ScreenSettingsPanelProps) {
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

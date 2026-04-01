import { ComponentBlock, Preview } from './shared'
import CircleButton from '../../components/common/CircleButton'
import CloseButton from '../../components/common/CloseButton'
import GaugeBar from '../../components/common/GaugeBar'
import ToggleSwitch from '../../components/common/ToggleSwitch'
import { typeScale } from '../../components/common/design-tokens'
import type { DesignSpec, TypeScaleKey } from '../../components/common/design-spec'

/* ═══════════════════════════════════════════
   5. COMPONENTS
   ═══════════════════════════════════════════ */

export type UpdateFn = <K extends keyof DesignSpec>(key: K, partial: Partial<DesignSpec[K]>) => void

/** typeScale 키에서 fontSize, stroke 가져오기 */
export function getScale(key: TypeScaleKey) {
  return typeScale[key]
}

export function ComponentsSection({ spec }: { spec: DesignSpec; update: UpdateFn }) {
  const g = spec.gaugeBar

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
      {/* CircleButton */}
      <ComponentBlock
        name="CircleButton"
        category="Button"
        desc="원형 아이콘 버튼. 플레이, 회전, 일시정지 등 단일 액션에 사용."
        preview={
          <Preview bg="#111">
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <CircleButton icon="rotate" size={80} />
              <CircleButton icon="play" size={80} />
              <CircleButton icon="pause" size={52} />
            </div>
          </Preview>
        }
        controls={null}
        tokens={['blueGray', 'radius.full']}
      />

      {/* CloseButton */}
      <ComponentBlock
        name="CloseButton"
        category="Button"
        desc="모달 닫기 버튼. 검정 원형 배경 + 굵은 X 아이콘."
        preview={
          <Preview bg="#2a292e">
            <CloseButton size={32} />
          </Preview>
        }
        controls={null}
        tokens={['black', 'white', 'radius.full']}
      />

      {/* GaugeBar */}
      <ComponentBlock
        name="GaugeBar"
        category="Indicator"
        desc="HP/체력 게이지 바. 대각선 줄무늬 패턴으로 진행 상태 표시."
        preview={
          <Preview bg="#111">
            <GaugeBar value={0.7} width={300} height={g.height} fillColor={g.fillColor} />
          </Preview>
        }
        controls={null}
        tokens={['red', 'radius.sm']}
      />

      {/* ToggleSwitch */}
      <ComponentBlock
        name="ToggleSwitch"
        category="Input"
        desc="토글 스위치. 설정 화면의 on/off 토글에 사용."
        preview={
          <Preview bg="#111">
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <ToggleSwitch on={false} />
              <ToggleSwitch on={true} />
            </div>
          </Preview>
        }
        controls={null}
        tokens={['black', 'steel', 'radius.full']}
      />
    </div>
  )
}

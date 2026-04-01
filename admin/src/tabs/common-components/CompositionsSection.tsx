import { useState } from 'react'
import { ComponentBlock, Preview, InputRow, ScaleField, ColorField, NumField, labelStyle, inputStyle } from './shared'
import { getScale, type UpdateFn } from './ComponentsSection'
import MainTitle from '../../components/common/MainTitle'
import ButtonGuide from '../../components/common/ButtonGuide'
import ChallengeModal from '../../components/common/ChallengeModal'
import type { DesignSpec } from '../../components/common/design-spec'

/* ═══════════════════════════════════════════
   6. COMPOSITIONS
   ═══════════════════════════════════════════ */

export function CompositionsSection({ spec, update }: { spec: DesignSpec; update: UpdateFn }) {
  const [line1, setLine1] = useState('직장인 잔혹사')
  const [line2, setLine2] = useState('당신의 하루를 견뎌내세요...')
  const t = spec.mainTitle
  const t1s = getScale(t.line1Scale)
  const t2s = getScale(t.line2Scale)
  const m = spec.challengeModal
  const [msg, setMsg] = useState("퇴근 직전 1000에서 '잠깐만' 당했다.\n분하면 도전해봐")
  const [guideText, setGuideText] = useState('앞으로 한 칸 이동!')
  const [guideDir, setGuideDir] = useState<'left' | 'right' | 'up' | 'down'>('right')
  const [guideColor, setGuideColor] = useState('#00e5ff')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
      {/* MainTitle */}
      <ComponentBlock
        name="MainTitle"
        category="Composition"
        desc="메인 타이틀 텍스트. 3중 레이어 (외곽 흰색 → 내곽 검정 → 그라데이션 fill)로 임팩트 있는 타이틀 구현."
        preview={
          <Preview bg="linear-gradient(to bottom, #2a0c10, #000)" minH={160}>
            <MainTitle line1={line1} line2={line2} line1Size={t1s.fontSize} line2Size={t2s.fontSize} gradientFrom={t.gradientFrom} gradientTo={t.gradientTo} strokeWidth={t1s.stroke} line2Color={t.line2Color} />
          </Preview>
        }
        original="/game01/main-screen/main-text.png"
        originalBg="linear-gradient(to bottom, #2a0c10, #000)"
        controls={
          <>
            <InputRow label="Line 1" value={line1} onChange={setLine1} />
            <InputRow label="Line 2" value={line2} onChange={setLine2} />
            <ScaleField label="Line 1 Scale" value={t.line1Scale} onChange={(v) => update('mainTitle', { line1Scale: v })} />
            <ScaleField label="Line 2 Scale" value={t.line2Scale} onChange={(v) => update('mainTitle', { line2Scale: v })} />
            <ColorField label="Grad From" value={t.gradientFrom} onChange={(v) => update('mainTitle', { gradientFrom: v })} />
            <ColorField label="Grad To" value={t.gradientTo} onChange={(v) => update('mainTitle', { gradientTo: v })} />
            <ColorField label="Line 2" value={t.line2Color} onChange={(v) => update('mainTitle', { line2Color: v })} />
          </>
        }
        tokens={[t.line1Scale, t.line2Scale, 'blue → blueLight']}
      />

      {/* ChallengeModal */}
      <ComponentBlock
        name="ChallengeModal"
        category="Composition"
        desc="도전장 모달. ScoreDisplay + MessageCard + CTAButton을 조합한 풀스크린 오버레이."
        preview={
          <Preview bg="rgba(0,0,0,0.7)" minH={500}>
            <ChallengeModal score={1000} message={msg} style={{ width: m.width, borderRadius: m.borderRadius, padding: `${m.paddingY}px ${m.paddingX}px`, gap: m.gap, backgroundColor: m.bgColor }} />
          </Preview>
        }
        controls={
          <>
            <NumField label="Width" value={m.width} onChange={(v) => update('challengeModal', { width: v })} min={260} max={400} />
            <NumField label="Border Radius" value={m.borderRadius} onChange={(v) => update('challengeModal', { borderRadius: v })} max={40} />
            <NumField label="Padding X" value={m.paddingX} onChange={(v) => update('challengeModal', { paddingX: v })} max={40} />
            <NumField label="Padding Y" value={m.paddingY} onChange={(v) => update('challengeModal', { paddingY: v })} max={40} />
            <NumField label="Gap" value={m.gap} onChange={(v) => update('challengeModal', { gap: v })} max={32} />
            <ScaleField label="Score Scale" value={m.scoreScale} onChange={(v) => update('challengeModal', { scoreScale: v })} />
            <ScaleField label="Message Scale" value={m.messageScale} onChange={(v) => update('challengeModal', { messageScale: v })} />
            <ScaleField label="CTA Scale" value={m.ctaScale} onChange={(v) => update('challengeModal', { ctaScale: v })} />
            <ColorField label="Background" value={m.bgColor} onChange={(v) => update('challengeModal', { bgColor: v })} />
            <label style={labelStyle}><span>Message</span><textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></label>
          </>
        }
        tokens={[m.scoreScale, m.messageScale, m.ctaScale, 'modalBg', 'radius.xl']}
      />

      {/* ButtonGuide */}
      <ComponentBlock
        name="ButtonGuide"
        category="Composition"
        desc="튜토리얼 가이드. 텍스트 + 바운싱 화살표 + 글로우 버튼으로 사용자 시선을 유도."
        preview={
          <Preview bg="#111" minH={160}>
            <ButtonGuide text={guideText} arrowDirection={guideDir} glowColor={guideColor} buttonSize={72} />
          </Preview>
        }
        controls={
          <>
            <InputRow label="Text" value={guideText} onChange={setGuideText} />
            <label style={labelStyle}>
              <span>Direction</span>
              <select value={guideDir} onChange={(e) => setGuideDir(e.target.value as typeof guideDir)} style={inputStyle}>
                <option value="right">→ Right</option><option value="left">← Left</option>
                <option value="up">↑ Up</option><option value="down">↓ Down</option>
              </select>
            </label>
            <ColorField label="Glow" value={guideColor} onChange={setGuideColor} />
          </>
        }
        tokens={['cyan', 'guide', 'radius.full']}
      />
    </div>
  )
}

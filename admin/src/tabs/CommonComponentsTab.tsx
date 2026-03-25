import { useState, useEffect, useCallback } from 'react'
import DarkButton from '../components/common/DarkButton'
import RedButton from '../components/common/RedButton'
import IconButton from '../components/common/IconButton'
import CircleButton from '../components/common/CircleButton'
import StoneButton from '../components/common/StoneButton'
import CloseButton from '../components/common/CloseButton'
import GaugeBar from '../components/common/GaugeBar'
import MainTitle from '../components/common/MainTitle'
import ButtonGuide from '../components/common/ButtonGuide'
import ChallengeModal from '../components/common/ChallengeModal'
import { colors, radius, font, textStyles } from '../components/common/design-tokens'
import { DEFAULT_SPEC, R2_KEY, type DesignSpec } from '../components/common/design-spec'
import { getJson, putJson } from '../api'

type Tab = 'colors' | 'typo' | 'buttons' | 'ui' | 'compositions'

const TABS: { id: Tab; label: string }[] = [
  { id: 'colors', label: 'Colors' },
  { id: 'typo', label: 'Typography' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'ui', label: 'UI' },
  { id: 'compositions', label: 'Compositions' },
]

export default function CommonComponentsTab() {
  const [tab, setTab] = useState<Tab>('colors')
  const [spec, setSpec] = useState<DesignSpec>(DEFAULT_SPEC)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState('')

  // 로드
  useEffect(() => {
    getJson<DesignSpec>(R2_KEY).then((data) => {
      if (data) setSpec({ ...DEFAULT_SPEC, ...data })
    }).catch(() => {})
  }, [])

  // 저장
  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await putJson(R2_KEY, spec)
      setLastSaved(new Date().toLocaleTimeString())
    } catch { /* ignore */ }
    setSaving(false)
  }, [spec])

  const update = <K extends keyof DesignSpec>(key: K, partial: Partial<DesignSpec[K]>) => {
    setSpec((prev) => ({ ...prev, [key]: { ...prev[key], ...partial } }))
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Design System</h2>
        <button
          onClick={handleSave}
          style={{
            padding: '5px 16px', borderRadius: 6, border: '1px solid #555',
            background: saving ? '#333' : '#2563eb', color: '#fff', fontSize: 13,
            fontWeight: 600, cursor: saving ? 'default' : 'pointer',
          }}
        >
          {saving ? '저장 중...' : '스펙 저장'}
        </button>
        {lastSaved && <span style={{ fontSize: 12, color: '#666' }}>저장됨 {lastSaved}</span>}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #333', paddingBottom: 8 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 16px', borderRadius: 8, border: 'none',
              background: tab === t.id ? '#fff' : 'transparent',
              color: tab === t.id ? '#000' : '#888',
              fontWeight: tab === t.id ? 700 : 400, fontSize: 14, cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'colors' && <ColorsTab />}
      {tab === 'typo' && <TypographyTab />}
      {tab === 'buttons' && <ButtonsTab spec={spec} update={update} />}
      {tab === 'ui' && <UITab spec={spec} update={update} />}
      {tab === 'compositions' && <CompositionsTab spec={spec} update={update} />}
    </div>
  )
}

/* ═══════════ Spec Editor Helper ═══════════ */
function NumField({ label, value, onChange, min = 0, max = 100, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number
}) {
  return (
    <label style={labelStyle}>
      <span>{label}: {value}{typeof value === 'number' && !label.includes('Weight') ? 'px' : ''}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ ...labelStyle, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <span>{label}</span>
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#777' }}>{value}</span>
    </label>
  )
}

/* ═══════════ Colors Tab ═══════════ */
const COLOR_GROUPS: { title: string; desc: string; items: { name: string; hex: string; usage: string }[] }[] = [
  {
    title: '배경 (Background)',
    desc: '버튼, 모달, 카드 배경',
    items: [
      { name: 'dark', hex: colors.dark, usage: 'btn-home 배경' },
      { name: 'darker', hex: colors.darker, usage: '멘트 카드, btn-challenge/ranking' },
      { name: 'modalBg', hex: colors.modalBg, usage: '도전장 모달 배경' },
      { name: 'black', hex: colors.black, usage: 'CTA 버튼, 텍스트 스트로크' },
    ],
  },
  {
    title: '강조 (Accent)',
    desc: '중요한 액션, 타이틀 하이라이트',
    items: [
      { name: 'red', hex: colors.red, usage: 'btn-revive 메인' },
      { name: 'redLight', hex: colors.redLight, usage: 'btn-revive 하이라이트' },
      { name: 'redDark', hex: colors.redDark, usage: 'btn-revive 그림자/테두리' },
      { name: 'cyan', hex: colors.cyan, usage: '튜토리얼 글로우' },
      { name: 'blue', hex: colors.blue, usage: '타이틀 그라데이션 시작' },
      { name: 'blueLight', hex: colors.blueLight, usage: '타이틀 그라데이션 끝' },
    ],
  },
  {
    title: '중성 (Neutral)',
    desc: '원형 버튼, 돌 버튼, 비활성 텍스트',
    items: [
      { name: 'blueGray', hex: colors.blueGray, usage: 'CircleButton/StoneButton' },
      { name: 'blueGrayLight', hex: colors.blueGrayLight, usage: '하이라이트' },
      { name: 'blueGrayDark', hex: colors.blueGrayDark, usage: '그림자' },
      { name: 'gray', hex: colors.gray, usage: '멘트 변경 버튼' },
      { name: 'grayText', hex: colors.grayText, usage: '비활성 텍스트' },
      { name: 'white', hex: colors.white, usage: '텍스트, 테두리' },
    ],
  },
]

function ColorsTab() {
  const [copied, setCopied] = useState('')
  const handleCopy = (hex: string) => { navigator.clipboard.writeText(hex); setCopied(hex); setTimeout(() => setCopied(''), 1500) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      {COLOR_GROUPS.map((g) => (
        <div key={g.title}>
          <h3 style={sectionTitle}>{g.title}</h3>
          <p style={{ fontSize: 13, color: '#777', marginBottom: 12 }}>{g.desc}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {g.items.map((c) => (
              <div key={c.name} onClick={() => handleCopy(c.hex)} style={{ cursor: 'pointer', borderRadius: 10, border: '1px solid #333', overflow: 'hidden' }}>
                <div style={{ height: 56, background: c.hex, borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {copied === c.hex && <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 4 }}>Copied!</span>}
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#eee', fontFamily: 'monospace' }}>{c.hex}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#aaa', marginTop: 2 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{c.usage}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div>
        <h3 style={sectionTitle}>Border Radius</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(radius).map(([name, val]) => (
            <div key={name} style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, background: colors.blueGray, borderRadius: val, border: `2px solid ${colors.blueGrayLight}` }} />
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{name}</div>
              <div style={{ fontSize: 11, color: '#666' }}>{val}px</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 style={sectionTitle}>Font</h3>
        <div style={{ fontFamily: font.primary, fontWeight: font.weight.black, fontSize: 28, color: '#fff' }}>Black Han Sans (900)</div>
        <div style={{ fontFamily: font.primary, fontWeight: font.weight.bold, fontSize: 20, color: '#ccc', marginTop: 4 }}>Bold (700)</div>
        <div style={{ fontSize: 12, color: '#666', fontFamily: 'monospace', marginTop: 4 }}>{font.primary}</div>
      </div>
    </div>
  )
}

/* ═══════════ Buttons Tab ═══════════ */
type UpdateFn = <K extends keyof DesignSpec>(key: K, partial: Partial<DesignSpec[K]>) => void

function ButtonsTab({ spec, update }: { spec: DesignSpec; update: UpdateFn }) {
  const d = spec.darkButton
  const r = spec.redButton
  const ic = spec.iconButton
  const st = spec.stoneButton
  const cb = spec.circleButton

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      {/* DarkButton */}
      <div>
        <h3 style={sectionTitle}>DarkButton</h3>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 360px' }}>
            <Preview bg="#fff">
              <DarkButton fontSize={d.fontSize} style={{ borderRadius: d.borderRadius, border: `${d.borderWidth}px solid ${d.borderColor}`, padding: `${d.paddingY}px ${d.paddingX}px`, WebkitTextStroke: `${d.strokeWidth}px #000`, backgroundColor: d.bgColor }}>홈으로 가기</DarkButton>
            </Preview>
            <OriginalImg src="/game01/game-over-screen/btn-home.png" />
          </div>
          <div style={controlsBox}>
            <NumField label="Font Size" value={d.fontSize} onChange={(v) => update('darkButton', { fontSize: v })} min={16} max={48} />
            <NumField label="Stroke" value={d.strokeWidth} onChange={(v) => update('darkButton', { strokeWidth: v })} min={0} max={8} step={0.5} />
            <NumField label="Border Radius" value={d.borderRadius} onChange={(v) => update('darkButton', { borderRadius: v })} max={40} />
            <NumField label="Border Width" value={d.borderWidth} onChange={(v) => update('darkButton', { borderWidth: v })} max={10} />
            <NumField label="Padding X" value={d.paddingX} onChange={(v) => update('darkButton', { paddingX: v })} max={60} />
            <NumField label="Padding Y" value={d.paddingY} onChange={(v) => update('darkButton', { paddingY: v })} max={30} />
            <ColorField label="Background" value={d.bgColor} onChange={(v) => update('darkButton', { bgColor: v })} />
            <ColorField label="Border" value={d.borderColor} onChange={(v) => update('darkButton', { borderColor: v })} />
          </div>
        </div>
      </div>

      {/* RedButton */}
      <div>
        <h3 style={sectionTitle}>RedButton</h3>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 360px' }}>
            <Preview bg="#111">
              <RedButton fontSize={r.fontSize} style={{ borderRadius: r.borderRadius, border: `${r.borderWidth}px solid ${r.borderColor}`, padding: `${r.paddingY}px ${r.paddingX}px`, WebkitTextStroke: `${r.strokeWidth}px #000`, background: `linear-gradient(135deg, ${r.gradientFrom}, ${r.gradientTo})` }}>광고보고 부활</RedButton>
            </Preview>
            <OriginalImg src="/game01/game-over-screen/btn-revive.png" />
          </div>
          <div style={controlsBox}>
            <NumField label="Font Size" value={r.fontSize} onChange={(v) => update('redButton', { fontSize: v })} min={16} max={48} />
            <NumField label="Stroke" value={r.strokeWidth} onChange={(v) => update('redButton', { strokeWidth: v })} min={0} max={8} step={0.5} />
            <NumField label="Border Radius" value={r.borderRadius} onChange={(v) => update('redButton', { borderRadius: v })} max={40} />
            <NumField label="Padding X" value={r.paddingX} onChange={(v) => update('redButton', { paddingX: v })} max={60} />
            <NumField label="Padding Y" value={r.paddingY} onChange={(v) => update('redButton', { paddingY: v })} max={30} />
            <ColorField label="Gradient From" value={r.gradientFrom} onChange={(v) => update('redButton', { gradientFrom: v })} />
            <ColorField label="Gradient To" value={r.gradientTo} onChange={(v) => update('redButton', { gradientTo: v })} />
            <ColorField label="Border" value={r.borderColor} onChange={(v) => update('redButton', { borderColor: v })} />
          </div>
        </div>
      </div>

      {/* IconButton */}
      <div>
        <h3 style={sectionTitle}>IconButton</h3>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 360px' }}>
            <Preview bg="#111">
              <div style={{ display: 'flex', gap: 12 }}>
                <IconButton icon="🔥" fontSize={ic.fontSize} style={{ borderRadius: ic.borderRadius, border: `${ic.borderWidth}px solid ${ic.borderColor}`, outline: `2px solid ${ic.outlineColor}`, padding: `${ic.paddingY}px ${ic.paddingX}px`, backgroundColor: ic.bgColor, WebkitTextStroke: `${ic.strokeWidth}px #000` }}>도전장 보내기</IconButton>
                <IconButton icon="🏆" fontSize={ic.fontSize} style={{ borderRadius: ic.borderRadius, border: `${ic.borderWidth}px solid ${ic.borderColor}`, outline: `2px solid ${ic.outlineColor}`, padding: `${ic.paddingY}px ${ic.paddingX}px`, backgroundColor: ic.bgColor, WebkitTextStroke: `${ic.strokeWidth}px #000` }}>랭킹 보기</IconButton>
              </div>
            </Preview>
          </div>
          <div style={controlsBox}>
            <NumField label="Font Size" value={ic.fontSize} onChange={(v) => update('iconButton', { fontSize: v })} min={12} max={36} />
            <NumField label="Stroke" value={ic.strokeWidth} onChange={(v) => update('iconButton', { strokeWidth: v })} min={0} max={6} step={0.5} />
            <NumField label="Border Radius" value={ic.borderRadius} onChange={(v) => update('iconButton', { borderRadius: v })} max={30} />
            <NumField label="Padding X" value={ic.paddingX} onChange={(v) => update('iconButton', { paddingX: v })} max={40} />
            <NumField label="Padding Y" value={ic.paddingY} onChange={(v) => update('iconButton', { paddingY: v })} max={24} />
            <ColorField label="Background" value={ic.bgColor} onChange={(v) => update('iconButton', { bgColor: v })} />
            <ColorField label="Border" value={ic.borderColor} onChange={(v) => update('iconButton', { borderColor: v })} />
          </div>
        </div>
      </div>

      {/* StoneButton */}
      <div>
        <h3 style={sectionTitle}>StoneButton</h3>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 360px' }}>
            <Preview bg="#111">
              <StoneButton fontSize={st.fontSize} style={{ borderRadius: st.borderRadius, border: `${st.borderWidth}px solid ${st.borderColor}`, padding: `${st.paddingY}px ${st.paddingX}px`, WebkitTextStroke: `${st.strokeWidth}px #000` }}>퇴근하기</StoneButton>
            </Preview>
            <OriginalImg src="/game01/main-screen/main-btn.png" />
          </div>
          <div style={controlsBox}>
            <NumField label="Font Size" value={st.fontSize} onChange={(v) => update('stoneButton', { fontSize: v })} min={16} max={40} />
            <NumField label="Stroke" value={st.strokeWidth} onChange={(v) => update('stoneButton', { strokeWidth: v })} min={0} max={8} step={0.5} />
            <NumField label="Border Radius" value={st.borderRadius} onChange={(v) => update('stoneButton', { borderRadius: v })} max={40} />
            <NumField label="Padding X" value={st.paddingX} onChange={(v) => update('stoneButton', { paddingX: v })} max={60} />
            <NumField label="Padding Y" value={st.paddingY} onChange={(v) => update('stoneButton', { paddingY: v })} max={30} />
            <ColorField label="Background" value={st.bgColor} onChange={(v) => update('stoneButton', { bgColor: v })} />
            <ColorField label="Border" value={st.borderColor} onChange={(v) => update('stoneButton', { borderColor: v })} />
          </div>
        </div>
      </div>

      {/* CircleButton */}
      <div>
        <h3 style={sectionTitle}>CircleButton</h3>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 360px' }}>
            <Preview bg="#111">
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <CircleButton icon="rotate" size={cb.size} />
                <CircleButton icon="play" size={cb.size} />
                <CircleButton icon="pause" size={Math.round(cb.size * 0.65)} />
              </div>
            </Preview>
          </div>
          <div style={controlsBox}>
            <NumField label="Size" value={cb.size} onChange={(v) => update('circleButton', { size: v })} min={40} max={120} />
          </div>
        </div>
      </div>

      {/* CloseButton */}
      <div>
        <h3 style={sectionTitle}>CloseButton</h3>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 360px' }}>
            <Preview bg="#2a292e">
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <CloseButton size={32} />
                <CloseButton size={40} />
                <CloseButton size={24} />
              </div>
            </Preview>
            <p style={{ fontSize: 12, color: '#777', marginTop: 8 }}>검정 원형 배경 + 굵은 ✕ — 모달 우상단에 사용</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════ UI Tab ═══════════ */
function UITab({ spec, update }: { spec: DesignSpec; update: UpdateFn }) {
  const [gaugeVal, setGaugeVal] = useState(0.7)
  const g = spec.gaugeBar

  return (
    <div>
      <h3 style={sectionTitle}>GaugeBar</h3>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 360px' }}>
          <Preview bg="#111">
            <GaugeBar value={gaugeVal} width={300} height={g.height} fillColor={g.fillColor} />
          </Preview>
        </div>
        <div style={controlsBox}>
          <NumField label="Value" value={Math.round(gaugeVal * 100)} onChange={(v) => setGaugeVal(v / 100)} max={100} />
          <NumField label="Height" value={g.height} onChange={(v) => update('gaugeBar', { height: v })} min={16} max={48} />
          <ColorField label="Fill Color" value={g.fillColor} onChange={(v) => update('gaugeBar', { fillColor: v })} />
        </div>
      </div>
    </div>
  )
}

/* ═══════════ Typography Tab ═══════════ */
function TypographyTab() {
  const [sampleText, setSampleText] = useState('직장인 잔혹사')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label style={labelStyle}>
        <span>Sample Text</span>
        <input type="text" value={sampleText} onChange={(e) => setSampleText(e.target.value)} style={inputStyle} />
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
        {Object.entries(textStyles).map(([key, ts]) => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '12px 16px',
              borderRadius: 8,
              background: '#1a1a1f',
              border: '1px solid #2a2a2f',
            }}
          >
            {/* Preview */}
            <div style={{
              flex: '1 1 300px',
              fontFamily: font.primary,
              fontSize: ts.fontSize,
              fontWeight: ts.fontWeight,
              color: ts.color === 'gradient' ? undefined : ts.color,
              WebkitTextStroke: ts.strokeWidth ? `${ts.strokeWidth}px #000` : undefined,
              paintOrder: 'stroke fill',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              ...(ts.color === 'gradient' ? {
                background: `linear-gradient(to bottom, ${colors.blue}, ${colors.blueLight})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              } : {}),
            }}>
              {sampleText}
            </div>

            {/* Spec info */}
            <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#ddd' }}>{key}</span>
              <span style={{ fontSize: 11, color: '#888' }}>{ts.usage}</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                <Tag>{ts.fontSize}px</Tag>
                <Tag>w{ts.fontWeight}</Tag>
                {ts.strokeWidth > 0 && <Tag>stroke {ts.strokeWidth}</Tag>}
                {ts.outerStrokeWidth > 0 && <Tag>outer {ts.outerStrokeWidth}</Tag>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10, color: '#aaa', background: '#333', padding: '1px 6px', borderRadius: 4 }}>{children}</span>
}

/* ═══════════ Compositions Tab ═══════════ */
function CompositionsTab({ spec, update }: { spec: DesignSpec; update: UpdateFn }) {
  const [line1, setLine1] = useState('직장인 잔혹사')
  const [line2, setLine2] = useState('당신의 하루를 견뎌내세요...')
  const t = spec.mainTitle
  const m = spec.challengeModal
  const [msg, setMsg] = useState("퇴근 직전 1000에서 '잠깐만' 당했다.\n분하면 도전해봐")
  const [guideText, setGuideText] = useState('앞으로 한 칸 이동!')
  const [guideDir, setGuideDir] = useState<'left' | 'right' | 'up' | 'down'>('right')
  const [guideColor, setGuideColor] = useState('#00e5ff')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      {/* MainTitle */}
      <div>
        <h3 style={sectionTitle}>MainTitle (메인 타이틀)</h3>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 400px' }}>
            <Preview bg="linear-gradient(to bottom, #2a0c10, #000)">
              <MainTitle line1={line1} line2={line2} line1Size={t.line1Size} line2Size={t.line2Size} gradientFrom={t.gradientFrom} gradientTo={t.gradientTo} strokeWidth={t.strokeWidth} line2Color={t.line2Color} />
            </Preview>
            <OriginalImg src="/game01/main-screen/main-text.png" bg="linear-gradient(to bottom, #2a0c10, #000)" />
          </div>
          <div style={controlsBox}>
            <InputRow label="Line 1" value={line1} onChange={setLine1} />
            <InputRow label="Line 2" value={line2} onChange={setLine2} />
            <NumField label="Line 1 Size" value={t.line1Size} onChange={(v) => update('mainTitle', { line1Size: v })} min={24} max={80} />
            <NumField label="Line 2 Size" value={t.line2Size} onChange={(v) => update('mainTitle', { line2Size: v })} min={12} max={40} />
            <NumField label="Stroke" value={t.strokeWidth} onChange={(v) => update('mainTitle', { strokeWidth: v })} min={0} max={12} />
            <ColorField label="Grad From" value={t.gradientFrom} onChange={(v) => update('mainTitle', { gradientFrom: v })} />
            <ColorField label="Grad To" value={t.gradientTo} onChange={(v) => update('mainTitle', { gradientTo: v })} />
            <ColorField label="Line 2" value={t.line2Color} onChange={(v) => update('mainTitle', { line2Color: v })} />
          </div>
        </div>
      </div>

      {/* ChallengeModal */}
      <div>
        <h3 style={sectionTitle}>ChallengeModal (도전장 보내기)</h3>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 400px' }}>
            <Preview bg="rgba(0,0,0,0.7)" minH={500}>
              <ChallengeModal score={1000} message={msg} style={{ width: m.width, borderRadius: m.borderRadius, padding: `${m.paddingY}px ${m.paddingX}px`, gap: m.gap, backgroundColor: m.bgColor }} />
            </Preview>
          </div>
          <div style={controlsBox}>
            <NumField label="Width" value={m.width} onChange={(v) => update('challengeModal', { width: v })} min={260} max={400} />
            <NumField label="Border Radius" value={m.borderRadius} onChange={(v) => update('challengeModal', { borderRadius: v })} max={40} />
            <NumField label="Padding X" value={m.paddingX} onChange={(v) => update('challengeModal', { paddingX: v })} max={40} />
            <NumField label="Padding Y" value={m.paddingY} onChange={(v) => update('challengeModal', { paddingY: v })} max={40} />
            <NumField label="Gap" value={m.gap} onChange={(v) => update('challengeModal', { gap: v })} max={32} />
            <NumField label="Score Font" value={m.scoreFontSize} onChange={(v) => update('challengeModal', { scoreFontSize: v })} min={36} max={96} />
            <NumField label="CTA Font" value={m.ctaFontSize} onChange={(v) => update('challengeModal', { ctaFontSize: v })} min={12} max={24} />
            <ColorField label="Background" value={m.bgColor} onChange={(v) => update('challengeModal', { bgColor: v })} />
            <label style={labelStyle}><span>Message</span><textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></label>
          </div>
        </div>
      </div>

      {/* ButtonGuide */}
      <div>
        <h3 style={sectionTitle}>ButtonGuide (튜토리얼 가이드)</h3>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 400px' }}>
            <Preview bg="#111" minH={160}>
              <ButtonGuide text={guideText} arrowDirection={guideDir} glowColor={guideColor} buttonSize={72} />
            </Preview>
          </div>
          <div style={controlsBox}>
            <InputRow label="Text" value={guideText} onChange={setGuideText} />
            <label style={labelStyle}>
              <span>Direction</span>
              <select value={guideDir} onChange={(e) => setGuideDir(e.target.value as typeof guideDir)} style={inputStyle}>
                <option value="right">→ Right</option><option value="left">← Left</option>
                <option value="up">↑ Up</option><option value="down">↓ Down</option>
              </select>
            </label>
            <ColorField label="Glow" value={guideColor} onChange={setGuideColor} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════ 공통 헬퍼 ═══════════ */
function Preview({ bg, minH, children }: { bg: string; minH?: number; children: React.ReactNode }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: minH ?? 100 }}>
      {children}
    </div>
  )
}

function OriginalImg({ src, maxW, bg }: { src: string; maxW?: number; bg?: string }) {
  return (
    <div style={{ marginTop: 8 }}>
      <span style={{ fontSize: 12, color: '#555' }}>Original</span>
      <div style={{ background: bg || '#ffffff', borderRadius: 8, padding: 12, marginTop: 4, display: 'inline-flex', border: '1px solid #333' }}>
        <img src={src} alt="" style={{ maxWidth: maxW ?? '100%', height: 'auto', maxHeight: 80 }} />
      </div>
    </div>
  )
}

function InputRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={labelStyle}><span>{label}</span><input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} /></label>
  )
}

const sectionTitle: React.CSSProperties = { marginBottom: 12, fontSize: 16, fontWeight: 600, color: '#aaa', borderBottom: '1px solid #333', paddingBottom: 6 }
const controlsBox: React.CSSProperties = { flex: '0 0 260px', display: 'flex', flexDirection: 'column', gap: 10 }
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#ccc' }
const inputStyle: React.CSSProperties = { padding: '6px 10px', borderRadius: 6, border: '1px solid #444', background: '#1a1a1a', color: '#fff', fontSize: 14 }

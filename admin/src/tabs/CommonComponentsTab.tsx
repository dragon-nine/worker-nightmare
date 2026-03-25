import { useState } from 'react'
import DarkButton from '../components/common/DarkButton'
import RedButton from '../components/common/RedButton'
import IconButton from '../components/common/IconButton'
import CircleButton from '../components/common/CircleButton'
import StoneButton from '../components/common/StoneButton'
import GaugeBar from '../components/common/GaugeBar'
import MainTitle from '../components/common/MainTitle'
import ButtonGuide from '../components/common/ButtonGuide'
import ChallengeModal from '../components/common/ChallengeModal'
import { colors, radius, font } from '../components/common/design-tokens'

type Tab = 'colors' | 'buttons' | 'ui' | 'text' | 'modal' | 'guide'

const TABS: { id: Tab; label: string }[] = [
  { id: 'colors', label: 'Colors' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'ui', label: 'UI' },
  { id: 'text', label: 'Text' },
  { id: 'modal', label: 'Modal' },
  { id: 'guide', label: 'Guide' },
]

export default function CommonComponentsTab() {
  const [tab, setTab] = useState<Tab>('colors')

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>Design System</h2>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #333', paddingBottom: 8 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              border: 'none',
              background: tab === t.id ? '#fff' : 'transparent',
              color: tab === t.id ? '#000' : '#888',
              fontWeight: tab === t.id ? 700 : 400,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'colors' && <ColorsTab />}
      {tab === 'buttons' && <ButtonsTab />}
      {tab === 'ui' && <UITab />}
      {tab === 'text' && <TextTab />}
      {tab === 'modal' && <ModalTab />}
      {tab === 'guide' && <GuideTab />}
    </div>
  )
}

/* ═══════════ Colors Tab ═══════════ */

const COLOR_GROUPS: { title: string; desc: string; items: { name: string; hex: string; usage: string }[] }[] = [
  {
    title: '배경 (Background)',
    desc: '버튼, 모달, 카드 배경에 사용',
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
      { name: 'blueGray', hex: colors.blueGray, usage: 'CircleButton/StoneButton 메인' },
      { name: 'blueGrayLight', hex: colors.blueGrayLight, usage: '하이라이트' },
      { name: 'blueGrayDark', hex: colors.blueGrayDark, usage: '그림자' },
      { name: 'gray', hex: colors.gray, usage: '멘트 변경 버튼 배경' },
      { name: 'grayText', hex: colors.grayText, usage: '비활성 텍스트' },
      { name: 'white', hex: colors.white, usage: '텍스트, 게이지 테두리' },
    ],
  },
]

function ColorsTab() {
  const [copied, setCopied] = useState('')

  const handleCopy = (hex: string) => {
    navigator.clipboard.writeText(hex)
    setCopied(hex)
    setTimeout(() => setCopied(''), 1500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      {COLOR_GROUPS.map((group) => (
        <div key={group.title}>
          <h3 style={sectionTitle}>{group.title}</h3>
          <p style={{ fontSize: 13, color: '#777', marginBottom: 12 }}>{group.desc}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {group.items.map((c) => (
              <div
                key={c.name}
                onClick={() => handleCopy(c.hex)}
                style={{
                  cursor: 'pointer',
                  borderRadius: 10,
                  border: '1px solid #333',
                  overflow: 'hidden',
                  transition: 'transform 0.1s',
                }}
              >
                {/* Color swatch */}
                <div style={{
                  height: 56,
                  background: c.hex,
                  borderBottom: '1px solid #333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {copied === c.hex && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: c.hex === '#ffffff' || c.hex === '#7ec8e3' || c.hex === '#00e5ff' ? '#000' : '#fff', background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: 4 }}>Copied!</span>
                  )}
                </div>
                {/* Info */}
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

      {/* Radius & Font tokens */}
      <div>
        <h3 style={sectionTitle}>Border Radius</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(radius).map(([name, val]) => (
            <div key={name} style={{ textAlign: 'center' }}>
              <div style={{
                width: 56,
                height: 56,
                background: colors.blueGray,
                borderRadius: val,
                border: `2px solid ${colors.blueGrayLight}`,
              }} />
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{name}</div>
              <div style={{ fontSize: 11, color: '#666' }}>{val}px</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 style={sectionTitle}>Font</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontFamily: font.primary, fontWeight: font.weight.black, fontSize: 28, color: '#fff' }}>
            Black Han Sans / GMarketSans (900)
          </div>
          <div style={{ fontFamily: font.primary, fontWeight: font.weight.bold, fontSize: 20, color: '#ccc' }}>
            Bold (700) — 서브텍스트, 버튼 라벨
          </div>
          <div style={{ fontSize: 12, color: '#666', fontFamily: 'monospace' }}>
            font-family: {font.primary}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════ Buttons Tab ═══════════ */
function ButtonsTab() {
  const [darkText, setDarkText] = useState('홈으로 가기')
  const [redText, setRedText] = useState('광고보고 부활')
  const [stoneText, setStoneText] = useState('퇴근하기')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      {/* Dark Button */}
      <Section title="DarkButton" original="/game01/game-over-screen/btn-home.png">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <Preview bg="#fff">
              <DarkButton>{darkText}</DarkButton>
            </Preview>
            <InputRow label="Text" value={darkText} onChange={setDarkText} />
          </div>
        </div>
      </Section>

      {/* Red Button */}
      <Section title="RedButton" original="/game01/game-over-screen/btn-revive.png">
        <Preview bg="#111">
          <RedButton>{redText}</RedButton>
        </Preview>
        <InputRow label="Text" value={redText} onChange={setRedText} />
      </Section>

      {/* Icon Button */}
      <Section title="IconButton" original="">
        <Preview bg="#111">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <IconButton icon="🔥">도전장 보내기</IconButton>
            <IconButton icon="🏆">랭킹 보기</IconButton>
          </div>
        </Preview>
        <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
          <OriginalImg src="/game01/game-over-screen/btn-challenge.png" />
          <OriginalImg src="/game01/game-over-screen/btn-ranking.png" />
        </div>
      </Section>

      {/* Stone Button */}
      <Section title="StoneButton" original="/game01/main-screen/main-btn.png">
        <Preview bg="#111">
          <StoneButton>{stoneText}</StoneButton>
        </Preview>
        <InputRow label="Text" value={stoneText} onChange={setStoneText} />
      </Section>

      {/* Circle Buttons */}
      <Section title="CircleButton" original="">
        <Preview bg="#111">
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <CircleButton icon="rotate" size={70} />
            <CircleButton icon="play" size={70} />
            <CircleButton icon="pause" size={50} />
          </div>
        </Preview>
        <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
          <OriginalImg src="/game01/ui/btn-switch.png" maxW={70} />
          <OriginalImg src="/game01/ui/btn-forward.png" maxW={70} />
          <OriginalImg src="/game01/ui/btn-pause.png" maxW={50} />
        </div>
      </Section>
    </div>
  )
}

/* ═══════════ UI Tab ═══════════ */
function UITab() {
  const [gaugeVal, setGaugeVal] = useState(0.7)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      <Section title="GaugeBar" original="">
        <Preview bg="#111">
          <GaugeBar value={gaugeVal} width={300} height={28} />
        </Preview>
        <label style={labelStyle}>
          <span>Value: {Math.round(gaugeVal * 100)}%</span>
          <input type="range" min={0} max={100} value={gaugeVal * 100} onChange={(e) => setGaugeVal(+e.target.value / 100)} />
        </label>
        <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
          <OriginalImg src="/game01/ui/gauge-empty.png" maxW={300} />
          <OriginalImg src="/game01/ui/gauge-full.png" maxW={300} />
        </div>
      </Section>
    </div>
  )
}

/* ═══════════ Text Tab ═══════════ */
function TextTab() {
  const [line1, setLine1] = useState('직장인 잔혹사')
  const [line2, setLine2] = useState('당신의 하루를 견뎌내세요...')
  const [size1, setSize1] = useState(52)
  const [size2, setSize2] = useState(22)
  const [gradFrom, setGradFrom] = useState('#1a6fc4')
  const [gradTo, setGradTo] = useState('#7ec8e3')
  const [sw, setSw] = useState(6)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      <Section title="MainTitle" original="/game01/main-screen/main-text.png" originalBg="linear-gradient(to bottom, #2a0c10, #000)">
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 400px' }}>
            <Preview bg="linear-gradient(to bottom, #2a0c10, #000)">
              <MainTitle line1={line1} line2={line2} line1Size={size1} line2Size={size2} gradientFrom={gradFrom} gradientTo={gradTo} strokeWidth={sw} />
            </Preview>
          </div>
          <div style={controlsBox}>
            <InputRow label="Line 1" value={line1} onChange={setLine1} />
            <InputRow label="Line 2" value={line2} onChange={setLine2} />
            <label style={labelStyle}><span>Size 1: {size1}px</span><input type="range" min={24} max={80} value={size1} onChange={(e) => setSize1(+e.target.value)} /></label>
            <label style={labelStyle}><span>Size 2: {size2}px</span><input type="range" min={12} max={40} value={size2} onChange={(e) => setSize2(+e.target.value)} /></label>
            <label style={labelStyle}><span>Stroke: {sw}px</span><input type="range" min={0} max={12} value={sw} onChange={(e) => setSw(+e.target.value)} /></label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ ...labelStyle, flex: 1 }}><span>From</span><input type="color" value={gradFrom} onChange={(e) => setGradFrom(e.target.value)} /></label>
              <label style={{ ...labelStyle, flex: 1 }}><span>To</span><input type="color" value={gradTo} onChange={(e) => setGradTo(e.target.value)} /></label>
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}

/* ═══════════ Modal Tab ═══════════ */
function ModalTab() {
  const [score, setScore] = useState(1000)
  const [image, setImage] = useState('')
  const [msg, setMsg] = useState("퇴근 직전 1000에서 '잠깐만' 당했다.\n분하면 도전해봐")
  const [cta, setCta] = useState('카카오톡으로 도전장 보내기')
  const [refresh, setRefresh] = useState('다른 멘트로 바꾸기')

  return (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 400px' }}>
        <Preview bg="rgba(0,0,0,0.7)" minH={500}>
          <ChallengeModal score={score} imageSrc={image || undefined} message={msg} ctaText={cta} refreshText={refresh} />
        </Preview>
        <OriginalImg src="https://pub-a6e8e0aec44d4a69ae3ed4e096c5acc5.r2.dev/shared/%EC%8A%A4%ED%81%AC%EB%A6%B0%EC%83%B7%202026-03-25%20%EC%98%A4%ED%9B%84%207.58.30.png" maxW={340} />
      </div>
      <div style={controlsBox}>
        <InputRow label="Score" value={String(score)} onChange={(v) => setScore(Number(v) || 0)} />
        <InputRow label="Image URL" value={image} onChange={setImage} />
        <label style={labelStyle}><span>Message</span><textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></label>
        <InputRow label="CTA" value={cta} onChange={setCta} />
        <InputRow label="Refresh" value={refresh} onChange={setRefresh} />
      </div>
    </div>
  )
}

/* ═══════════ Guide Tab ═══════════ */
function GuideTab() {
  const [text, setText] = useState('앞으로 한 칸 이동!')
  const [dir, setDir] = useState<'left' | 'right' | 'up' | 'down'>('right')
  const [color, setColor] = useState('#00e5ff')
  const [size, setSize] = useState(72)

  return (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 400px' }}>
        <Preview bg="#111" minH={200}>
          <ButtonGuide text={text} arrowDirection={dir} glowColor={color} buttonSize={size} />
        </Preview>
        <OriginalImg src="https://pub-a6e8e0aec44d4a69ae3ed4e096c5acc5.r2.dev/shared/unnamed.jpg" maxW={280} />
      </div>
      <div style={controlsBox}>
        <InputRow label="Text" value={text} onChange={setText} />
        <label style={labelStyle}>
          <span>Direction</span>
          <select value={dir} onChange={(e) => setDir(e.target.value as typeof dir)} style={inputStyle}>
            <option value="right">→ Right</option>
            <option value="left">← Left</option>
            <option value="up">↑ Up</option>
            <option value="down">↓ Down</option>
          </select>
        </label>
        <label style={labelStyle}><span>Size: {size}px</span><input type="range" min={40} max={120} value={size} onChange={(e) => setSize(+e.target.value)} /></label>
        <label style={labelStyle}><span>Glow Color</span><input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></label>
      </div>
    </div>
  )
}

/* ═══════════ 공통 헬퍼 ═══════════ */

function Section({ title, original, originalBg, children }: { title: string; original: string; originalBg?: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={sectionTitle}>{title}</h3>
      {children}
      {original && (
        <div style={{ marginTop: 8 }}>
          <OriginalImg src={original} bg={originalBg} />
        </div>
      )}
    </div>
  )
}

function Preview({ bg, minH, children }: { bg: string; minH?: number; children: React.ReactNode }) {
  return (
    <div style={{
      background: bg,
      borderRadius: 12,
      padding: 32,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: minH ?? 100,
    }}>
      {children}
    </div>
  )
}

function OriginalImg({ src, maxW, bg }: { src: string; maxW?: number; bg?: string }) {
  return (
    <div style={{ marginTop: 8 }}>
      <span style={{ fontSize: 12, color: '#555' }}>Original</span>
      <div style={{ background: bg || '#111', borderRadius: 8, padding: 12, marginTop: 4, display: 'inline-flex' }}>
        <img src={src} alt="" style={{ maxWidth: maxW ?? '100%', height: 'auto', maxHeight: 80 }} />
      </div>
    </div>
  )
}

function InputRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={labelStyle}>
      <span>{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </label>
  )
}

const sectionTitle: React.CSSProperties = {
  marginBottom: 12,
  fontSize: 16,
  fontWeight: 600,
  color: '#aaa',
  borderBottom: '1px solid #333',
  paddingBottom: 6,
}

const controlsBox: React.CSSProperties = {
  flex: '0 0 260px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 13,
  color: '#ccc',
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #444',
  background: '#1a1a1a',
  color: '#fff',
  fontSize: 14,
}

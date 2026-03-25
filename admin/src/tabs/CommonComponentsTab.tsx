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
import { colors, radius, font, spacing, typeScale, typeUsage } from '../components/common/design-tokens'
import { DEFAULT_SPEC, R2_KEY, type DesignSpec } from '../components/common/design-spec'
import { getJson, putJson } from '../api'

type Tab = 'typography' | 'color' | 'space' | 'components' | 'compositions'

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'typography', label: 'Typography', desc: '서체 & 타입 스케일' },
  { id: 'color', label: 'Color', desc: '컬러 팔레트' },
  { id: 'space', label: 'Space & Shape', desc: '간격 & 형태' },
  { id: 'components', label: 'Components', desc: '버튼 & UI 요소' },
  { id: 'compositions', label: 'Compositions', desc: '복합 패턴' },
]

export default function CommonComponentsTab() {
  const [tab, setTab] = useState<Tab>('typography')
  const [spec, setSpec] = useState<DesignSpec>(DEFAULT_SPEC)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState('')

  useEffect(() => {
    getJson<DesignSpec>(R2_KEY).then((data) => {
      if (data) setSpec({ ...DEFAULT_SPEC, ...data })
    }).catch(() => {})
  }, [])

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
    <div style={{ padding: 24, maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#111' }}>Design System</h1>
          <span style={{ fontSize: 12, color: '#999', background: '#f0f0f0', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>v1.0</span>
        </div>
        <p style={{ fontSize: 14, color: '#888', margin: 0 }}>직장인 잔혹사 — 게임 UI 디자인 토큰 & 컴포넌트 라이브러리</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 32, borderBottom: '2px solid #e8e8e8' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid #111' : '2px solid transparent',
              marginBottom: -2,
              background: 'transparent',
              color: tab === t.id ? '#111' : '#999',
              fontWeight: tab === t.id ? 700 : 400,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8 }}>
          {lastSaved && <span style={{ fontSize: 11, color: '#999' }}>저장됨 {lastSaved}</span>}
          <button
            onClick={handleSave}
            style={{
              padding: '5px 14px', borderRadius: 6, border: '1px solid #ddd',
              background: saving ? '#f5f5f5' : '#111', color: saving ? '#999' : '#fff',
              fontSize: 12, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
            }}
          >
            {saving ? '저장 중...' : '스펙 저장'}
          </button>
        </div>
      </div>

      {tab === 'typography' && <TypographySection />}
      {tab === 'color' && <ColorSection />}
      {tab === 'space' && <SpaceShapeSection />}
      {tab === 'components' && <ComponentsSection spec={spec} update={update} />}
      {tab === 'compositions' && <CompositionsSection spec={spec} update={update} />}
    </div>
  )
}

/* ═══════════════════════════════════════════
   1. TYPOGRAPHY — 디자인 시스템의 기초
   ═══════════════════════════════════════════ */

function TypographySection() {
  const [sampleText, setSampleText] = useState('직장인 잔혹사')

  const scaleEntries = Object.entries(typeScale) as [keyof typeof typeScale, typeof typeScale[keyof typeof typeScale]][]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      {/* 1-1. Font Family */}
      <section>
        <SectionHeader
          title="Font Family"
          desc="게임 UI 전체에서 사용하는 서체. GMarketSans Bold 하나로 통일."
        />
        <FontFamilyCard
          name="Primary"
          family={font.primary}
          specimen="GMarketSans"
          desc="게임 UI 전용 — 타이틀, 버튼, 점수, HUD 등 모든 인게임 텍스트"
          weights={[
            { label: 'Bold', value: 700, isDefault: true },
          ]}
        />
      </section>

      {/* 1-2. Text Effects */}
      <section>
        <SectionHeader
          title="Text Effects"
          desc="게임 서체에 적용하는 효과. stroke(외곽선)를 통해 가독성과 임팩트를 동시에 확보."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <EffectCard
            label="No Stroke"
            desc="CTA, 본문, 라벨에 사용"
            bg="#f0f0f0"
            text="텍스트"
            renderText={(text) => (
              <span style={{ fontFamily: font.primary, fontSize: 32, fontWeight: 900, color: '#333' }}>{text}</span>
            )}
          />
          <EffectCard
            label="Single Stroke"
            desc="버튼 텍스트에 사용 (2-3px)"
            bg="#f0f0f0"
            text="텍스트"
            renderText={(text) => (
              <span style={{ fontFamily: font.primary, fontSize: 32, fontWeight: 900, color: '#333', WebkitTextStroke: '3px rgba(0,0,0,0.25)', paintOrder: 'stroke fill' }}>{text}</span>
            )}
          />
          <EffectCard
            label="Double Stroke"
            desc="타이틀에 사용 — 3중 레이어 (흰색 외곽 → 검정 내곽 → 그라데이션 fill)"
            bg="#f0f0f0"
            text="텍스트"
            renderText={(text) => (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{ fontFamily: font.primary, fontSize: 32, fontWeight: 900, color: 'transparent', WebkitTextStroke: '12px #ccc', paintOrder: 'stroke fill' }}>{text}</div>
                <div style={{ position: 'absolute', inset: 0, fontFamily: font.primary, fontSize: 32, fontWeight: 900, color: 'transparent', WebkitTextStroke: '6px #666', paintOrder: 'stroke fill' }}>{text}</div>
                <div style={{ position: 'absolute', inset: 0, fontFamily: font.primary, fontSize: 32, fontWeight: 900, background: `linear-gradient(to bottom, ${colors.blue}, ${colors.blueLight})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{text}</div>
              </div>
            )}
          />
        </div>
      </section>

      {/* 1-3. Type Scale */}
      <section>
        <SectionHeader
          title="Type Scale"
          desc="폰트 크기별 위계. 큰 것부터 작은 것 순서로 — 모든 텍스트는 이 스케일 안에서 선택."
        />
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#888' }}>
            <span>Sample</span>
            <input
              type="text"
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              style={inputStyle}
            />
          </label>
        </div>
        <div style={{ background: '#f0f0f0', borderRadius: 12, overflow: 'hidden', border: '1px solid #e8e8e8' }}>
          {scaleEntries.map(([name, ts], i) => {
            const usage = typeUsage[name]
            return (
              <div
                key={name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr 240px',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: i < scaleEntries.length - 1 ? '1px solid #e0e0e0' : 'none',
                  gap: 16,
                }}
              >
                {/* Name + specs */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>{name}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <Tag>{ts.fontSize}px</Tag>
                    <Tag>w{ts.fontWeight}</Tag>
                    {ts.stroke > 0 && <Tag>stroke {ts.stroke}</Tag>}
                  </div>
                </div>

                {/* Preview */}
                <div style={{
                  fontFamily: font.primary,
                  fontSize: Math.min(ts.fontSize, 72),
                  fontWeight: ts.fontWeight,
                  color: '#333',
                  WebkitTextStroke: ts.stroke ? `${ts.stroke}px rgba(0,0,0,0.2)` : undefined,
                  paintOrder: 'stroke fill',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {sampleText}
                </div>

                {/* Usages */}
                <div style={{ fontSize: 11, color: '#999', textAlign: 'right', lineHeight: 1.5 }}>
                  {usage?.usages.join(' · ')}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function FontFamilyCard({ name, family, specimen, desc, weights }: {
  name: string; family: string; specimen: string; desc: string
  weights: { label: string; value: number; isDefault?: boolean }[]
}) {
  return (
    <div style={{ border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ background: '#f0f0f0', padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: family, fontWeight: 900, fontSize: 36, color: '#333', lineHeight: 1.2 }}>
          {specimen}
        </div>
        <div style={{ fontFamily: family, fontWeight: 400, fontSize: 14, color: '#999', marginTop: 4 }}>
          가나다라 ABCD 1234 !@#$
        </div>
      </div>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{name}</span>
          <span style={{ fontSize: 11, color: '#999', fontFamily: 'monospace' }}>{family.split(',')[0].replace(/"/g, '')}</span>
        </div>
        <p style={{ fontSize: 12, color: '#888', margin: '0 0 12px' }}>{desc}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {weights.map((w) => (
            <span key={w.value} style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4,
              background: w.isDefault ? '#111' : '#f5f5f5',
              color: w.isDefault ? '#fff' : '#666',
              fontWeight: 600,
            }}>
              {w.label} ({w.value})
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function EffectCard({ label, desc, bg, text, renderText }: {
  label: string; desc: string; bg: string; text: string
  renderText: (text: string) => React.ReactNode
}) {
  return (
    <div style={{ border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ background: bg, padding: '32px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {renderText(text)}
      </div>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   2. COLOR — 팔레트
   ═══════════════════════════════════════════ */

const COLOR_GROUPS: { title: string; desc: string; items: { name: string; hex: string; usage: string }[] }[] = [
  {
    title: 'Background',
    desc: '화면, 모달, 카드의 배경색. 어둡고 무거운 톤으로 게임의 무게감을 표현.',
    items: [
      { name: 'dark', hex: colors.dark, usage: '버튼 배경' },
      { name: 'darker', hex: colors.darker, usage: '카드, 아이콘 버튼 배경' },
      { name: 'modalBg', hex: colors.modalBg, usage: '모달 배경' },
      { name: 'black', hex: colors.black, usage: 'CTA, 텍스트 스트로크' },
    ],
  },
  {
    title: 'Accent',
    desc: '주요 액션과 하이라이트. Red 계열은 긴박함, Blue 계열은 타이틀 그라데이션.',
    items: [
      { name: 'red', hex: colors.red, usage: '부활 버튼 메인' },
      { name: 'redLight', hex: colors.redLight, usage: '부활 버튼 하이라이트' },
      { name: 'redDark', hex: colors.redDark, usage: '부활 버튼 그림자' },
      { name: 'cyan', hex: colors.cyan, usage: '튜토리얼 글로우' },
      { name: 'blue', hex: colors.blue, usage: '타이틀 그라데이션 시작' },
      { name: 'blueLight', hex: colors.blueLight, usage: '타이틀 그라데이션 끝' },
    ],
  },
  {
    title: 'Neutral',
    desc: '돌 버튼, 원형 버튼, 비활성 텍스트 등. BlueGray 계열이 특징.',
    items: [
      { name: 'blueGray', hex: colors.blueGray, usage: '돌 버튼, 원형 버튼' },
      { name: 'blueGrayLight', hex: colors.blueGrayLight, usage: '하이라이트' },
      { name: 'blueGrayDark', hex: colors.blueGrayDark, usage: '그림자' },
      { name: 'gray', hex: colors.gray, usage: '보조 버튼' },
      { name: 'grayText', hex: colors.grayText, usage: '비활성 텍스트' },
      { name: 'white', hex: colors.white, usage: '텍스트, 테두리' },
    ],
  },
]

function ColorSection() {
  const [copied, setCopied] = useState('')
  const handleCopy = (hex: string) => {
    navigator.clipboard.writeText(hex)
    setCopied(hex)
    setTimeout(() => setCopied(''), 1500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      {/* Full Palette Overview */}
      <section>
        <SectionHeader title="Color Palette" desc="게임 전체에서 사용하는 컬러 시스템. 클릭하면 HEX 복사." />

        {COLOR_GROUPS.map((g) => (
          <div key={g.title} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#333', margin: 0 }}>{g.title}</h4>
              <span style={{ fontSize: 12, color: '#999' }}>{g.desc}</span>
            </div>
            <div style={{ display: 'flex', gap: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid #e8e8e8' }}>
              {g.items.map((c) => (
                <div
                  key={c.name}
                  onClick={() => handleCopy(c.hex)}
                  style={{
                    flex: 1, cursor: 'pointer', transition: 'transform 0.1s',
                    position: 'relative',
                  }}
                >
                  <div style={{
                    height: 72, background: c.hex,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRight: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {copied === c.hex && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: '#fff',
                        background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 4,
                      }}>Copied!</span>
                    )}
                  </div>
                  <div style={{ padding: '8px 10px', background: '#fafafa' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, fontFamily: 'monospace', color: '#333' }}>{c.hex}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#999', marginTop: 1 }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: '#bbb', marginTop: 1 }}>{c.usage}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Gradient */}
      <section>
        <SectionHeader title="Gradients" desc="게임 내에서 사용하는 그라데이션 조합." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <GradientCard
            label="Title Gradient"
            desc="메인 타이틀 텍스트"
            from="#ffffff"
            to="#c1e5ff"
            direction="to bottom"
          />
          <GradientCard
            label="Revive Button"
            desc="광고보고 부활 버튼"
            from="#e5332f"
            to="#771615"
            direction="135deg"
          />
          <GradientCard
            label="Background"
            desc="메인 화면 배경"
            from="#2a0c10"
            to="#000000"
            direction="to bottom"
          />
        </div>
      </section>
    </div>
  )
}

function GradientCard({ label, desc, from, to, direction }: {
  label: string; desc: string; from: string; to: string; direction: string
}) {
  return (
    <div style={{ border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ height: 80, background: `linear-gradient(${direction}, ${from}, ${to})` }} />
      <div style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{desc}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#999', background: '#f5f5f5', padding: '1px 6px', borderRadius: 3 }}>{from}</span>
          <span style={{ fontSize: 10, color: '#ccc' }}>→</span>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#999', background: '#f5f5f5', padding: '1px 6px', borderRadius: 3 }}>{to}</span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   3. SPACE & SHAPE — 간격, 라디우스
   ═══════════════════════════════════════════ */

function SpaceShapeSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      {/* Spacing Scale */}
      <section>
        <SectionHeader title="Spacing Scale" desc="일관된 여백을 위한 간격 스케일. 모든 padding, margin, gap에 적용." />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {Object.entries(spacing).map(([name, val]) => (
            <div key={name} style={{
              display: 'grid', gridTemplateColumns: '60px 60px 1fr',
              alignItems: 'center', gap: 12, padding: '8px 0',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace', color: '#333' }}>{name}</span>
              <span style={{ fontSize: 12, color: '#999' }}>{val}px</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: val, height: 24, background: '#111', borderRadius: 4,
                  minWidth: 2,
                }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Border Radius */}
      <section>
        <SectionHeader title="Border Radius" desc="모서리 둥글기. 작은 요소는 sm, 카드/모달은 lg~xl." />
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {Object.entries(radius).map(([name, val]) => (
            <div key={name} style={{ textAlign: 'center' }}>
              <div style={{
                width: 72, height: 72, background: '#111', borderRadius: val,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>{val}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginTop: 8 }}>{name}</div>
              <div style={{ fontSize: 11, color: '#999' }}>{val}px</div>
            </div>
          ))}
        </div>
      </section>

      {/* Elevation / Shadow */}
      <section>
        <SectionHeader title="Elevation" desc="깊이감을 위한 그림자. 게임 UI는 주로 stroke과 border로 깊이를 표현하되, 모달에만 그림자 적용." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            { name: 'flat', shadow: 'none', desc: '기본 버튼', border: '3px solid #333' },
            { name: 'raised', shadow: '0 4px 12px rgba(0,0,0,0.3)', desc: '돌 버튼, 원형 버튼', border: 'none' },
            { name: 'overlay', shadow: '0 8px 32px rgba(0,0,0,0.5)', desc: '모달, 도전장', border: 'none' },
          ].map((e) => (
            <div key={e.name} style={{ textAlign: 'center' }}>
              <div style={{
                width: 120, height: 80, background: '#2a292e', borderRadius: 16,
                boxShadow: e.shadow, border: e.border,
                margin: '0 auto 12px',
              }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{e.name}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{e.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

/* ═══════════════════════════════════════════
   4. COMPONENTS — 인터랙티브 컴포넌트
   ═══════════════════════════════════════════ */

type UpdateFn = <K extends keyof DesignSpec>(key: K, partial: Partial<DesignSpec[K]>) => void

function ComponentsSection({ spec, update }: { spec: DesignSpec; update: UpdateFn }) {
  const d = spec.darkButton
  const r = spec.redButton
  const ic = spec.iconButton
  const st = spec.stoneButton
  const cb = spec.circleButton
  const [gaugeVal, setGaugeVal] = useState(0.7)
  const g = spec.gaugeBar

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
      {/* DarkButton */}
      <ComponentBlock
        name="DarkButton"
        category="Button"
        desc="어두운 배경의 기본 액션 버튼. 게임오버 화면의 '홈으로 가기'에 사용."
        preview={
          <Preview bg="#fff">
            <DarkButton fontSize={d.fontSize} style={{ borderRadius: d.borderRadius, border: `${d.borderWidth}px solid ${d.borderColor}`, padding: `${d.paddingY}px ${d.paddingX}px`, WebkitTextStroke: `${d.strokeWidth}px #000`, backgroundColor: d.bgColor }}>홈으로 가기</DarkButton>
          </Preview>
        }
        original="/game01/game-over-screen/btn-home.png"
        controls={
          <>
            <NumField label="Font Size" value={d.fontSize} onChange={(v) => update('darkButton', { fontSize: v })} min={16} max={48} />
            <NumField label="Stroke" value={d.strokeWidth} onChange={(v) => update('darkButton', { strokeWidth: v })} min={0} max={8} step={0.5} />
            <NumField label="Border Radius" value={d.borderRadius} onChange={(v) => update('darkButton', { borderRadius: v })} max={40} />
            <NumField label="Border Width" value={d.borderWidth} onChange={(v) => update('darkButton', { borderWidth: v })} max={10} />
            <NumField label="Padding X" value={d.paddingX} onChange={(v) => update('darkButton', { paddingX: v })} max={60} />
            <NumField label="Padding Y" value={d.paddingY} onChange={(v) => update('darkButton', { paddingY: v })} max={30} />
            <ColorField label="Background" value={d.bgColor} onChange={(v) => update('darkButton', { bgColor: v })} />
            <ColorField label="Border" value={d.borderColor} onChange={(v) => update('darkButton', { borderColor: v })} />
          </>
        }
        tokens={['dark', 'buttonLarge', 'radius.lg']}
      />

      {/* RedButton */}
      <ComponentBlock
        name="RedButton"
        category="Button"
        desc="그라데이션 강조 버튼. 긴박한 액션('광고보고 부활')에 사용."
        preview={
          <Preview bg="#111">
            <RedButton fontSize={r.fontSize} style={{ borderRadius: r.borderRadius, border: `${r.borderWidth}px solid ${r.borderColor}`, padding: `${r.paddingY}px ${r.paddingX}px`, WebkitTextStroke: `${r.strokeWidth}px #000`, background: `linear-gradient(135deg, ${r.gradientFrom}, ${r.gradientTo})` }}>광고보고 부활</RedButton>
          </Preview>
        }
        original="/game01/game-over-screen/btn-revive.png"
        controls={
          <>
            <NumField label="Font Size" value={r.fontSize} onChange={(v) => update('redButton', { fontSize: v })} min={16} max={48} />
            <NumField label="Stroke" value={r.strokeWidth} onChange={(v) => update('redButton', { strokeWidth: v })} min={0} max={8} step={0.5} />
            <NumField label="Border Radius" value={r.borderRadius} onChange={(v) => update('redButton', { borderRadius: v })} max={40} />
            <NumField label="Padding X" value={r.paddingX} onChange={(v) => update('redButton', { paddingX: v })} max={60} />
            <NumField label="Padding Y" value={r.paddingY} onChange={(v) => update('redButton', { paddingY: v })} max={30} />
            <ColorField label="Gradient From" value={r.gradientFrom} onChange={(v) => update('redButton', { gradientFrom: v })} />
            <ColorField label="Gradient To" value={r.gradientTo} onChange={(v) => update('redButton', { gradientTo: v })} />
            <ColorField label="Border" value={r.borderColor} onChange={(v) => update('redButton', { borderColor: v })} />
          </>
        }
        tokens={['red → redDark', 'buttonLarge', 'radius.lg']}
      />

      {/* IconButton */}
      <ComponentBlock
        name="IconButton"
        category="Button"
        desc="아이콘 + 텍스트 조합 버튼. '도전장 보내기', '랭킹 보기'에 사용."
        preview={
          <Preview bg="#111">
            <div style={{ display: 'flex', gap: 12 }}>
              <IconButton icon="🔥" fontSize={ic.fontSize} style={{ borderRadius: ic.borderRadius, border: `${ic.borderWidth}px solid ${ic.borderColor}`, outline: `2px solid ${ic.outlineColor}`, padding: `${ic.paddingY}px ${ic.paddingX}px`, backgroundColor: ic.bgColor, WebkitTextStroke: `${ic.strokeWidth}px #000` }}>도전장 보내기</IconButton>
              <IconButton icon="🏆" fontSize={ic.fontSize} style={{ borderRadius: ic.borderRadius, border: `${ic.borderWidth}px solid ${ic.borderColor}`, outline: `2px solid ${ic.outlineColor}`, padding: `${ic.paddingY}px ${ic.paddingX}px`, backgroundColor: ic.bgColor, WebkitTextStroke: `${ic.strokeWidth}px #000` }}>랭킹 보기</IconButton>
            </div>
          </Preview>
        }
        controls={
          <>
            <NumField label="Font Size" value={ic.fontSize} onChange={(v) => update('iconButton', { fontSize: v })} min={12} max={36} />
            <NumField label="Stroke" value={ic.strokeWidth} onChange={(v) => update('iconButton', { strokeWidth: v })} min={0} max={6} step={0.5} />
            <NumField label="Border Radius" value={ic.borderRadius} onChange={(v) => update('iconButton', { borderRadius: v })} max={30} />
            <NumField label="Padding X" value={ic.paddingX} onChange={(v) => update('iconButton', { paddingX: v })} max={40} />
            <NumField label="Padding Y" value={ic.paddingY} onChange={(v) => update('iconButton', { paddingY: v })} max={24} />
            <ColorField label="Background" value={ic.bgColor} onChange={(v) => update('iconButton', { bgColor: v })} />
            <ColorField label="Border" value={ic.borderColor} onChange={(v) => update('iconButton', { borderColor: v })} />
          </>
        }
        tokens={['darker', 'buttonMedium', 'radius.md']}
      />

      {/* StoneButton */}
      <ComponentBlock
        name="StoneButton"
        category="Button"
        desc="돌 텍스처의 메인 CTA 버튼. 메인 화면의 '퇴근하기'에 사용."
        preview={
          <Preview bg="#111">
            <StoneButton fontSize={st.fontSize} style={{ borderRadius: st.borderRadius, border: `${st.borderWidth}px solid ${st.borderColor}`, padding: `${st.paddingY}px ${st.paddingX}px`, WebkitTextStroke: `${st.strokeWidth}px #000` }}>퇴근하기</StoneButton>
          </Preview>
        }
        original="/game01/main-screen/main-btn.png"
        controls={
          <>
            <NumField label="Font Size" value={st.fontSize} onChange={(v) => update('stoneButton', { fontSize: v })} min={16} max={40} />
            <NumField label="Stroke" value={st.strokeWidth} onChange={(v) => update('stoneButton', { strokeWidth: v })} min={0} max={8} step={0.5} />
            <NumField label="Border Radius" value={st.borderRadius} onChange={(v) => update('stoneButton', { borderRadius: v })} max={40} />
            <NumField label="Padding X" value={st.paddingX} onChange={(v) => update('stoneButton', { paddingX: v })} max={60} />
            <NumField label="Padding Y" value={st.paddingY} onChange={(v) => update('stoneButton', { paddingY: v })} max={30} />
            <ColorField label="Background" value={st.bgColor} onChange={(v) => update('stoneButton', { bgColor: v })} />
            <ColorField label="Border" value={st.borderColor} onChange={(v) => update('stoneButton', { borderColor: v })} />
          </>
        }
        tokens={['blueGray', 'buttonLarge', 'radius.lg']}
      />

      {/* CircleButton */}
      <ComponentBlock
        name="CircleButton"
        category="Button"
        desc="원형 아이콘 버튼. 플레이, 회전, 일시정지 등 단일 액션에 사용."
        preview={
          <Preview bg="#111">
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <CircleButton icon="rotate" size={cb.size} />
              <CircleButton icon="play" size={cb.size} />
              <CircleButton icon="pause" size={Math.round(cb.size * 0.65)} />
            </div>
          </Preview>
        }
        controls={
          <NumField label="Size" value={cb.size} onChange={(v) => update('circleButton', { size: v })} min={40} max={120} />
        }
        tokens={['blueGray', 'radius.full']}
      />

      {/* CloseButton */}
      <ComponentBlock
        name="CloseButton"
        category="Button"
        desc="모달 닫기 버튼. 검정 원형 배경 + 굵은 X 아이콘."
        preview={
          <Preview bg="#2a292e">
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <CloseButton size={24} />
              <CloseButton size={32} />
              <CloseButton size={40} />
            </div>
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
            <GaugeBar value={gaugeVal} width={300} height={g.height} fillColor={g.fillColor} />
          </Preview>
        }
        controls={
          <>
            <NumField label="Value" value={Math.round(gaugeVal * 100)} onChange={(v) => setGaugeVal(v / 100)} max={100} />
            <NumField label="Height" value={g.height} onChange={(v) => update('gaugeBar', { height: v })} min={16} max={48} />
            <ColorField label="Fill Color" value={g.fillColor} onChange={(v) => update('gaugeBar', { fillColor: v })} />
          </>
        }
        tokens={['red', 'radius.sm']}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════
   5. COMPOSITIONS — 복합 패턴
   ═══════════════════════════════════════════ */

function CompositionsSection({ spec, update }: { spec: DesignSpec; update: UpdateFn }) {
  const [line1, setLine1] = useState('직장인 잔혹사')
  const [line2, setLine2] = useState('당신의 하루를 견뎌내세요...')
  const t = spec.mainTitle
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
            <MainTitle line1={line1} line2={line2} line1Size={t.line1Size} line2Size={t.line2Size} gradientFrom={t.gradientFrom} gradientTo={t.gradientTo} strokeWidth={t.strokeWidth} line2Color={t.line2Color} />
          </Preview>
        }
        original="/game01/main-screen/main-text.png"
        originalBg="linear-gradient(to bottom, #2a0c10, #000)"
        controls={
          <>
            <InputRow label="Line 1" value={line1} onChange={setLine1} />
            <InputRow label="Line 2" value={line2} onChange={setLine2} />
            <NumField label="Line 1 Size" value={t.line1Size} onChange={(v) => update('mainTitle', { line1Size: v })} min={24} max={80} />
            <NumField label="Line 2 Size" value={t.line2Size} onChange={(v) => update('mainTitle', { line2Size: v })} min={12} max={40} />
            <NumField label="Stroke" value={t.strokeWidth} onChange={(v) => update('mainTitle', { strokeWidth: v })} min={0} max={12} />
            <ColorField label="Grad From" value={t.gradientFrom} onChange={(v) => update('mainTitle', { gradientFrom: v })} />
            <ColorField label="Grad To" value={t.gradientTo} onChange={(v) => update('mainTitle', { gradientTo: v })} />
            <ColorField label="Line 2" value={t.line2Color} onChange={(v) => update('mainTitle', { line2Color: v })} />
          </>
        }
        tokens={['titleLarge', 'titleSub', 'blue → blueLight']}
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
            <NumField label="Score Font" value={m.scoreFontSize} onChange={(v) => update('challengeModal', { scoreFontSize: v })} min={36} max={96} />
            <NumField label="CTA Font" value={m.ctaFontSize} onChange={(v) => update('challengeModal', { ctaFontSize: v })} min={12} max={24} />
            <ColorField label="Background" value={m.bgColor} onChange={(v) => update('challengeModal', { bgColor: v })} />
            <label style={labelStyle}><span>Message</span><textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></label>
          </>
        }
        tokens={['modalBg', 'score', 'body', 'buttonCTA', 'radius.xl']}
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

/* ═══════════════════════════════════════════
   SHARED HELPERS
   ═══════════════════════════════════════════ */

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: '0 0 4px' }}>{title}</h3>
      <p style={{ fontSize: 13, color: '#888', margin: 0 }}>{desc}</p>
    </div>
  )
}

function ComponentBlock({ name, category, desc, preview, original, originalBg, controls, tokens }: {
  name: string; category: string; desc: string
  preview: React.ReactNode; original?: string; originalBg?: string
  controls: React.ReactNode; tokens?: string[]
}) {
  return (
    <div style={{ borderBottom: '1px solid #eee', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: 0 }}>{name}</h3>
          <span style={{ fontSize: 11, color: '#999', background: '#f0f0f0', padding: '1px 8px', borderRadius: 4, fontWeight: 500 }}>{category}</span>
        </div>
        <p style={{ fontSize: 13, color: '#888', margin: 0 }}>{desc}</p>
        {tokens && tokens.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: '#bbb' }}>Tokens:</span>
            {tokens.map((t) => (
              <span key={t} style={{ fontSize: 11, fontFamily: 'monospace', color: '#666', background: '#f5f5f5', padding: '1px 6px', borderRadius: 3 }}>{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 400px' }}>
          {preview}
          {original && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 11, color: '#bbb', fontWeight: 500 }}>Original Asset</span>
              <div style={{ background: originalBg || '#fff', borderRadius: 8, padding: 12, marginTop: 4, display: 'inline-flex', border: '1px solid #e8e8e8' }}>
                <img src={original} alt="" style={{ maxWidth: '100%', height: 'auto', maxHeight: 80 }} />
              </div>
            </div>
          )}
        </div>
        {controls && (
          <div style={controlsBox}>
            {controls}
          </div>
        )}
      </div>
    </div>
  )
}

function Preview({ bg, minH, children }: { bg: string; minH?: number; children: React.ReactNode }) {
  return (
    <div style={{
      background: bg, borderRadius: 12, padding: 32,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: minH ?? 100,
      border: '1px solid #e8e8e8',
    }}>
      {children}
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10, color: '#666', background: '#f0f0f0', padding: '1px 6px', borderRadius: 4, fontWeight: 500 }}>{children}</span>
}

function NumField({ label, value, onChange, min = 0, max = 100, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number
}) {
  return (
    <label style={labelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'monospace', color: '#999', fontSize: 12 }}>{value}{!label.includes('Weight') ? 'px' : ''}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ width: '100%', accentColor: '#111' }}
      />
    </label>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ ...labelStyle, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 28, height: 28, border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }} />
      <span>{label}</span>
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#999', marginLeft: 'auto' }}>{value}</span>
    </label>
  )
}

function InputRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={labelStyle}><span>{label}</span><input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} /></label>
  )
}

const controlsBox: React.CSSProperties = { flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: 10, background: '#fafafa', borderRadius: 12, padding: 16, border: '1px solid #eee' }
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#555' }
const inputStyle: React.CSSProperties = { padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', color: '#333', fontSize: 14 }

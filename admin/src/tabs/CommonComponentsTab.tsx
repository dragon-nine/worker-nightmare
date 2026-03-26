import { useState, useEffect, useCallback } from 'react'
import CircleButton from '../components/common/CircleButton'
import CloseButton from '../components/common/CloseButton'
import GaugeBar from '../components/common/GaugeBar'
import MainTitle from '../components/common/MainTitle'
import ButtonGuide from '../components/common/ButtonGuide'
import ChallengeModal from '../components/common/ChallengeModal'
import ToggleSwitch from '../components/common/ToggleSwitch'
import { colors, radius, font, spacing, typeScale, typeUsage, buttonStyleDefaults } from '../components/common/design-tokens'
import { DEFAULT_SPEC, R2_KEY, type DesignSpec, type TypeScaleKey, type ButtonStyleType } from '../components/common/design-spec'
import { getJson, putJson } from '../api'

type Tab = 'typography' | 'color' | 'space' | 'buttons' | 'components' | 'compositions'

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'typography', label: 'Typography', desc: '서체 & 타입 스케일' },
  { id: 'color', label: 'Color', desc: '컬러 팔레트' },
  { id: 'space', label: 'Space & Shape', desc: '간격 & 형태' },
  { id: 'buttons', label: 'Buttons', desc: '버튼 스타일 유형' },
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
      {tab === 'buttons' && <ButtonStylesSection />}
      {tab === 'components' && <ComponentsSection spec={spec} update={update} />}
      {tab === 'compositions' && <CompositionsSection spec={spec} update={update} />}
    </div>
  )
}

/* ═══════════════════════════════════════════
   1. TYPOGRAPHY — 디자인 시스템의 기초
   ═══════════════════════════════════════════ */

function TypographySection() {
  const scaleEntries = Object.entries(typeScale) as [keyof typeof typeScale, typeof typeScale[keyof typeof typeScale]][]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      {/* 1-1. Font Family & Text Effects */}
      <section>
        <SectionHeader
          title="Font & Effects"
          desc="게임 UI 서체와 텍스트 효과. GMarketSans Bold + stroke 외곽선으로 임팩트 확보."
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FontFamilyCard
            name="Primary"
            family={font.primary}
            specimen="GMarketSans"
            desc="게임 UI 전용 — 타이틀, 버튼, 점수 등 모든 인게임 텍스트"
            weights={[
              { label: 'Bold', value: 700, isDefault: true },
            ]}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <EffectCard
              label="Single Stroke"
              desc="버튼 텍스트에 사용 (2-3px)"
              bg="#fff"
              text="텍스트"
              renderText={(text) => (
                <span style={{ fontFamily: font.primary, fontSize: 32, fontWeight: 900, color: '#fff', WebkitTextStroke: '3px #000', paintOrder: 'stroke fill' }}>{text}</span>
              )}
            />
            <EffectCard
              label="Double Stroke"
              desc="타이틀에 사용 — 흰색 외곽 → 검정 내곽 → 그라데이션 fill"
              bg="#111"
              text="텍스트"
              renderText={(text) => (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <div style={{ fontFamily: font.primary, fontSize: 32, fontWeight: 900, color: 'transparent', WebkitTextStroke: '12px #fff', paintOrder: 'stroke fill' }}>{text}</div>
                  <div style={{ position: 'absolute', inset: 0, fontFamily: font.primary, fontSize: 32, fontWeight: 900, color: 'transparent', WebkitTextStroke: '6px #000', paintOrder: 'stroke fill' }}>{text}</div>
                  <div style={{ position: 'absolute', inset: 0, fontFamily: font.primary, fontSize: 32, fontWeight: 900, background: 'linear-gradient(to bottom, #ffffff, #c1e5ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{text}</div>
                </div>
              )}
            />
          </div>
        </div>
      </section>

      {/* 1-3. Type Scale */}
      <section>
        <SectionHeader
          title="Type Scale"
          desc="폰트 크기별 위계. 큰 것부터 작은 것 순서로 — 모든 텍스트는 이 스케일 안에서 선택."
        />
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e8e8e8' }}>
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
                  borderBottom: i < scaleEntries.length - 1 ? '1px solid #eee' : 'none',
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
                  fontSize: ts.fontSize,
                  fontWeight: ts.fontWeight,
                  color: '#fff',
                  WebkitTextStroke: ts.stroke ? `${ts.stroke}px #000` : undefined,
                  paintOrder: 'stroke fill',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {usage?.usages[0] ?? name}
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
      <div style={{ background: '#111', padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: family, fontWeight: 900, fontSize: 36, color: '#fff', lineHeight: 1.2 }}>
          {specimen}
        </div>
        <div style={{ fontFamily: family, fontWeight: 400, fontSize: 14, color: '#888', marginTop: 4 }}>
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

const COLOR_ITEMS: { name: string; hex: string; usage: string }[] = [
  { name: 'white', hex: colors.white, usage: '텍스트, 테두리' },
  { name: 'black', hex: colors.black, usage: '스트로크, CTA 배경' },
  { name: 'charcoal', hex: colors.charcoal, usage: '카드, 버튼 배경' },
  { name: 'slate', hex: colors.slate, usage: '보조 버튼' },
  { name: 'silver', hex: colors.silver, usage: '비활성 텍스트' },
  { name: 'ash', hex: colors.ash, usage: '모달 배경' },
  { name: 'graphite', hex: colors.graphite, usage: '게임오버 큰 버튼' },
  { name: 'cocoa', hex: colors.cocoa, usage: '게임오버 작은 버튼' },
  { name: 'bronze', hex: colors.bronze, usage: '더블 라인' },
  { name: 'steel', hex: colors.steel, usage: '토글 배경' },
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
        <SectionHeader title="Color Palette" desc="게임 전체에서 사용하는 컬러. 클릭하면 HEX 복사." />

        <div style={{ display: 'flex', gap: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid #e8e8e8' }}>
          {COLOR_ITEMS.map((c) => (
            <div
              key={c.name}
              onClick={() => handleCopy(c.hex)}
              style={{
                flex: 1, cursor: 'pointer',
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
      </section>

      {/* Gradient */}
      <section>
        <SectionHeader title="Gradients" desc="게임 내에서 사용하는 그라데이션 조합." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <GradientCard
            label="White → Ice Blue"
            desc="메인 타이틀 텍스트"
            from="#ffffff"
            to="#c1e5ff"
            direction="to bottom"
          />
          <GradientCard
            label="Crimson → Maroon"
            desc="광고보고 부활 버튼"
            from="#e5332f"
            to="#771615"
            direction="135deg"
          />
          <GradientCard
            label="Wine → Black"
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
   4. BUTTONS — 버튼 스타일 유형
   ═══════════════════════════════════════════ */

type ButtonStyle = 'flat' | 'outline' | 'doubleLine'

function GameButton({ variant = 'flat', children, icon, scale = 'lg', bgColor }: {
  variant?: ButtonStyle
  children: React.ReactNode
  icon?: string
  scale?: TypeScaleKey
  bgColor?: string
}) {
  const s = typeScale[scale]
  const d = buttonStyleDefaults[variant]
  const bg = bgColor || colors.graphite

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: variant === 'doubleLine' ? '4px' : undefined,
      background: bg,
      borderRadius: d.borderRadius,
      border: d.borderWidth > 0 ? `${d.borderWidth}px solid ${d.borderColor}` : 'none',
      cursor: 'pointer',
      position: 'relative',
    }}>
      {variant === 'doubleLine' ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: `${Math.max(20, Math.round(s.fontSize * 0.45))}px ${Math.round(s.fontSize * 0.9)}px`,
          borderRadius: d.borderRadius - 4,
          border: `${d.innerLineWidth}px solid ${d.innerLineColor}`,
          width: '100%',
        }}>
          {icon && <span style={{ fontSize: s.fontSize }}>{icon}</span>}
          <span style={{
            fontFamily: font.primary,
            fontSize: s.fontSize,
            fontWeight: s.fontWeight,
            color: '#fff',
            WebkitTextStroke: s.stroke ? `${s.stroke}px #000` : undefined,
            paintOrder: 'stroke fill',
          }}>{children}</span>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: `${Math.max(20, Math.round(s.fontSize * 0.45))}px ${Math.round(s.fontSize * 0.9)}px`,
        }}>
          {icon && <span style={{ fontSize: s.fontSize }}>{icon}</span>}
          <span style={{
            fontFamily: font.primary,
            fontSize: s.fontSize,
            fontWeight: s.fontWeight,
            color: '#fff',
            WebkitTextStroke: s.stroke ? `${s.stroke}px #000` : undefined,
            paintOrder: 'stroke fill',
          }}>{children}</span>
        </div>
      )}
    </div>
  )
}

function ButtonStylesSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      <section>
        <SectionHeader
          title="Button Styles"
          desc="게임에서 사용하는 3가지 버튼 유형. 모든 버튼 컴포넌트는 이 유형 중 하나를 기반으로 구성."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {/* Flat */}
          <div style={{ border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: '#333', padding: '40px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GameButton variant="flat" scale="lg">퇴근하기</GameButton>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>Flat</div>
              <p style={{ fontSize: 12, color: '#888', margin: 0 }}>단색 배경, 테두리 없음. 가장 기본적인 버튼 형태.</p>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <Tag>배경색만</Tag>
                <Tag>테두리 없음</Tag>
              </div>
            </div>
          </div>

          {/* Outline */}
          <div style={{ border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: '#333', padding: '40px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GameButton variant="outline" scale="lg">홈으로 가기</GameButton>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>Outline</div>
              <p style={{ fontSize: 12, color: '#888', margin: 0 }}>배경 + 외곽 테두리. 기본 액션 버튼에 사용.</p>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <Tag>배경색</Tag>
                <Tag>외곽 border</Tag>
              </div>
            </div>
          </div>

          {/* Double Line */}
          <div style={{ border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: '#333', padding: '40px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GameButton variant="doubleLine" scale="md" icon="🔥" bgColor={colors.cocoa}>도전장 보내기</GameButton>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>Double Line</div>
              <p style={{ fontSize: 12, color: '#888', margin: 0 }}>외곽 테두리 + 안쪽 더블 라인. 강조 액션 버튼에 사용.</p>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <Tag>배경색</Tag>
                <Tag>외곽 border</Tag>
                <Tag>더블 라인</Tag>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

/* ═══════════════════════════════════════════
   5. COMPONENTS — 인터랙티브 컴포넌트
   ═══════════════════════════════════════════ */

type UpdateFn = <K extends keyof DesignSpec>(key: K, partial: Partial<DesignSpec[K]>) => void

/** typeScale 키에서 fontSize, stroke 가져오기 */
function getScale(key: TypeScaleKey) {
  return typeScale[key]
}

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
          <Preview bg="#444">
            <GameButton variant={d.buttonStyle} scale={d.scale} bgColor={d.bgColor}>홈으로 가기</GameButton>
          </Preview>
        }
        original="/game01/game-over-screen/btn-home.png"
        controls={
          <>
            <ButtonStyleField label="Button Style" value={d.buttonStyle} onChange={(v) => update('darkButton', { buttonStyle: v })} />
            <ScaleField label="Type Scale" value={d.scale} onChange={(v) => update('darkButton', { scale: v })} />
            <ColorField label="Background" value={d.bgColor} onChange={(v) => update('darkButton', { bgColor: v })} />
          </>
        }
        tokens={[d.scale, d.buttonStyle]}
      />

      {/* RedButton */}
      <ComponentBlock
        name="RedButton"
        category="Button"
        desc="그라데이션 강조 버튼. 긴박한 액션('광고보고 부활')에 사용."
        preview={
          <Preview bg="#111">
            <GameButton variant={r.buttonStyle} scale={r.scale} bgColor={`linear-gradient(135deg, ${r.gradientFrom}, ${r.gradientTo})`}>광고보고 부활</GameButton>
          </Preview>
        }
        original="/game01/game-over-screen/btn-revive.png"
        controls={
          <>
            <ButtonStyleField label="Button Style" value={r.buttonStyle} onChange={(v) => update('redButton', { buttonStyle: v })} />
            <ScaleField label="Type Scale" value={r.scale} onChange={(v) => update('redButton', { scale: v })} />
            <ColorField label="Gradient From" value={r.gradientFrom} onChange={(v) => update('redButton', { gradientFrom: v })} />
            <ColorField label="Gradient To" value={r.gradientTo} onChange={(v) => update('redButton', { gradientTo: v })} />
          </>
        }
        tokens={[r.scale, r.buttonStyle]}
      />

      {/* IconButton */}
      <ComponentBlock
        name="IconButton"
        category="Button"
        desc="아이콘 + 텍스트 조합 버튼. '도전장 보내기', '랭킹 보기'에 사용."
        preview={
          <Preview bg="#111">
            <div style={{ display: 'flex', gap: 12 }}>
              <GameButton variant={ic.buttonStyle} scale={ic.scale} icon="🔥" bgColor={ic.bgColor}>도전장 보내기</GameButton>
              <GameButton variant={ic.buttonStyle} scale={ic.scale} icon="🏆" bgColor={ic.bgColor}>랭킹 보기</GameButton>
            </div>
          </Preview>
        }
        controls={
          <>
            <ButtonStyleField label="Button Style" value={ic.buttonStyle} onChange={(v) => update('iconButton', { buttonStyle: v })} />
            <ScaleField label="Type Scale" value={ic.scale} onChange={(v) => update('iconButton', { scale: v })} />
            <ColorField label="Background" value={ic.bgColor} onChange={(v) => update('iconButton', { bgColor: v })} />
          </>
        }
        tokens={[ic.scale, ic.buttonStyle]}
      />

      {/* StoneButton */}
      <ComponentBlock
        name="StoneButton"
        category="Button"
        desc="돌 텍스처의 메인 CTA 버튼. 메인 화면의 '퇴근하기'에 사용."
        preview={
          <Preview bg="#111">
            <GameButton variant={st.buttonStyle} scale={st.scale} bgColor={st.bgColor}>퇴근하기</GameButton>
          </Preview>
        }
        original="/game01/main-screen/main-btn.png"
        controls={
          <>
            <ButtonStyleField label="Button Style" value={st.buttonStyle} onChange={(v) => update('stoneButton', { buttonStyle: v })} />
            <ScaleField label="Type Scale" value={st.scale} onChange={(v) => update('stoneButton', { scale: v })} />
            <ColorField label="Background" value={st.bgColor} onChange={(v) => update('stoneButton', { bgColor: v })} />
          </>
        }
        tokens={[st.scale, st.buttonStyle]}
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

      {/* ToggleSwitch */}
      <ComponentBlock
        name="ToggleSwitch"
        category="Input"
        desc="토글 스위치. 설정 화면의 on/off 토글에 사용."
        preview={
          <Preview bg="#111">
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <ToggleSwitch on={false} size={48} />
              <ToggleSwitch on={true} size={48} />
              <ToggleSwitch on={false} size={36} />
              <ToggleSwitch on={true} size={36} />
            </div>
          </Preview>
        }
        controls={null}
        tokens={['black', 'steel', 'radius.full']}
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

const BUTTON_STYLES: { value: ButtonStyleType; label: string }[] = [
  { value: 'flat', label: 'Flat — 테두리 없음' },
  { value: 'outline', label: 'Outline — 외곽 테두리' },
  { value: 'doubleLine', label: 'Double Line — 외곽 + 이너' },
]

function ButtonStyleField({ label, value, onChange }: { label: string; value: ButtonStyleType; onChange: (v: ButtonStyleType) => void }) {
  return (
    <label style={labelStyle}>
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ButtonStyleType)}
        style={inputStyle}
      >
        {BUTTON_STYLES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </label>
  )
}

const SCALE_KEYS = Object.keys(typeScale) as TypeScaleKey[]

function ScaleField({ label, value, onChange }: { label: string; value: TypeScaleKey; onChange: (v: TypeScaleKey) => void }) {
  const s = typeScale[value]
  return (
    <label style={labelStyle}>
      <span>{label}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as TypeScaleKey)}
          style={{ ...inputStyle, flex: 1 }}
        >
          {SCALE_KEYS.map((k) => (
            <option key={k} value={k}>{k} — {typeScale[k].fontSize}px / stroke {typeScale[k].stroke}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        <span style={{ fontSize: 10, color: '#999', background: '#f0f0f0', padding: '1px 6px', borderRadius: 3 }}>{s.fontSize}px</span>
        <span style={{ fontSize: 10, color: '#999', background: '#f0f0f0', padding: '1px 6px', borderRadius: 3 }}>w{s.fontWeight}</span>
        {s.stroke > 0 && <span style={{ fontSize: 10, color: '#999', background: '#f0f0f0', padding: '1px 6px', borderRadius: 3 }}>stroke {s.stroke}</span>}
      </div>
    </label>
  )
}

const COLOR_ENTRIES = Object.entries(colors) as [string, string][]

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const matchedName = COLOR_ENTRIES.find(([, hex]) => hex === value)?.[0]
  return (
    <label style={labelStyle}>
      <span>{label}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: value, border: '1px solid #ddd', flexShrink: 0 }} />
        <select
          value={matchedName ?? '__custom'}
          onChange={(e) => {
            if (e.target.value === '__custom') return
            const hex = colors[e.target.value as keyof typeof colors]
            if (hex) onChange(hex)
          }}
          style={{ ...inputStyle, flex: 1 }}
        >
          {!matchedName && <option value="__custom">{value} (커스텀)</option>}
          {COLOR_ENTRIES.map(([name, hex]) => (
            <option key={name} value={name}>{name} — {hex}</option>
          ))}
        </select>
      </div>
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

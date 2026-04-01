import { SectionHeader, Tag } from './shared'
import { font, typeScale, typeUsage } from '../../components/common/design-tokens'

/* ═══════════════════════════════════════════
   1. TYPOGRAPHY
   ═══════════════════════════════════════════ */

export function TypographySection() {
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

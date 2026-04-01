import { useState } from 'react'
import { SectionHeader } from './shared'
import { colors } from '../../components/common/design-tokens'

/* ═══════════════════════════════════════════
   2. COLOR
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

export function ColorSection() {
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
            label="White -> Ice Blue"
            desc="메인 타이틀 텍스트"
            from="#ffffff"
            to="#c1e5ff"
            direction="to bottom"
          />
          <GradientCard
            label="Crimson -> Maroon"
            desc="광고보고 부활 버튼"
            from="#e5332f"
            to="#771615"
            direction="135deg"
          />
          <GradientCard
            label="Wine -> Black"
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

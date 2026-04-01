import { SectionHeader } from './shared'
import { spacing, radius } from '../../components/common/design-tokens'

/* ═══════════════════════════════════════════
   3. SPACE & SHAPE
   ═══════════════════════════════════════════ */

export function SpaceShapeSection() {
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

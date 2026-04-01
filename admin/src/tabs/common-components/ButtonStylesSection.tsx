import { SectionHeader, Tag } from './shared'
import { font, typeScale, buttonStyleDefaults, colors } from '../../components/common/design-tokens'
import type { TypeScaleKey } from '../../components/common/design-spec'

/* ═══════════════════════════════════════════
   4. BUTTONS
   ═══════════════════════════════════════════ */

type ButtonStyle = 'flat' | 'outline' | 'doubleLine' | 'pill'

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
      padding: variant === 'doubleLine' ? '4px' : variant === 'pill' ? '8px 20px' : undefined,
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

export function ButtonStylesSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      <section>
        <SectionHeader
          title="Button Styles"
          desc="게임에서 사용하는 4가지 버튼 유형. 모든 버튼 컴포넌트는 이 유형 중 하나를 기반으로 구성."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
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

          {/* Pill */}
          <div style={{ border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: '#333', padding: '40px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GameButton variant="pill" scale="2xs" bgColor={colors.steel}>↻ 다른 멘트로 바꾸기</GameButton>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>Pill</div>
              <p style={{ fontSize: 12, color: '#888', margin: 0 }}>둥근 알약 형태. 보조 액션, 새로고침 등 부수적인 동작에 사용.</p>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <Tag>뮤트 배경</Tag>
                <Tag>완전 둥근 모서리</Tag>
                <Tag>소형 텍스트</Tag>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

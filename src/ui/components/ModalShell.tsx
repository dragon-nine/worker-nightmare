import type { ReactNode } from 'react';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { TapButton } from './TapButton';
import { Text } from './Text';
import styles from '../overlays/overlay.module.css';

const DEFAULT_GUIDANCE = '화면 터치 시 이전으로 이동';

export interface ModalTabDef {
  /** 탭 식별 키 */
  key: string;
  /** 탭 라벨 (예: "일일 출석") */
  label: string;
  /** 아이콘 — accent 컬러를 받아서 SVG 등 렌더 */
  icon?: (color: string, size: number) => ReactNode;
  /** 활성 강조 색 */
  accent?: string;
}

interface Props {
  /** 배경/X 버튼 클릭 시 호출 */
  onClose: () => void;
  /** 카드 최대 너비 (DESIGN_W 기준 px). 기본 360 */
  maxWidth?: number;
  /** 외곽 z-index. 기본 미지정 */
  zIndex?: number;
  /**
   * 모달 아래 안내 문구.
   *  - 미지정: 기본값 "화면 터치 시 이전으로 이동"
   *  - 빈 문자열 또는 null: 표시 안 함
   */
  guidanceText?: string | null;
  /**
   * 하단 탭 정의. 미지정 시 탭 없는 일반 모달.
   */
  tabs?: ModalTabDef[];
  /** 현재 활성 탭 키 (tabs 사용 시 필수) */
  activeTab?: string;
  /** 탭 변경 콜백 (tabs 사용 시 필수) */
  onTabChange?: (key: string) => void;
  children: ReactNode;
}

/**
 * 모든 모달의 공통 외곽 구조 — 단일 진실 원천(SSOT).
 *
 * - fadeIn + 반투명 dim + backdrop blur (overlay.module.css의 .dim)
 * - 배경 클릭 시 onClose 호출
 * - 우측 상단 X 버튼 (onClose)
 * - 카드 내부 콘텐츠 (children)
 * - 카드 아래 안내 텍스트 (기본값 제공, override 가능, null로 비활성화)
 * - 옵셔널 하단 탭바 (tabs prop 제공 시)
 */
export function ModalShell({
  onClose,
  maxWidth = 360,
  zIndex,
  guidanceText = DEFAULT_GUIDANCE,
  tabs,
  activeTab,
  onTabChange,
  children,
}: Props) {
  const scale = useResponsiveScale();
  const hasTabs = !!tabs && tabs.length > 0;

  return (
    <div
      className={`${styles.overlay} ${styles.fadeIn}`}
      style={{
        pointerEvents: 'auto',
        ...(zIndex !== undefined && { zIndex }),
      }}
      onClick={onClose}
    >
      <div className={styles.dim} />

      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `0 ${20 * scale}px`,
      }}>
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#2a292e',
            borderRadius: 20 * scale,
            width: '100%',
            maxWidth: maxWidth * scale,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* 본문 영역 */}
          <div
            style={{
              padding: `${32 * scale}px ${24 * scale}px ${hasTabs ? 16 * scale : 24 * scale}px`,
              position: 'relative',
            }}
          >
            {/* X 버튼 */}
            <TapButton
              onTap={onClose}
              style={{
                position: 'absolute',
                top: 12 * scale, right: 12 * scale,
                width: 28 * scale, height: 28 * scale,
                borderRadius: 999,
                background: '#000',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 2,
              }}
            >
              <span style={{ color: '#fff', fontSize: 14 * scale, fontWeight: 700, lineHeight: 1 }}>✕</span>
            </TapButton>

            {children}
          </div>

          {/* 하단 탭바 (옵셔널) */}
          {hasTabs && (
            <div
              style={{
                display: 'flex',
                borderTop: `${1 * scale}px solid rgba(255,255,255,0.08)`,
                background: 'rgba(0,0,0,0.35)',
              }}
            >
              {tabs!.map((t) => {
                const isActive = t.key === activeTab;
                const accent = t.accent || '#ffd24a';
                return (
                  <TapButton
                    key={t.key}
                    onTap={() => onTabChange?.(t.key)}
                    pressScale={0.92}
                    style={{
                      flex: 1,
                      padding: `${10 * scale}px ${4 * scale}px`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 3 * scale,
                      background: isActive ? `linear-gradient(180deg, ${accent}22, ${accent}05)` : 'transparent',
                      borderTop: `${2 * scale}px solid ${isActive ? accent : 'transparent'}`,
                      position: 'relative',
                    }}
                  >
                    {t.icon && (
                      <div
                        style={{
                          filter: isActive ? `drop-shadow(0 0 ${4 * scale}px ${accent}80)` : 'none',
                          transform: isActive ? 'scale(1.05)' : 'scale(1)',
                          transition: 'transform 0.15s ease-out',
                        }}
                      >
                        {t.icon(isActive ? accent : 'rgba(255,255,255,0.85)', 22 * scale)}
                      </div>
                    )}
                    <span
                      style={{
                        fontFamily: 'GMarketSans, sans-serif',
                        fontWeight: isActive ? 900 : 700,
                        fontSize: 10 * scale,
                        color: isActive ? accent : 'rgba(255,255,255,0.85)',
                        letterSpacing: 0.3,
                        textShadow: isActive ? `0 0 ${4 * scale}px ${accent}50` : 'none',
                      }}
                    >
                      {t.label}
                    </span>
                  </TapButton>
                );
              })}
            </div>
          )}
        </div>

        {guidanceText && (
          <Text size={13 * scale} color="#434750" align="center" style={{ marginTop: 12 * scale }}>
            {guidanceText}
          </Text>
        )}
      </div>
    </div>
  );
}

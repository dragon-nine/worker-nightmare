import type { ReactNode } from 'react';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { TapButton } from './TapButton';
import { Text } from './Text';
import styles from '../overlays/overlay.module.css';

const DEFAULT_GUIDANCE = '화면 터치 시 이전으로 이동';

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
   *  - 그 외: 해당 문구로 override (예: PauseOverlay의 "화면 터치 시 게임으로 이동")
   */
  guidanceText?: string | null;
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
 *
 * 사용처: PauseOverlay, SettingsOverlay, AdRemoveOverlay, ChallengeOverlay,
 *         ReviveFailModal, MockAdModal
 */
export function ModalShell({
  onClose,
  maxWidth = 360,
  zIndex,
  guidanceText = DEFAULT_GUIDANCE,
  children,
}: Props) {
  const scale = useResponsiveScale();

  return (
    <div
      className={`${styles.overlay} ${styles.fadeIn}`}
      style={zIndex !== undefined ? { zIndex } : undefined}
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
            padding: `${32 * scale}px ${24 * scale}px ${24 * scale}px`,
            width: '100%',
            maxWidth: maxWidth * scale,
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
            }}
          >
            <span style={{ color: '#fff', fontSize: 14 * scale, fontWeight: 700, lineHeight: 1 }}>✕</span>
          </TapButton>

          {children}
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

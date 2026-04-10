import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { ModalShell } from '../components/ModalShell';
import { TapButton } from '../components/TapButton';
import { Text } from '../components/Text';

interface Props {
  reason: 'skipped' | 'failed';
  onRetry: () => void;
  onClose: () => void;
}

/**
 * 부활 광고 실패/스킵 시 안내 + 재시도 모달.
 *
 * - skipped: 사용자가 광고를 끝까지 안 봄
 * - failed:  광고 로드/표시 자체가 실패
 *
 * 배경 탭 또는 X로 닫기, [다시 시도] 버튼으로 부활 흐름 재진입.
 */
export function ReviveFailModal({ reason, onRetry, onClose }: Props) {
  const scale = useResponsiveScale();

  const title =
    reason === 'skipped' ? '광고 시청 미완료' : '광고를 불러올 수 없어요';
  const message =
    reason === 'skipped'
      ? '끝까지 봐야 부활할 수 있어요 🥲'
      : '잠시 후 다시 시도해주세요';

  return (
    <ModalShell onClose={onClose} maxWidth={320} zIndex={300}>
      {/* 타이틀 */}
      <Text
        size={22 * scale}
        weight={900}
        align="center"
        style={{ marginBottom: 8 * scale }}
      >
        {title}
      </Text>

      {/* 본문 */}
      <Text
        size={14 * scale}
        color="#bbb"
        align="center"
        lineHeight={1.5}
        style={{ marginBottom: 22 * scale }}
      >
        {message}
      </Text>

      {/* 다시 시도 버튼 */}
      <TapButton
        onTap={onRetry}
        style={{
          background: '#000',
          borderRadius: 12 * scale,
          padding: `${14 * scale}px`,
          textAlign: 'center',
        }}
      >
        <Text size={18 * scale} weight={700} as="span">
          다시 시도
        </Text>
      </TapButton>
    </ModalShell>
  );
}

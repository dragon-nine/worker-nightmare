import { useCallback, useState } from 'react';
import { gameBus } from '../../game/event-bus';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { ModalShell } from '../components/ModalShell';
import { TapButton } from '../components/TapButton';
import { Text } from '../components/Text';
import { purchaseAdRemove } from '../../game/services/billing';

interface Props {
  onClose: () => void;
}

const BENEFITS = [
  '부활 시 광고 영구 제거',
  '한 번 구매로 평생 적용',
  '쾌적한 퇴근길 보장',
];

export function AdRemoveOverlay({ onClose }: Props) {
  const scale = useResponsiveScale();
  const [purchasing, setPurchasing] = useState(false);

  const handleClose = useCallback(() => {
    gameBus.emit('play-sfx', 'sfx-click');
    onClose();
  }, [onClose]);

  const handlePurchase = useCallback(async () => {
    if (purchasing) return;
    gameBus.emit('play-sfx', 'sfx-click');
    setPurchasing(true);
    try {
      const success = await purchaseAdRemove();
      if (success) onClose();
    } finally {
      setPurchasing(false);
    }
  }, [purchasing, onClose]);

  return (
    <ModalShell onClose={handleClose} zIndex={200}>
      {/* 타이틀 */}
      <Text size={30 * scale} weight={900} align="center" style={{ marginBottom: 6 * scale }}>
        광고 제거
      </Text>

      {/* 설명 */}
      <Text
        size={14 * scale}
        color="#999"
        align="center"
        lineHeight={1.5}
        style={{ marginBottom: 16 * scale }}
      >
        부활 시 광고 없이<br />바로 이어서 퇴근할 수 있어요
      </Text>

      {/* 혜택 카드 */}
      <div style={{
        background: '#1a1a1f',
        borderRadius: 14 * scale,
        padding: `${16 * scale}px ${20 * scale}px`,
        marginBottom: 16 * scale,
        textAlign: 'center',
      }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          {BENEFITS.map((text, i) => (
            <div key={i} style={{
              marginTop: i > 0 ? 6 * scale : 0,
              display: 'flex',
              alignItems: 'center',
            }}>
              <Text size={15 * scale} color="#888" as="span" style={{ marginRight: 6 * scale, flexShrink: 0 }}>✓</Text>
              <Text size={15 * scale} color="#ddd" lineHeight={1.4} as="span" style={{ whiteSpace: 'nowrap' }}>
                {text}
              </Text>
            </div>
          ))}
        </div>

        {/* 가격 */}
        <Text size={24 * scale} weight={900} align="center" style={{ marginTop: 14 * scale }}>
          1,900원
        </Text>
      </div>

      {/* 구매하기 버튼 */}
      <TapButton
        onTap={handlePurchase}
        style={{
          background: '#000',
          borderRadius: 12 * scale,
          padding: `${14 * scale}px`,
          textAlign: 'center',
        }}
      >
        <Text size={20 * scale} weight={700} as="span">
          {purchasing ? '처리 중...' : '구매하기'}
        </Text>
      </TapButton>
    </ModalShell>
  );
}

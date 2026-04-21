import { useCallback, useState } from 'react';
import { gameBus } from '../../game/event-bus';
import { logEvent } from '../../game/services/analytics';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useTossProductPrices } from '../hooks/useTossProductPrices';
import { ModalShell } from '../components/ModalShell';
import { TapButton } from '../components/TapButton';
import { Text } from '../components/Text';
import { purchaseAdRemove } from '../../game/services/billing';

interface Props {
  onClose: () => void;
}

const BENEFITS = [
  '부활 광고 영구 제거',
  '한 번 구매로 평생 적용',
  '쾌적한 퇴근길 보장',
];

export function AdRemoveOverlay({ onClose }: Props) {
  const scale = useResponsiveScale();
  const tossPrices = useTossProductPrices();
  const priceLabel = tossPrices.adRemove ?? '₩1,980';
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
      if (success) {
        logEvent('ad_remove_purchase_success');
        gameBus.emit('toast', '부활 광고 제거 구매 완료!');
        onClose();
      } else {
        logEvent('ad_remove_purchase_fail');
        gameBus.emit('toast', '결제가 취소되거나 실패했어요');
      }
    } finally {
      setPurchasing(false);
    }
  }, [purchasing, onClose]);

  return (
    <ModalShell onClose={handleClose} zIndex={200}>
      {/* 타이틀 */}
      <Text size={30 * scale} weight={900} align="center" style={{ marginBottom: 6 * scale }}>
        부활 광고 제거
      </Text>

      {/* 설명 */}
      <Text
        size={14 * scale}
        color="#999"
        align="center"
        lineHeight={1.5}
        style={{ marginBottom: 16 * scale }}
      >
        부활할 때 나오는 광고를 보지 않고<br />바로 이어서 도전할 수 있어요
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

        {/* 가격 — 토스 동적 가격 우선 */}
        <Text size={24 * scale} weight={900} align="center" style={{ marginTop: 14 * scale }}>
          {priceLabel}
        </Text>
      </div>

      {/* 구매하기 버튼 — 진행 중엔 pointer-events none + 시각 dim */}
      <TapButton
        onTap={handlePurchase}
        style={{
          background: '#000',
          borderRadius: 12 * scale,
          padding: `${14 * scale}px`,
          textAlign: 'center',
          pointerEvents: purchasing ? 'none' : 'auto',
          opacity: purchasing ? 0.6 : 1,
        }}
      >
        <Text size={20 * scale} weight={700} as="span">
          {purchasing ? '처리 중...' : '구매하기'}
        </Text>
      </TapButton>
    </ModalShell>
  );
}

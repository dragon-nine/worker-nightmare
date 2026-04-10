import { useEffect, useState } from 'react';
import { gameBus } from '../../game/event-bus';
import { resolveMockAd } from '../../game/services/mock-ad-provider';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { ModalShell } from '../components/ModalShell';
import { TapButton } from '../components/TapButton';
import { Text } from '../components/Text';
import type { AdResult } from '../../game/services/ad-service';

/**
 * Mock 광고 모달 — DEV 전용.
 *
 * MockAdProvider가 'mock-ad-show' 이벤트를 발생시키면 표시.
 * 사용자 선택 결과를 resolveMockAd로 전달.
 *
 * 다른 모든 모달과 동일하게 ModalShell 사용 (단일 진실 원천).
 */
export function MockAdModal() {
  const scale = useResponsiveScale();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const unsub = gameBus.on('mock-ad-show', () => setShow(true));
    return unsub;
  }, []);

  if (!show) return null;

  const finish = (result: AdResult) => {
    setShow(false);
    resolveMockAd(result);
  };

  // 배경 탭 = 광고 스킵
  const handleClose = () => finish({ kind: 'skipped' });

  return (
    <ModalShell onClose={handleClose} maxWidth={320} zIndex={500}>
      {/* 타이틀 */}
      <Text
        size={20 * scale}
        weight={900}
        align="center"
        style={{ marginBottom: 4 * scale }}
      >
        🎬 Mock Rewarded Ad
      </Text>

      <Text
        size={12 * scale}
        weight={400}
        color="#888"
        align="center"
        style={{ marginBottom: 4 * scale }}
      >
        광고 결과를 선택하세요 (DEV)
      </Text>

      <Text
        size={10 * scale}
        weight={400}
        color="#555"
        align="center"
        style={{ marginBottom: 16 * scale }}
      >
        ※ 모달 닫기 전까지 Phaser scene paused
      </Text>

      {/* 결과 버튼들 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 * scale }}>
        <TapButton
          onTap={() => finish({ kind: 'rewarded' })}
          style={{
            background: '#22c55e',
            borderRadius: 8 * scale,
            padding: `${12 * scale}px ${16 * scale}px`,
            textAlign: 'center',
          }}
        >
          <Text size={14 * scale} weight={700} as="span">
            ✅ 광고 시청 완료 (rewarded)
          </Text>
        </TapButton>

        <TapButton
          onTap={() => finish({ kind: 'skipped' })}
          style={{
            background: '#f59e0b',
            borderRadius: 8 * scale,
            padding: `${12 * scale}px ${16 * scale}px`,
            textAlign: 'center',
          }}
        >
          <Text size={14 * scale} weight={700} as="span">
            ⏭️ 광고 스킵 (skipped)
          </Text>
        </TapButton>

        <TapButton
          onTap={() => finish({ kind: 'failed', error: new Error('mock_failed') })}
          style={{
            background: '#ef4444',
            borderRadius: 8 * scale,
            padding: `${12 * scale}px ${16 * scale}px`,
            textAlign: 'center',
          }}
        >
          <Text size={14 * scale} weight={700} as="span">
            ❌ 기술적 실패 (failed)
          </Text>
        </TapButton>
      </div>
    </ModalShell>
  );
}

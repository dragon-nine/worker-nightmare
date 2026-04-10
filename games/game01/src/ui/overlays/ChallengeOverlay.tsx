import { useState, useCallback } from 'react';
import { gameBus } from '../../game/event-bus';
import { storage } from '../../game/services/storage';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { ModalShell } from '../components/ModalShell';
import { TapButton } from '../components/TapButton';
import { Text } from '../components/Text';
import { getRandomChallengeQuote } from '../../game/challenge-quotes';

const BASE = import.meta.env.BASE_URL || '/';

interface Props {
  score: number;
  onClose: () => void;
}

export function ChallengeOverlay({ score, onClose }: Props) {
  const scale = useResponsiveScale();
  const bestScore = storage.getBestScore();
  const isNewRecord = score >= bestScore && bestScore > 0;
  const [message, setMessage] = useState(() => getRandomChallengeQuote(score, isNewRecord));

  const handleRefresh = useCallback(() => {
    gameBus.emit('play-sfx', 'sfx-click');
    setMessage(getRandomChallengeQuote(score, isNewRecord));
  }, [score, isNewRecord]);

  const handleCTA = useCallback(async () => {
    gameBus.emit('play-sfx', 'sfx-click');
    const shareText = `${message}\n\n🎮 직장인 잔혹사 : 퇴근길\nhttps://play.google.com/store/apps/details?id=com.dragonnine.game01`;
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: '직장인 잔혹사 : 퇴근길',
        text: shareText,
        dialogTitle: '도전장 보내기',
      });
    } catch {
      // 공유 취소 또는 미지원 — 무시
    }
  }, [message]);

  const handleClose = useCallback(() => {
    gameBus.emit('play-sfx', 'sfx-click');
    onClose();
  }, [onClose]);

  return (
    <ModalShell onClose={handleClose} zIndex={200}>
      {/* 점수 */}
      <Text size={48 * scale} weight={900} align="center" style={{ marginBottom: 8 * scale }}>
        {score}
      </Text>

      {/* 캐릭터 이미지 */}
      <div style={{ textAlign: 'center', marginBottom: 12 * scale }}>
        <img
          src={`${BASE}challenge/challenge-rabbit.png`}
          alt=""
          draggable={false}
          style={{ width: 140 * scale, objectFit: 'contain' }}
        />
      </div>

      {/* 멘트 카드 */}
      <div style={{
        background: '#1a1a1f',
        borderRadius: 14 * scale,
        padding: `${14 * scale}px ${16 * scale}px`,
        marginBottom: 10 * scale,
        textAlign: 'center',
      }}>
        <Text size={14 * scale} color="#ccc" lineHeight={1.5} as="span">
          {message}
        </Text>
      </div>

      {/* 다른 멘트로 바꾸기 */}
      <TapButton
        onTap={handleRefresh}
        style={{
          textAlign: 'center',
          marginBottom: 20 * scale,
        }}
      >
        <Text size={12 * scale} color="#888" as="span">
          ↻ 다른 멘트로 바꾸기
        </Text>
      </TapButton>

      {/* 카카오톡 보내기 버튼 */}
      <TapButton
        onTap={handleCTA}
        style={{
          background: '#000',
          borderRadius: 12 * scale,
          padding: `${14 * scale}px`,
          textAlign: 'center',
        }}
      >
        <Text size={17 * scale} weight={700} as="span" style={{ whiteSpace: 'nowrap' }}>
          도전장 보내기
        </Text>
      </TapButton>
    </ModalShell>
  );
}

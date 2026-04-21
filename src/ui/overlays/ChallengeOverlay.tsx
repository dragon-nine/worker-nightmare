import { useState, useCallback } from 'react';
import { gameBus } from '../../game/event-bus';
import { storage } from '../../game/services/storage';
import { gameConfig } from '../../game/game.config';
import { logEvent } from '../../game/services/analytics';
import { isTossNative } from '../../game/platform';
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

    // 공유 성공 시 호출 — 미션 카운트 증가 + 분석 이벤트 + 사용자 피드백 토스트
    const onShareSuccess = (method: 'native' | 'clipboard' | 'toss') => {
      storage.recordChallenge();
      const weekly = storage.getPlayStats().weekly.challenges;
      logEvent('challenge_share_success', { method, weekly });
      const baseMsg =
        method === 'clipboard' ? '도전장 복사 완료!' : '도전장 공유 완료!';
      gameBus.emit('toast', `${baseMsg} (주간 ${weekly}/3)`);
    };

    // 1차 — 토스 네이티브 우선 (토스 인앱 환경)
    //   getTossShareLink로 intoss:// 딥링크를 웹 공유 가능 링크로 변환
    //   → 미설치 사용자는 앱스토어로, 설치된 사용자는 토스 앱으로 연결
    if (isTossNative()) {
      try {
        const { share, getTossShareLink } = await import('@apps-in-toss/web-framework');
        const tossLink = await getTossShareLink(gameConfig.shareUrl.tossDeepLink);
        const shareMessage = `${message}\n\n🎮 직장인 잔혹사 : 퇴근길\n${tossLink}`;
        await share({ message: shareMessage });
        onShareSuccess('toss');
        return;
      } catch (e) {
        const err = e as { name?: string } | undefined;
        if (err?.name === 'AbortError') return;
        // 실패 시 아래 폴백으로
      }
    }

    // 웹/기타 환경 — Google Play 스토어 URL 사용
    const shareText = `${message}\n\n🎮 직장인 잔혹사 : 퇴근길\n${gameConfig.shareUrl.google}`;

    // 2차 — Web Share API 또는 Capacitor Share
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: '직장인 잔혹사 : 퇴근길',
          text: shareText,
        });
        onShareSuccess('native');
        return;
      }
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: '직장인 잔혹사 : 퇴근길',
        text: shareText,
        dialogTitle: '도전장 보내기',
      });
      onShareSuccess('native');
      return;
    } catch (e) {
      const err = e as { name?: string } | undefined;
      if (err?.name === 'AbortError') return;
      // 실패 → 클립보드 폴백
    }

    // 2차 — 클립보드 복사
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        onShareSuccess('clipboard');
        return;
      }
    } catch {
      // 클립보드도 실패 (권한/컨텍스트 문제)
    }

    // 3차 — DEV 빌드 시뮬레이션 (로컬 테스트용)
    if (import.meta.env.DEV) {
      const ok = window.confirm(
        '[DEV] 공유 시뮬레이션\n\n' +
        '공유 API와 클립보드 모두 사용 불가 (HTTP 환경 등).\n' +
        '공유 성공으로 처리할까요? (미션 카운트 +1)',
      );
      if (ok) {
        onShareSuccess('native');
        return;
      }
      gameBus.emit('toast', '[DEV] 시뮬레이션 취소');
      return;
    }

    // 4차 — 프로덕션 & 모두 실패 (미션 카운트 X)
    gameBus.emit('toast', '공유를 사용할 수 없는 환경이에요');
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

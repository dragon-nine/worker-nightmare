import { useRef } from 'react';
import { gameBus } from '../../game/event-bus';
import { storage } from '../../game/services/storage';
import { useAudioToggles } from '../hooks/useAudioToggles';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { ModalShell } from '../components/ModalShell';
import { TapButton } from '../components/TapButton';
import { Text } from '../components/Text';
import { Toggle } from '../components/Toggle';

const META_INTRO_PENDING_KEY = 'home.metaIntroPending';
const META_INTRO_SHOWN_KEY = 'home.metaIntroShown';
const META_TIP_DISMISSED_KEY = 'home.metaTipDismissed';

const SECRET_TAP_THRESHOLD = 10;
const SECRET_TAP_WINDOW_MS = 10_000;

export function SettingsOverlay() {
  const scale = useResponsiveScale();
  const { bgmMuted, sfxMuted, handleBgmToggle, handleSfxToggle } = useAudioToggles();
  const tapCountRef = useRef(0);
  const tapWindowStartRef = useRef(0);

  const handleTitleTap = () => {
    const now = Date.now();
    if (tapCountRef.current === 0 || now - tapWindowStartRef.current > SECRET_TAP_WINDOW_MS) {
      tapCountRef.current = 1;
      tapWindowStartRef.current = now;
      return;
    }
    tapCountRef.current += 1;
    if (tapCountRef.current >= SECRET_TAP_THRESHOLD) {
      tapCountRef.current = 0;
      // 설정 모달 닫고 → 메인에서 디버그 모달 (비밀번호 게이트) 띄움
      gameBus.emit('screen-change', 'main');
      gameBus.emit('open-debug', undefined);
    }
  };

  const handleClose = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    gameBus.emit('screen-change', 'main');
  };

  const handleReplayTutorial = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    storage.setBool('tutorialDone', false);
    localStorage.removeItem(META_INTRO_PENDING_KEY);
    localStorage.removeItem(META_INTRO_SHOWN_KEY);
    localStorage.removeItem(META_TIP_DISMISSED_KEY);
    gameBus.emit('toast', '다음 게임부터 튜토리얼이 표시됩니다');
  };

  return (
    <ModalShell onClose={handleClose} maxWidth={340}>
      {/* 타이틀 — 비밀 탭(10초 안에 10번)으로 디버그 모달 진입 */}
      <TapButton
        onTap={handleTitleTap}
        pressScale={1}
        style={{
          width: '100%',
          marginBottom: 20 * scale,
          background: 'transparent',
          border: 'none',
          padding: 0,
        }}
      >
        <Text size={30 * scale} weight={900} align="center">
          설정
        </Text>
      </TapButton>

      {/* 설정 카드 */}
      <div style={{
        background: '#1a1a1f',
        borderRadius: 14 * scale,
        padding: `${20 * scale}px ${28 * scale}px`,
      }}>
        {/* 음악 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16 * scale,
        }}>
          <Text size={22 * scale} weight={700} color="#ddd" as="span">음악</Text>
          <Toggle on={!bgmMuted} onToggle={handleBgmToggle} scale={scale} />
        </div>

        {/* 효과음 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16 * scale,
        }}>
          <Text size={22 * scale} weight={700} color="#ddd" as="span">효과음</Text>
          <Toggle on={!sfxMuted} onToggle={handleSfxToggle} scale={scale} />
        </div>

        {/* 구분선 */}
        <div style={{
          height: 1,
          background: 'rgba(255, 255, 255, 0.08)',
          margin: `${4 * scale}px 0 ${16 * scale}px`,
        }} />

        {/* 튜토리얼 다시 보기 */}
        <TapButton
          onTap={handleReplayTutorial}
          pressScale={0.96}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <Text size={22 * scale} weight={700} color="#ddd" as="span">튜토리얼 다시 보기</Text>
          <Text size={22 * scale} weight={700} color="#888" as="span">›</Text>
        </TapButton>
      </div>

      {/* 음원 크레딧 — CodeManu BGM은 CC BY 3.0이라 법적으로 저작자 표시 필수 */}
      <div
        style={{
          marginTop: 16 * scale,
          textAlign: 'center',
          fontSize: 11 * scale,
          color: 'rgba(255, 255, 255, 0.45)',
          fontFamily: 'sans-serif',
          letterSpacing: 0.3,
          lineHeight: 1.5,
        }}
      >
        Music by CodeManu (
        <a
          href="https://creativecommons.org/licenses/by/3.0/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'underline' }}
        >
          CC BY 3.0
        </a>
        )
        <div style={{ marginTop: 4 * scale, opacity: 0.7 }}>
          v{__APP_VERSION__} ({__BUILD_TIME__})
        </div>
      </div>
    </ModalShell>
  );
}

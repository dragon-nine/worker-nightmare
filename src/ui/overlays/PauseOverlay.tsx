import { gameBus } from '../../game/event-bus';
import { useAudioToggles } from '../hooks/useAudioToggles';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { ModalShell } from '../components/ModalShell';
import { TapButton } from '../components/TapButton';
import { Text } from '../components/Text';
import { Toggle } from '../components/Toggle';

export function PauseOverlay() {
  const scale = useResponsiveScale();
  const { bgmMuted, sfxMuted, handleBgmToggle, handleSfxToggle } = useAudioToggles();

  const handleResume = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    gameBus.emit('resume-game', undefined);
  };

  const handleGoHome = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    gameBus.emit('go-home', undefined);
  };

  return (
    <ModalShell onClose={handleResume} guidanceText="화면 터치 시 게임으로 이동">
      {/* 타이틀 */}
      <Text size={30 * scale} weight={900} align="center" style={{ marginBottom: 20 * scale }}>
        일시정지
      </Text>

      {/* 설정 카드 */}
      <div style={{
        background: '#1a1a1f',
        borderRadius: 14 * scale,
        padding: `${20 * scale}px ${28 * scale}px`,
        marginBottom: 16 * scale,
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
        }}>
          <Text size={22 * scale} weight={700} color="#ddd" as="span">효과음</Text>
          <Toggle on={!sfxMuted} onToggle={handleSfxToggle} scale={scale} />
        </div>
      </div>

      {/* 홈으로 가기 버튼 */}
      <TapButton
        onTap={handleGoHome}
        style={{
          background: '#000',
          borderRadius: 12 * scale,
          padding: `${14 * scale}px`,
          textAlign: 'center',
        }}
      >
        <Text size={20 * scale} weight={700} as="span">홈으로 가기</Text>
      </TapButton>
    </ModalShell>
  );
}

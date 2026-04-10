import { gameBus } from '../../game/event-bus';
import { useAudioToggles } from '../hooks/useAudioToggles';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { ModalShell } from '../components/ModalShell';
import { Text } from '../components/Text';
import { Toggle } from '../components/Toggle';

export function SettingsOverlay() {
  const scale = useResponsiveScale();
  const { bgmMuted, sfxMuted, handleBgmToggle, handleSfxToggle } = useAudioToggles();

  const handleClose = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    gameBus.emit('screen-change', 'main');
  };

  return (
    <ModalShell onClose={handleClose} maxWidth={340}>
      {/* 타이틀 */}
      <Text size={30 * scale} weight={900} align="center" style={{ marginBottom: 20 * scale }}>
        설정
      </Text>

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
        }}>
          <Text size={22 * scale} weight={700} color="#ddd" as="span">효과음</Text>
          <Toggle on={!sfxMuted} onToggle={handleSfxToggle} scale={scale} />
        </div>
      </div>
    </ModalShell>
  );
}

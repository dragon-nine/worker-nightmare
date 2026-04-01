import { gameBus } from '../../game/event-bus';
import { DESIGN_W } from '../../game/layout-types';
import { LayoutRenderer } from '../components/LayoutRenderer';
import { useAudioToggles } from '../hooks/useAudioToggles';
import type { ScreenLayoutJSON } from '../types/screen-layout';
import pauseLayout from '../../../public/layout/pause.json';
import styles from './overlay.module.css';

const MAX_W = 500;
const scale = Math.min(window.innerWidth, MAX_W) / DESIGN_W;

export function PauseOverlay() {
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
    <div className={`${styles.overlay} ${styles.fadeIn}`} onClick={handleResume}>
      <div className={styles.dim} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        <LayoutRenderer
          elements={(pauseLayout as ScreenLayoutJSON).elements}
          scale={scale}
          screenW={Math.min(window.innerWidth, MAX_W)}
          screenH={window.innerHeight}
          screenPadding={(pauseLayout as ScreenLayoutJSON).padding}
          groupVAlign={(pauseLayout as ScreenLayoutJSON).groupVAlign || 'center'}
          textOverrides={{
            'el-mn75ws33-5bwz': `음악 ${bgmMuted ? 'OFF' : 'ON'}`,
            'el-mn75xgke-bj91': `효과음 ${sfxMuted ? 'OFF' : 'ON'}`,
          }}
          clickHandlers={{
            'el-mn75wlue-m5il': handleBgmToggle,
            'el-mn75ws33-5bwz': handleBgmToggle,
            'el-mn75xebg-5f1p': handleSfxToggle,
            'el-mn75xgke-bj91': handleSfxToggle,
            'el-mn8ku90y-e7r3': handleGoHome,
          }}
          toggleStates={{
            'el-mn75wlue-m5il': !bgmMuted,
            'el-mn75xebg-5f1p': !sfxMuted,
          }}
        />
      </div>
    </div>
  );
}

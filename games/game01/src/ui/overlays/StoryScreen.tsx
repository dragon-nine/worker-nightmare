import { gameBus } from '../../game/event-bus';
import { usePress } from '../hooks/usePress';
import styles from './overlay.module.css';

const BASE = import.meta.env.BASE_URL || '/';
const DESIGN_W = 390;

export function StoryScreen() {
  const { handlers, pressStyle } = usePress();
  const scale = Math.min(window.innerWidth, 500) / DESIGN_W;

  const handleTap = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    gameBus.emit('start-game', undefined);
  };

  return (
    <div className={styles.overlay} style={{ background: '#000' }}>
      <div
        className={styles.fadeIn}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={`${BASE}story/story.png`}
          alt="story"
          draggable={false}
          style={{
            width: '100%',
            maxHeight: '75%',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* 하단 버튼 — 홈 화면과 동일 위치 */}
      <div
        style={{
          position: 'absolute',
          bottom: 80 * scale,
          left: 0, right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          className={styles.fadeInThenPulse}
          style={{ width: 214 * scale, position: 'relative' }}
        >
          <div
            onClick={handleTap}
            {...handlers('story-start')}
            style={{
              cursor: 'pointer',
              position: 'relative',
              ...pressStyle('story-start'),
            }}
          >
            <img
              src={`${BASE}main-screen/main-btn.png`}
              alt=""
              draggable={false}
              className={styles.imgBtn}
              style={{ width: '100%', display: 'block', objectFit: 'contain' }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              paddingBottom: 8 * scale,
              justifyContent: 'center',
              fontFamily: 'GMarketSans, sans-serif',
              fontWeight: 900,
              fontSize: 28 * scale,
              color: '#fff',
              WebkitTextStroke: `${5 * scale}px #000`,
              paintOrder: 'stroke fill',
              pointerEvents: 'none',
            }}>
              퇴근 시작
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

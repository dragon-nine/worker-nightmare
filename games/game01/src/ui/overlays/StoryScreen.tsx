import { gameBus } from '../../game/event-bus';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { Text } from '../components/Text';
import styles from './overlay.module.css';

const BASE = import.meta.env.BASE_URL || '/';

export function StoryScreen() {
  const scale = useResponsiveScale();

  const handleTap = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    gameBus.emit('start-game', undefined);
  };

  return (
    <div
      className={styles.overlay}
      style={{ background: '#000', cursor: 'pointer' }}
      onClick={handleTap}
    >
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

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
            maxHeight: '70%',
            objectFit: 'contain',
          }}
        />
        {/* 4컷 만화 바로 아래 깜빡이는 문구 */}
        <div style={{
          marginTop: 20 * scale,
          animation: 'blink 1.5s ease-in-out infinite',
        }}>
          <Text
            size={18 * scale}
            weight={700}
            as="span"
            style={{
              WebkitTextStroke: `${2 * scale}px #000`,
              paintOrder: 'stroke fill',
            }}
          >
            화면을 터치하고 시작
          </Text>
        </div>
      </div>

    </div>
  );
}

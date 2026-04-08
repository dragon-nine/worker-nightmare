import { gameBus } from '../../game/event-bus';
import { storage } from '../../game/services/storage';
import { usePress } from '../hooks/usePress';
import { StartButton } from '../components/StartButton';
import { DESIGN_W } from '../../game/layout-types';
import styles from './overlay.module.css';

const BASE = import.meta.env.BASE_URL || '/';

export function MainScreen() {
  const scale = Math.min(window.innerWidth, 500) / DESIGN_W;
  const { handlers, pressStyle } = usePress();
  const tutorialDone = storage.getBool('tutorialDone');
  const bestScore = storage.getBestScore();

  const handleStart = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    if (!tutorialDone) {
      gameBus.emit('screen-change', 'story');
    } else {
      gameBus.emit('start-game', undefined);
    }
  };

  const handleSettings = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    gameBus.emit('screen-change', 'settings');
  };

  return (
    <div className={styles.overlay}>
      {/* 배경 */}
      <img
        src={`${BASE}main-screen/main-bg.png`}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
        }}
      />

      {/* ── 상단 영역: 아이콘 버튼들 ── */}
      <div
        className={styles.fadeInUp}
        style={{
          position: 'absolute',
          top: `calc(var(--sat, 0px) + ${6 * scale}px)`,
          left: 0,
          right: 0,
          padding: `0 ${16 * scale}px`,
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          zIndex: 10,
          animationDelay: '1.2s',
        }}
      >
        {/* 광고제거 */}
        <div
          onClick={() => gameBus.emit('show-ad-remove', undefined)}
          {...handlers('icon-ad-remove')}
          style={{
            width: 42 * scale, height: 42 * scale,
            borderRadius: 999,
            background: 'linear-gradient(135deg, #f0a030, #ffd060)',
            border: `${2 * scale}px solid #000`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            ...pressStyle('icon-ad-remove'),
          }}
        >
          <svg width={26 * scale} height={26 * scale} viewBox="0 0 24 24" fill="none">
            {/* AD 텍스트 */}
            <text x="12" y="17" textAnchor="middle" fontSize="16" fontWeight="900" fontFamily="Arial, sans-serif" letterSpacing="1" stroke="#000" strokeWidth="3" fill="#fff" paintOrder="stroke fill">AD</text>
            {/* 사선 (\) */}
            <line x1="4" y1="4" x2="20" y2="20" stroke="#000" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="4" y1="4" x2="20" y2="20" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* 우측: ⚙ */}
        <div style={{ display: 'flex', gap: 6 * scale }}>
          <div
            onClick={handleSettings}
            {...handlers('btn-settings')}
            style={{
              width: 42 * scale, height: 42 * scale,
              borderRadius: 999,
              background: '#354a59',
              border: `${2 * scale}px solid #000`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              ...pressStyle('btn-settings'),
            }}
          >
            <svg width={20 * scale} height={20 * scale} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── 타이틀 이미지: 상단에서 15% 위치 ── */}
      <div
        className={`${styles.fadeInUp}`}
        style={{
          position: 'absolute',
          top: '15%',
          left: 0, right: 0,
          display: 'flex',
          justifyContent: 'center',
          animationDelay: '0.2s',
        }}
      >
        <img
          src={`${BASE}main-screen/main-text.png`}
          alt="직장인 잔혹사"
          draggable={false}
          style={{ width: 331 * scale, display: 'block', objectFit: 'contain' }}
        />
      </div>

      {/* ── 하단 영역: 최고기록 + 시작 버튼 ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 80 * scale,
          left: 0, right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}
      >
        {/* 최고기록 */}
        <div
          className={styles.fadeInUp}
          style={{
            fontFamily: 'GMarketSans, sans-serif',
            fontWeight: 900,
            fontSize: 22 * scale,
            color: '#fff',
            textAlign: 'center',
            animationDelay: '0.6s',
            marginBottom: 2 * scale,
            WebkitTextStroke: `${3 * scale}px #000`,
            paintOrder: 'stroke fill',
          }}
        >
          최고기록 {bestScore}
        </div>

        {/* 시작 버튼 */}
        <StartButton label="시작하기" scale={scale} onClick={handleStart} />
      </div>

    </div>
  );
}

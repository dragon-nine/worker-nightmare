import { useState, useEffect } from 'react';
import { gameBus } from '../../game/event-bus';
import { storage } from '../../game/services/storage';

/**
 * 개발용 디버그 패널 — DEV 빌드에서만 표시
 * 우측 상단에 작은 토글로 펼침/접힘
 */
export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [godMode, setGodMode] = useState(() => storage.getBool('godMode'));

  // godMode 외부 변경 감지 (스토리지 직접 토글된 경우)
  useEffect(() => {
    const sync = () => setGodMode(storage.getBool('godMode'));
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const toggleGod = () => {
    gameBus.emit('toggle-godmode', undefined);
    setGodMode(storage.getBool('godMode'));
  };

  const btnStyle: React.CSSProperties = {
    padding: '6px 10px',
    fontSize: 11,
    fontWeight: 700,
    border: '1px solid #555',
    borderRadius: 6,
    background: '#1a1a22',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(var(--sat, 0px) + 4px)',
        right: 4,
        zIndex: 9999,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 4,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          ...btnStyle,
          background: open ? '#c92020' : '#2a2a3a',
          opacity: 0.85,
        }}
      >
        {open ? '× DEBUG' : '🛠 DEBUG'}
      </button>

      {open && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            padding: 6,
            background: 'rgba(0,0,0,0.7)',
            border: '1px solid #444',
            borderRadius: 8,
            backdropFilter: 'blur(4px)',
          }}
        >
          <button
            onClick={toggleGod}
            style={{
              ...btnStyle,
              background: godMode ? '#1a8a1a' : '#1a1a22',
              borderColor: godMode ? '#3fdc3f' : '#555',
            }}
          >
            {godMode ? '✓ 무적 ON' : '무적 OFF'}
          </button>
        </div>
      )}
    </div>
  );
}

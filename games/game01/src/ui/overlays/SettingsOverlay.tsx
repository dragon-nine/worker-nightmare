import { useState } from 'react';
import { gameBus } from '../../game/event-bus';
import { useLayout } from '../hooks/useLayout';
import type { LayoutElement } from '../../game/layout-types';
import styles from './overlay.module.css';

const IMAGE_MAP: Record<string, string> = {};

export function SettingsOverlay() {
  const { positions, elements, scale, ready } = useLayout('settings', IMAGE_MAP);
  const [bgmMuted, setBgmMuted] = useState(localStorage.getItem('bgmMuted') === 'true');
  const [sfxMuted, setSfxMuted] = useState(localStorage.getItem('sfxMuted') === 'true');

  const handleClose = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    gameBus.emit('screen-change', 'main');
  };

  const handleBgmToggle = () => {
    const next = !bgmMuted;
    setBgmMuted(next);
    localStorage.setItem('bgmMuted', String(next));
    gameBus.emit('toggle-bgm', undefined);
  };

  const handleSfxToggle = () => {
    const next = !sfxMuted;
    setSfxMuted(next);
    localStorage.setItem('sfxMuted', String(next));
    gameBus.emit('toggle-sfx', undefined);
  };

  if (!ready) return null;

  // 토글 클릭 핸들러 (토글 + 같은 행 텍스트 모두)
  const toggleHandlers: Record<string, () => void> = {};
  const toggleStates: Record<string, boolean> = {};
  for (const el of elements) {
    if (el.id === 'el-mn75wlue-m5il' || el.id === 'el-mn75ws33-5bwz') {
      toggleHandlers[el.id] = handleBgmToggle;
      toggleStates[el.id] = !bgmMuted;
    }
    if (el.id === 'el-mn75xebg-5f1p' || el.id === 'el-mn75xgke-bj91') {
      toggleHandlers[el.id] = handleSfxToggle;
      toggleStates[el.id] = !sfxMuted;
    }
  }

  // 텍스트 오버라이드 (동적 ON/OFF)
  function getTextOverride(el: LayoutElement): string | null {
    if (el.id === 'el-mn75ws33-5bwz') return `음악 ${bgmMuted ? 'OFF' : 'ON'}`;
    if (el.id === 'el-mn75xgke-bj91') return `효과음 ${sfxMuted ? 'OFF' : 'ON'}`;
    return null;
  }

  return (
    <div className={`${styles.overlay} ${styles.fadeIn}`} onClick={handleClose}>
      <div className={styles.dim} />

      {elements.map((el) => {
        const pos = positions.get(el.id);
        if (!pos) return null;

        const left = pos.x - pos.displayWidth * pos.originX;
        const top = pos.y - pos.displayHeight * pos.originY;
        const onClick = toggleHandlers[el.id];

        return (
          <div
            key={el.id}
            onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
            style={{
              position: 'absolute', left, top, zIndex: 1,
              width: pos.displayWidth, height: pos.displayHeight,
              cursor: onClick ? 'pointer' : undefined,
            }}
          >
            <SettingsElement el={el} scale={scale} toggleOn={toggleStates[el.id]} textOverride={getTextOverride(el)} />
          </div>
        );
      })}
    </div>
  );
}

function SettingsElement({ el, scale, toggleOn, textOverride }: {
  el: LayoutElement; scale: number; toggleOn?: boolean; textOverride?: string | null;
}) {
  // 모달
  if (el.type === 'modal') {
    return (
      <div style={{
        width: '100%', height: '100%',
        background: '#2a292e', borderRadius: 20 * scale,
        position: 'relative',
      }}>
        {/* X 버튼 — admin과 동일 */}
        <div style={{
          position: 'absolute', top: 10 * scale, right: 10 * scale,
          width: 28 * scale, height: 28 * scale,
          background: '#000', borderRadius: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 2,
        }}>
          <span style={{ color: '#fff', fontSize: 14 * scale, fontWeight: 700, lineHeight: 1 }}>✕</span>
        </div>
      </div>
    );
  }

  // 카드
  if (el.type === 'card') {
    return (
      <div style={{
        width: '100%', height: '100%',
        background: el.buttonStyle?.bgColor || '#1a1a1f',
        borderRadius: 16 * scale,
        border: '1px solid rgba(255,255,255,0.08)',
      }} />
    );
  }

  // 토글
  if (el.type === 'toggle') {
    const on = toggleOn ?? false;
    const w = 54 * scale;
    const h = 30 * scale;
    const knob = h - 4 * scale;
    return (
      <div style={{
        width: w, height: h, borderRadius: h / 2,
        background: on ? '#4ade80' : '#434750',
        position: 'relative', transition: 'background 0.2s',
        margin: '0 auto',
      }}>
        <div style={{
          width: knob, height: knob, borderRadius: knob / 2,
          background: on ? '#fff' : '#000',
          position: 'absolute', top: 2 * scale,
          left: on ? w - knob - 2 * scale : 2 * scale,
          transition: 'left 0.2s',
        }} />
      </div>
    );
  }

  // 텍스트
  if (el.type === 'text') {
    const ts = el.textStyle;
    const fontSize = (ts?.fontSizePx || 14) * scale;
    const color = ts?.color || '#fff';
    const strokeWidth = ts?.strokeWidth || 0;
    const gradient = ts?.gradientColors;

    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'GMarketSans, sans-serif', fontWeight: 'bold',
        fontSize, color: gradient ? undefined : color,
        textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.3,
        WebkitTextStroke: strokeWidth ? `${strokeWidth * scale}px ${ts?.strokeColor || '#000'}` : undefined,
        ...(gradient ? {
          background: `linear-gradient(to right, ${gradient[0]}, ${gradient[1]})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        } : {}),
      }}>
        {textOverride ?? el.label ?? el.id}
      </div>
    );
  }

  // 닫기 버튼
  if (el.type === 'close') {
    const s = 32 * scale;
    return (
      <div style={{
        width: s, height: s, borderRadius: 999,
        background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: '#fff', fontSize: s * 0.5, fontWeight: 700, lineHeight: 1 }}>✕</span>
      </div>
    );
  }

  return null;
}

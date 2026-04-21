import { useState } from 'react';
import { ModalShell } from '../../components/ModalShell';
import { TapButton } from '../../components/TapButton';
import { Text } from '../../components/Text';
import { useResponsiveScale } from '../../hooks/useResponsiveScale';
import { gameBus } from '../../../game/event-bus';
import { storage } from '../../../game/services/storage';
import { isAdRemoved } from '../../../game/services/billing';

const AD_REMOVE_KEY = 'ad_removed';

interface Props {
  onClose: () => void;
}

const COIN_GRANT = 10000;
const GEM_GRANT = 10000;

export function DebugModal({ onClose }: Props) {
  const scale = useResponsiveScale();
  const [godMode, setGodMode] = useState(() => storage.getBool('godMode'));
  const [adRemoved, setAdRemoved] = useState(() => isAdRemoved());
  const [coins, setCoins] = useState(() => storage.getNum('coins'));
  const [gems, setGems] = useState(() => storage.getNum('gems'));

  const refresh = () => {
    setCoins(storage.getNum('coins'));
    setGems(storage.getNum('gems'));
  };

  const handleToggleGod = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    gameBus.emit('toggle-godmode', undefined);
    const next = storage.getBool('godMode');
    setGodMode(next);
    gameBus.emit('toast', next ? '무적 ON' : '무적 OFF');
  };

  const handleToggleAdRemoved = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    const next = !adRemoved;
    if (next) {
      localStorage.setItem(AD_REMOVE_KEY, 'true');
    } else {
      localStorage.removeItem(AD_REMOVE_KEY);
    }
    setAdRemoved(next);
    gameBus.emit('toast', next ? '부활 광고 제거 ON (구매 상태)' : '부활 광고 제거 OFF');
  };

  const grant = (key: 'coins' | 'gems', amount: number) => {
    gameBus.emit('play-sfx', 'sfx-click');
    storage.addNum(key, amount);
    refresh();
    gameBus.emit('toast', `${key === 'coins' ? '코인' : '보석'} +${amount.toLocaleString()}`);
  };

  const reset = (key: 'coins' | 'gems') => {
    gameBus.emit('play-sfx', 'sfx-click');
    storage.setNum(key, 0);
    refresh();
    gameBus.emit('toast', `${key === 'coins' ? '코인' : '보석'} 0으로 초기화`);
  };

  return (
    <ModalShell onClose={onClose} maxWidth={340}>
      <Text size={22 * scale} weight={900} align="center" style={{ marginBottom: 4 * scale }}>
        🛠 디버그
      </Text>
      <Text size={11 * scale} color="rgba(255,255,255,0.55)" align="center" style={{ marginBottom: 16 * scale }}>
        DEV 빌드 전용
      </Text>

      {/* 치트 토글 — 무적 모드 + 부활 광고 제거 */}
      <Section title="치트" scale={scale}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 * scale }}>
          <ToggleButton
            label="무적 모드"
            on={godMode}
            scale={scale}
            onTap={handleToggleGod}
          />
          <ToggleButton
            label="부활 광고 제거 (구매 상태)"
            on={adRemoved}
            scale={scale}
            onTap={handleToggleAdRemoved}
          />
        </div>
      </Section>

      {/* 코인 */}
      <Section title={`코인 (현재: ${coins.toLocaleString()})`} scale={scale}>
        <ButtonRow scale={scale}>
          <GrantButton
            label={`+${COIN_GRANT.toLocaleString()}`}
            color="#ffd24a"
            scale={scale}
            onTap={() => grant('coins', COIN_GRANT)}
          />
          <GrantButton
            label="0으로"
            color="rgba(255,255,255,0.5)"
            scale={scale}
            onTap={() => reset('coins')}
            ghost
          />
        </ButtonRow>
      </Section>

      {/* 보석 */}
      <Section title={`보석 (현재: ${gems.toLocaleString()})`} scale={scale}>
        <ButtonRow scale={scale}>
          <GrantButton
            label={`+${GEM_GRANT.toLocaleString()}`}
            color="#3fdcb0"
            scale={scale}
            onTap={() => grant('gems', GEM_GRANT)}
          />
          <GrantButton
            label="0으로"
            color="rgba(255,255,255,0.5)"
            scale={scale}
            onTap={() => reset('gems')}
            ghost
          />
        </ButtonRow>
      </Section>

      {/* 로컬스토리지 초기화 */}
      <Section title="저장소" scale={scale}>
        <TapButton
          onTap={() => {
            const ok = window.confirm('모든 로컬 데이터를 초기화하고 새로고침합니다. 계속할까요?');
            if (!ok) return;
            localStorage.clear();
            window.location.reload();
          }}
          pressScale={0.96}
          style={{
            width: '100%',
            padding: `${10 * scale}px`,
            background: 'rgba(232,89,60,0.12)',
            border: `${1.5 * scale}px solid #e8593c`,
            borderRadius: 9 * scale,
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'GMarketSans, sans-serif',
              fontWeight: 900,
              fontSize: 13 * scale,
              color: '#e8593c',
              letterSpacing: 0.3,
            }}
          >
            ⚠ 로컬스토리지 전체 초기화
          </span>
        </TapButton>
      </Section>
    </ModalShell>
  );
}

function Section({ title, scale, children }: { title: string; scale: number; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 * scale }}>
      <div
        style={{
          fontFamily: 'GMarketSans, sans-serif',
          fontWeight: 700,
          fontSize: 11 * scale,
          color: 'rgba(255,255,255,0.5)',
          marginBottom: 6 * scale,
          letterSpacing: 0.3,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function ButtonRow({ scale, children }: { scale: number; children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 6 * scale }}>{children}</div>;
}

function ToggleButton({
  label,
  on,
  scale,
  onTap,
}: {
  label: string;
  on: boolean;
  scale: number;
  onTap: () => void;
}) {
  return (
    <TapButton
      onTap={onTap}
      pressScale={0.96}
      style={{
        width: '100%',
        padding: `${12 * scale}px`,
        background: on
          ? 'linear-gradient(180deg, #3fdcb0, #1d9e75)'
          : 'rgba(255,255,255,0.06)',
        border: `${2 * scale}px solid ${on ? '#0a3a28' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 10 * scale,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10 * scale,
      }}
    >
      <span
        style={{
          fontFamily: 'GMarketSans, sans-serif',
          fontWeight: 900,
          fontSize: 14 * scale,
          color: on ? '#0a1f15' : '#fff',
          letterSpacing: 0.3,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'GMarketSans, sans-serif',
          fontWeight: 900,
          fontSize: 12 * scale,
          color: on ? '#0a1f15' : 'rgba(255,255,255,0.55)',
          letterSpacing: 0.3,
        }}
      >
        {on ? '✓ ON' : 'OFF'}
      </span>
    </TapButton>
  );
}

function GrantButton({
  label,
  color,
  scale,
  onTap,
  ghost,
}: {
  label: string;
  color: string;
  scale: number;
  onTap: () => void;
  ghost?: boolean;
}) {
  return (
    <TapButton
      onTap={onTap}
      pressScale={0.94}
      style={{
        flex: 1,
        padding: `${10 * scale}px`,
        background: ghost ? 'rgba(255,255,255,0.04)' : `${color}22`,
        border: `${1.5 * scale}px solid ${ghost ? 'rgba(255,255,255,0.12)' : color}`,
        borderRadius: 9 * scale,
        textAlign: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'GMarketSans, sans-serif',
          fontWeight: 900,
          fontSize: 13 * scale,
          color,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </span>
    </TapButton>
  );
}

import { Fragment } from 'react';
import { TapButton } from '../../components/TapButton';
import { Text } from '../../components/Text';

const BASE = import.meta.env.BASE_URL || '/';

export type HomeTab = 'shop' | 'ranking' | 'home' | 'characters';
type LockedTab = 'battle';
type AnyTab = HomeTab | LockedTab;

interface Props {
  active: HomeTab;
  onChange: (tab: HomeTab) => void;
  scale: number;
}

interface TabDef {
  key: AnyTab;
  label: string;
  locked?: boolean;
  icon: (size: number, color: string) => React.ReactNode;
}

const TABS: TabDef[] = [
  {
    key: 'shop',
    label: '상점',
    icon: (s) => (
      <img
        src={`${BASE}ui/tabbar/shop.png`}
        alt=""
        draggable={false}
        style={{ width: s * 1.4, height: s * 1.4, objectFit: 'contain', display: 'block' }}
      />
    ),
  },
  {
    key: 'ranking',
    label: '랭킹',
    icon: (s) => (
      <img
        src={`${BASE}ui/tabbar/ranking.png`}
        alt=""
        draggable={false}
        style={{ width: s * 1.4, height: s * 1.4, objectFit: 'contain', display: 'block' }}
      />
    ),
  },
  {
    key: 'home',
    label: '홈',
    icon: (s) => (
      <img
        src={`${BASE}ui/tabbar/home.png`}
        alt=""
        draggable={false}
        style={{ width: s * 1.4, height: s * 1.4, objectFit: 'contain', display: 'block' }}
      />
    ),
  },
  {
    key: 'battle',
    label: '',
    locked: true,
    icon: (s) => (
      <img
        src={`${BASE}ui/tabbar/lock.png`}
        alt=""
        draggable={false}
        style={{ width: s * 1.4, height: s * 1.4, objectFit: 'contain', display: 'block' }}
      />
    ),
  },
  {
    key: 'characters',
    label: '캐릭터',
    icon: (s) => (
      <img
        src={`${BASE}ui/tabbar/character.png`}
        alt=""
        draggable={false}
        style={{ width: s * 1.4, height: s * 1.4, objectFit: 'contain', display: 'block' }}
      />
    ),
  },
];


export function BottomTabBar({ active, onChange, scale }: Props) {
  const barH = 76 * scale;
  const iconSize = 28 * scale;
  const labelSize = 13 * scale;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: 'var(--sab, 0px)',
        background: 'linear-gradient(180deg, rgba(15,18,28,0) 0%, rgba(15,18,28,0.85) 28%, rgba(15,18,28,0.95) 100%)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderTop: `${1.5 * scale}px solid rgba(255,255,255,0.12)`,
        zIndex: 20,
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          height: barH,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-around',
          padding: `0 ${8 * scale}px`,
        }}
      >
        {TABS.map((tab, idx) => {
          const isActive = !tab.locked && active === tab.key;
          const accent = tab.locked
            ? 'rgba(255,255,255,0.4)'
            : isActive
            ? '#ffd24a'
            : 'rgba(255,255,255,0.9)';
          return (
            <Fragment key={tab.key}>
            <TapButton
              onTap={() => {
                if (tab.locked) return;
                onChange(tab.key as HomeTab);
              }}
              pressScale={tab.locked ? 1 : 0.9}
              style={{
                flex: 1,
                margin: `${6 * scale}px ${2 * scale}px`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3 * scale,
                position: 'relative',
                opacity: tab.locked ? 0.55 : 1,
                cursor: tab.locked ? 'default' : 'pointer',
                background: isActive ? 'rgba(255,210,74,0.12)' : 'transparent',
                borderRadius: 16 * scale,
                border: isActive ? `${1 * scale}px solid rgba(255,210,74,0.30)` : `${1 * scale}px solid transparent`,
                transition: 'background 0.15s ease-out',
              }}
            >
              {/* 활성 표시 — 하단바 상단 라인에 짧은 인디케이터 */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: -7 * scale,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 28 * scale,
                    height: 3 * scale,
                    borderRadius: 999,
                    background: '#ffd24a',
                    boxShadow: '0 0 8px #ffd24a, 0 0 16px #ffd24a60',
                  }}
                />
              )}
              <div
                style={{
                  position: 'relative',
                  transform: isActive ? `scale(1.08)` : 'scale(1)',
                  transition: 'transform 0.15s ease-out',
                }}
              >
                {tab.icon(iconSize, accent)}
              </div>
              <Text
                size={labelSize}
                weight={isActive ? 900 : 700}
                color={accent}
                as="span"
              >
                {tab.label}
              </Text>
            </TapButton>
            {idx < TABS.length - 1 && (
              <div
                style={{
                  width: 1,
                  height: 32 * scale,
                  alignSelf: 'center',
                  background: 'rgba(255,255,255,0.10)',
                  flexShrink: 0,
                }}
              />
            )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

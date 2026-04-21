import { TapButton } from '../../components/TapButton';
import { Text } from '../../components/Text';

export type HomeTab = 'shop' | 'home' | 'characters';

interface Props {
  active: HomeTab;
  onChange: (tab: HomeTab) => void;
  scale: number;
}

interface TabDef {
  key: HomeTab;
  label: string;
  icon: (size: number, color: string) => React.ReactNode;
}

const TABS: TabDef[] = [
  {
    key: 'shop',
    label: '상점',
    icon: (s, c) => (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9h18l-1.5 11a2 2 0 01-2 1.7H6.5a2 2 0 01-2-1.7L3 9z" />
        <path d="M8 9V6a4 4 0 018 0v3" />
      </svg>
    ),
  },
  {
    key: 'home',
    label: '홈',
    icon: (s, c) => (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
      </svg>
    ),
  },
  {
    key: 'characters',
    label: '캐릭터',
    icon: (s, c) => (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {/* 토끼 실루엣 */}
        <ellipse cx="12" cy="15" rx="5" ry="5" />
        <ellipse cx="9" cy="6" rx="1.6" ry="3.5" />
        <ellipse cx="15" cy="6" rx="1.6" ry="3.5" />
        <circle cx="10.5" cy="14" r="0.6" fill={c} />
        <circle cx="13.5" cy="14" r="0.6" fill={c} />
      </svg>
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
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          const accent = isActive ? '#ffd24a' : 'rgba(255,255,255,0.9)';
          return (
            <TapButton
              key={tab.key}
              onTap={() => onChange(tab.key)}
              pressScale={0.9}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3 * scale,
                position: 'relative',
              }}
            >
              {/* 활성 표시 — 상단 짧은 인디케이터 */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
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
                  transform: isActive ? `scale(1.08)` : 'scale(1)',
                  transition: 'transform 0.15s ease-out',
                  filter: isActive ? 'drop-shadow(0 0 4px #ffd24a80)' : 'none',
                }}
              >
                {tab.icon(iconSize, accent)}
              </div>
              <Text
                size={labelSize}
                weight={isActive ? 900 : 700}
                color={accent}
                as="span"
                style={{
                  textShadow: isActive ? '0 0 6px #ffd24a60' : 'none',
                }}
              >
                {tab.label}
              </Text>
            </TapButton>
          );
        })}
      </div>
    </div>
  );
}

import { TapButton } from './TapButton';
import styles from '../overlays/overlay.module.css';

const BASE = import.meta.env.BASE_URL || '/';

interface Props {
  label: string;
  scale: number;
  onClick: () => void;
  /** 인트로 fade-in 애니메이션 재생 여부. 기본 true. 탭 전환 시 false 권장. */
  animate?: boolean;
}

export function StartButton({ label, scale, onClick, animate = true }: Props) {
  return (
    <div
      className={animate ? styles.fadeInThenPulse : styles.pulseOnly}
      style={{ width: 214 * scale, position: 'relative' }}
    >
      <TapButton
        onTap={onClick}
        rapid
        style={{ position: 'relative' }}
      >
        <img
          src={`${BASE}main-screen/main-btn.png`}
          alt=""
          draggable={false}
          style={{ width: '100%', display: 'block', objectFit: 'contain', pointerEvents: 'none' }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          paddingBottom: (label.includes(' ') ? 18 : 14) * scale,
          justifyContent: 'center',
          fontFamily: 'GMarketSans, sans-serif',
          fontWeight: 900,
          fontSize: 28 * scale,
          color: '#fff',
          WebkitTextStroke: `${5 * scale}px #000`,
          paintOrder: 'stroke fill',
          pointerEvents: 'none',
        }}>
          {label}
        </div>
      </TapButton>
    </div>
  );
}

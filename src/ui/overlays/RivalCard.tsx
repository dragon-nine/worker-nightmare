import type { RivalMessage } from './rival-message';

export function RivalCard({ msg, scale }: { msg: RivalMessage; scale: number }) {
  const accent = msg.kind === 'rival' ? '#ffd24a'
    : msg.kind === 'top' ? '#ffd24a'
    : msg.kind === 'pb-new' ? '#7ce4ff'
    : 'rgba(255,255,255,0.78)';
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2 * scale,
        padding: `${6 * scale}px ${12 * scale}px`,
        borderRadius: 12 * scale,
        background: 'rgba(0,0,0,0.35)',
        border: `${1 * scale}px solid ${accent}55`,
        backdropFilter: 'blur(4px)',
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          fontFamily: 'GMarketSans, sans-serif',
          fontSize: 17 * scale,
          fontWeight: 900,
          color: accent,
          letterSpacing: 0.3,
          WebkitTextStroke: `${1.4 * scale}px #000`,
          paintOrder: 'stroke fill',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}
      >
        {msg.title}
      </span>
      {msg.subtitle && (
        <span
          style={{
            fontFamily: 'GMarketSans, sans-serif',
            fontSize: 11 * scale,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.72)',
            letterSpacing: 0.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}
        >
          {msg.subtitle}
        </span>
      )}
    </div>
  );
}

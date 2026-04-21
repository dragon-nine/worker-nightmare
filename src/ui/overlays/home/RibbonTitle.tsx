interface Props {
  label: string;
  scale: number;
}

/**
 * 노란 리본형 섹션 타이틀 — 양쪽 끝 화살표 노치, 내부 텍스트
 */
export function RibbonTitle({ label, scale }: Props) {
  const w = 180 * scale;
  const h = 40 * scale;
  const notch = 12 * scale;

  return (
    <div
      style={{
        position: 'relative',
        width: w,
        height: h,
        margin: `${4 * scale}px 0`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // SVG ribbon shape
        background: 'linear-gradient(180deg, #ffe14a 0%, #ffba1c 50%, #f29a08 100%)',
        clipPath: `polygon(
          ${notch}px 0%,
          calc(100% - ${notch}px) 0%,
          100% 50%,
          calc(100% - ${notch}px) 100%,
          ${notch}px 100%,
          0% 50%
        )`,
        filter: 'drop-shadow(0 3px 0 rgba(0,0,0,0.35))',
      }}
    >
      {/* 내부 보더 효과 — 작은 인너 리본 */}
      <div
        style={{
          position: 'absolute',
          inset: `${3 * scale}px ${5 * scale}px`,
          background: 'transparent',
          border: `${1.5 * scale}px solid rgba(120,60,0,0.55)`,
          clipPath: `polygon(
            ${notch * 0.8}px 0%,
            calc(100% - ${notch * 0.8}px) 0%,
            100% 50%,
            calc(100% - ${notch * 0.8}px) 100%,
            ${notch * 0.8}px 100%,
            0% 50%
          )`,
          pointerEvents: 'none',
        }}
      />
      <span
        style={{
          fontFamily: 'GMarketSans, sans-serif',
          fontWeight: 900,
          fontSize: 18 * scale,
          color: '#fff',
          letterSpacing: 0.5,
          WebkitTextStroke: `${2 * scale}px #6b3500`,
          paintOrder: 'stroke fill',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
}

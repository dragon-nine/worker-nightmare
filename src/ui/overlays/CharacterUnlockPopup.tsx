import { useEffect, useRef, useState } from 'react';
import { gameBus, type CharacterUnlockPopupData } from '../../game/event-bus';
import { Text } from '../components/Text';
import { useNativeTap } from '../hooks/useNativeTap';
import { useResponsiveScale } from '../hooks/useResponsiveScale';

const BASE = import.meta.env.BASE_URL || '/';
const FADE_MS = 240;

export function CharacterUnlockPopup() {
  const scale = useResponsiveScale();
  const [data, setData] = useState<CharacterUnlockPopupData | null>(null);
  const [visible, setVisible] = useState(false);
  const clearTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = gameBus.on('show-character-unlock', (incoming) => {
      if (!incoming) return;
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      setData(incoming);
      setVisible(true);
      window.setTimeout(() => gameBus.emit('play-sfx', 'sfx-reward'), 60);
    });
    return () => {
      unsub();
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  const handleDismiss = () => {
    if (!data) return;
    gameBus.emit('play-sfx', 'sfx-click');
    setVisible(false);
    clearTimerRef.current = window.setTimeout(() => setData(null), FADE_MS);
  };

  const dismissRef = useNativeTap(handleDismiss);

  if (!data) return null;

  const formattedDesc = data.desc.replace(/(\.["']?)\s+/g, '$1\n');

  return (
    <div
      ref={dismissRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${24 * scale}px`,
        background: 'radial-gradient(circle at center, rgba(255,219,104,0.22), rgba(8,10,18,0.9) 60%)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 360 * scale,
          borderRadius: 24 * scale,
          padding: `${26 * scale}px ${22 * scale}px ${20 * scale}px`,
          background: 'linear-gradient(180deg, rgba(47,26,12,0.98), rgba(18,11,28,0.98))',
          border: `${2 * scale}px solid rgba(255,214,92,0.9)`,
          boxShadow: `0 ${12 * scale}px ${36 * scale}px rgba(0,0,0,0.45), 0 0 ${32 * scale}px rgba(255,214,92,0.28)`,
          overflow: 'hidden',
        }}
        // eslint-disable-next-line no-restricted-syntax -- stopPropagation 만 수행, 탭 액션 없음
        onClick={(e) => e.stopPropagation()}
      >
        <BurstDeco scale={scale} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Text
            size={14 * scale}
            weight={900}
            color="#ffd65c"
            align="center"
            style={{ letterSpacing: 1.4, marginBottom: 16 * scale }}
          >
            NEW CHARACTER
          </Text>

          <div
            style={{
              width: 164 * scale,
              height: 164 * scale,
              margin: `0 auto ${16 * scale}px`,
              borderRadius: 24 * scale,
              background: 'radial-gradient(circle at 50% 35%, rgba(255,239,174,0.28), rgba(255,177,59,0.08) 45%, rgba(13,14,24,0.1) 70%)',
              border: `${1.5 * scale}px solid rgba(255,223,127,0.4)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `inset 0 ${1 * scale}px 0 rgba(255,255,255,0.18), 0 0 ${30 * scale}px rgba(255,204,84,0.22)`,
            }}
          >
            <img
              src={`${BASE}${data.src}`}
              alt={data.name}
              draggable={false}
              style={{
                width: '86%',
                height: '86%',
                objectFit: 'contain',
                filter: `drop-shadow(0 ${8 * scale}px ${16 * scale}px rgba(0,0,0,0.45))`,
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              gap: 8 * scale,
              flexWrap: 'wrap',
              marginBottom: 8 * scale,
            }}
          >
            <Text size={24 * scale} weight={900} align="center">{data.name}</Text>
            <Text size={12 * scale} weight={700} color="rgba(255,255,255,0.62)" as="span">
              {data.jobTitle}
            </Text>
          </div>

          <Text
            size={12 * scale}
            color="rgba(255,255,255,0.78)"
            align="center"
            lineHeight={1.5}
            style={{ marginBottom: 16 * scale, whiteSpace: 'pre-wrap' }}
          >
            {formattedDesc}
          </Text>
        </div>
      </div>

      <div
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 220ms ease-out',
          marginTop: 14 * scale,
          pointerEvents: 'none',
        }}
      >
        <Text
          size={13 * scale}
          weight={700}
          color="rgba(255, 255, 255, 0.72)"
          align="center"
          as="span"
          style={{
            letterSpacing: 0.5,
            textShadow: `0 ${1 * scale}px ${2 * scale}px rgba(0, 0, 0, 0.6)`,
            animation: 'characterUnlockHintBlink 1.4s ease-in-out infinite',
          }}
        >
          화면 터치 시 계속
        </Text>
      </div>

      <style>{`
        @keyframes characterUnlockHintBlink {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function BurstDeco({ scale }: { scale: number }) {
  const stars = [
    { top: 18, left: 26, size: 18, opacity: 0.9 },
    { top: 30, right: 30, size: 14, opacity: 0.72 },
    { top: 120, left: 18, size: 12, opacity: 0.6 },
    { top: 132, right: 16, size: 16, opacity: 0.8 },
  ];

  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 25%, rgba(255,232,144,0.22), transparent 42%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -36 * scale,
          left: '50%',
          width: 220 * scale,
          height: 220 * scale,
          transform: 'translateX(-50%)',
          borderRadius: '50%',
          background: 'conic-gradient(from 0deg, rgba(255,214,92,0.35), rgba(255,214,92,0.04), rgba(255,214,92,0.35))',
          filter: `blur(${20 * scale}px)`,
          pointerEvents: 'none',
        }}
      />
      {stars.map((star, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          style={{
            position: 'absolute',
            top: star.top * scale,
            left: star.left !== undefined ? star.left * scale : undefined,
            right: star.right !== undefined ? star.right * scale : undefined,
            width: star.size * scale,
            height: star.size * scale,
            opacity: star.opacity,
            pointerEvents: 'none',
          }}
        >
          <path d="M12 2l2.4 7.1L22 12l-7.6 2.9L12 22l-2.4-7.1L2 12l7.6-2.9L12 2z" fill="#ffd65c" />
        </svg>
      ))}
    </>
  );
}

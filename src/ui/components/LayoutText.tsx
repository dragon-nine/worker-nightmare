import type { LayoutElement } from '../../game/layout-types';

interface Props {
  el: LayoutElement;
  scale: number;
  overrideText?: string | null;
  /** LayoutRenderer용: height 100% 대신 padding 사용 */
  compact?: boolean;
}

export function LayoutText({ el, scale, overrideText, compact }: Props) {
  const ts = el.textStyle;
  const fontSizePx = ts?.fontSizePx || 14;
  const color = ts?.color || '#fff';
  const strokeWidth = ts?.strokeWidth || 0;
  const strokeColor = ts?.strokeColor || '#000';
  const gradient = ts?.gradientColors;

  return (
    <div
      style={{
        color: gradient ? undefined : color,
        textAlign: 'center',
        width: '100%',
        height: compact ? undefined : '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'GMarketSans, sans-serif',
        fontWeight: 700,
        whiteSpace: 'pre-line',
        lineHeight: 1.4,
        fontSize: `${Math.max(6, fontSizePx * scale)}px`,
        padding: compact ? `${4 * scale}px 0` : undefined,
        WebkitTextStroke: strokeWidth
          ? `${strokeWidth * scale}px ${strokeColor}`
          : undefined,
        paintOrder: strokeWidth ? 'stroke fill' : undefined,
        ...(gradient ? {
          background: `linear-gradient(to bottom, ${gradient[0]}, ${gradient[1]})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        } : {}),
      }}
    >
      {overrideText ?? el.label ?? el.id}
    </div>
  );
}

import type { LayoutElement } from '../../game/layout-types';
import { typeScale, buttonStyleDefaults, gradientTokens } from './design-tokens';

interface Props {
  el: LayoutElement;
  scale: number;
  overrideText?: string | null;
  /** LayoutRenderer용: 내부 padding 추가 */
  withPadding?: boolean;
}

export function LayoutButton({ el, scale, overrideText, withPadding }: Props) {
  const bs = el.buttonStyle;
  const scaleKey = bs?.scaleKey || 'lg';
  const ts = typeScale[scaleKey] || typeScale.lg;
  const bsd = buttonStyleDefaults[bs?.styleType || 'outline'];
  const bgGrad = bs?.bgGradient ? gradientTokens[bs.bgGradient] : null;
  const bgStyle = bgGrad
    ? `linear-gradient(${bgGrad.direction}, ${bgGrad.from}, ${bgGrad.to})`
    : bs?.bgColor || '#24282c';
  const text = overrideText ?? el.label ?? '버튼';
  const padding = withPadding ? `${14 * scale}px ${20 * scale}px` : undefined;

  const textStyle: React.CSSProperties = {
    fontFamily: 'GMarketSans, sans-serif',
    fontSize: ts.fontSize * scale,
    fontWeight: ts.fontWeight,
    color: '#fff',
    WebkitTextStroke: ts.stroke ? `${ts.stroke * scale}px #000` : undefined,
    paintOrder: 'stroke fill',
  };

  return (
    <div style={{
      width: withPadding ? undefined : '100%',
      height: withPadding ? undefined : '100%',
      background: bgStyle,
      borderRadius: bsd.borderRadius * scale,
      border: bsd.borderWidth > 0 ? `${bsd.borderWidth * scale}px solid ${bsd.borderColor}` : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: bs?.styleType === 'doubleLine' ? `${3 * scale}px` : undefined,
    }}>
      {bs?.styleType === 'doubleLine' ? (
        <div style={{
          width: '100%', height: withPadding ? undefined : '100%',
          border: `${bsd.innerLineWidth * scale}px solid ${bsd.innerLineColor}`,
          borderRadius: (bsd.borderRadius - 4) * scale,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding,
        }}>
          <span style={textStyle}>{text}</span>
        </div>
      ) : (
        <div style={{ padding }}>
          <span style={textStyle}>{text}</span>
        </div>
      )}
    </div>
  );
}

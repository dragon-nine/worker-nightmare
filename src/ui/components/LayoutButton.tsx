import { useRef, useEffect, useState } from 'react';
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

  const baseFontSize = ts.fontSize * scale;
  const [fontSize, setFontSize] = useState(baseFontSize);
  const textRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 텍스트가 넘치면 폰트 축소
  useEffect(() => {
    const span = textRef.current;
    const container = containerRef.current;
    if (!span || !container) return;

    let size = baseFontSize;
    span.style.fontSize = `${size}px`;

    while (span.scrollWidth > container.clientWidth && size > 8) {
      size -= 0.5;
      span.style.fontSize = `${size}px`;
    }
    setFontSize(size);
  }, [baseFontSize, text]);

  const textStyle: React.CSSProperties = {
    fontFamily: 'GMarketSans, sans-serif',
    fontSize,
    fontWeight: ts.fontWeight,
    color: '#fff',
    WebkitTextStroke: ts.stroke ? `${ts.stroke * scale}px #000` : undefined,
    paintOrder: 'stroke fill',
    whiteSpace: 'nowrap',
  };

  const innerContent = (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding,
      }}
    >
      <span ref={textRef} style={textStyle}>{text}</span>
    </div>
  );

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
        }}>
          {innerContent}
        </div>
      ) : innerContent}
    </div>
  );
}

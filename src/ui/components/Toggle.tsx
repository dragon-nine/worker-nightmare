import { TapDiv } from './TapDiv';

interface Props {
  on: boolean;
  onToggle: () => void;
  scale: number;
}

export function Toggle({ on, onToggle, scale }: Props) {
  const w = 52 * scale;
  const h = 30 * scale;
  const knob = h - 4 * scale;
  return (
    <TapDiv
      onTap={onToggle}
      stopPropagation
      style={{
        width: w,
        height: h,
        borderRadius: h / 2,
        background: on ? '#4ade80' : '#434750',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: knob,
        height: knob,
        borderRadius: knob / 2,
        background: on ? '#fff' : '#888',
        position: 'absolute',
        top: 2 * scale,
        left: on ? w - knob - 2 * scale : 2 * scale,
        transition: 'left 0.2s, background 0.2s',
      }} />
    </TapDiv>
  );
}

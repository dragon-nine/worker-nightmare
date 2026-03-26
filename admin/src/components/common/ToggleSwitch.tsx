import { colors } from './design-tokens'

interface Props {
  on?: boolean
  size?: number
  style?: React.CSSProperties
}

export default function ToggleSwitch({ on = false, size = 48, style }: Props) {
  const h = size
  const w = size * 1.75
  const knobSize = h - 4
  const knobX = on ? w - knobSize - 2 : 2

  return (
    <div style={{
      width: w,
      height: h,
      borderRadius: h / 2,
      background: colors.steel,
      position: 'relative',
      cursor: 'pointer',
      transition: 'background 0.2s',
      ...style,
    }}>
      <div style={{
        width: knobSize,
        height: knobSize,
        borderRadius: knobSize / 2,
        background: colors.black,
        position: 'absolute',
        top: 2,
        left: knobX,
        transition: 'left 0.2s',
      }} />
    </div>
  )
}

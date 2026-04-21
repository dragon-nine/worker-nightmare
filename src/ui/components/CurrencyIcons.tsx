/**
 * 코인/보석 아이콘 — 단일 진실 원천(SSOT)
 *
 * 모든 화면(홈, 상점, 캐릭터, 디버그 등)에서 동일한 아이콘을 사용하기 위한 공용 컴포넌트.
 * PNG 에셋(public/ui/coin.png, public/ui/gem.png)을 사용.
 */

const BASE = import.meta.env.BASE_URL || '/';

interface IconProps {
  size: number;
}

/** 골드 코인 — public/ui/coin.png */
export function CoinIcon({ size }: IconProps) {
  return (
    <img
      src={`${BASE}ui/coin.png`}
      alt=""
      draggable={false}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        flexShrink: 0,
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  );
}

/** 보석 — public/ui/gem.png */
export function GemIcon({ size }: IconProps) {
  return (
    <img
      src={`${BASE}ui/gem.png`}
      alt=""
      draggable={false}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        flexShrink: 0,
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  );
}

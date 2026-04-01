/** 디자인 토큰 — 어드민 에디터와 동일한 값 (단일 소스) */

export const typeScale: Record<string, { fontSize: number; fontWeight: number; stroke: number }> = {
  '3xl': { fontSize: 76, fontWeight: 900, stroke: 6 },
  '2xl': { fontSize: 56, fontWeight: 900, stroke: 6 },
  xl: { fontSize: 44, fontWeight: 900, stroke: 4 },
  lg: { fontSize: 32, fontWeight: 900, stroke: 3 },
  md: { fontSize: 28, fontWeight: 900, stroke: 3 },
  sm: { fontSize: 20, fontWeight: 700, stroke: 2 },
  xs: { fontSize: 16, fontWeight: 700, stroke: 0 },
  '2xs': { fontSize: 13, fontWeight: 400, stroke: 0 },
};

export const buttonStyleDefaults: Record<string, { borderWidth: number; borderColor: string; innerLineWidth: number; innerLineColor: string; borderRadius: number }> = {
  flat: { borderWidth: 0, borderColor: 'transparent', innerLineWidth: 0, innerLineColor: 'transparent', borderRadius: 12 },
  outline: { borderWidth: 3, borderColor: '#000000', innerLineWidth: 0, innerLineColor: 'transparent', borderRadius: 12 },
  doubleLine: { borderWidth: 3, borderColor: '#000000', innerLineWidth: 2, innerLineColor: '#4d4340', borderRadius: 12 },
  pill: { borderWidth: 0, borderColor: 'transparent', innerLineWidth: 0, innerLineColor: 'transparent', borderRadius: 9999 },
};

export const gradientTokens: Record<string, { from: string; to: string; direction: string }> = {
  'White → Ice Blue': { from: '#ffffff', to: '#c1e5ff', direction: 'to bottom' },
  'Crimson → Maroon': { from: '#e5332f', to: '#771615', direction: '135deg' },
  'Wine → Black': { from: '#2a0c10', to: '#000000', direction: 'to bottom' },
};

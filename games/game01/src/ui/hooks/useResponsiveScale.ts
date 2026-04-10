import { DESIGN_W } from '../../game/layout-types';

const MAX_W = 500;

/**
 * 화면 너비 기준 스케일 비율.
 * MAX_W(500px)를 상한으로, DESIGN_W(390px) 기준으로 계산.
 *
 * 모듈 로드 시점 1회 계산 — 리사이즈에 반응하지 않음 (기존 동작 유지).
 */
const cachedScale = Math.min(window.innerWidth, MAX_W) / DESIGN_W;

export function useResponsiveScale(): number {
  return cachedScale;
}

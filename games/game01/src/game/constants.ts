// ── Game constants ──
export const NUM_LANES = 2;                // 전체 레인 수
export const VISIBLE_LANES = 2;            // 화면에 보이는 레인 수
export const MAX_TIME = 5;                 // 최대 시간 (초)
export const START_TIME = 5;               // 시작 시간 (초)
export const PADDING = 30;                 // 도로 양쪽 여백 (px)
export const OBSTACLE_SIZE_RATIO = 1.1;    // 장애물 크기 = laneW * ratio
export const RABBIT_SIZE_RATIO = 1.2;      // 토끼 크기 = laneW * ratio

// ── UI constants ──
export const BTN_MARGIN = -10;
export const BTN_BOTTOM_OFFSET = 85;
export const BTN_PRESS_SCALE = 0.85;
export const BTN_PRESS_DURATION = 80;

// ── Types ──
export type Lane = number;       // 0 ~ NUM_LANES-1
export type RoadType = number;   // 0 ~ NUM_LANES-1

export interface RoadRow {
  type: RoadType;
  isTurn: boolean;
  y: number;
  tiles: Phaser.GameObjects.Image[];
  decoration?: Phaser.GameObjects.Container;
}

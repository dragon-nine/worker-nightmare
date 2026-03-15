// ── Game constants ──
export const MAX_TIME = 10;               // 최대 시간 (초)
export const START_TIME = 10;             // 시작 시간 (초)
export const ACTION_BONUS = 2;            // 액션 성공 시 획득 시간 (초)
export const TICK_INTERVAL_START = 1000;  // 초기 틱 간격 (ms) — 1초에 1초 감소
export const TICK_INTERVAL_MIN = 300;     // 최소 틱 간격 (ms) — 이 이상 빨라지지 않음
export const TICK_ACCEL = 10;             // 틱마다 간격이 줄어드는 양 (ms)
export const PADDING = 30;                // 도로 양쪽 여백 (px)
export const OBSTACLE_CHANCE = 0.8;       // 빈 레인에 장애물 등장 확률 (0~1)
export const OBSTACLE_SIZE_RATIO = 1.1;   // 장애물 크기 = laneW * ratio
export const RABBIT_SIZE_RATIO = 1;       // 토끼 크기 = laneW * ratio

// ── UI constants ──
export const BTN_SIZE = 200;              // 버튼 크기 (px, 정사각형)
export const BTN_MARGIN = -10;            // 버튼 ↔ 화면 가장자리 여백 (px, 음수=밖으로)
export const BTN_BOTTOM_OFFSET = 85;      // 화면 하단 → 버튼 중심 거리 (px)
export const BTN_PRESS_SCALE = 0.85;      // 버튼 눌렀을 때 축소 비율 (0~1)
export const BTN_PRESS_DURATION = 80;     // 버튼 눌림 애니메이션 시간 (ms)

// ── Types ──
export type Lane = 'left' | 'right';
export type RoadType = 'left' | 'right';

export interface RoadRow {
  type: RoadType;
  isTurn: boolean;
  y: number;
  leftTile?: Phaser.GameObjects.Image;
  rightTile?: Phaser.GameObjects.Image;
  decoration?: Phaser.GameObjects.Container;
}

export interface LanePositions {
  left: number;
  right: number;
}

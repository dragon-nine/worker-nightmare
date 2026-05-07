// ── Game constants ──
export const NUM_LANES = 2;                // 전체 레인 수
export const VISIBLE_LANES = 2;            // 화면에 보이는 레인 수
export const MAX_TIME = 5;                 // 최대 시간 (초)
export const START_TIME = 5;               // 시작 시간 (초)
export const PADDING = 30;                 // 도로 양쪽 여백 (px)
export const RABBIT_SIZE_RATIO = 1.2;      // 토끼 크기 = laneW * ratio
export const PLAYER_Y_RATIO = 3 / 4;       // 플레이어 화면 Y 위치 (height 대비)

// ── Types ──
export type Lane = number;       // 0 ~ NUM_LANES-1
export type RoadType = number;   // 0 ~ NUM_LANES-1

export interface RoadRow {
  type: RoadType;
  isTurn: boolean;
  y: number;
  tiles: Phaser.GameObjects.Image[];
  decoration?: Phaser.GameObjects.Container;
  coin?: Phaser.GameObjects.Image;
  coinCollected?: boolean;
  dust?: Phaser.GameObjects.Image;
  dustConsumed?: boolean;
  /** 뒤로가기 장애물 — 통과 시 N칸 후진 */
  rewind?: Phaser.GameObjects.Container;
  /** 뒤로가기 칸 수 (1~3) */
  rewindCount?: number;
  rewindConsumed?: boolean;
}

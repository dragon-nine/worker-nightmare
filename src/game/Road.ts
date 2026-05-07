import Phaser from 'phaser';
import type { RoadRow, RoadType } from './constants';
import { obstaclesForCurrentMode } from './services/stages';

/**
 * 직선 타일에 코인이 스폰될 확률.
 * 코인은 점수와 무관 (잔액 충전만).
 * 평균적으로 직선/턴 타일이 1:1로 나타나고
 *  - 턴 행: +2점 (스위치+전진)
 *  - 직선 행: +1점 (전진)
 *  → 한 쌍당 3점, p코인.
 *  → p=0.20 이면 1코인/15점 ≈ 300점당 20코인.
 */
const COIN_SPAWN_RATE = 0.2;

/**
 * 타일 장애물(먼지더미/후진) 통합 스폰 — 5~30 행 간격 랜덤 (부드러운 균등).
 * 같은 행에 여러 장애물 겹치지 않게 단일 슬롯으로 관리. 구름은 별도(시간 기반).
 */
const TILE_OBSTACLE_MIN_ROW = 8;
const TILE_OBSTACLE_MIN_GAP = 5;
const TILE_OBSTACLE_MAX_GAP = 30;

function pickNextObstacleAt(currentIdx: number): number {
  const gap = TILE_OBSTACLE_MIN_GAP + Math.floor(Math.random() * (TILE_OBSTACLE_MAX_GAP - TILE_OBSTACLE_MIN_GAP + 1));
  return currentIdx + gap;
}

/** 후진 칸 수 분포 — 35% 2칸, 30% 3칸, 20% 4칸, 15% 5칸 */
function pickRewindCount(): number {
  const r = Math.random();
  if (r < 0.35) return 2;
  if (r < 0.65) return 3;
  if (r < 0.85) return 4;
  return 5;
}

export class Road {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private laneWorldX: number[];
  private numLanes: number;
  private laneW: number;
  private tileH: number;

  rows: RoadRow[] = [];
  startY = 0;
  private straightRemaining = 0;
  /** 다음 타일 장애물(먼지/후진) 배치할 행 idx — 같은 행에 두 종류 겹치지 않도록 단일 슬롯 */
  private nextObstacleAt = -1;

  constructor(
    scene: Phaser.Scene,
    laneWorldX: number[],
    laneW: number,
    tileH: number,
    numLanes: number,
  ) {
    this.scene = scene;
    this.laneWorldX = laneWorldX;
    this.laneW = laneW;
    this.tileH = tileH;
    this.numLanes = numLanes;
    this.container = scene.add.container(0, 0).setDepth(5);
  }

  getContainer() {
    return this.container;
  }

  /** 튜토리얼 transition-road 중 DOM 미러 렌더용 타일 정보 */
  getMirrorTiles() {
    const out: Array<{ x: number; y: number; w: number; h: number; texKey: string }> = [];
    for (const row of this.rows) {
      for (const tile of row.tiles) {
        out.push({
          x: this.container.x + tile.x,
          y: this.container.y + tile.y,
          w: tile.displayWidth,
          h: tile.displayHeight,
          texKey: tile.texture.key,
        });
      }
    }
    return out;
  }

  /** 튜토리얼 중 Phaser 도로 숨김 (DOM 미러가 대체 렌더) */
  setVisibleForTutorial(visible: boolean) {
    this.container.setAlpha(visible ? 1 : 0);
  }

  generateInitial(height: number, startLane: number, startY?: number) {
    this.startY = startY ?? height - 200;
    this.straightRemaining = 1;
    this.addRow(startLane, this.startY);

    for (let i = 0; i < 25; i++) {
      this.addNextRow();
    }
  }

  /**
   * 튜토리얼 전용 초기 도로:
   * - row 0: 시작 타일 (lane 0)
   * - row 1: TR 턴 (lane 0→1) — 첫 전진 후 방향전환 연습 가능
   * - row 2+: 랜덤
   */
  generateTutorialInitial(height: number, startY?: number) {
    this.startY = startY ?? height - 200;

    const startTile = this.createTile(this.laneWorldX[0], this.startY, 'tile-road-start');
    this.container.add(startTile);
    this.rows.push({ type: 0 as RoadType, y: this.startY, isTurn: false, tiles: [startTile] });

    // row 1: TR 턴 — 첫 전진 착지 지점
    this.addRow(1 as RoadType, this.startY - this.tileH);

    this.straightRemaining = 0;
    for (let i = 0; i < 25; i++) {
      this.addNextRow();
    }
  }

  /**
   * 시작 연출: 토끼가 빈 땅에 서있고, 위쪽부터 길 시작
   * - row 0: 빈 땅 (토끼만 서있음)
   * - row 1~: 직선으로 시작하는 정상 도로
   * 첫 액션은 전진(↑)으로 게임 시작
   */
  generateInitialStand(height: number, startLane: number, startY?: number) {
    this.startY = startY ?? height - 200;

    // row 0: 토끼 시작 위치 (시작 타일)
    const startTile = this.createTile(this.laneWorldX[startLane], this.startY, 'tile-road-start');
    this.container.add(startTile);
    this.rows.push({ type: startLane as RoadType, y: this.startY, isTurn: false, tiles: [startTile] });

    // row 1: 직선 (토끼 바로 위)
    const row1Y = this.startY - this.tileH;
    this.addRow(startLane as RoadType, row1Y);

    // 첫 직선 타일 — 그대로 표시

    // row 2: TR 턴 (lane 0→1, 오른쪽으로 꺾임)
    this.addRow(1 as RoadType, this.startY - this.tileH * 2);

    // 이후 완전 랜덤
    this.straightRemaining = 0;

    for (let i = 0; i < 25; i++) {
      this.addNextRow();
    }
  }

  addNextRow() {
    const last = this.rows[this.rows.length - 1];
    const nextY = last.y - this.tileH;
    const nextType = this.pickNextRoadType(last.type);
    this.addRow(nextType, nextY);
  }

  cleanupOldRows(currentRowIdx: number): number {
    // 후진 장애물이 최대 5칸까지 보내므로 충분한 행 보존
    const KEEP_BEHIND = 13;
    while (currentRowIdx > KEEP_BEHIND) {
      const old = this.rows.shift()!;
      old.tiles.forEach(t => t.destroy());
      old.decoration?.destroy();
      old.coin?.destroy();
      old.dust?.destroy();
      old.rewind?.destroy();
      currentRowIdx--;
      this.nextObstacleAt--;
    }
    return currentRowIdx;
  }

  private addRow(type: RoadType, y: number) {
    const prev = this.rows.length > 0 ? this.rows[this.rows.length - 1] : null;
    const isTurn = prev !== null && prev.type !== type;
    const row: RoadRow = { type, y, isTurn, tiles: [] };

    if (isTurn) {
      const prevLane = prev!.type;
      const lowerLane = Math.min(prevLane, type);
      const higherLane = Math.max(prevLane, type);
      const goingRight = type > prevLane;

      if (goingRight) {
        // left→right: lower gets corner-tl, higher gets corner-br
        const dept = this.createTile(this.laneWorldX[lowerLane], y, 'tile-corner-tl');
        const arr = this.createTile(this.laneWorldX[higherLane], y, 'tile-corner-br');
        row.tiles.push(dept, arr);
        this.container.add(dept);
        this.container.add(arr);
      } else {
        // right→left: lower gets corner-bl, higher gets corner-tr
        const arr = this.createTile(this.laneWorldX[lowerLane], y, 'tile-corner-bl');
        const dept = this.createTile(this.laneWorldX[higherLane], y, 'tile-corner-tr');
        row.tiles.push(arr, dept);
        this.container.add(arr);
        this.container.add(dept);
      }
    } else {
      const road = this.createTile(this.laneWorldX[type], y, 'tile-straight');
      row.tiles.push(road);
      this.container.add(road);

      // 직선 타일에만 코인 스폰 (시작 직후 몇 줄은 스킵)
      if (this.rows.length > 3 && Math.random() < COIN_SPAWN_RATE) {
        this.spawnCoin(row, this.laneWorldX[type], y);
      }

      // 타일 장애물 (먼지더미 / 후진) — 통합 5~30 행 간격 단일 슬롯.
      // 같은 행에 여러 종류 겹치지 않음. 코인 있는 행도 회피.
      const rowIdx = this.rows.length;
      const obs = obstaclesForCurrentMode();
      const enabledTileObs: Array<'dust' | 'rewind'> = [];
      if (obs.dust)   enabledTileObs.push('dust');
      if (obs.rewind) enabledTileObs.push('rewind');

      if (enabledTileObs.length > 0 && !row.coin && rowIdx >= TILE_OBSTACLE_MIN_ROW) {
        if (this.nextObstacleAt < 0) this.nextObstacleAt = pickNextObstacleAt(rowIdx);
        if (rowIdx >= this.nextObstacleAt) {
          const choice = enabledTileObs[Math.floor(Math.random() * enabledTileObs.length)];
          if (choice === 'dust') this.spawnDust(row, this.laneWorldX[type], y);
          else                   this.spawnRewind(row, this.laneWorldX[type], y, pickRewindCount());
          this.nextObstacleAt = pickNextObstacleAt(rowIdx);
        }
      }
    }

    this.rows.push(row);
  }

  private spawnDust(row: RoadRow, x: number, y: number) {
    const size = this.laneW * 0.85;
    const dust = this.scene.add.image(x, y - this.tileH * 0.05, 'paper-pile')
      .setDisplaySize(size, size)
      .setOrigin(0.5, 0.5)
      .setDepth(8);
    this.container.add(dust);
    row.dust = dust;
  }

  /**
   * 뒤로가기 장애물 — 타일 위에 페인트된 표지판 느낌.
   * 추후 에셋 받으면 교체. count = 후진할 칸 수 (1~3).
   */
  private spawnRewind(row: RoadRow, x: number, y: number, count: number) {
    const cx = x;
    const cy = y;
    const bgSize = this.laneW * 0.85; // 타일을 거의 다 덮음

    // 타일 위에 평평하게 깔린 배경 (붉은 사각형 — 도로에 페인트된 경고 표지)
    const bg = this.scene.add.rectangle(cx, cy, bgSize, bgSize, 0xff5544, 0.92)
      .setStrokeStyle(this.laneW * 0.05, 0xffffff, 1);

    // 텍스트 "←N" — 타일 글자처럼 굵고 크게
    const fontPx = Math.round(bgSize * 0.5);
    const text = this.scene.add.text(cx, cy, `←${count}`, {
      fontFamily: 'GMarketSans, sans-serif',
      fontSize: `${fontPx}px`,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.55);

    const wrap = this.scene.add.container(0, 0, [bg, text]).setDepth(7);
    this.container.add(wrap);
    // idle 흔들림 없음 — 타일 위에 평평하게 고정

    row.rewind = wrap;
    row.rewindCount = count;
  }

  private spawnCoin(row: RoadRow, x: number, y: number) {
    const size = this.laneW * 0.5;
    const coin = this.scene.add.image(x, y - this.tileH * 0.05, 'coin')
      .setDisplaySize(size, size)
      .setOrigin(0.5, 0.5)
      .setDepth(8);
    this.container.add(coin);
    row.coin = coin;

    // 위아래로 둥둥 뜨는 효과만 (회전 없음)
    this.scene.tweens.add({
      targets: coin,
      y: y - this.tileH * 0.18,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createTile(x: number, y: number, key: string): Phaser.GameObjects.Image {
    return this.scene.add.image(x, y, key)
      .setDisplaySize(this.laneW, this.tileH)
      .setOrigin(0.5, 0.5);
  }

  private pickNextRoadType(prev: RoadType): RoadType {
    if (this.straightRemaining > 0) {
      this.straightRemaining--;
      return prev;
    }
    this.straightRemaining = Math.floor(Math.random() * 3);
    if (prev === 0) return 1;
    if (prev === this.numLanes - 1) return prev - 1;
    return Math.random() < 0.5 ? prev - 1 : prev + 1;
  }
}

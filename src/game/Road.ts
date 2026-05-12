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

  /** 스테이지 모드 — 목표 row idx 까지만 row 생성하고 그 너머는 차단 */
  private stageGoalIdx: number | null = null;
  /** 미리 그려둔 finish 마커 — 캐릭터 도달 시 burst 시킴 */
  private finishMarkerPieces: Phaser.GameObjects.Rectangle[] | null = null;
  /** 생성 가능한 누적 row 수 — 스테이지 모드에서 setMaxRows() 로 지정 */
  private maxRowsLimit: number | null = null;
  /** 누적 addRow 호출 카운트 — cleanupOldRows 로 rows.shift() 되어도 줄지 않음 */
  private totalRowsAdded = 0;
  /** 스테이지 모드 — turn(코너) row 강제 갯수. pickNextRoadType 에서 분포 보장 */
  private stageTurnQuota: number | null = null;
  private stageTurnsUsed = 0;

  /** 스테이지 모드 — 초기 도로 생성 전에 호출. 이 후 누적 addRow 가 limit 초과 시 무시. */
  setMaxRows(n: number) {
    this.maxRowsLimit = n;
  }

  /** 스테이지 모드 — row 생성 시 turn row 갯수를 정확히 T 개로 강제 */
  setStageTurnQuota(t: number) {
    this.stageTurnQuota = t;
    this.stageTurnsUsed = 0;
  }

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
  generateInitialStand(height: number, startLane: number, startY?: number, stageMode = false) {
    this.startY = startY ?? height - 200;

    // row 0: 토끼 시작 위치 (시작 타일) — addRow 우회하지만 누적 카운트는 +1
    const startTile = this.createTile(this.laneWorldX[startLane], this.startY, 'tile-road-start');
    this.container.add(startTile);
    this.rows.push({ type: startLane as RoadType, y: this.startY, isTurn: false, tiles: [startTile] });
    this.totalRowsAdded++;

    if (!stageMode) {
      // 일반 모드 — row 1 직선 (토끼 바로 위)
      const row1Y = this.startY - this.tileH;
      this.addRow(startLane as RoadType, row1Y);
      // row 2: TR 턴 (lane 0→1) — 첫 전진 후 방향전환 연습 가능
      this.addRow(1 as RoadType, this.startY - this.tileH * 2);
    }

    // 이후 완전 랜덤 (stage 모드면 row 1 부터, 일반 모드면 row 3 부터).
    // 마지막 row 는 addRow 안에서 isFinishRow 처리되어 자동으로 직선 강제.
    this.straightRemaining = 0;

    for (let i = 0; i < 25; i++) {
      this.addNextRow();
    }
  }

  addNextRow() {
    // 누적 생성 상한 도달 시 추가 안 함 (스테이지 모드 피니쉬 너머)
    if (this.maxRowsLimit != null && this.totalRowsAdded >= this.maxRowsLimit) return;
    const last = this.rows[this.rows.length - 1];
    const nextY = last.y - this.tileH;
    // 마지막 row(피니쉬) 는 무조건 직선 — 코너 위에 finish 마커가 그려지면 어색
    const isFinishRow = this.maxRowsLimit != null && this.totalRowsAdded === this.maxRowsLimit - 1;
    const nextType = isFinishRow ? last.type : this.pickNextRoadType(last.type);
    this.addRow(nextType, nextY);
  }

  /**
   * 스테이지 목표 설정 — row[targetIdx] 자리에 finish 마커(체크무늬) 미리 그리기,
   * 그 너머는 destroy + addNextRow 차단으로 만들어지지 않게 함.
   * 마커는 캐릭터 도달 시점에 burstFinishMarker() 로 흩날림.
   */
  setStageGoal(targetRowIdx: number) {
    if (this.rows.length === 0) return;
    // maxRowsLimit 으로 이미 그 너머는 안 만들어졌으므로, 단순히 finish 마커만 그림.
    const finishIdx = Math.min(targetRowIdx, this.rows.length - 1);

    const finishRow = this.rows[finishIdx];
    if (!finishRow) return;
    const w = this.laneW * 2.0;
    const h = Math.max(8, this.tileH * 0.22);
    const y = finishRow.y;
    const cx = this.laneWorldX[0] + (this.laneWorldX[1] - this.laneWorldX[0]) / 2;

    const cells = 12;
    const cellW = w / cells;
    const cellH = h / 2;
    const pieces: Phaser.GameObjects.Rectangle[] = [];

    const base = this.scene.add.rectangle(cx, y, w + 3, h + 3, 0x000000, 1);
    this.container.add(base);
    pieces.push(base);

    for (let i = 0; i < cells; i++) {
      const px = cx - w / 2 + i * cellW + cellW / 2;
      const topRow = i % 2 === 1;
      const py = y - cellH / 2 + (topRow ? 0 : cellH);
      const piece = this.scene.add.rectangle(px, py, cellW * 0.94, cellH * 0.94, 0xffffff, 1);
      this.container.add(piece);
      pieces.push(piece);
    }

    this.finishMarkerPieces = pieces;
    this.stageGoalIdx = finishIdx;
  }

  /** 캐릭터가 finish row 에 도달했을 때 호출 — 마커 cell + 컨페티가 사방으로 흩날리며 사라짐. */
  burstFinishMarker() {
    if (!this.finishMarkerPieces) return;
    // 마커 중심 좌표 (첫 cell 기준) — 컨페티 생성 위치
    const center = this.finishMarkerPieces[0];
    const cx = center.x;
    const cy = center.y;

    // 1) 기존 마커 cell 들 — 더 넓고 강하게 흩날림
    for (const piece of this.finishMarkerPieces) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(120, 280);
      this.scene.tweens.add({
        targets: piece,
        x: piece.x + Math.cos(angle) * dist,
        y: piece.y + Math.sin(angle) * dist - 60,
        alpha: 0,
        angle: Phaser.Math.Between(-360, 360),
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 750,
        ease: 'Cubic.easeOut',
        onComplete: () => piece.destroy(),
      });
    }

    // 2) 노란 컨페티 (작은 도트) — 사방으로 폭발
    const COLORS = [0xffd24a, 0xffe066, 0xf5a623, 0xffffff];
    const CONFETTI_COUNT = 40;
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const size = Phaser.Math.FloatBetween(6, 12);
      const dot = this.scene.add.rectangle(cx, cy, size, size, color, 1);
      this.container.add(dot);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(140, 360);
      this.scene.tweens.add({
        targets: dot,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist - 50,
        alpha: 0,
        angle: Phaser.Math.Between(-540, 540),
        scaleX: 0.3,
        scaleY: 0.3,
        duration: Phaser.Math.Between(700, 1000),
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      });
    }

    // 3) 큰 "CLEAR!" 텍스트 — 위로 떠오르며 페이드
    const clearLabel = this.scene.add.text(cx, cy, 'CLEAR!', {
      fontFamily: 'GMarketSans, sans-serif',
      fontSize: '56px',
      color: '#ffd24a',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5);
    this.container.add(clearLabel);
    clearLabel.setScale(0);
    this.scene.tweens.add({
      targets: clearLabel,
      scale: 1.3,
      duration: 280,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: clearLabel,
      y: cy - 90,
      alpha: 0,
      duration: 900,
      delay: 260,
      ease: 'Cubic.easeIn',
      onComplete: () => clearLabel.destroy(),
    });

    // 4) 화면 flash — 흰 반투명 박스 펄스
    const screenW = this.scene.scale.width;
    const flash = this.scene.add.rectangle(cx, cy, screenW * 4, screenW * 4, 0xffffff, 0.6);
    this.container.add(flash);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });

    this.finishMarkerPieces = null;
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
      // stageGoalIdx 도 같이 보정 (shift 로 array index 가 1 줄어들었으니)
      if (this.stageGoalIdx != null) this.stageGoalIdx--;
    }
    return currentRowIdx;
  }

  private addRow(typeArg: RoadType, y: number) {
    if (this.maxRowsLimit != null && this.totalRowsAdded >= this.maxRowsLimit) return;
    const prev = this.rows.length > 0 ? this.rows[this.rows.length - 1] : null;
    // 마지막 row(피니쉬) 는 무조건 직선 — 호출자가 turn 으로 지정해도 prev lane 강제
    const isFinishRow = this.maxRowsLimit != null && this.totalRowsAdded === this.maxRowsLimit - 1;
    const type: RoadType = isFinishRow && prev ? prev.type : typeArg;
    this.totalRowsAdded++;
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
    // 스테이지 모드 — turn quota 강제 분포
    if (this.stageTurnQuota != null && this.maxRowsLimit != null) {
      const remainingRows = this.maxRowsLimit - this.totalRowsAdded;
      const remainingTurns = this.stageTurnQuota - this.stageTurnsUsed;
      const remainingStraight = remainingRows - remainingTurns;
      // 마지막 row 는 직선 강제 (addRow 에서 별도 처리), 그 이전까지 turn 분포 보장
      // 남은 row 가 남은 turn 갯수와 같거나 적으면 무조건 turn
      if (remainingTurns > 0 && remainingStraight <= 1) {
        this.stageTurnsUsed++;
        return prev === 0 ? 1 : 0;
      }
      // 남은 turn 다 썼으면 무조건 직선
      if (remainingTurns <= 0) return prev;
      // 그 외엔 turn 확률 = remainingTurns / remainingRows
      if (Math.random() < remainingTurns / Math.max(1, remainingRows)) {
        this.stageTurnsUsed++;
        return prev === 0 ? 1 : 0;
      }
      return prev;
    }

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

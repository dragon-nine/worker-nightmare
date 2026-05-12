import Phaser from 'phaser';

interface CloudOpts {
  /** 다음 스폰까지 최소 간격 (ms) */
  minIntervalMs?: number;
  /** 다음 스폰까지 최대 간격 (ms) */
  maxIntervalMs?: number;
  /** 화면 가로 횡단에 걸리는 시간 (ms) */
  travelMs?: number;
  /** 화면 가로 대비 구름 폭 비율 */
  widthRatio?: number;
  /** Y 위치 가능 범위 — 화면 높이 비율 [min, max] */
  yRatioRange?: [number, number];
  /** 구름 불투명도 */
  alpha?: number;
}

const DEFAULTS: Required<CloudOpts> = {
  minIntervalMs: 4500,
  maxIntervalMs: 7000,
  travelMs: 13000,           // 천천히 — 시야를 가리는 시간 길게
  widthRatio: 1.6,
  // 토끼(PLAYER_Y_RATIO=0.75) 위쪽까지 포함 — 장애물 느낌
  yRatioRange: [0.05, 0.85],
  alpha: 1,
};

/** 직전 구름과 yRatio 가 이만큼 떨어진 위치에서만 spawn — 같은 라인 반복 방지 (대략 상하 2 레인) */
const MIN_Y_GAP_RATIO = 0.25;

/**
 * 시간차를 두고 구름이 가로지르는 시각적 장애물. 충돌 판정 없음.
 * 직전 구름과 충분한 상하 갭(>= MIN_Y_GAP_RATIO)을 두고, 직전과 반대 방향에서 출발.
 * 토끼(PLAYER_Y_RATIO) 위로도 지나가서 시야를 가림.
 */
export class CloudManager {
  private timer: Phaser.Time.TimerEvent | null = null;
  private active = new Set<Phaser.GameObjects.Image>();
  private scene: Phaser.Scene;
  private opts: CloudOpts;
  private lastYRatio: number | null = null;
  private lastFromLeft: boolean | null = null;

  constructor(scene: Phaser.Scene, opts: CloudOpts = {}) {
    this.scene = scene;
    this.opts = opts;
  }

  start() {
    if (this.timer) return;
    this.scheduleNext();
  }

  stop() {
    this.timer?.remove(false);
    this.timer = null;
    for (const c of this.active) c.destroy();
    this.active.clear();
  }

  private scheduleNext() {
    const o = { ...DEFAULTS, ...this.opts };
    const delay = Phaser.Math.Between(o.minIntervalMs, o.maxIntervalMs);
    this.timer = this.scene.time.delayedCall(delay, () => {
      this.spawnOne();
      this.scheduleNext();
    });
  }

  private spawnOne() {
    const o = { ...DEFAULTS, ...this.opts };
    const { width, height } = this.scene.scale;

    const variants = ['cloud-1', 'cloud-2', 'cloud-3'] as const;
    const key = variants[Math.floor(Math.random() * variants.length)];

    const cloud = this.scene.add.image(0, 0, key);
    const tex = this.scene.textures.get(key).getSourceImage() as HTMLImageElement;
    const targetW = width * o.widthRatio;
    cloud.setScale(targetW / tex.width);
    cloud.setAlpha(o.alpha);
    cloud.setDepth(200);

    // 방향: 직전과 반대
    const fromLeft = this.lastFromLeft == null ? Math.random() < 0.5 : !this.lastFromLeft;
    this.lastFromLeft = fromLeft;
    const halfW = cloud.displayWidth / 2;
    const startX = fromLeft ? -halfW : width + halfW;
    const endX = fromLeft ? width + halfW : -halfW;
    cloud.setFlipX(!fromLeft);

    // y: 직전과 MIN_Y_GAP_RATIO 이상 떨어진 위치
    const yRatio = pickYRatioWithGap(o.yRatioRange, this.lastYRatio);
    this.lastYRatio = yRatio;
    cloud.setPosition(startX, height * yRatio);

    this.active.add(cloud);
    this.scene.tweens.add({
      targets: cloud,
      x: endX,
      duration: o.travelMs,
      ease: 'Linear',
      onComplete: () => {
        this.active.delete(cloud);
        cloud.destroy();
      },
    });
  }
}

function pickYRatioWithGap(range: [number, number], prev: number | null): number {
  const [min, max] = range;
  if (prev == null) return Phaser.Math.FloatBetween(min, max);
  for (let i = 0; i < 10; i++) {
    const candidate = Phaser.Math.FloatBetween(min, max);
    if (Math.abs(candidate - prev) >= MIN_Y_GAP_RATIO) return candidate;
  }
  // 못 고르면 강제로 반대편 끝에 spawn (prev 가 위쪽이면 아래쪽으로, 아래면 위로)
  return prev > (min + max) / 2 ? min : max;
}

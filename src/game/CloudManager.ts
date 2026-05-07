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
  minIntervalMs: 8000,
  maxIntervalMs: 12000,
  travelMs: 5000,
  widthRatio: 1.6,           // 화면 가로의 1.6배 (기존 2.4 의 2/3)
  yRatioRange: [0.10, 0.55],
  alpha: 0.95,
};

/**
 * 가끔 화면 좌/우 끝에서 등장해 반대쪽으로 흘러가는 구름. 시야를 가리는 시각적 장애물 — 충돌 판정 없음.
 * 플레이어 위에 그려져 길/캐릭터를 덮음. 씬 pause 시 tween 자동 정지.
 */
export class CloudManager {
  private timer: Phaser.Time.TimerEvent | null = null;
  private active = new Set<Phaser.GameObjects.Image>();
  private scene: Phaser.Scene;
  private opts: CloudOpts;

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
      // 한 번에 2개까지 — 첫 번째 즉시, 두 번째 2~3.5초 뒤(서로 겹치지 않게 충분한 간격).
      // stop() 후 두 번째는 발사 안 됨.
      this.spawnOne();
      this.scene.time.delayedCall(Phaser.Math.Between(2000, 3500), () => {
        if (!this.timer) return;
        this.spawnOne();
      });
      this.scheduleNext();
    });
  }

  private spawnOne() {
    const o = { ...DEFAULTS, ...this.opts };
    const { width, height } = this.scene.scale;

    // 3종 중 랜덤 선택 — 같은 구름만 계속 나오면 단조로움
    const variants = ['cloud-1', 'cloud-2', 'cloud-3'] as const;
    const key = variants[Math.floor(Math.random() * variants.length)];

    const cloud = this.scene.add.image(0, 0, key);
    const tex = this.scene.textures.get(key).getSourceImage() as HTMLImageElement;
    const targetW = width * o.widthRatio;
    cloud.setScale(targetW / tex.width);
    cloud.setAlpha(o.alpha);
    cloud.setDepth(200);

    const fromLeft = Math.random() < 0.5;
    const halfW = cloud.displayWidth / 2;
    const startX = fromLeft ? -halfW : width + halfW;
    const endX = fromLeft ? width + halfW : -halfW;
    cloud.setFlipX(!fromLeft);

    const yRatio = Phaser.Math.FloatBetween(o.yRatioRange[0], o.yRatioRange[1]);
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

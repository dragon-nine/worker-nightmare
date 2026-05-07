import Phaser from 'phaser';

interface Opts {
  /** 야근 모드 지속 시간 (ms) */
  durationMs?: number;
  /** 페이드 인/아웃 시간 (ms) */
  fadeMs?: number;
  /** 가장 어두운 가장자리의 검정 alpha (0~1) */
  darkness?: number;
  /** 시야 중심 반경 (laneW 배수) — 이 안쪽은 완전 투명 */
  innerRadiusLaneRatio?: number;
  /** 시야 가장자리 반경 (laneW 배수) — 이 너머는 완전 어둠 */
  outerRadiusLaneRatio?: number;
}

const DEFAULTS: Required<Opts> = {
  durationMs: 4000,
  fadeMs: 300,
  darkness: 0.88,
  innerRadiusLaneRatio: 0.45,
  outerRadiusLaneRatio: 1.3,
};

/**
 * 야근 모드 — 화면 전체를 어둡게 깔고 캐릭터 주변만 부드럽게 밝힘.
 * 캔버스 텍스처에 radial 그라데이션으로 "구멍"을 뚫어 vignette 이미지로 사용,
 * 매 프레임 플레이어 좌표를 따라가도록 위치 갱신.
 */
export class OvertimeManager {
  private scene: Phaser.Scene;
  private getPlayerPos: () => { x: number; y: number };
  private laneW: number;
  private opts: Required<Opts>;
  private texKey = 'overtime-vignette';
  private vignette: Phaser.GameObjects.Image | null = null;
  private endTimer: Phaser.Time.TimerEvent | null = null;
  private updateUnsub: (() => void) | null = null;
  private active = false;

  constructor(
    scene: Phaser.Scene,
    getPlayerPos: () => { x: number; y: number },
    laneW: number,
    opts: Opts = {},
  ) {
    this.scene = scene;
    this.getPlayerPos = getPlayerPos;
    this.laneW = laneW;
    this.opts = { ...DEFAULTS, ...opts };
  }

  isActive() {
    return this.active;
  }

  trigger(origin?: { x: number; y: number }) {
    const burstPos = origin ?? this.getPlayerPos();
    this.spawnDustBurst(burstPos.x, burstPos.y);

    if (this.active) {
      this.extend();
      return;
    }
    this.active = true;
    this.ensureTexture();

    const p = this.getPlayerPos();
    this.vignette = this.scene.add.image(p.x, p.y, this.texKey)
      .setDepth(300)
      .setAlpha(0);

    const update = () => {
      if (!this.vignette) return;
      const pos = this.getPlayerPos();
      this.vignette.setPosition(pos.x, pos.y);
    };
    this.scene.events.on('preupdate', update);
    this.updateUnsub = () => this.scene.events.off('preupdate', update);

    this.scene.tweens.add({
      targets: this.vignette,
      alpha: 1,
      duration: this.opts.fadeMs,
      ease: 'Sine.easeInOut',
    });

    this.endTimer = this.scene.time.delayedCall(this.opts.durationMs, () => this.endFade());
  }

  /** 야근 중 또 다른 먼지 더미 밟으면 시간 연장 */
  private extend() {
    this.endTimer?.remove(false);
    this.endTimer = this.scene.time.delayedCall(this.opts.durationMs, () => this.endFade());
  }

  private endFade() {
    if (!this.vignette) {
      this.cleanup();
      return;
    }
    this.scene.tweens.add({
      targets: this.vignette,
      alpha: 0,
      duration: this.opts.fadeMs,
      ease: 'Sine.easeInOut',
      onComplete: () => this.cleanup(),
    });
  }

  private cleanup() {
    this.updateUnsub?.();
    this.updateUnsub = null;
    this.vignette?.destroy();
    this.vignette = null;
    this.endTimer = null;
    this.active = false;
  }

  stop() {
    this.endTimer?.remove(false);
    this.cleanup();
  }

  /**
   * 서류 더미 통과 시 종이가 사방으로 휘날리는 burst — 두 종류 종이(paper-1, paper-2)를
   * 섞어서 반반 분산. 시야를 잠깐 가리는 시각 효과.
   */
  private spawnDustBurst(x: number, y: number) {
    const baseScale = this.laneW / 512; // paper 에셋 원본 512px 기준
    const PER_KIND = 7; // 종류당 입자 수 (총 14개)
    for (const key of ['paper-1', 'paper-2'] as const) {
      const emitter = this.scene.add.particles(x, y, key, {
        quantity: 0,
        speed: { min: 240, max: 560 },
        angle: { min: 0, max: 360 },
        scale: { start: baseScale * 0.4, end: baseScale * 0.08 },
        alpha: { start: 0.95, end: 0 },
        rotate: { min: 0, max: 360 },
        lifespan: { min: 800, max: 1100 },
        emitting: false,
      });
      emitter.setDepth(350);
      emitter.explode(PER_KIND);
      this.scene.time.delayedCall(1100, () => emitter.destroy());
    }
  }

  private ensureTexture() {
    if (this.scene.textures.exists(this.texKey)) return;
    // 2.2배 — 플레이어가 화면 끝(레인 0/1)에 있어도 vignette 가장자리가 화면 밖에 위치할 만큼만.
    // 3배는 폰 GPU 에 비싸므로 최소 필요량으로 축소.
    const W = Math.ceil(this.scene.scale.width * 2.2);
    const H = Math.ceil(this.scene.scale.height * 2.2);
    const canvasTex = this.scene.textures.createCanvas(this.texKey, W, H);
    if (!canvasTex) return;
    const ctx = canvasTex.getContext();
    const cx = W / 2;
    const cy = H / 2;

    ctx.fillStyle = `rgba(0,0,0,${this.opts.darkness})`;
    ctx.fillRect(0, 0, W, H);

    // destination-out 으로 중심을 부드럽게 뚫음 → 그 부분이 투명해짐
    ctx.globalCompositeOperation = 'destination-out';
    const inner = this.laneW * this.opts.innerRadiusLaneRatio;
    const outer = this.laneW * this.opts.outerRadiusLaneRatio;
    const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    canvasTex.refresh();
  }
}

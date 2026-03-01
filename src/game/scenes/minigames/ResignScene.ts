import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지10: "사직서 투척" — Resignation Letter Launch (Paper Airplane)
 *
 * 1인칭 시점. 사무실 책상 너머 잠든 상사.
 *
 * Phase 1: 사직서 봉투가 하단에 놓여 있음
 *   - 직접 드래그해서 던지면 (TRAP) 상사 얼굴에 맞고 실패
 *   - 봉투 위에서 좌우로 스와이프하면 종이접기 → 종이비행기로 변신
 *
 * Phase 2: 종이비행기 새총 발사
 *   - Angry Birds 스타일로 뒤로 당겨서 발사
 *   - 상사 입 안에 명중 → 성공
 *   - 빗나가면 최대 3회 재시도 가능
 *
 * 25초 제한시간. 시간 초과 → FAIL.
 */
export class ResignScene extends Phaser.Scene {
  private stageId = 0;
  private ended = false;

  // Phase management
  private phase: 'envelope' | 'folding' | 'slingshot' | 'flying' | 'done' = 'envelope';

  // Timer
  private timeLeft = 25;
  private timerText!: Phaser.GameObjects.Text;
  private timerEvent?: Phaser.Time.TimerEvent;

  // Boss
  private bossContainer!: Phaser.GameObjects.Container;
  private bossEmoji!: Phaser.GameObjects.Text;
  private bossZzz!: Phaser.GameObjects.Text;
  private bossMouthTarget!: Phaser.GameObjects.Arc;
  private bossMouthX = 0;
  private bossMouthY = 0;

  // Envelope / Airplane
  private envelopeContainer!: Phaser.GameObjects.Container;
  private envelopeBg!: Phaser.GameObjects.Rectangle;
  private envelopeText!: Phaser.GameObjects.Text;
  private envelopeCornerTL!: Phaser.GameObjects.Triangle;
  private envelopeCornerTR!: Phaser.GameObjects.Triangle;
  private envelopeCornerBL!: Phaser.GameObjects.Triangle;
  private envelopeCornerBR!: Phaser.GameObjects.Triangle;
  private airplaneEmoji!: Phaser.GameObjects.Text;

  // Folding state
  private swipeCount = 0;
  private swipesNeeded = 4;
  private lastPointerX = 0;
  private swipeDirection = 0; // -1 left, 1 right, 0 none
  private swipeDistAccum = 0;
  private isPointerDownOnEnvelope = false;

  // Slingshot state
  private slingshotOriginX = 0;
  private slingshotOriginY = 0;
  private isDraggingAirplane = false;
  private currentDragX = 0;
  private currentDragY = 0;
  private slingshotLineLeft!: Phaser.GameObjects.Graphics;
  private slingshotLineRight!: Phaser.GameObjects.Graphics;
  private trajectoryDots: Phaser.GameObjects.Arc[] = [];
  private slingshotPostLeft!: Phaser.GameObjects.Rectangle;
  private slingshotPostRight!: Phaser.GameObjects.Rectangle;

  // Launch attempts
  private attempts = 0;
  private maxAttempts = 3;
  private attemptText!: Phaser.GameObjects.Text;

  // Direct-throw trap
  private isDirectDragging = false;
  private directDragStartY = 0;

  constructor() {
    super({ key: 'ResignScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.ended = false;
    this.phase = 'envelope';
    this.timeLeft = 25;
    this.swipeCount = 0;
    this.lastPointerX = 0;
    this.swipeDirection = 0;
    this.swipeDistAccum = 0;
    this.isPointerDownOnEnvelope = false;
    this.isDraggingAirplane = false;
    this.isDirectDragging = false;
    this.attempts = 0;
    this.trajectoryDots = [];
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#3d2b1f');

    // ── Background: office / desk area ──
    this.createBackground(width, height);

    // ── Boss sleeping at desk ──
    this.createBoss(width, height);

    // ── Desk in front of boss ──
    this.createDesk(width, height);

    // ── Envelope (resignation letter) ──
    this.createEnvelope(width, height);

    // ── Slingshot posts (hidden initially) ──
    this.createSlingshotPosts(width, height);

    // ── Slingshot graphics (hidden initially) ──
    this.slingshotLineLeft = this.add.graphics().setDepth(14);
    this.slingshotLineRight = this.add.graphics().setDepth(14);

    // ── Top bar ──
    this.add.rectangle(width / 2, 25, width, 50, 0x1a1008, 0.7).setDepth(30);

    this.add.text(20, 25, '📝 사직서 투척', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#ffeedd', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(31);

    this.attemptText = this.add.text(width / 2, 25, '', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31);

    this.timerText = this.add.text(width - 20, 25, `⏱ ${this.timeLeft}`, {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#ff6b6b', fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(31);

    // ── Hint text ──
    const hintText = this.add.text(width / 2, height - 20, '사직서를 상사에게 전달하세요!', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#aa9977',
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: hintText, alpha: { from: 1, to: 0.3 },
      duration: 1500, yoyo: true, repeat: -1,
    });

    // ── Timer ──
    this.timerEvent = this.time.addEvent({
      delay: 1000, repeat: 24,
      callback: () => this.onTimerTick(),
    });

    // ── Input setup ──
    this.setupInput();

    emitGameState({
      scene: 'ResignScene', stageId: this.stageId,
      progress: GameManager.progress, allCleared: GameManager.allCleared,
      stress: GameManager.stress,
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  BACKGROUND
  // ═══════════════════════════════════════════════════════════

  private createBackground(width: number, height: number) {
    // Office wall (upper portion)
    this.add.rectangle(width / 2, 0, width, height * 0.5, 0x5c4033).setOrigin(0.5, 0);

    // Warm ambient glow
    this.add.rectangle(width / 2, height * 0.15, 300, 200, 0x8b6914, 0.08);

    // Floor area
    this.add.rectangle(width / 2, height, width, height * 0.35, 0x2e1f14).setOrigin(0.5, 1);

    // Wall decoration: simple window (two rectangles)
    const winX = width * 0.15;
    const winY = height * 0.15;
    this.add.rectangle(winX, winY, 80, 100, 0x1a2a3a, 0.5).setStrokeStyle(3, 0x4a3a2a);
    this.add.rectangle(winX, winY, 78, 48, 0x223355, 0.3).setOrigin(0.5, 0);

    // Wall decoration: clock
    this.add.text(width * 0.85, height * 0.12, '🕐', {
      fontSize: '32px',
    }).setOrigin(0.5).setAlpha(0.5);

    // Bookshelf hint on left
    this.add.rectangle(width * 0.05, height * 0.35, 40, 120, 0x3d2b1f)
      .setStrokeStyle(1, 0x5a4030);
    this.add.text(width * 0.05, height * 0.32, '📚', {
      fontSize: '20px',
    }).setOrigin(0.5).setAlpha(0.4);
  }

  // ═══════════════════════════════════════════════════════════
  //  BOSS (sleeping at desk)
  // ═══════════════════════════════════════════════════════════

  private createBoss(width: number, height: number) {
    this.bossContainer = this.add.container(width / 2, height * 0.22).setDepth(5);

    // Boss body/chair silhouette
    const chairBack = this.add.rectangle(0, -20, 100, 80, 0x2a2a2a, 0.6);
    this.bossContainer.add(chairBack);

    // Boss emoji (sleeping, head tilted)
    this.bossEmoji = this.add.text(0, -15, '😴', {
      fontSize: '64px',
    }).setOrigin(0.5).setRotation(-0.15);
    this.bossContainer.add(this.bossEmoji);

    // Breathing animation (gentle scale pulse)
    this.tweens.add({
      targets: this.bossEmoji,
      scaleX: { from: 1.0, to: 1.05 },
      scaleY: { from: 1.0, to: 1.08 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Boss mouth target area (the open mouth)
    // Position relative to boss face — slightly below center of emoji
    this.bossMouthX = width / 2 + 5;
    this.bossMouthY = height * 0.22 + 8;

    // Invisible target circle (subtle glow indicator)
    this.bossMouthTarget = this.add.circle(this.bossMouthX, this.bossMouthY, 35, 0xff0000, 0.0)
      .setDepth(6);

    // Subtle pulsing target hint (very faint)
    this.tweens.add({
      targets: this.bossMouthTarget,
      alpha: { from: 0.0, to: 0.06 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });

    // Floating 💤 Zzz above boss
    this.bossZzz = this.add.text(width / 2 + 50, height * 0.08, '💤', {
      fontSize: '28px',
    }).setOrigin(0.5).setDepth(7);

    this.tweens.add({
      targets: this.bossZzz,
      y: height * 0.04,
      x: width / 2 + 65,
      alpha: { from: 1, to: 0.3 },
      scale: { from: 1, to: 1.3 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Second smaller Zzz
    const zzz2 = this.add.text(width / 2 + 70, height * 0.06, 'z', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#aabbcc', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(7).setAlpha(0.5);

    this.tweens.add({
      targets: zzz2,
      y: height * 0.02,
      alpha: { from: 0.5, to: 0.1 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      delay: 500,
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  DESK
  // ═══════════════════════════════════════════════════════════

  private createDesk(width: number, height: number) {
    // Main desk surface
    this.add.rectangle(width / 2, height * 0.38, 500, 40, 0x8b6914)
      .setStrokeStyle(3, 0x5c4a0a).setDepth(4);

    // Desk front panel
    this.add.rectangle(width / 2, height * 0.42, 500, 30, 0x6b5210)
      .setStrokeStyle(2, 0x4a3a08).setDepth(4);

    // Items on desk
    this.add.text(width * 0.35, height * 0.35, '📋', {
      fontSize: '20px',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(4);

    this.add.text(width * 0.62, height * 0.35, '☕', {
      fontSize: '22px',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(4);

    // Name plate on desk
    this.add.rectangle(width / 2, height * 0.36, 70, 18, 0x333333)
      .setDepth(4);
    this.add.text(width / 2, height * 0.36, '부장', {
      fontFamily: 'sans-serif', fontSize: '11px', color: '#dddddd',
    }).setOrigin(0.5).setDepth(4);
  }

  // ═══════════════════════════════════════════════════════════
  //  ENVELOPE (Resignation Letter)
  // ═══════════════════════════════════════════════════════════

  private createEnvelope(width: number, height: number) {
    const envX = width / 2;
    const envY = height * 0.72;

    this.envelopeContainer = this.add.container(envX, envY).setDepth(15);

    // White rectangle envelope body
    this.envelopeBg = this.add.rectangle(0, 0, 140, 90, 0xffffff)
      .setStrokeStyle(2, 0xcccccc);
    this.envelopeContainer.add(this.envelopeBg);

    // "사직서" text on envelope
    this.envelopeText = this.add.text(0, -5, '사직서', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#333333', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.envelopeContainer.add(this.envelopeText);

    // Seal stamp (decorative)
    const seal = this.add.circle(30, 20, 12, 0xcc0000, 0.6);
    this.envelopeContainer.add(seal);

    // Corner triangles (for folding animation, initially hidden)
    this.envelopeCornerTL = this.add.triangle(
      -70, -45, 0, 0, 30, 0, 0, 30, 0xeeeeee,
    ).setAlpha(0);
    this.envelopeCornerTR = this.add.triangle(
      70, -45, 0, 0, -30, 0, 0, 30, 0xeeeeee,
    ).setAlpha(0);
    this.envelopeCornerBL = this.add.triangle(
      -70, 45, 0, 0, 30, 0, 0, -30, 0xeeeeee,
    ).setAlpha(0);
    this.envelopeCornerBR = this.add.triangle(
      70, 45, 0, 0, -30, 0, 0, -30, 0xeeeeee,
    ).setAlpha(0);
    this.envelopeContainer.add([
      this.envelopeCornerTL, this.envelopeCornerTR,
      this.envelopeCornerBL, this.envelopeCornerBR,
    ]);

    // Airplane emoji (hidden until folded)
    this.airplaneEmoji = this.add.text(0, 0, '✈️', {
      fontSize: '48px',
    }).setOrigin(0.5).setAlpha(0).setScale(0);
    this.envelopeContainer.add(this.airplaneEmoji);

    // Make envelope interactive
    this.envelopeBg.setInteractive({ useHandCursor: true, draggable: true });
  }

  // ═══════════════════════════════════════════════════════════
  //  SLINGSHOT POSTS
  // ═══════════════════════════════════════════════════════════

  private createSlingshotPosts(width: number, height: number) {
    this.slingshotOriginX = width / 2;
    this.slingshotOriginY = height * 0.72;

    // Y-shaped slingshot posts
    const postOffset = 50;
    this.slingshotPostLeft = this.add.rectangle(
      this.slingshotOriginX - postOffset, this.slingshotOriginY + 20,
      8, 60, 0x5c4033,
    ).setDepth(13).setAlpha(0).setStrokeStyle(1, 0x3d2b1f);

    this.slingshotPostRight = this.add.rectangle(
      this.slingshotOriginX + postOffset, this.slingshotOriginY + 20,
      8, 60, 0x5c4033,
    ).setDepth(13).setAlpha(0).setStrokeStyle(1, 0x3d2b1f);

    // Post top forks
    const forkL = this.add.rectangle(
      this.slingshotOriginX - postOffset, this.slingshotOriginY - 8,
      12, 8, 0x6b5030,
    ).setDepth(13).setAlpha(0);
    const forkR = this.add.rectangle(
      this.slingshotOriginX + postOffset, this.slingshotOriginY - 8,
      12, 8, 0x6b5030,
    ).setDepth(13).setAlpha(0);

    // Store forks for showing later
    (this as any)._forkL = forkL;
    (this as any)._forkR = forkR;
  }

  // ═══════════════════════════════════════════════════════════
  //  INPUT SETUP
  // ═══════════════════════════════════════════════════════════

  private setupInput() {
    // Pointer down on envelope
    this.envelopeBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.ended) return;

      if (this.phase === 'envelope') {
        this.isPointerDownOnEnvelope = true;
        this.lastPointerX = pointer.x;
        this.swipeDistAccum = 0;
        this.swipeDirection = 0;
        this.directDragStartY = pointer.y;
        this.isDirectDragging = false;
      }
    });

    // Global pointer move
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.ended) return;

      if (this.phase === 'envelope' && this.isPointerDownOnEnvelope) {
        this.handleEnvelopeSwipe(pointer);
      }

      if (this.phase === 'slingshot' && this.isDraggingAirplane) {
        this.handleSlingshotDrag(pointer);
      }
    });

    // Global pointer up
    this.input.on('pointerup', (_pointer: Phaser.Input.Pointer) => {
      if (this.ended) return;

      if (this.phase === 'envelope' && this.isPointerDownOnEnvelope) {
        this.isPointerDownOnEnvelope = false;

        // Check if was direct-dragged upward significantly
        if (this.isDirectDragging) {
          this.onDirectThrow();
        }
      }

      if (this.phase === 'slingshot' && this.isDraggingAirplane) {
        this.onSlingshotRelease();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  ENVELOPE SWIPE (FOLDING MECHANIC)
  // ═══════════════════════════════════════════════════════════

  private handleEnvelopeSwipe(pointer: Phaser.Input.Pointer) {
    const dx = pointer.x - this.lastPointerX;
    const dy = pointer.y - this.directDragStartY;

    // Check if player is dragging upward (direct throw trap)
    if (dy < -60 && Math.abs(dx) < 40) {
      this.isDirectDragging = true;
      // Move envelope with pointer somewhat
      this.envelopeContainer.y = Math.max(
        this.scale.height * 0.3,
        this.scale.height * 0.72 + dy * 0.5,
      );
      return;
    }

    // Horizontal swipe tracking
    const currentDir = dx > 0 ? 1 : dx < 0 ? -1 : 0;

    if (currentDir !== 0 && currentDir !== this.swipeDirection) {
      // Direction changed — count if we accumulated enough distance
      if (Math.abs(this.swipeDistAccum) > 30) {
        this.swipeDirection = currentDir;
        this.swipeDistAccum = 0;
        this.swipeCount++;
        this.onFoldStep();
      } else {
        this.swipeDirection = currentDir;
        this.swipeDistAccum = 0;
      }
    }

    this.swipeDistAccum += dx;
    this.lastPointerX = pointer.x;

    // Visual feedback: slight horizontal wobble during swipe
    if (this.phase === 'envelope') {
      this.envelopeContainer.x = this.scale.width / 2 + Math.sin(this.swipeCount * 0.5) * dx * 0.1;
    }
  }

  private onFoldStep() {
    if (this.ended || this.phase !== 'envelope') return;

    // Show folding progress text
    this.showFloatingText(
      this.envelopeContainer.x,
      this.envelopeContainer.y - 60,
      '착!',
      '#ffd700',
      22,
    );

    // Camera feedback
    this.cameras.main.shake(50, 0.003);

    if (this.swipeCount === 1) {
      // First fold: corners fold in slightly (top corners appear)
      this.tweens.add({
        targets: [this.envelopeCornerTL, this.envelopeCornerTR],
        alpha: 0.8,
        duration: 200,
      });

      // Envelope narrows slightly
      this.tweens.add({
        targets: this.envelopeBg,
        displayWidth: 130,
        duration: 200,
      });
    } else if (this.swipeCount === 2) {
      // Second fold: bottom corners fold too, more narrow
      this.tweens.add({
        targets: [this.envelopeCornerBL, this.envelopeCornerBR],
        alpha: 0.8,
        duration: 200,
      });

      this.tweens.add({
        targets: this.envelopeBg,
        displayWidth: 110,
        displayHeight: 70,
        duration: 200,
      });

      // Text fades
      this.tweens.add({
        targets: this.envelopeText,
        alpha: 0.3,
        fontSize: 14,
        duration: 200,
      });
    } else if (this.swipeCount === 3) {
      // Third fold: getting pointy
      this.tweens.add({
        targets: this.envelopeBg,
        displayWidth: 80,
        displayHeight: 50,
        duration: 200,
      });

      this.tweens.add({
        targets: this.envelopeText,
        alpha: 0,
        duration: 150,
      });

      // Show "착착착!" text
      this.showFloatingText(
        this.envelopeContainer.x,
        this.envelopeContainer.y - 80,
        '착착착!',
        '#ffd700',
        26,
      );
    }

    if (this.swipeCount >= this.swipesNeeded) {
      // Transform into paper airplane!
      this.transformToAirplane();
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  DIRECT THROW (TRAP)
  // ═══════════════════════════════════════════════════════════

  private onDirectThrow() {
    if (this.ended || this.phase !== 'envelope') return;
    this.phase = 'done';

    const { width, height } = this.scale;

    // Fly envelope toward boss face
    this.tweens.add({
      targets: this.envelopeContainer,
      x: this.bossMouthX,
      y: this.bossMouthY - 20, // hits FACE, not mouth
      scale: 0.6,
      duration: 400,
      ease: 'Quad.easeIn',
      onComplete: () => {
        // Bounce off!
        this.cameras.main.shake(200, 0.02);

        // "퉁!" text
        this.showFloatingText(this.bossMouthX, this.bossMouthY - 50, '퉁!', '#ff4444', 32);

        // Envelope bounces away
        this.tweens.add({
          targets: this.envelopeContainer,
          x: width * 0.3,
          y: height * 0.6,
          angle: Phaser.Math.Between(-180, 180),
          scale: 0.3,
          alpha: 0.3,
          duration: 500,
          ease: 'Bounce.easeOut',
        });

        // Boss wakes up angry
        this.time.delayedCall(300, () => {
          this.bossEmoji.setText('😠').setRotation(0);

          // Stop Zzz
          this.tweens.killTweensOf(this.bossZzz);
          this.bossZzz.setAlpha(0);

          // Boss reaction
          this.showFloatingText(
            this.bossMouthX,
            this.bossMouthY - 80,
            '이게 뭐야?! 다시 생각해!',
            '#ff2222',
            20,
          );

          // Boss zooms in angrily
          this.tweens.add({
            targets: this.bossEmoji,
            scaleX: 1.5, scaleY: 1.5,
            duration: 400,
            ease: 'Power3',
          });

          // Ripping animation: show torn letter pieces flying
          this.time.delayedCall(800, () => {
            // Tearing effect
            for (let i = 0; i < 8; i++) {
              const piece = this.add.rectangle(
                this.bossMouthX + Phaser.Math.Between(-20, 20),
                this.bossMouthY + Phaser.Math.Between(-10, 10),
                Phaser.Math.Between(10, 25),
                Phaser.Math.Between(8, 18),
                0xffffff, 0.9,
              ).setDepth(20).setRotation(Phaser.Math.FloatBetween(-1, 1));

              this.tweens.add({
                targets: piece,
                x: piece.x + Phaser.Math.Between(-120, 120),
                y: piece.y + Phaser.Math.Between(60, 180),
                angle: Phaser.Math.Between(-360, 360),
                alpha: 0,
                duration: 800,
                delay: i * 50,
                ease: 'Quad.easeOut',
                onComplete: () => piece.destroy(),
              });
            }

            // Rip sound text
            this.showFloatingText(this.bossMouthX, this.bossMouthY, '찢어!', '#ff0000', 28);
          });

          // Red flash
          this.cameras.main.flash(400, 255, 50, 50, false);
        });

        // FAIL after delay
        this.time.delayedCall(2500, () => {
          this.endGame(false);
        });
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  TRANSFORM TO AIRPLANE
  // ═══════════════════════════════════════════════════════════

  private transformToAirplane() {
    this.phase = 'folding'; // transitional phase
    const { width, height } = this.scale;

    // Camera celebration
    this.cameras.main.flash(200, 255, 215, 0, false);
    this.cameras.main.shake(100, 0.005);

    // Hide envelope pieces, show airplane
    this.tweens.add({
      targets: [this.envelopeBg, this.envelopeCornerTL, this.envelopeCornerTR,
        this.envelopeCornerBL, this.envelopeCornerBR, this.envelopeText],
      alpha: 0,
      scale: 0.5,
      duration: 300,
      ease: 'Quad.easeIn',
    });

    // Airplane appears with flair
    this.tweens.add({
      targets: this.airplaneEmoji,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      delay: 200,
      ease: 'Back.easeOut',
    });

    // Show transformation celebration text
    const transText = this.add.text(width / 2, height * 0.55, '종이비행기 완성!', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#ffd700', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25).setAlpha(0).setScale(0.5);

    this.tweens.add({
      targets: transText,
      alpha: 1, scaleX: 1, scaleY: 1,
      duration: 400, delay: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: transText,
          alpha: 0, y: transText.y - 30,
          duration: 600, delay: 600,
          onComplete: () => transText.destroy(),
        });
      },
    });

    // Sparkle particles
    for (let i = 0; i < 6; i++) {
      const sparkle = this.add.text(
        this.envelopeContainer.x + Phaser.Math.Between(-40, 40),
        this.envelopeContainer.y + Phaser.Math.Between(-30, 30),
        '✨', { fontSize: '20px' },
      ).setOrigin(0.5).setDepth(16).setAlpha(0);

      this.tweens.add({
        targets: sparkle,
        alpha: 1,
        y: sparkle.y - 40,
        duration: 400,
        delay: i * 80,
        onComplete: () => {
          this.tweens.add({
            targets: sparkle,
            alpha: 0,
            duration: 300,
            onComplete: () => sparkle.destroy(),
          });
        },
      });
    }

    // After transformation, enter slingshot mode
    this.time.delayedCall(1200, () => {
      if (this.ended) return;
      this.enterSlingshotMode();
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  SLINGSHOT MODE
  // ═══════════════════════════════════════════════════════════

  private enterSlingshotMode() {
    this.phase = 'slingshot';
    const { width, height } = this.scale;

    // Reset envelope container to slingshot origin
    this.envelopeContainer.setPosition(this.slingshotOriginX, this.slingshotOriginY);
    this.envelopeContainer.setScale(1);

    // Show slingshot posts
    this.tweens.add({
      targets: [this.slingshotPostLeft, this.slingshotPostRight,
        (this as any)._forkL, (this as any)._forkR],
      alpha: 1,
      duration: 300,
      ease: 'Quad.easeOut',
    });

    // Update attempt text
    this.attemptText.setText(`${this.maxAttempts - this.attempts}회 남음`);

    // Show instruction
    this.showFloatingText(
      width / 2,
      height * 0.58,
      '비행기를 뒤로 당겨서 발사!',
      '#aaddff',
      18,
    );

    // Make airplane draggable
    this.airplaneEmoji.setInteractive({ useHandCursor: true });
    this.airplaneEmoji.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.ended || this.phase !== 'slingshot') return;
      this.isDraggingAirplane = true;
      this.currentDragX = pointer.x;
      this.currentDragY = pointer.y;
    });
  }

  private handleSlingshotDrag(pointer: Phaser.Input.Pointer) {
    this.currentDragX = pointer.x;
    this.currentDragY = pointer.y;

    const dx = this.currentDragX - this.slingshotOriginX;
    const dy = this.currentDragY - this.slingshotOriginY;

    // Clamp pull distance
    const maxPull = 150;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, maxPull);
    const angle = Math.atan2(dy, dx);

    const pullX = this.slingshotOriginX + Math.cos(angle) * clampedDist;
    const pullY = this.slingshotOriginY + Math.sin(angle) * clampedDist;

    // Only allow pulling downward/backward (y must increase or x deviation)
    if (pullY < this.slingshotOriginY - 20) {
      return; // Don't allow pulling forward
    }

    // Move airplane to pull position
    this.envelopeContainer.setPosition(pullX, pullY);

    // Rotate airplane to face launch direction
    const launchAngle = Math.atan2(
      this.slingshotOriginY - pullY,
      this.slingshotOriginX - pullX,
    );
    this.airplaneEmoji.setRotation(launchAngle - Math.PI / 2);

    // Draw elastic bands
    this.drawSlingshotBands(pullX, pullY);

    // Draw trajectory dots
    this.drawTrajectory(pullX, pullY, clampedDist);
  }

  private drawSlingshotBands(pullX: number, pullY: number) {
    const postOffset = 50;
    const leftPostX = this.slingshotOriginX - postOffset;
    const rightPostX = this.slingshotOriginX + postOffset;
    const postTopY = this.slingshotOriginY - 8;

    this.slingshotLineLeft.clear();
    this.slingshotLineLeft.lineStyle(4, 0x8b4513, 0.9);
    this.slingshotLineLeft.beginPath();
    this.slingshotLineLeft.moveTo(leftPostX, postTopY);
    this.slingshotLineLeft.lineTo(pullX, pullY);
    this.slingshotLineLeft.strokePath();

    this.slingshotLineRight.clear();
    this.slingshotLineRight.lineStyle(4, 0x8b4513, 0.9);
    this.slingshotLineRight.beginPath();
    this.slingshotLineRight.moveTo(rightPostX, postTopY);
    this.slingshotLineRight.lineTo(pullX, pullY);
    this.slingshotLineRight.strokePath();
  }

  private drawTrajectory(pullX: number, pullY: number, power: number) {
    // Clear old dots
    this.trajectoryDots.forEach(d => d.destroy());
    this.trajectoryDots = [];

    // Launch vector (opposite of pull direction)
    const launchDirX = this.slingshotOriginX - pullX;
    const launchDirY = this.slingshotOriginY - pullY;
    const magnitude = Math.sqrt(launchDirX * launchDirX + launchDirY * launchDirY);

    if (magnitude < 10) return;

    const normX = launchDirX / magnitude;
    const normY = launchDirY / magnitude;
    const speed = power * 3.5;

    // Draw predicted path dots
    const dotCount = 8;
    for (let i = 1; i <= dotCount; i++) {
      const t = i * 0.12;
      const dotX = this.slingshotOriginX + normX * speed * t;
      const dotY = this.slingshotOriginY + normY * speed * t + 0.5 * 200 * t * t; // gravity effect

      // Only show dots within screen bounds
      if (dotX < 0 || dotX > this.scale.width || dotY < 0 || dotY > this.scale.height) break;

      const dot = this.add.circle(dotX, dotY, 4 - i * 0.3, 0xffffff, 0.6 - i * 0.06)
        .setDepth(12);
      this.trajectoryDots.push(dot);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  SLINGSHOT RELEASE
  // ═══════════════════════════════════════════════════════════

  private onSlingshotRelease() {
    if (this.phase !== 'slingshot') return;
    this.isDraggingAirplane = false;
    this.phase = 'flying';
    this.attempts++;

    // Clear trajectory dots
    this.trajectoryDots.forEach(d => d.destroy());
    this.trajectoryDots = [];

    // Clear bands
    this.slingshotLineLeft.clear();
    this.slingshotLineRight.clear();

    // Calculate launch
    const pullX = this.envelopeContainer.x;
    const pullY = this.envelopeContainer.y;
    const dx = this.slingshotOriginX - pullX;
    const dy = this.slingshotOriginY - pullY;
    const pullDist = Math.sqrt(dx * dx + dy * dy);

    // If barely pulled, just snap back
    if (pullDist < 20) {
      this.envelopeContainer.setPosition(this.slingshotOriginX, this.slingshotOriginY);
      this.phase = 'slingshot';
      this.attempts--;
      return;
    }

    // Launch direction (opposite of pull)
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    const normX = dx / magnitude;
    const normY = dy / magnitude;
    const speed = pullDist * 3.5;

    // Calculate landing position
    // Simple projectile: find where it would be after time T
    // We want it to reach boss area (roughly y = bossMouthY)
    const targetTime = 0.5; // fixed flight time for predictable feel
    const landX = this.slingshotOriginX + normX * speed * targetTime;
    const landY = this.slingshotOriginY + normY * speed * targetTime + 0.5 * 150 * targetTime * targetTime;

    // Animate flight
    this.tweens.add({
      targets: this.envelopeContainer,
      x: landX,
      y: landY,
      scale: 0.7,
      duration: 450,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        // Rotate airplane during flight
        this.airplaneEmoji.rotation -= 0.02;
      },
      onComplete: () => {
        this.checkHit(landX, landY);
      },
    });

    // Update attempts display
    this.attemptText.setText(`${Math.max(0, this.maxAttempts - this.attempts)}회 남음`);
  }

  // ═══════════════════════════════════════════════════════════
  //  HIT CHECK
  // ═══════════════════════════════════════════════════════════

  private checkHit(landX: number, landY: number) {
    const dist = Phaser.Math.Distance.Between(landX, landY, this.bossMouthX, this.bossMouthY);

    if (dist < 45) {
      // HIT! Success!
      this.onSuccess();
    } else {
      // Miss
      this.onMiss(landX, landY);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  SUCCESS
  // ═══════════════════════════════════════════════════════════

  private onSuccess() {
    this.phase = 'done';
    const { width, height } = this.scale;

    // Stop timer
    this.stopTimer();

    // "쏙!" text
    this.showFloatingText(this.bossMouthX, this.bossMouthY - 30, '쏙!', '#00ff88', 36);

    // Airplane disappears into mouth
    this.tweens.add({
      targets: this.envelopeContainer,
      x: this.bossMouthX,
      y: this.bossMouthY,
      scale: 0,
      duration: 200,
      ease: 'Quad.easeIn',
    });

    // Boss gulps
    this.time.delayedCall(500, () => {
      this.bossEmoji.setText('😮').setRotation(0);
      this.showFloatingText(this.bossMouthX, this.bossMouthY + 30, '꿀꺽', '#ffaa00', 24);

      // Gulp animation — boss scale pulse
      this.tweens.add({
        targets: this.bossEmoji,
        scaleY: 1.2,
        duration: 150,
        yoyo: true,
      });
    });

    // Dramatic pause, then stamp
    this.time.delayedCall(1400, () => {
      // Stamp animation
      this.cameras.main.shake(300, 0.03);
      this.cameras.main.flash(300, 255, 255, 255);

      // 도장 stamp
      const stamp = this.add.text(width / 2, height * 0.45, '🔴', {
        fontSize: '80px',
      }).setOrigin(0.5).setDepth(30).setScale(3).setAlpha(0);

      this.tweens.add({
        targets: stamp,
        alpha: 1, scaleX: 1, scaleY: 1,
        duration: 200,
        ease: 'Quad.easeIn',
        onComplete: () => {
          // "쾅!" impact text
          this.showFloatingText(width / 2, height * 0.35, '쾅!', '#ff0000', 36);
        },
      });

      // 퇴사 승인 text
      this.time.delayedCall(600, () => {
        const approvalText = this.add.text(width / 2, height * 0.5, '퇴사 승인!', {
          fontFamily: 'sans-serif',
          fontSize: '48px',
          color: '#ff0000',
          fontStyle: 'bold',
          stroke: '#ffffff',
          strokeThickness: 6,
        }).setOrigin(0.5).setDepth(35).setScale(0).setAlpha(0);

        this.tweens.add({
          targets: approvalText,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 500,
          ease: 'Back.easeOut',
        });

        // Subtle pulsing on the approval text
        this.tweens.add({
          targets: approvalText,
          scaleX: { from: 1, to: 1.05 },
          scaleY: { from: 1, to: 1.05 },
          duration: 400,
          yoyo: true,
          repeat: -1,
          delay: 500,
        });

        // Confetti explosion
        this.spawnConfetti();

        // Background color change to celebratory
        this.cameras.main.setBackgroundColor('#1a3320');
      });
    });

    // Transition to result
    this.time.delayedCall(3500, () => {
      this.endGame(true);
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  MISS
  // ═══════════════════════════════════════════════════════════

  private onMiss(landX: number, landY: number) {
    // Crumple animation at landing spot
    this.tweens.add({
      targets: this.envelopeContainer,
      scaleX: 0.3,
      scaleY: 0.3,
      angle: Phaser.Math.Between(-90, 90),
      alpha: 0.4,
      duration: 300,
      ease: 'Bounce.easeOut',
    });

    // "빗나갔다!" text
    this.showFloatingText(landX, landY - 30, '빗나갔다!', '#ff6b6b', 22);

    // Boss stirs but doesn't wake
    this.tweens.add({
      targets: this.bossEmoji,
      rotation: { from: -0.15, to: -0.05 },
      duration: 300,
      yoyo: true,
    });

    // Mumble text
    this.showFloatingText(this.bossMouthX, this.bossMouthY - 50, '음...', '#888888', 16);

    // Camera slight shake
    this.cameras.main.shake(100, 0.005);

    if (this.attempts >= this.maxAttempts) {
      // Out of attempts — boss wakes up
      this.time.delayedCall(800, () => {
        this.bossEmoji.setText('😠').setRotation(0);
        this.tweens.killTweensOf(this.bossZzz);
        this.bossZzz.setAlpha(0);

        this.showFloatingText(
          this.bossMouthX, this.bossMouthY - 70,
          '누가 날 깨웠어?!',
          '#ff2222',
          22,
        );

        this.tweens.add({
          targets: this.bossEmoji,
          scaleX: 1.5, scaleY: 1.5,
          duration: 400,
        });

        this.cameras.main.flash(400, 255, 50, 50, false);
      });

      this.time.delayedCall(2200, () => {
        this.endGame(false);
      });
    } else {
      // Reset for next attempt
      this.time.delayedCall(800, () => {
        if (this.ended) return;

        // Reset airplane position
        this.envelopeContainer.setPosition(this.slingshotOriginX, this.slingshotOriginY);
        this.envelopeContainer.setScale(1);
        this.envelopeContainer.setAngle(0);
        this.envelopeContainer.setAlpha(1);
        this.airplaneEmoji.setRotation(0);

        this.phase = 'slingshot';
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  CONFETTI
  // ═══════════════════════════════════════════════════════════

  private spawnConfetti() {
    const { width, height } = this.scale;
    const emojis = ['🎉', '✨', '🎊', '💯', '⭐', '🥳', '🎈', '🎆'];

    for (let i = 0; i < 20; i++) {
      const emoji = Phaser.Utils.Array.GetRandom(emojis);
      const startX = Phaser.Math.Between(50, width - 50);
      const conf = this.add.text(startX, height + 20, emoji, {
        fontSize: `${Phaser.Math.Between(18, 36)}px`,
      }).setOrigin(0.5).setDepth(40).setAlpha(0);

      this.tweens.add({
        targets: conf,
        alpha: 1,
        y: Phaser.Math.Between(30, height - 30),
        x: startX + Phaser.Math.Between(-80, 80),
        angle: Phaser.Math.Between(-360, 360),
        duration: Phaser.Math.Between(600, 1200),
        delay: i * 60,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: conf,
            alpha: 0,
            y: conf.y + 60,
            duration: 600,
            delay: 400,
            onComplete: () => conf.destroy(),
          });
        },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  TIMER
  // ═══════════════════════════════════════════════════════════

  private onTimerTick() {
    if (this.ended) return;

    this.timeLeft--;
    this.timerText.setText(`⏱ ${this.timeLeft}`);

    if (this.timeLeft <= 5) {
      this.timerText.setColor('#ff0000');
      this.tweens.add({
        targets: this.timerText,
        scaleX: 1.3, scaleY: 1.3,
        duration: 120,
        yoyo: true,
      });
    }

    if (this.timeLeft <= 3) {
      this.cameras.main.flash(100, 255, 50, 50, false);
    }

    if (this.timeLeft <= 0) {
      this.onTimeUp();
    }
  }

  private stopTimer() {
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = undefined;
    }
  }

  private onTimeUp() {
    if (this.ended) return;

    const { width, height } = this.scale;

    // Boss wakes up
    this.bossEmoji.setText('😒').setRotation(0);
    this.tweens.killTweensOf(this.bossZzz);
    this.bossZzz.setAlpha(0);

    // Timeout message
    const timeoutText = this.add.text(width / 2, height * 0.5, '용기가 부족했다...', {
      fontFamily: 'sans-serif', fontSize: '28px', color: '#888888', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30).setAlpha(0);

    this.tweens.add({
      targets: timeoutText,
      alpha: 1,
      duration: 500,
    });

    // Fade everything
    this.cameras.main.fade(1500, 0, 0, 0, false);

    this.time.delayedCall(2000, () => {
      this.endGame(false);
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  END GAME
  // ═══════════════════════════════════════════════════════════

  private endGame(success: boolean) {
    if (this.ended) return;
    this.ended = true;
    this.stopTimer();

    const { width, height } = this.scale;

    // Overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
      .setDepth(50);
    this.tweens.add({
      targets: overlay,
      fillAlpha: 0.5,
      duration: 400,
    });

    if (!success) {
      // Fail result
      const failText = this.add.text(width / 2, height / 2, '💀\n퇴사 실패...', {
        fontFamily: 'sans-serif', fontSize: '32px', color: '#e94560', fontStyle: 'bold',
        align: 'center',
      }).setOrigin(0.5).setDepth(51).setAlpha(0).setScale(0.5);

      this.tweens.add({
        targets: failText,
        alpha: 1, scaleX: 1, scaleY: 1,
        duration: 500,
        ease: 'Back.easeOut',
      });
    }

    this.time.delayedCall(success ? 500 : 1800, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success });
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  UTILITY
  // ═══════════════════════════════════════════════════════════

  private showFloatingText(x: number, y: number, text: string, color: string, size: number) {
    const msg = this.add.text(x, y, text, {
      fontFamily: 'sans-serif', fontSize: `${size}px`, color,
      stroke: '#000000', strokeThickness: 3,
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0).setDepth(35);

    this.tweens.add({
      targets: msg, alpha: 1, y: y - 25,
      duration: 250,
      onComplete: () => {
        this.tweens.add({
          targets: msg, alpha: 0, y: y - 55,
          duration: 500, delay: 600,
          onComplete: () => msg.destroy(),
        });
      },
    });
  }
}

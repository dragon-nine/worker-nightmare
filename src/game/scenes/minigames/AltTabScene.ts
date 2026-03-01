import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지6: 웹서핑 숨기기 — Physical Power Off
 *
 * 1인칭 시점: 쇼핑 사이트가 띄워진 모니터를 바라보고 있다.
 * 왼쪽에서 부장님 그림자가 다가온다 (~8초).
 * 화면 중앙의 [Alt+Tab] 버튼은 함정 — 누르면 응답 없음 + 실패.
 * 모니터 베젤 우하단의 작은 물리 전원 버튼이 정답.
 */
export class AltTabScene extends Phaser.Scene {
  private stageId = 0;
  private ended = false;

  // Layout constants
  private readonly MON_X = 480;
  private readonly MON_Y = 240;
  private readonly MON_W = 800;
  private readonly MON_H = 440;
  private readonly BEZEL = 20;

  // Objects
  private bossShadow!: Phaser.GameObjects.Rectangle;
  private bossShadowGrad!: Phaser.GameObjects.Rectangle;
  private bossLabel!: Phaser.GameObjects.Text;
  private screenContent!: Phaser.GameObjects.Container;
  private altTabBtn!: Phaser.GameObjects.Container;
  private powerBtn!: Phaser.GameObjects.Arc;
  private powerLed!: Phaser.GameObjects.Arc;
  private trapped = false;

  constructor() {
    super({ key: 'AltTabScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.ended = false;
    this.trapped = false;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#2a2a3d');

    // ── Desk surface hint ──
    this.add.rectangle(width / 2, height - 30, width, 60, 0x3d3522);

    // ── Monitor bezel (outer frame) ──
    this.add.rectangle(
      this.MON_X, this.MON_Y,
      this.MON_W + this.BEZEL * 2,
      this.MON_H + this.BEZEL * 2,
      0x222222,
    ).setStrokeStyle(3, 0x111111);

    // Monitor stand
    this.add.rectangle(this.MON_X, this.MON_Y + this.MON_H / 2 + this.BEZEL + 25, 120, 30, 0x1a1a1a);
    this.add.rectangle(this.MON_X, this.MON_Y + this.MON_H / 2 + this.BEZEL + 45, 200, 10, 0x1a1a1a);

    // ── Monitor screen area (bright shopping site) ──
    this.add.rectangle(
      this.MON_X, this.MON_Y,
      this.MON_W, this.MON_H,
      0xffffff,
    );

    // ── Screen content container ──
    this.screenContent = this.add.container(0, 0);

    // Browser chrome bar
    const browserBar = this.add.rectangle(this.MON_X, this.MON_Y - this.MON_H / 2 + 18, this.MON_W, 36, 0xf0f0f0);
    const urlBar = this.add.rectangle(this.MON_X, this.MON_Y - this.MON_H / 2 + 18, 400, 22, 0xffffff)
      .setStrokeStyle(1, 0xcccccc);
    const urlText = this.add.text(this.MON_X, this.MON_Y - this.MON_H / 2 + 18, '🔒 www.mega-hot-deal.co.kr', {
      fontFamily: 'sans-serif', fontSize: '11px', color: '#666666',
    }).setOrigin(0.5);

    // Shopping site banner
    const bannerBg = this.add.rectangle(this.MON_X, this.MON_Y - this.MON_H / 2 + 70, this.MON_W - 40, 50, 0xff3b3b);
    const bannerText = this.add.text(this.MON_X, this.MON_Y - this.MON_H / 2 + 70, '🔥 오늘의 핫딜! 최대 70% OFF 🔥', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Product cards
    const card1Bg = this.add.rectangle(this.MON_X - 160, this.MON_Y - 30, 260, 100, 0xfff9e6)
      .setStrokeStyle(2, 0xffd700);
    const card1Title = this.add.text(this.MON_X - 160, this.MON_Y - 55, '🎧 에어팟 프로', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#333333', fontStyle: 'bold',
    }).setOrigin(0.5);
    const card1Price = this.add.text(this.MON_X - 160, this.MON_Y - 30, '50% OFF!', {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#e94560', fontStyle: 'bold',
    }).setOrigin(0.5);
    const card1Sub = this.add.text(this.MON_X - 160, this.MON_Y - 5, '₩149,000 → ₩74,500', {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#888888',
    }).setOrigin(0.5);

    const card2Bg = this.add.rectangle(this.MON_X + 160, this.MON_Y - 30, 260, 100, 0xe6f9ff)
      .setStrokeStyle(2, 0x3b9dff);
    const card2Title = this.add.text(this.MON_X + 160, this.MON_Y - 55, '📺 삼성 TV 65인치', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#333333', fontStyle: 'bold',
    }).setOrigin(0.5);
    const card2Price = this.add.text(this.MON_X + 160, this.MON_Y - 30, '한정수량!', {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#e94560', fontStyle: 'bold',
    }).setOrigin(0.5);
    const card2Sub = this.add.text(this.MON_X + 160, this.MON_Y - 5, '₩1,890,000 → ₩890,000', {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#888888',
    }).setOrigin(0.5);

    // Flash sale timer at bottom of screen
    const saleBg = this.add.rectangle(this.MON_X, this.MON_Y + 120, 300, 30, 0xffe066);
    const saleText = this.add.text(this.MON_X, this.MON_Y + 120, '⏰ 타임세일 남은시간 00:03:27', {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#c0392b', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.screenContent.add([
      browserBar, urlBar, urlText,
      bannerBg, bannerText,
      card1Bg, card1Title, card1Price, card1Sub,
      card2Bg, card2Title, card2Price, card2Sub,
      saleBg, saleText,
    ]);

    // Blinking sale tag animation
    this.tweens.add({
      targets: [card1Price, card2Price],
      alpha: 0.3,
      duration: 400,
      yoyo: true,
      repeat: -1,
    });

    // ── Alt+Tab trap button (centered, pulsing, eye-catching) ──
    this.altTabBtn = this.add.container(this.MON_X, this.MON_Y + 65);

    const btnBg = this.add.rectangle(0, 0, 200, 50, 0x333399)
      .setStrokeStyle(2, 0x5555cc);
    const btnIcon = this.add.text(-80, 0, '⌨️', {
      fontSize: '22px',
    }).setOrigin(0.5);
    const btnLabel = this.add.text(10, 0, 'Alt + Tab', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    const btnHint = this.add.text(0, 32, '클릭하여 업무화면 전환!', {
      fontFamily: 'sans-serif', fontSize: '12px', color: '#ffdd57', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.altTabBtn.add([btnBg, btnIcon, btnLabel, btnHint]);
    this.altTabBtn.setDepth(3);

    // Pulsing animation to attract clicks
    this.tweens.add({
      targets: this.altTabBtn,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Glow effect around the button
    const glow = this.add.rectangle(this.MON_X, this.MON_Y + 65, 220, 60, 0x5555ff, 0.25)
      .setDepth(2);
    this.tweens.add({
      targets: glow,
      alpha: 0.05,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    btnBg.setInteractive({ useHandCursor: true });
    btnBg.on('pointerdown', () => this.onAltTabClicked());

    // ── Physical power button on bezel (bottom-right, subtle) ──
    // Position it on the bezel, bottom-right area
    const powerX = this.MON_X + this.MON_W / 2 + this.BEZEL / 2;
    const powerY = this.MON_Y + this.MON_H / 2 + 6;

    this.powerBtn = this.add.circle(powerX, powerY, 9, 0x2e2e2e)
      .setStrokeStyle(1, 0x444444)
      .setInteractive({ useHandCursor: true })
      .setDepth(4);

    // Tiny green LED next to power button
    this.powerLed = this.add.circle(powerX, powerY - 14, 3, 0x00ff66)
      .setDepth(4);

    // Subtle LED pulse
    this.tweens.add({
      targets: this.powerLed,
      alpha: 0.3,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.powerBtn.on('pointerdown', () => this.onPowerButtonClicked());

    // ── Boss shadow approaching from left ──
    this.bossShadow = this.add.rectangle(-100, height / 2, 200, height, 0x000000, 0.0)
      .setOrigin(1, 0.5)
      .setDepth(5);

    this.bossShadowGrad = this.add.rectangle(-100, height / 2, 100, height, 0x000000, 0.0)
      .setOrigin(1, 0.5)
      .setDepth(5);

    this.bossLabel = this.add.text(-80, height - 50, '👞 부장님이 다가오고 있다...', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#ff6666',
    }).setOrigin(0, 0.5).setAlpha(0).setDepth(6);

    // Boss approach: discrete footstep-like steps over ~8 seconds
    this.startBossApproach();

    // ── Emit state ──
    emitGameState({
      scene: 'AltTabScene',
      stageId: this.stageId,
      progress: GameManager.progress,
      allCleared: GameManager.allCleared,
      stress: GameManager.stress,
    });
  }

  // ── Boss shadow movement (discrete footsteps) ──
  private startBossApproach() {
    const totalSteps = 12;
    const stepDuration = 650; // ~8s total
    const targetX = this.MON_X + this.MON_W / 2 + this.BEZEL + 50;
    let step = 0;

    // Show label after first step
    this.time.delayedCall(stepDuration, () => {
      if (this.ended) return;
      this.tweens.add({ targets: this.bossLabel, alpha: 1, duration: 300 });
    });

    this.time.addEvent({
      delay: stepDuration,
      repeat: totalSteps - 1,
      callback: () => {
        if (this.ended) return;
        step++;
        const progress = step / totalSteps;
        const newX = Phaser.Math.Linear(-100, targetX, progress);
        const newWidth = Phaser.Math.Linear(200, 500, progress);
        const newAlpha = Phaser.Math.Linear(0.0, 0.7, progress);

        // Snap movement (footstep feel)
        this.tweens.add({
          targets: this.bossShadow,
          x: newX,
          width: newWidth,
          alpha: newAlpha,
          duration: 150,
          ease: 'Stepped',
        });

        this.tweens.add({
          targets: this.bossShadowGrad,
          x: newX + 60,
          alpha: newAlpha * 0.5,
          duration: 150,
          ease: 'Stepped',
        });

        // Move label with shadow
        this.bossLabel.x = Math.max(10, newX - newWidth + 20);

        // Camera shake on each step (gets stronger)
        this.cameras.main.shake(100, 0.002 * progress);

        // Boss arrived => FAIL
        if (step >= totalSteps) {
          this.bossArrived();
        }
      },
    });
  }

  // ── TRAP: Alt+Tab clicked ──
  private onAltTabClicked() {
    if (this.ended || this.trapped) return;
    this.trapped = true;

    // Disable the button visually
    this.altTabBtn.setAlpha(0.5);

    // Show hourglass / freeze
    // Glitch effect on screen
    this.cameras.main.shake(200, 0.008);

    // Windows-style "not responding" overlay on the monitor
    const freezeOverlay = this.add.rectangle(
      this.MON_X, this.MON_Y,
      this.MON_W, this.MON_H,
      0xffffff, 0.7,
    ).setDepth(8);

    const hourglassText = this.add.text(this.MON_X, this.MON_Y - 30, '⏳', {
      fontSize: '48px',
    }).setOrigin(0.5).setDepth(9);

    this.add.text(this.MON_X, this.MON_Y + 30, '응답 없음...', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#cc0000', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(9);

    this.add.text(this.MON_X, this.MON_Y + 60, '(프로그램이 응답하지 않습니다)', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#666666',
    }).setOrigin(0.5).setDepth(9);

    // Hourglass spin
    this.tweens.add({
      targets: hourglassText,
      angle: 360,
      duration: 1500,
      repeat: -1,
    });

    // Glitch flicker
    this.time.addEvent({
      delay: 300,
      repeat: 5,
      callback: () => {
        freezeOverlay.setAlpha(freezeOverlay.alpha === 0.7 ? 0.5 : 0.7);
      },
    });

    // The power button still works even in frozen state!
    // (No extra logic needed -- powerBtn handler is separate)
  }

  // ── Boss has fully arrived ──
  private bossArrived() {
    if (this.ended) return;
    this.ended = true;

    const { width, height } = this.scale;

    // Dark overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setDepth(10);

    this.add.text(width / 2, height / 2 - 20, '👀 들켰다!', {
      fontFamily: 'sans-serif', fontSize: '42px', color: '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);

    this.add.text(width / 2, height / 2 + 30, '"김대리, 지금 뭐 하는 거야?"', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffaaaa',
    }).setOrigin(0.5).setDepth(11);

    this.cameras.main.shake(400, 0.01);

    this.time.delayedCall(1500, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success: false });
    });
  }

  // ── SOLUTION: Physical power button clicked ──
  private onPowerButtonClicked() {
    if (this.ended) return;
    this.ended = true;

    const { width, height } = this.scale;

    // Instant screen off -- CRT shutdown effect
    // 1) White flash
    const flash = this.add.rectangle(this.MON_X, this.MON_Y, this.MON_W, this.MON_H, 0xffffff)
      .setDepth(15);

    // 2) Shrink to horizontal line then to dot
    this.tweens.add({
      targets: flash,
      scaleY: 0.005,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.tweens.add({
          targets: flash,
          scaleX: 0.0,
          alpha: 0,
          duration: 150,
          ease: 'Power3',
          onComplete: () => {
            flash.destroy();
          },
        });
      },
    });

    // 3) Black screen fills monitor
    this.time.delayedCall(150, () => {
      // Hide all screen content
      this.screenContent.setVisible(false);
      this.altTabBtn.setVisible(false);

      // Black monitor screen
      this.add.rectangle(this.MON_X, this.MON_Y, this.MON_W, this.MON_H, 0x000000).setDepth(12);

      // Turn off LED
      this.powerLed.setFillStyle(0x333333);
      this.tweens.killTweensOf(this.powerLed);
      this.powerLed.setAlpha(1);
    });

    // "팟!" sound effect text
    const popText = this.add.text(this.MON_X + 50, this.MON_Y, '팟!', {
      fontFamily: 'sans-serif', fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(16).setAlpha(0);

    this.time.delayedCall(100, () => {
      popText.setAlpha(1);
      this.tweens.add({
        targets: popText,
        alpha: 0,
        y: this.MON_Y - 40,
        duration: 600,
        ease: 'Power2',
      });
    });

    // Boss passes by after monitor is off
    this.time.delayedCall(1000, () => {
      // Boss shadow sweeps across
      this.tweens.add({
        targets: this.bossShadow,
        x: width + 200,
        alpha: 0.3,
        duration: 1200,
        ease: 'Sine.easeInOut',
      });

      const bossComment = this.add.text(width / 2, height - 70, '"어? 김대리 컴퓨터 꺼졌네? 쉬어~"', {
        fontFamily: 'sans-serif', fontSize: '18px', color: '#aaffaa', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(15).setAlpha(0);

      this.tweens.add({
        targets: bossComment,
        alpha: 1,
        duration: 400,
      });
    });

    // SUCCESS after delay
    this.time.delayedCall(2800, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success: true });
    });
  }
}

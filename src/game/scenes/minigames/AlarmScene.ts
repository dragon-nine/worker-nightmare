import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지1: "알람 0.1초 컷" — 스마트폰 망치로 깨부수기
 *
 * 1인칭 시점. 어두운 방. 스마트폰 알람이 울린다.
 * - [중지] 버튼은 누를 때마다 도망감 (TRAP)
 * - [스누즈 5분] 버튼은 알람을 더 키움 (TRAP)
 * - 🥛 물컵은 감전 → FAIL (TRAP)
 * - 🔨 망치(어두운 그림자 속)를 찾아 폰 위에 드래그 → SUCCESS
 *
 * 15초 제한시간. 시간 초과 시 FAIL.
 */
export class AlarmScene extends Phaser.Scene {
  private stageId = 0;
  private ended = false;

  // Phone
  private phone!: Phaser.GameObjects.Container;
  private phoneX = 0;
  private phoneY = 0;
  private phoneW = 160;
  private phoneH = 280;
  private alarmScreen!: Phaser.GameObjects.Rectangle;
  private phoneBorderGlow!: Phaser.GameObjects.Rectangle;

  // Buttons
  private stopBtn!: Phaser.GameObjects.Container;
  private snoozeBtn!: Phaser.GameObjects.Container;
  private stopBtnLocalX = 0;
  private stopBtnLocalY = 0;

  // State
  private stopTapCount = 0;
  private snoozeTapCount = 0;
  private phoneVibeIntensity = 2;
  private phoneVibeTween!: Phaser.Tweens.Tween;

  // Hammer
  private hammer!: Phaser.GameObjects.Text;
  private isDraggingHammer = false;
  private hammerGrabTimer: Phaser.Time.TimerEvent | null = null;

  // Nightstand items
  private waterGlass!: Phaser.GameObjects.Text;

  // Timer
  private timerText!: Phaser.GameObjects.Text;
  private timeLeft = 15;

  constructor() {
    super({ key: 'AlarmScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.ended = false;
    this.stopTapCount = 0;
    this.snoozeTapCount = 0;
    this.phoneVibeIntensity = 2;
    this.isDraggingHammer = false;
    this.hammerGrabTimer = null;
    this.timeLeft = 15;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#08080f');

    // ── Dark room ambience ──
    this.createRoomBackground(width, height);

    // ── Nightstand (right side) ──
    this.createNightstand(width, height);

    // ── Smartphone (center) ──
    this.phoneX = width * 0.42;
    this.phoneY = height * 0.44;
    this.createPhone(width, height);

    // ── Timer (top right) ──
    this.timerText = this.add.text(width - 30, 30, `${this.timeLeft}s`, {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#555577',
    }).setOrigin(1, 0.5).setDepth(20);

    this.time.addEvent({
      delay: 1000, repeat: 14,
      callback: () => this.onTimerTick(),
    });

    // ── Instruction text ──
    const hintText = this.add.text(width / 2, height * 0.92, '알람을 꺼주세요!', {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#555570',
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: hintText, alpha: { from: 1, to: 0.4 },
      duration: 1200, yoyo: true, repeat: -1,
    });

    // ── Drag handling ──
    this.setupDragHandlers();

    emitGameState({
      scene: 'AlarmScene', stageId: this.stageId,
      progress: GameManager.progress, allCleared: GameManager.allCleared,
      stress: GameManager.stress,
    });
  }

  // ═══════════════════════════════════════════════
  //  ROOM BACKGROUND
  // ═══════════════════════════════════════════════

  private createRoomBackground(width: number, height: number) {
    // Subtle vignette effect — darker edges
    this.add.rectangle(width / 2, 0, width, 120, 0x000000, 0.6)
      .setOrigin(0.5, 0);
    this.add.rectangle(width / 2, height, width, 100, 0x000000, 0.5)
      .setOrigin(0.5, 1);
    this.add.rectangle(0, height / 2, 150, height, 0x000000, 0.4)
      .setOrigin(0, 0.5);
    this.add.rectangle(width, height / 2, 150, height, 0x000000, 0.3)
      .setOrigin(1, 0.5);

    // Faint moonlight glow top-left
    this.add.circle(80, 60, 120, 0x223355, 0.08);

    // Floor / bed edge hint
    this.add.rectangle(width / 2, height - 20, width, 40, 0x0e0e18)
      .setOrigin(0.5, 0.5);
  }

  // ═══════════════════════════════════════════════
  //  NIGHTSTAND (right side)
  // ═══════════════════════════════════════════════

  private createNightstand(width: number, height: number) {
    const nsX = width * 0.78;
    const nsY = height * 0.52;

    // Nightstand surface
    this.add.rectangle(nsX, nsY, 180, 120, 0x1a1520, 0.7)
      .setStrokeStyle(2, 0x2a2030);

    // Nightstand legs
    this.add.rectangle(nsX - 75, nsY + 90, 8, 50, 0x151020);
    this.add.rectangle(nsX + 75, nsY + 90, 8, 50, 0x151020);

    // Nightstand top edge (perspective hint)
    this.add.rectangle(nsX, nsY - 55, 190, 8, 0x221a2e);

    // ── Glasses (decorative) ──
    this.add.text(nsX - 45, nsY - 25, '👓', {
      fontSize: '28px',
    }).setOrigin(0.5).setAlpha(0.5);

    // ── Glass of water (TRAP) ──
    this.waterGlass = this.add.text(nsX + 10, nsY - 25, '🥛', {
      fontSize: '34px',
    }).setOrigin(0.5).setAlpha(0.65).setInteractive({ useHandCursor: true });

    // Water glass hover glow
    this.waterGlass.on('pointerover', () => {
      if (!this.ended) this.waterGlass.setAlpha(0.9);
    });
    this.waterGlass.on('pointerout', () => {
      if (!this.ended) this.waterGlass.setAlpha(0.65);
    });
    this.waterGlass.on('pointerdown', () => this.onWaterGlassTap());

    // ── Hammer (SOLUTION — hidden in shadow) ──
    this.hammer = this.add.text(nsX + 55, nsY + 10, '🔨', {
      fontSize: '44px',
    }).setOrigin(0.5).setAlpha(0.25).setDepth(5);

    // Subtle hammer breathing (so observant players notice it)
    this.tweens.add({
      targets: this.hammer,
      alpha: { from: 0.2, to: 0.35 },
      duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Hammer is interactive but needs long press to grab
    this.hammer.setInteractive({ useHandCursor: true, draggable: false });

    this.hammer.on('pointerdown', () => {
      if (this.ended || this.isDraggingHammer) return;
      // Long press to grab (300ms hold)
      this.hammerGrabTimer = this.time.delayedCall(300, () => {
        this.grabHammer();
      });
    });

    this.hammer.on('pointerup', () => {
      if (this.hammerGrabTimer) {
        this.hammerGrabTimer.destroy();
        this.hammerGrabTimer = null;
      }
      if (!this.isDraggingHammer) {
        // Short tap — just a hint
        this.showFloatingText(this.hammer.x, this.hammer.y - 40, '꾹 눌러서 잡기', '#887766', 16);
      }
    });

    this.hammer.on('pointerout', () => {
      if (this.hammerGrabTimer) {
        this.hammerGrabTimer.destroy();
        this.hammerGrabTimer = null;
      }
    });
  }

  // ═══════════════════════════════════════════════
  //  SMARTPHONE
  // ═══════════════════════════════════════════════

  private createPhone(_width: number, _height: number) {
    this.phone = this.add.container(this.phoneX, this.phoneY).setDepth(10);

    // Phone border glow (alarm light bleeding)
    this.phoneBorderGlow = this.add.rectangle(0, 0, this.phoneW + 30, this.phoneH + 30, 0xff2222, 0.15);
    this.phone.add(this.phoneBorderGlow);

    this.tweens.add({
      targets: this.phoneBorderGlow,
      alpha: { from: 0.1, to: 0.3 }, scaleX: { from: 1, to: 1.08 }, scaleY: { from: 1, to: 1.05 },
      duration: 400, yoyo: true, repeat: -1,
    });

    // Phone body
    const phoneBg = this.add.rectangle(0, 0, this.phoneW, this.phoneH, 0x1a1a2e)
      .setStrokeStyle(4, 0x333366);
    this.phone.add(phoneBg);

    // Alarm screen (red pulsing)
    this.alarmScreen = this.add.rectangle(0, 0, this.phoneW - 12, this.phoneH - 12, 0xdd1a1a);
    this.phone.add(this.alarmScreen);

    this.tweens.add({
      targets: this.alarmScreen, alpha: { from: 1, to: 0.65 },
      duration: 350, yoyo: true, repeat: -1,
    });

    // Alarm icon
    const alarmIcon = this.add.text(0, -80, '⏰', { fontSize: '50px' }).setOrigin(0.5);
    this.phone.add(alarmIcon);

    this.tweens.add({
      targets: alarmIcon, angle: { from: -18, to: 18 },
      duration: 90, yoyo: true, repeat: -1,
    });

    // Time text
    const timeDisplay = this.add.text(0, -28, '07:00', {
      fontFamily: 'sans-serif', fontSize: '30px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.phone.add(timeDisplay);

    // ── [중지] button (TRAP — dodges) ──
    this.stopBtnLocalX = 0;
    this.stopBtnLocalY = 30;
    this.stopBtn = this.add.container(this.stopBtnLocalX, this.stopBtnLocalY);
    const stopBg = this.add.rectangle(0, 0, 110, 38, 0xffffff, 0.95)
      .setStrokeStyle(2, 0xffffff);
    const stopLabel = this.add.text(0, 0, '중지', {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#dd1a1a', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.stopBtn.add([stopBg, stopLabel]);
    this.stopBtn.setSize(110, 38);
    this.stopBtn.setInteractive({ useHandCursor: true });
    this.stopBtn.on('pointerdown', () => this.onStopBtnTap());
    this.phone.add(this.stopBtn);

    // ── [스누즈 5분] button (TRAP — makes it worse) ──
    this.snoozeBtn = this.add.container(0, 78);
    const snoozeBg = this.add.rectangle(0, 0, 110, 34, 0x333355, 0.8)
      .setStrokeStyle(1, 0x555577);
    const snoozeLabel = this.add.text(0, 0, '스누즈 5분', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#aaaacc',
    }).setOrigin(0.5);
    this.snoozeBtn.add([snoozeBg, snoozeLabel]);
    this.snoozeBtn.setSize(110, 34);
    this.snoozeBtn.setInteractive({ useHandCursor: true });
    this.snoozeBtn.on('pointerdown', () => this.onSnoozeBtnTap());
    this.phone.add(this.snoozeBtn);

    // Phone vibration tween
    this.phoneVibeTween = this.tweens.add({
      targets: this.phone, angle: { from: -this.phoneVibeIntensity, to: this.phoneVibeIntensity },
      duration: 55, yoyo: true, repeat: -1,
    });
  }

  // ═══════════════════════════════════════════════
  //  DRAG HANDLERS
  // ═══════════════════════════════════════════════

  private setupDragHandlers() {
    this.input.on('drag', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
      if (obj === this.hammer && this.isDraggingHammer) {
        (obj as Phaser.GameObjects.Text).x = dragX;
        (obj as Phaser.GameObjects.Text).y = dragY;
      }
    });

    this.input.on('dragend', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (obj !== this.hammer || this.ended || !this.isDraggingHammer) return;

      const dist = Phaser.Math.Distance.Between(
        (obj as Phaser.GameObjects.Text).x,
        (obj as Phaser.GameObjects.Text).y,
        this.phoneX, this.phoneY,
      );

      if (dist < 110) {
        this.smashPhone();
      } else {
        // Dropped away — bounce back slightly
        this.isDraggingHammer = false;
        this.hammer.setAlpha(0.5);
        this.showFloatingText(this.hammer.x, this.hammer.y - 30, '폰 위에 떨어뜨려!', '#887766', 14);
      }
    });
  }

  // ═══════════════════════════════════════════════
  //  GRAB HAMMER
  // ═══════════════════════════════════════════════

  private grabHammer() {
    if (this.ended || this.isDraggingHammer) return;
    this.isDraggingHammer = true;

    // Reveal hammer
    this.tweens.add({
      targets: this.hammer, alpha: 1, scale: 1.2,
      duration: 200, ease: 'Back.easeOut',
      onComplete: () => {
        this.hammer.setScale(1);
      },
    });

    this.input.setDraggable(this.hammer, true);
    this.cameras.main.shake(80, 0.004);

    // Sound-like feedback text
    this.showFloatingText(this.hammer.x, this.hammer.y - 50, '🔨 잡았다!', '#ddaa44', 18);
  }

  // ═══════════════════════════════════════════════
  //  STOP BUTTON TAP (TRAP — dodges)
  // ═══════════════════════════════════════════════

  private onStopBtnTap() {
    if (this.ended) return;
    this.stopTapCount++;

    // Button dodge — move to random position within phone screen
    const padX = 40;
    const padY = 50;
    const halfW = (this.phoneW / 2) - padX;
    const halfH = (this.phoneH / 2) - padY;
    const newX = Phaser.Math.Between(-halfW, halfW);
    const newY = Phaser.Math.Between(-halfH + 20, halfH);

    // Dodge speed increases with tap count
    const dodgeDuration = Math.max(60, 250 - this.stopTapCount * 35);

    this.tweens.add({
      targets: this.stopBtn,
      x: newX, y: newY,
      duration: dodgeDuration,
      ease: 'Quad.easeOut',
    });

    // Button flash on miss
    const stopBg = this.stopBtn.getAt(0) as Phaser.GameObjects.Rectangle;
    this.tweens.add({
      targets: stopBg, fillAlpha: { from: 0.5, to: 0.95 },
      duration: 100, yoyo: true,
    });

    // Frustrated text reactions
    const reactions = [
      '...?',
      '어?',
      '왜 도망가?!',
      '잡아!!',
      '이게 뭐야...',
      '미쳤나 이 버튼',
      '😤😤😤',
      '포기하자...',
    ];
    const msgIdx = Math.min(this.stopTapCount - 1, reactions.length - 1);

    this.showFloatingText(
      this.phoneX,
      this.phoneY + this.phoneH / 2 + 25,
      reactions[msgIdx],
      '#e94560',
      17,
    );

    // Camera shake (increases with frustration)
    const intensity = Math.min(0.004 + this.stopTapCount * 0.002, 0.018);
    this.cameras.main.shake(80, intensity);

    // After 5+ taps, hammer gets slightly brighter as a hint
    if (this.stopTapCount >= 4 && this.hammer.alpha < 0.5) {
      this.tweens.add({
        targets: this.hammer, alpha: 0.5, duration: 800,
      });
      if (this.stopTapCount === 4) {
        this.showFloatingText(this.hammer.x, this.hammer.y - 50, '👀', '#ffffff', 24);
      }
    }
  }

  // ═══════════════════════════════════════════════
  //  SNOOZE BUTTON TAP (TRAP — alarm intensifies)
  // ═══════════════════════════════════════════════

  private onSnoozeBtnTap() {
    if (this.ended) return;
    this.snoozeTapCount++;

    // Alarm gets more intense
    this.phoneVibeIntensity = Math.min(8, this.phoneVibeIntensity + 2);

    // Restart vibration with increased intensity
    if (this.phoneVibeTween) this.phoneVibeTween.destroy();
    this.phoneVibeTween = this.tweens.add({
      targets: this.phone, angle: { from: -this.phoneVibeIntensity, to: this.phoneVibeIntensity },
      duration: Math.max(30, 55 - this.snoozeTapCount * 5), yoyo: true, repeat: -1,
    });

    // Screen flashes brighter red
    this.cameras.main.flash(200, 255, 50, 50, false);

    // Alarm screen gets more intensely red
    const redIntensity = Math.min(0xff, 0xdd + this.snoozeTapCount * 0x10);
    this.alarmScreen.setFillStyle((redIntensity << 16) | 0x1a1a);

    // Border glow gets bigger
    this.tweens.add({
      targets: this.phoneBorderGlow,
      scaleX: 1 + this.snoozeTapCount * 0.1,
      scaleY: 1 + this.snoozeTapCount * 0.08,
      alpha: Math.min(0.5, 0.15 + this.snoozeTapCount * 0.08),
      duration: 300,
    });

    // Camera shake
    this.cameras.main.shake(200, 0.008 + this.snoozeTapCount * 0.005);

    // Warning messages
    const warnings = [
      '알람이 더 커졌다!!',
      '왜 더 시끄러워?!',
      '스누즈가 아니라 증폭이잖아!!',
      '귀가 아프다!!',
    ];
    const idx = Math.min(this.snoozeTapCount - 1, warnings.length - 1);

    this.showFloatingText(
      this.phoneX,
      this.phoneY - this.phoneH / 2 - 30,
      warnings[idx],
      '#ff4444',
      19,
    );

    // Snooze button text changes
    const snoozeLabel = this.snoozeBtn.getAt(1) as Phaser.GameObjects.Text;
    if (this.snoozeTapCount >= 2) {
      snoozeLabel.setText('💀 스누즈');
    }
  }

  // ═══════════════════════════════════════════════
  //  WATER GLASS TAP (TRAP — electrocution FAIL)
  // ═══════════════════════════════════════════════

  private onWaterGlassTap() {
    if (this.ended) return;
    this.ended = true;

    const { width, height } = this.scale;
    const gx = this.waterGlass.x;
    const gy = this.waterGlass.y;

    // Water spill animation
    this.waterGlass.setText('💧');
    this.tweens.add({
      targets: this.waterGlass,
      angle: 90, alpha: 0.3,
      duration: 300,
    });

    // Water droplets spreading toward phone
    for (let i = 0; i < 6; i++) {
      const drop = this.add.text(
        gx + Phaser.Math.Between(-20, 20),
        gy + Phaser.Math.Between(-10, 10),
        '💧', { fontSize: '18px' },
      ).setOrigin(0.5).setDepth(15);

      this.tweens.add({
        targets: drop,
        x: this.phoneX + Phaser.Math.Between(-30, 30),
        y: this.phoneY + Phaser.Math.Between(-40, 40),
        alpha: 0.3,
        duration: 400 + i * 80,
        ease: 'Quad.easeIn',
        onComplete: () => drop.destroy(),
      });
    }

    // Electrocution after water reaches phone
    this.time.delayedCall(500, () => {
      // Sparks on phone
      this.cameras.main.flash(150, 255, 255, 100);
      this.cameras.main.shake(300, 0.02);

      for (let i = 0; i < 5; i++) {
        const spark = this.add.text(
          this.phoneX + Phaser.Math.Between(-50, 50),
          this.phoneY + Phaser.Math.Between(-60, 60),
          '⚡', { fontSize: `${Phaser.Math.Between(20, 36)}px` },
        ).setOrigin(0.5).setDepth(20);

        this.tweens.add({
          targets: spark, alpha: 0, scale: 1.5,
          duration: 400, delay: i * 100,
          onComplete: () => spark.destroy(),
        });
      }

      // "감전!" text
      const shockText = this.add.text(this.phoneX, this.phoneY, '감전!', {
        fontFamily: 'sans-serif', fontSize: '36px', color: '#ffee00', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(25);

      this.tweens.add({
        targets: shockText, scale: { from: 0.5, to: 1.3 }, alpha: { from: 1, to: 0 },
        duration: 800, ease: 'Quad.easeOut',
        onComplete: () => shockText.destroy(),
      });

      // Phone goes haywire
      this.tweens.killTweensOf(this.phone);
      this.tweens.add({
        targets: this.phone, angle: { from: -15, to: 15 },
        duration: 40, yoyo: true, repeat: 6,
      });
    });

    // Fail screen
    this.time.delayedCall(1500, () => {
      this.cameras.main.setBackgroundColor('#0a0808');

      const failText = this.add.text(width / 2, height * 0.45, '💀 감전됐다...', {
        fontFamily: 'sans-serif', fontSize: '28px', color: '#e94560', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(30);

      const failSub = this.add.text(width / 2, height * 0.58, '물 + 전자기기 = 위험', {
        fontFamily: 'sans-serif', fontSize: '16px', color: '#886666',
      }).setOrigin(0.5).setDepth(30);

      this.tweens.add({
        targets: [failText, failSub], alpha: { from: 0, to: 1 }, duration: 400,
      });
    });

    this.time.delayedCall(3000, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success: false });
    });
  }

  // ═══════════════════════════════════════════════
  //  SMASH PHONE — SUCCESS
  // ═══════════════════════════════════════════════

  private smashPhone() {
    if (this.ended) return;
    this.ended = true;

    const { width, height } = this.scale;

    // Kill all existing tweens
    this.tweens.killAll();

    // Hammer strike animation
    this.hammer.setDepth(30);
    this.tweens.add({
      targets: this.hammer,
      x: this.phoneX, y: this.phoneY,
      scale: 2.5, angle: -45,
      duration: 180, ease: 'Quad.easeIn',
      onComplete: () => {
        // ── IMPACT ──
        this.cameras.main.shake(600, 0.04);
        this.cameras.main.flash(350, 255, 255, 255);

        // Hide phone and hammer
        this.phone.setVisible(false);
        this.hammer.setVisible(false);

        // Explosion emoji
        const explosion = this.add.text(this.phoneX, this.phoneY, '💥', {
          fontSize: '120px',
        }).setOrigin(0.5).setDepth(25);

        this.tweens.add({
          targets: explosion,
          scale: { from: 0.5, to: 2 },
          alpha: { from: 1, to: 0 },
          duration: 700,
          ease: 'Quad.easeOut',
          onComplete: () => explosion.destroy(),
        });

        // Crack lines (rectangles radiating out)
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 / 6) * i + Phaser.Math.FloatBetween(-0.3, 0.3);
          const len = Phaser.Math.Between(80, 160);
          const crack = this.add.rectangle(
            this.phoneX, this.phoneY,
            len, 3, 0xffffff, 0.8,
          ).setOrigin(0, 0.5).setRotation(angle).setDepth(22);

          this.tweens.add({
            targets: crack, alpha: 0, scaleX: 1.5,
            duration: 500, delay: 50,
            onComplete: () => crack.destroy(),
          });
        }

        // Debris particles flying out
        const shards = ['📱', '✨', '⚡', '💫', '🔥', '💀', '🔩', '📱'];
        for (let i = 0; i < 12; i++) {
          const shard = this.add.text(
            this.phoneX, this.phoneY,
            Phaser.Math.RND.pick(shards),
            { fontSize: `${Phaser.Math.Between(18, 32)}px` },
          ).setOrigin(0.5).setDepth(24);

          const destAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const dist = Phaser.Math.Between(100, 280);
          const destX = this.phoneX + Math.cos(destAngle) * dist;
          const destY = this.phoneY + Math.sin(destAngle) * dist;

          this.tweens.add({
            targets: shard,
            x: destX, y: destY,
            alpha: 0, scale: { from: 1, to: 0.2 },
            angle: Phaser.Math.Between(-360, 360),
            duration: Phaser.Math.Between(500, 900),
            ease: 'Quad.easeOut',
            onComplete: () => shard.destroy(),
          });
        }

        // Screen crack pattern (visual flair)
        const crackText = this.add.text(this.phoneX, this.phoneY, '✖', {
          fontSize: '80px', color: '#ffffff',
        }).setOrigin(0.5).setAlpha(0.6).setDepth(23);

        this.tweens.add({
          targets: crackText, alpha: 0, scale: 3,
          duration: 600,
          onComplete: () => crackText.destroy(),
        });

        // ── SUCCESS SCREEN (after 600ms) ──
        this.time.delayedCall(600, () => {
          // Fade to dark green
          this.cameras.main.setBackgroundColor('#0d2818');

          // Dim everything existing
          this.children.each((child) => {
            if (child && 'alpha' in child) {
              (child as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(0);
            }
          });

          // Success icon
          const successIcon = this.add.text(width / 2, height * 0.28, '📵', {
            fontSize: '80px',
          }).setOrigin(0.5).setDepth(40).setAlpha(0);

          // Success text
          const successText = this.add.text(width / 2, height * 0.50, '알람 영구 정지', {
            fontFamily: 'sans-serif', fontSize: '34px', color: '#00b894', fontStyle: 'bold',
          }).setOrigin(0.5).setDepth(40).setAlpha(0);

          // Subtitle
          const subtitle = this.add.text(width / 2, height * 0.64, '때로는 상식을 벗어나야 합니다', {
            fontFamily: 'sans-serif', fontSize: '16px', color: '#448866',
          }).setOrigin(0.5).setDepth(40).setAlpha(0);

          // Peaceful particles (subtle)
          for (let i = 0; i < 5; i++) {
            const particle = this.add.text(
              Phaser.Math.Between(100, width - 100),
              height + 20,
              Phaser.Math.RND.pick(['✨', '🌙', '💤']),
              { fontSize: '20px' },
            ).setOrigin(0.5).setAlpha(0).setDepth(35);

            this.tweens.add({
              targets: particle,
              y: Phaser.Math.Between(50, height - 50),
              alpha: { from: 0, to: 0.4 },
              duration: 2000, delay: i * 300,
            });
          }

          // Fade in success elements
          this.tweens.add({
            targets: [successIcon, successText, subtitle],
            alpha: 1, duration: 500, ease: 'Quad.easeOut',
          });

          // Scale pop on icon
          this.tweens.add({
            targets: successIcon,
            scale: { from: 0.5, to: 1 },
            duration: 400, ease: 'Back.easeOut',
          });
        });

        // ── TRANSITION (after 2.5s) ──
        this.time.delayedCall(2500, () => {
          this.scene.start('ResultScene', { stageId: this.stageId, success: true });
        });
      },
    });
  }

  // ═══════════════════════════════════════════════
  //  TIMER
  // ═══════════════════════════════════════════════

  private onTimerTick() {
    if (this.ended) return;

    this.timeLeft--;
    this.timerText.setText(`${this.timeLeft}s`);

    // Color change at low time
    if (this.timeLeft <= 5) {
      this.timerText.setColor('#e94560');
      this.timerText.setFontSize(24);

      // Pulse effect
      this.tweens.add({
        targets: this.timerText, scale: { from: 1.2, to: 1 },
        duration: 200,
      });
    }

    if (this.timeLeft <= 3) {
      // Urgent camera tint
      this.cameras.main.flash(100, 255, 50, 50, false);
    }

    if (this.timeLeft <= 0) {
      this.onTimeUp();
    }
  }

  private onTimeUp() {
    if (this.ended) return;
    this.ended = true;

    const { width, height } = this.scale;

    // Alarm wins animation
    this.tweens.killAll();

    // Phone grows menacingly
    this.tweens.add({
      targets: this.phone,
      scale: 1.3, duration: 500, ease: 'Quad.easeOut',
    });

    // Alarm triumphant flash
    this.cameras.main.flash(300, 255, 50, 50);

    // Fail message
    this.time.delayedCall(400, () => {
      const failMsg = this.add.text(width / 2, height * 0.85, '알람이 이겼다...', {
        fontFamily: 'sans-serif', fontSize: '26px', color: '#e94560', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(30).setAlpha(0);

      this.tweens.add({
        targets: failMsg, alpha: 1, duration: 300,
      });

      // Alarm icon victory dance
      const victoryAlarm = this.add.text(width / 2, height * 0.15, '⏰', {
        fontSize: '48px',
      }).setOrigin(0.5).setDepth(30);

      this.tweens.add({
        targets: victoryAlarm, angle: { from: -20, to: 20 },
        duration: 100, yoyo: true, repeat: 8,
      });
    });

    this.time.delayedCall(2000, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success: false });
    });
  }

  // ═══════════════════════════════════════════════
  //  UTILITY
  // ═══════════════════════════════════════════════

  private showFloatingText(x: number, y: number, text: string, color: string, size: number) {
    const msg = this.add.text(x, y, text, {
      fontFamily: 'sans-serif', fontSize: `${size}px`, color,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0).setDepth(35);

    this.tweens.add({
      targets: msg, alpha: 1, y: y - 25,
      duration: 250,
      onComplete: () => {
        this.tweens.add({
          targets: msg, alpha: 0, y: y - 50,
          duration: 500, delay: 500,
          onComplete: () => msg.destroy(),
        });
      },
    });
  }
}

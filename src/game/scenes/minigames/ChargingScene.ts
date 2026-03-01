import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지: 다리 떠는 빌런 — Leg Shaking Villain (Green Energy)
 *
 * 좌(동료 하반신 — 다리 떨기) / 우(내 책상 — 폰 + 서랍 아이템)
 *
 * SOLUTION:
 *   1) 소형 발전기를 무릎에 드래그
 *   2) USB 케이블을 폰에 드래그
 *   → 폰 충전 100% → SUCCESS
 *
 * TRAP:
 *   - 스테이플러를 다리에 드래그 → FAIL (직장 내 괴롭힘)
 *   - 다리를 꾹 누르면 잠시 멈추지만, 놓으면 다시 떨림 (진행 불가)
 */
export class ChargingScene extends Phaser.Scene {
  private stageId = 0;
  private ended = false;

  /* state flags */
  private generatorAttached = false;
  // cableConnected tracked implicitly via generatorAttached + cable drop
  private holdingLeg = false;

  /* game objects */
  // leftLeg created in buildCoworkerArea (no ref needed)
  private rightLeg!: Phaser.GameObjects.Rectangle;
  private legShakeTween!: Phaser.Tweens.Tween;
  private kneeZone!: Phaser.GameObjects.Rectangle;
  private kneeHighlight!: Phaser.GameObjects.Rectangle;

  private phone!: Phaser.GameObjects.Container;
  private phoneBatteryBar!: Phaser.GameObjects.Rectangle;
  private phoneBatteryText!: Phaser.GameObjects.Text;
  private phoneBatteryPct = 1;
  private phoneScreen!: Phaser.GameObjects.Rectangle;

  // draggable items created in buildMyDeskArea (no ref needed)

  private attachedGeneratorEmoji!: Phaser.GameObjects.Text;
  private cableLine!: Phaser.GameObjects.Graphics;
  private particleGraphics!: Phaser.GameObjects.Graphics;

  private timerText!: Phaser.GameObjects.Text;
  private remainingTime = 15;
  private timerEvent!: Phaser.Time.TimerEvent;

  /* electricity particles along cable */
  private particles: { x: number; y: number; t: number }[] = [];

  constructor() {
    super({ key: 'ChargingScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.ended = false;
    this.generatorAttached = false;
    // cableConnected reset
    this.holdingLeg = false;
    this.phoneBatteryPct = 1;
    this.remainingTime = 15;
    this.particles = [];
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a1a2e');

    /* ───────── divider ───────── */
    this.add.rectangle(width / 2, height / 2, 2, height, 0x333355);

    /* ═══════════════════════════════════
       LEFT HALF — coworker's lower body
       ═══════════════════════════════════ */
    this.buildCoworkerArea(width, height);

    /* ═══════════════════════════════════
       RIGHT HALF — my desk & phone
       ═══════════════════════════════════ */
    this.buildMyDeskArea(width, height);

    /* ───────── constant screen shake ───────── */
    this.time.addEvent({
      delay: 120,
      loop: true,
      callback: () => {
        if (this.ended) return;
        if (this.holdingLeg) return;
        this.cameras.main.shake(100, 0.0015);
      },
    });

    /* ───────── timer ───────── */
    this.timerText = this.add.text(width / 2, 22, `⏱ ${this.remainingTime}s`, {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100);

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      repeat: 14,
      callback: () => {
        if (this.ended) return;
        this.remainingTime--;
        this.timerText.setText(`⏱ ${this.remainingTime}s`);
        if (this.remainingTime <= 5) {
          this.timerText.setColor('#ff4444');
        }
        if (this.remainingTime <= 0) {
          this.failTimeout();
        }
      },
    });

    /* ───────── graphics layers ───────── */
    this.cableLine = this.add.graphics().setDepth(50);
    this.particleGraphics = this.add.graphics().setDepth(51);

    /* ───────── hint text ───────── */
    this.add.text(width / 2, height - 18, '서랍 아이템을 드래그하세요', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#555577',
    }).setOrigin(0.5).setDepth(100);

    emitGameState({
      scene: 'ChargingScene',
      stageId: this.stageId,
      progress: GameManager.progress,
      allCleared: GameManager.allCleared,
      stress: GameManager.stress,
    });
  }

  /* ─────────────────────────────────────────────
     LEFT HALF: coworker legs + desk/chair
     ───────────────────────────────────────────── */
  private buildCoworkerArea(_width: number, height: number) {
    const cx = 240; // centre of left half

    /* ── desk top (partial, top of screen) ── */
    this.add.rectangle(cx, 50, 360, 30, 0x5c4033).setStrokeStyle(1, 0x3e2a1e);

    /* ── chair seat ── */
    this.add.rectangle(cx, 90, 180, 18, 0x333355).setStrokeStyle(1, 0x444466);

    /* ── left leg (static) ── */
    this.add.rectangle(cx - 50, 280, 36, 280, 0x3a3a5c)
      .setStrokeStyle(1, 0x555577)
      .setOrigin(0.5, 0.5);

    /* ── right leg (shaking) ── */
    this.rightLeg = this.add.rectangle(cx + 50, 280, 36, 280, 0x3a3a5c)
      .setStrokeStyle(2, 0x7777aa)
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });

    /* ── shoe shapes at bottom ── */
    this.add.rectangle(cx - 50, 422, 48, 16, 0x222244).setStrokeStyle(1, 0x333355);
    this.add.rectangle(cx + 50, 422, 48, 16, 0x222244).setStrokeStyle(1, 0x333355);

    /* ── knee zone (target for generator) ── */
    const kneeY = 180;
    this.kneeHighlight = this.add.rectangle(cx + 50, kneeY, 52, 52, 0xffaa00, 0.15)
      .setStrokeStyle(2, 0xffaa00);
    this.tweens.add({
      targets: this.kneeHighlight,
      alpha: { from: 0.4, to: 0.8 },
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.kneeZone = this.add.rectangle(cx + 50, kneeY, 56, 56, 0x000000, 0)
      .setInteractive({ dropZone: true });
    (this.kneeZone as any).__dropId = 'knee';

    /* ── shaking tween for right leg ── */
    this.legShakeTween = this.tweens.add({
      targets: this.rightLeg,
      y: { from: 276, to: 284 },
      duration: 50,
      yoyo: true,
      repeat: -1,
    });

    /* synchronise knee highlight with leg */
    this.tweens.add({
      targets: [this.kneeHighlight, this.kneeZone],
      y: { from: kneeY - 4, to: kneeY + 4 },
      duration: 50,
      yoyo: true,
      repeat: -1,
    });

    /* ── label ── */
    this.add.text(cx, height - 50, '동료 다리', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#666688',
    }).setOrigin(0.5);

    /* ── hold leg to temporarily stop shaking (TRAP — no progress) ── */
    this.rightLeg.on('pointerdown', () => {
      if (this.ended) return;
      this.holdingLeg = true;
      this.legShakeTween.pause();
      this.rightLeg.setFillStyle(0x4a4a7c);
    });

    this.input.on('pointerup', () => {
      if (this.holdingLeg) {
        this.holdingLeg = false;
        if (!this.ended) {
          this.legShakeTween.resume();
          this.rightLeg.setFillStyle(0x3a3a5c);
        }
      }
    });
  }

  /* ─────────────────────────────────────────────
     RIGHT HALF: my desk, phone, drawer + items
     ───────────────────────────────────────────── */
  private buildMyDeskArea(_width: number, height: number) {
    const rx = 720; // centre of right half

    /* ── desk surface ── */
    this.add.rectangle(rx, 260, 380, 12, 0x5c4033).setStrokeStyle(1, 0x3e2a1e);

    /* ── phone ── */
    this.phone = this.add.container(rx - 60, 210);
    const phoneBody = this.add.rectangle(0, 0, 50, 80, 0x111122)
      .setStrokeStyle(2, 0x444466);
    this.phoneScreen = this.add.rectangle(0, -4, 42, 60, 0x0a0a15);
    const phoneBtn = this.add.circle(0, 32, 5, 0x333355);

    /* battery inside phone screen */
    const battOutline = this.add.rectangle(0, -4, 30, 16, 0x000000, 0)
      .setStrokeStyle(1, 0x666688);
    this.phoneBatteryBar = this.add.rectangle(-13, -4, 1, 12, 0xff4444)
      .setOrigin(0, 0.5);
    this.phoneBatteryText = this.add.text(0, -4, '1%', {
      fontFamily: 'sans-serif',
      fontSize: '9px',
      color: '#ff4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.phone.add([phoneBody, this.phoneScreen, phoneBtn, battOutline, this.phoneBatteryBar, this.phoneBatteryText]);
    this.phone.setDepth(10);

    /* phone drop zone */
    const phoneDropZone = this.add.rectangle(rx - 60, 210, 60, 90, 0x000000, 0)
      .setInteractive({ dropZone: true });
    (phoneDropZone as any).__dropId = 'phone';

    /* blinking battery text */
    this.tweens.add({
      targets: this.phoneBatteryText,
      alpha: { from: 1, to: 0.2 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    /* ── drawer ── */
    const drawerY = 380;
    /* drawer body */
    this.add.rectangle(rx, drawerY, 280, 110, 0x2a2a44).setStrokeStyle(2, 0x444466);
    /* drawer opening (gap) */
    this.add.rectangle(rx, drawerY - 45, 260, 20, 0x111122);
    /* drawer handle */
    this.add.rectangle(rx, drawerY - 58, 40, 6, 0x666688, 0.8);

    /* ── drawer items ── */
    const itemY = drawerY + 10;
    this.createDraggableItem(rx - 80, itemY, '⚡', '발전기', 'generator');
    this.createDraggableItem(rx, itemY, '🔌', '케이블', 'cable');
    this.createDraggableItem(rx + 80, itemY, '📎', '스테이플러', 'stapler');

    /* ── label ── */
    this.add.text(rx, height - 50, '내 책상', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#666688',
    }).setOrigin(0.5);

    /* ── drag-and-drop handling ── */
    this.setupDragDrop();
  }

  /* ─────────────────────────────────────────────
     Create a draggable item container
     ───────────────────────────────────────────── */
  private createDraggableItem(
    x: number, y: number, emoji: string, label: string, id: string,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 64, 64, 0x333355, 0.7)
      .setStrokeStyle(1, 0x555577);
    const icon = this.add.text(0, -6, emoji, { fontSize: '26px' }).setOrigin(0.5);
    const txt = this.add.text(0, 22, label, {
      fontFamily: 'sans-serif',
      fontSize: '10px',
      color: '#aaaacc',
    }).setOrigin(0.5);
    container.add([bg, icon, txt]);
    container.setSize(64, 64);
    container.setInteractive({ useHandCursor: true, draggable: true });
    container.setDepth(60);
    (container as any).__itemId = id;
    (container as any).__origX = x;
    (container as any).__origY = y;
    return container;
  }

  /* ─────────────────────────────────────────────
     Drag & drop logic
     ───────────────────────────────────────────── */
  private setupDragDrop() {
    this.input.on('drag', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Container, dragX: number, dragY: number) => {
      if (this.ended) return;
      obj.x = dragX;
      obj.y = dragY;
    });

    this.input.on('drop', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Container, zone: Phaser.GameObjects.Rectangle) => {
      if (this.ended) return;
      const itemId = (obj as any).__itemId as string;
      const dropId = (zone as any).__dropId as string;

      /* ── generator → knee ── */
      if (itemId === 'generator' && dropId === 'knee') {
        this.onGeneratorAttached(obj);
        return;
      }

      /* ── cable → phone (after generator attached) ── */
      if (itemId === 'cable' && dropId === 'phone' && this.generatorAttached) {
        this.onCableConnected(obj);
        return;
      }

      /* ── stapler → knee (TRAP) ── */
      if (itemId === 'stapler' && dropId === 'knee') {
        this.onStaplerTrap(obj);
        return;
      }

      /* wrong combination — snap back */
      this.snapBack(obj);
    });

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.Container, dropped: boolean) => {
      if (!dropped && !this.ended) {
        this.snapBack(obj);
      }
    });
  }

  private snapBack(obj: Phaser.GameObjects.Container) {
    const ox = (obj as any).__origX as number;
    const oy = (obj as any).__origY as number;
    this.tweens.add({
      targets: obj,
      x: ox,
      y: oy,
      duration: 250,
      ease: 'Back.easeOut',
    });
  }

  /* ─────────────────────────────────────────────
     STEP 1: generator on knee
     ───────────────────────────────────────────── */
  private onGeneratorAttached(obj: Phaser.GameObjects.Container) {
    this.generatorAttached = true;
    obj.setVisible(false);
    obj.disableInteractive();

    /* hide knee highlight */
    this.kneeHighlight.setVisible(false);

    /* place spinning generator emoji on the knee */
    const kneeX = 290; // cx+50 in coworker area
    const kneeY = 180;
    this.attachedGeneratorEmoji = this.add.text(kneeX, kneeY, '⚡', {
      fontSize: '28px',
    }).setOrigin(0.5).setDepth(30);

    /* spinning animation */
    this.tweens.add({
      targets: this.attachedGeneratorEmoji,
      angle: 360,
      duration: 400,
      repeat: -1,
    });

    /* sync vertical position with leg shake */
    this.tweens.add({
      targets: this.attachedGeneratorEmoji,
      y: { from: kneeY - 4, to: kneeY + 4 },
      duration: 50,
      yoyo: true,
      repeat: -1,
    });

    /* feedback */
    this.showFloatingText(kneeX, kneeY - 40, '발전기 장착!', '#ffaa00');
    this.cameras.main.flash(200, 255, 170, 0, true);
  }

  /* ─────────────────────────────────────────────
     STEP 2: cable to phone
     ───────────────────────────────────────────── */
  private onCableConnected(obj: Phaser.GameObjects.Container) {
    // cable connected
    obj.setVisible(false);
    obj.disableInteractive();

    /* draw cable line */
    const genX = 290;
    const genY = 180;
    const phoneX = 660;  // rx-60
    const phoneY = 210;

    this.drawCable(genX, genY, phoneX, phoneY);

    /* feedback */
    this.showFloatingText(480, 180, '케이블 연결!', '#00b894');

    /* start charging sequence */
    this.startCharging(genX, genY, phoneX, phoneY);
  }

  private drawCable(x1: number, y1: number, x2: number, y2: number) {
    this.cableLine.clear();
    this.cableLine.lineStyle(3, 0x00b894, 0.9);
    this.cableLine.beginPath();
    /* slight curve */
    const cpY = Math.max(y1, y2) + 60;
    this.cableLine.moveTo(x1, y1);
    this.cableLine.lineTo((x1 + x2) / 2, cpY);
    this.cableLine.lineTo(x2, y2);
    this.cableLine.strokePath();
  }

  /* ─────────────────────────────────────────────
     Charging animation → SUCCESS
     ───────────────────────────────────────────── */
  private startCharging(genX: number, genY: number, phoneX: number, phoneY: number) {
    /* initialise cable particles */
    for (let i = 0; i < 8; i++) {
      this.particles.push({ x: genX, y: genY, t: i / 8 });
    }

    const milestones = [25, 50, 75, 100];
    let milestoneIdx = 0;

    /* charge up in steps */
    this.time.addEvent({
      delay: 100,
      repeat: 49, // 50 steps → 5 seconds total for full charge
      callback: () => {
        if (this.ended) return;
        this.phoneBatteryPct = Math.min(100, this.phoneBatteryPct + 2);
        this.updatePhoneBattery();

        /* update cable particles */
        this.updateParticles(genX, genY, phoneX, phoneY);

        /* milestones */
        if (milestoneIdx < milestones.length && this.phoneBatteryPct >= milestones[milestoneIdx]) {
          this.showSparkle(phoneX, phoneY - 30);
          milestoneIdx++;
        }

        /* 100% reached */
        if (this.phoneBatteryPct >= 100) {
          this.onChargingComplete();
        }
      },
    });
  }

  private updatePhoneBattery() {
    const maxW = 26;
    const pct = this.phoneBatteryPct / 100;
    this.phoneBatteryBar.width = maxW * pct;

    /* color gradient */
    if (this.phoneBatteryPct < 20) {
      this.phoneBatteryBar.setFillStyle(0xff4444);
      this.phoneBatteryText.setColor('#ff4444');
    } else if (this.phoneBatteryPct < 50) {
      this.phoneBatteryBar.setFillStyle(0xffaa00);
      this.phoneBatteryText.setColor('#ffaa00');
    } else {
      this.phoneBatteryBar.setFillStyle(0x00b894);
      this.phoneBatteryText.setColor('#00b894');
    }

    this.phoneBatteryText.setText(`${this.phoneBatteryPct}%`);
    /* stop blinking once charging */
    this.tweens.killTweensOf(this.phoneBatteryText);
    this.phoneBatteryText.setAlpha(1);
  }

  private updateParticles(x1: number, y1: number, x2: number, y2: number) {
    this.particleGraphics.clear();
    const cpY = Math.max(y1, y2) + 60;

    for (const p of this.particles) {
      p.t += 0.06;
      if (p.t > 1) p.t -= 1;

      /* two-segment linear interpolation along the cable path */
      let px: number, py: number;
      if (p.t < 0.5) {
        const lt = p.t * 2;
        px = Phaser.Math.Linear(x1, (x1 + x2) / 2, lt);
        py = Phaser.Math.Linear(y1, cpY, lt);
      } else {
        const lt = (p.t - 0.5) * 2;
        px = Phaser.Math.Linear((x1 + x2) / 2, x2, lt);
        py = Phaser.Math.Linear(cpY, y2, lt);
      }

      this.particleGraphics.fillStyle(0x00ff88, 0.9);
      this.particleGraphics.fillCircle(px, py, 3);
      /* glow */
      this.particleGraphics.fillStyle(0x00ff88, 0.25);
      this.particleGraphics.fillCircle(px, py, 7);
    }
  }

  private showSparkle(x: number, y: number) {
    const sparkle = this.add.text(x, y, '✨', { fontSize: '22px' })
      .setOrigin(0.5).setDepth(70);
    this.tweens.add({
      targets: sparkle,
      y: y - 30,
      alpha: 0,
      scale: 1.5,
      duration: 600,
      onComplete: () => sparkle.destroy(),
    });
  }

  private onChargingComplete() {
    if (this.ended) return;
    this.ended = true;
    this.timerEvent.remove();

    /* phone screen lights up */
    this.phoneScreen.setFillStyle(0x224466);
    this.tweens.add({
      targets: this.phoneScreen,
      fillColor: { from: 0x224466, to: 0x44aaff },
      duration: 400,
    });

    /* "띠링~" text */
    this.showFloatingText(660, 160, '띠링~ 충전 완료!', '#00ff88');

    /* celebration flash */
    this.cameras.main.flash(400, 0, 184, 148);

    /* stop screen shake */
    this.cameras.main.resetFX();

    this.time.delayedCall(1500, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success: true });
    });
  }

  /* ─────────────────────────────────────────────
     TRAP: stapler on leg
     ───────────────────────────────────────────── */
  private onStaplerTrap(obj: Phaser.GameObjects.Container) {
    if (this.ended) return;
    this.ended = true;
    this.timerEvent.remove();

    obj.setVisible(false);

    /* camera red flash */
    this.cameras.main.flash(600, 230, 50, 50);

    /* warning text */
    const { width, height } = this.scale;
    const warnText = this.add.text(width / 2, height / 2, '직장 내 괴롭힘으로\n인사팀 호출!', {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#ff4444',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    this.tweens.add({
      targets: warnText,
      alpha: 1,
      scale: { from: 0.5, to: 1 },
      duration: 400,
      ease: 'Back.easeOut',
    });

    this.time.delayedCall(2000, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success: false });
    });
  }

  /* ─────────────────────────────────────────────
     FAIL: timeout
     ───────────────────────────────────────────── */
  private failTimeout() {
    if (this.ended) return;
    this.ended = true;

    const { width, height } = this.scale;

    /* phone goes dark */
    this.phoneScreen.setFillStyle(0x000000);
    this.phoneBatteryText.setText('');
    this.phoneBatteryBar.setVisible(false);

    /* dark flash */
    this.cameras.main.fade(600, 0, 0, 0);

    const failText = this.add.text(width / 2, height / 2, '배터리 방전...', {
      fontFamily: 'sans-serif',
      fontSize: '32px',
      color: '#ff4444',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100).setAlpha(0);

    this.tweens.add({
      targets: failText,
      alpha: 1,
      duration: 400,
    });

    this.time.delayedCall(2000, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success: false });
    });
  }

  /* ─────────────────────────────────────────────
     Utility: floating text feedback
     ───────────────────────────────────────────── */
  private showFloatingText(x: number, y: number, msg: string, color: string) {
    const txt = this.add.text(x, y, msg, {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(80);

    this.tweens.add({
      targets: txt,
      y: y - 40,
      alpha: { from: 1, to: 0 },
      duration: 1500,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    });
  }
}

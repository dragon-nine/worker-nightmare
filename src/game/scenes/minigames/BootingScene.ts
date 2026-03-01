import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 메신저 오타 — Physical Server Down
 *
 * 부장님에게 보낸 위험한 메시지를 삭제해야 하는데,
 * 삭제 버튼은 함정(서버 지연)이고 진짜 해법은
 * 책상 아래 모니터 전원 플러그를 뽑는 것.
 *
 * 두 개의 뷰(모니터 / 책상 아래)를 스와이프로 전환.
 */
export class BootingScene extends Phaser.Scene {
  private stageId = 0;
  private ended = false;

  // Timer
  private timeLeft = 12;
  private timerText!: Phaser.GameObjects.Text;

  // Views
  private worldContainer!: Phaser.GameObjects.Container;
  private currentView: 'monitor' | 'underDesk' = 'monitor';
  private isTweening = false;

  // Swipe tracking
  private swipeStartY = 0;
  private isSwiping = false;

  // Message interaction state
  private deletePopup: Phaser.GameObjects.Container | null = null;
  private bossReplied = false;
  private deleting = false;

  // Under-desk spark text
  private sparkTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'BootingScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.ended = false;
    this.timeLeft = 12;
    this.currentView = 'monitor';
    this.isTweening = false;
    this.isSwiping = false;
    this.deletePopup = null;
    this.bossReplied = false;
    this.deleting = false;
    this.sparkTexts = [];
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // ── World container: holds both views stacked vertically ──
    // View 1 (monitor): y 0..540
    // View 2 (under-desk): y 540..1080
    this.worldContainer = this.add.container(0, 0);

    this.buildMonitorView(width, height);
    this.buildUnderDeskView(width, height);

    // ── Timer (fixed UI, not inside worldContainer) ──
    this.timerText = this.add.text(width - 16, 16, `⏱ ${this.timeLeft}`, {
      fontFamily: 'monospace', fontSize: '22px', color: '#ff4444',
      fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(100);

    this.time.addEvent({
      delay: 1000, repeat: 11,
      callback: () => {
        if (this.ended) return;
        this.timeLeft--;
        this.timerText.setText(`⏱ ${this.timeLeft}`);
        if (this.timeLeft <= 5) {
          this.timerText.setColor('#ff0000');
          this.tweens.add({
            targets: this.timerText, scaleX: 1.3, scaleY: 1.3,
            duration: 120, yoyo: true,
          });
        }
        if (this.timeLeft <= 0) this.endGame(false);
      },
    });

    // ── Swipe detection (global pointer) ──
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.swipeStartY = p.y;
      this.isSwiping = true;
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.isSwiping) return;
      this.isSwiping = false;
      const deltaY = this.swipeStartY - p.y; // positive = swipe up
      if (deltaY > 80 && this.currentView === 'monitor') {
        this.scrollToView('underDesk');
      } else if (deltaY < -80 && this.currentView === 'underDesk') {
        this.scrollToView('monitor');
      }
    });

    // ── Emit state ──
    emitGameState({
      scene: 'BootingScene', stageId: this.stageId,
      progress: GameManager.progress, allCleared: GameManager.allCleared,
      stress: GameManager.stress,
    });
  }

  // ════════════════════════════════════════════════
  //  VIEW 1 — Monitor / Messenger
  // ════════════════════════════════════════════════
  private buildMonitorView(width: number, height: number) {
    const c = this.add.container(0, 0);
    this.worldContainer.add(c);

    // ── Office desk background ──
    c.add(this.add.rectangle(width / 2, height / 2, width, height, 0x2d2d44));

    // Desk surface at bottom
    c.add(this.add.rectangle(width / 2, height - 40, width, 80, 0x5c3d2e));
    c.add(this.add.rectangle(width / 2, height - 78, width, 4, 0x7a5640));

    // ── Monitor outer frame (bezel) ──
    const monX = width / 2;
    const monY = height / 2 - 30;
    const monW = 560;
    const monH = 380;
    // Bezel
    c.add(this.add.rectangle(monX, monY, monW + 24, monH + 24, 0x222222)
      .setStrokeStyle(3, 0x111111));
    // Screen area
    c.add(this.add.rectangle(monX, monY, monW, monH, 0xffffff));
    // Monitor stand
    c.add(this.add.rectangle(monX, monY + monH / 2 + 20, 60, 30, 0x333333));
    c.add(this.add.rectangle(monX, monY + monH / 2 + 38, 120, 10, 0x444444));

    // ── Messenger app inside monitor ──
    const msgLeft = monX - monW / 2 + 10;
    const msgRight = monX + monW / 2 - 10;
    const msgTop = monY - monH / 2 + 10;
    const msgW = monW - 20;
    const msgH = monH - 20;

    // App background
    c.add(this.add.rectangle(monX, monY, msgW, msgH, 0xf5f5f5));

    // ── Chat header bar ──
    const headerY = msgTop + 20;
    c.add(this.add.rectangle(monX, headerY, msgW, 40, 0x3b5998));
    // Online indicator (green dot)
    c.add(this.add.circle(msgLeft + 20, headerY, 5, 0x44dd44));
    c.add(this.add.text(msgLeft + 32, headerY, '부장님', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0, 0.5));
    // Status
    c.add(this.add.text(msgRight - 10, headerY, '접속 중', {
      fontFamily: 'sans-serif', fontSize: '12px', color: '#aaccff',
    }).setOrigin(1, 0.5));

    // ── Chat area ──
    // Boss's previous message (left-aligned, gray)
    const bossMsg1Y = headerY + 60;
    c.add(this.add.text(msgLeft + 14, bossMsg1Y - 12, '부장님', {
      fontFamily: 'sans-serif', fontSize: '10px', color: '#888888',
    }));
    const bossBubble1 = this.add.rectangle(msgLeft + 100, bossMsg1Y + 10, 180, 34, 0xe4e6eb, 1)
      .setStrokeStyle(1, 0xcccccc);
    c.add(bossBubble1);
    c.add(this.add.text(msgLeft + 100, bossMsg1Y + 10, '주간보고 보냈어?', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#333333',
    }).setOrigin(0.5));

    // ── MY dangerous message (right-aligned, blue) ──
    const myMsgY = bossMsg1Y + 65;
    const myBubbleW = 220;
    const myBubbleH = 38;
    const myBubbleX = msgRight - myBubbleW / 2 - 10;
    const myBubble = this.add.rectangle(myBubbleX, myMsgY, myBubbleW, myBubbleH, 0x0084ff, 1)
      .setStrokeStyle(1, 0x0066cc).setInteractive({ useHandCursor: true });
    c.add(myBubble);
    const myMsgText = this.add.text(myBubbleX, myMsgY, '부장님 개짜증나', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    c.add(myMsgText);
    // Read receipt
    c.add(this.add.text(myBubbleX - myBubbleW / 2 - 16, myMsgY + 6, '1', {
      fontFamily: 'sans-serif', fontSize: '11px', color: '#ffcc00',
    }).setOrigin(0.5));
    // Timestamp
    c.add(this.add.text(myBubbleX - myBubbleW / 2 - 16, myMsgY - 8, '오전 9:02', {
      fontFamily: 'sans-serif', fontSize: '9px', color: '#aaaaaa',
    }).setOrigin(0.5));

    // ── Tap message bubble → show delete popup ──
    myBubble.on('pointerdown', () => {
      if (this.ended || this.deletePopup) return;
      this.showDeletePopup(c, myBubbleX, myMsgY + myBubbleH / 2 + 6);
    });

    // ── Boss reply container (hidden, shown on trap) ──
    this.buildBossReplyArea(c, msgLeft, myMsgY + 70);

    // ── Input bar at bottom of messenger ──
    const inputBarY = monY + monH / 2 - 28;
    c.add(this.add.rectangle(monX, inputBarY, msgW, 36, 0xffffff)
      .setStrokeStyle(1, 0xcccccc));
    const inputPlaceholder = this.add.text(monX - msgW / 2 + 16, inputBarY, '메시지 입력...', {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#aaaaaa',
    }).setOrigin(0, 0.5);
    c.add(inputPlaceholder);
    // Send button
    const sendBtn = this.add.rectangle(monX + msgW / 2 - 30, inputBarY, 44, 28, 0x0084ff)
      .setInteractive({ useHandCursor: true });
    c.add(sendBtn);
    c.add(this.add.text(monX + msgW / 2 - 30, inputBarY, '전송', {
      fontFamily: 'sans-serif', fontSize: '12px', color: '#ffffff',
    }).setOrigin(0.5));

    // Input bar zone interactive
    const inputZone = this.add.rectangle(monX - 30, inputBarY, msgW - 60, 36, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    c.add(inputZone);

    // ── TRAP: Tapping input bar or send → boss angry reply → FAIL ──
    const triggerBossReply = () => {
      if (this.ended || this.bossReplied) return;
      this.bossReplied = true;
      this.triggerBossAnger(c, msgLeft, myMsgY + 70);
    };
    inputZone.on('pointerdown', triggerBossReply);
    sendBtn.on('pointerdown', triggerBossReply);

    // ── Swipe hint at bottom ──
    const hintText = this.add.text(width / 2, height - 14, '↑ 스와이프', {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#666688',
    }).setOrigin(0.5).setAlpha(0.5);
    c.add(hintText);

    // Gentle pulse on hint
    this.tweens.add({
      targets: hintText, alpha: 0.25, duration: 1200, yoyo: true, repeat: -1,
    });
  }

  private showDeletePopup(container: Phaser.GameObjects.Container, x: number, y: number) {
    const popup = this.add.container(x, y);

    const bg = this.add.rectangle(0, 12, 72, 30, 0xff4444, 1)
      .setStrokeStyle(1, 0xcc0000).setInteractive({ useHandCursor: true });
    popup.add(bg);
    popup.add(this.add.text(0, 12, '삭제', {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5));

    container.add(popup);
    this.deletePopup = popup;

    // Small pop-in animation
    popup.setScale(0);
    this.tweens.add({ targets: popup, scaleX: 1, scaleY: 1, duration: 150, ease: 'Back.easeOut' });

    // ── TRAP: Delete button → "서버 지연 중..." ──
    bg.on('pointerdown', () => {
      if (this.ended || this.deleting) return;
      this.deleting = true;
      this.showDeletingAnimation(container, x, y + 36);
    });
  }

  private showDeletingAnimation(container: Phaser.GameObjects.Container, x: number, y: number) {
    // Remove delete popup
    if (this.deletePopup) {
      this.deletePopup.destroy();
      this.deletePopup = null;
    }

    const loadingBg = this.add.rectangle(x, y, 200, 32, 0x333344, 0.9)
      .setStrokeStyle(1, 0x555566);
    container.add(loadingBg);

    const loadingText = this.add.text(x, y, '⏳ 서버 지연 중...', {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#ffcc44',
    }).setOrigin(0.5);
    container.add(loadingText);

    // Hourglass spinning animation — cycle text
    let frame = 0;
    const frames = ['⏳ 서버 지연 중...', '⌛ 서버 지연 중..', '⏳ 서버 지연 중.', '⌛ 서버 접속 중...'];
    this.time.addEvent({
      delay: 600, repeat: -1,
      callback: () => {
        if (this.ended || !loadingText.active) return;
        frame = (frame + 1) % frames.length;
        loadingText.setText(frames[frame]);
      },
    });
  }

  private bossReplyText: Phaser.GameObjects.Text | null = null;
  private bossReplyBubble: Phaser.GameObjects.Rectangle | null = null;

  private buildBossReplyArea(container: Phaser.GameObjects.Container, msgLeft: number, y: number) {
    // Pre-create hidden boss reply elements
    const bubbleX = msgLeft + 130;
    this.bossReplyBubble = this.add.rectangle(bubbleX, y, 260, 38, 0xe4e6eb, 1)
      .setStrokeStyle(1, 0xcccccc).setVisible(false);
    container.add(this.bossReplyBubble);

    this.bossReplyText = this.add.text(bubbleX, y, '', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#cc0000', fontStyle: 'bold',
    }).setOrigin(0.5).setVisible(false);
    container.add(this.bossReplyText);
  }

  private triggerBossAnger(container: Phaser.GameObjects.Container, msgLeft: number, y: number) {
    if (!this.bossReplyBubble || !this.bossReplyText) return;

    // "Typing..." indicator first
    const typingText = this.add.text(msgLeft + 20, y - 16, '부장님이 입력 중...', {
      fontFamily: 'sans-serif', fontSize: '11px', color: '#888888',
    });
    container.add(typingText);

    this.time.delayedCall(800, () => {
      if (this.ended) return;
      typingText.destroy();
      this.bossReplyBubble!.setVisible(true);
      this.bossReplyText!.setText('뭐가 짜증 난다고? \u{1F621}').setVisible(true);

      // Screen shake
      this.cameras.main.shake(200, 0.005);

      // Fail after 2 seconds
      this.time.delayedCall(2000, () => {
        if (!this.ended) this.endGame(false);
      });
    });
  }

  // ════════════════════════════════════════════════
  //  VIEW 2 — Under Desk
  // ════════════════════════════════════════════════
  private buildUnderDeskView(width: number, height: number) {
    const c = this.add.container(0, height); // offset below first view
    this.worldContainer.add(c);

    // ── Dark under-desk background ──
    c.add(this.add.rectangle(width / 2, height / 2, width, height, 0x0d0d1a));

    // Floor
    c.add(this.add.rectangle(width / 2, height - 20, width, 40, 0x333340));

    // Desk underside at top
    c.add(this.add.rectangle(width / 2, 16, width, 32, 0x4a2f1e));

    // ── Swipe hint ──
    const hintDown = this.add.text(width / 2, 42, '↓ 스와이프', {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#555577',
    }).setOrigin(0.5).setAlpha(0.5);
    c.add(hintDown);
    this.tweens.add({
      targets: hintDown, alpha: 0.2, duration: 1200, yoyo: true, repeat: -1,
    });

    // ── Power strip / 멀티탭 ──
    const stripX = width / 2 + 60;
    const stripY = height / 2 + 80;
    c.add(this.add.rectangle(stripX, stripY, 260, 40, 0xcccccc)
      .setStrokeStyle(2, 0x999999));
    c.add(this.add.text(stripX, stripY - 2, '■ ■ ■ ■ ■', {
      fontFamily: 'monospace', fontSize: '16px', color: '#666666',
    }).setOrigin(0.5));
    c.add(this.add.text(stripX + 130, stripY + 2, '🔌', {
      fontSize: '18px',
    }).setOrigin(0, 0.5));

    // ── Trash can (decorative) ──
    const trashX = 120;
    const trashY = height - 90;
    c.add(this.add.rectangle(trashX, trashY, 50, 70, 0x555566)
      .setStrokeStyle(1, 0x444455));
    c.add(this.add.rectangle(trashX, trashY - 38, 56, 8, 0x666677));
    c.add(this.add.text(trashX, trashY - 10, '🗑️', {
      fontSize: '24px',
    }).setOrigin(0.5));

    // ── Cables / plugs ──
    const cableConfigs = [
      { x: 280, y: height / 2 + 20, w: 140, h: 5, color: 0xff4444, label: '이건 에어컨 플러그...', angle: -8 },
      { x: 420, y: height / 2 - 10, w: 120, h: 5, color: 0x4488ff, label: '충전기 케이블인데?', angle: 12 },
      { x: 600, y: height / 2 + 40, w: 100, h: 5, color: 0xffcc00, label: '이건 LAN 케이블...', angle: -5 },
      { x: 750, y: height / 2 - 20, w: 90, h: 5, color: 0x888888, label: '뭔지 모를 선...', angle: 15 },
    ];

    cableConfigs.forEach(cfg => {
      // Cable line
      const cable = this.add.rectangle(cfg.x, cfg.y, cfg.w, cfg.h, cfg.color)
        .setAngle(cfg.angle);
      c.add(cable);

      // Plug head (small rectangle at end)
      const plugX = cfg.x + cfg.w / 2 - 10;
      const plug = this.add.rectangle(plugX, cfg.y, 24, 16, cfg.color)
        .setStrokeStyle(1, 0x222222)
        .setInteractive({ useHandCursor: true });
      c.add(plug);

      // ── TRAP: wrong plug → spark + funny text ──
      plug.on('pointerdown', () => {
        if (this.ended) return;
        this.showSpark(c, plugX, cfg.y, cfg.label);
      });
    });

    // ── CORRECT PLUG: Thick black cable connected to monitor ──
    // Visually distinct — thicker, black, with label hint
    const correctCableX = width / 2 - 80;
    const correctCableY = height / 2 + 10;
    // Cable going up to the desk
    c.add(this.add.rectangle(correctCableX, correctCableY - 60, 8, 100, 0x111111));
    // Thick cable horizontal section
    c.add(this.add.rectangle(correctCableX + 40, correctCableY + 2, 100, 8, 0x111111));

    // The plug itself — thick and black
    const correctPlug = this.add.rectangle(correctCableX + 95, correctCableY + 2, 36, 22, 0x0a0a0a)
      .setStrokeStyle(2, 0x333333)
      .setInteractive({ useHandCursor: true });
    c.add(correctPlug);
    // Prong marks on plug
    c.add(this.add.text(correctCableX + 95, correctCableY + 2, '▮▮', {
      fontFamily: 'monospace', fontSize: '10px', color: '#666666',
    }).setOrigin(0.5));
    // Small label near cable
    c.add(this.add.text(correctCableX - 10, correctCableY - 18, '모니터', {
      fontFamily: 'sans-serif', fontSize: '9px', color: '#444466',
    }).setOrigin(0.5));

    // ── SOLUTION: Pull the correct plug ──
    correctPlug.on('pointerdown', () => {
      if (this.ended) return;
      this.pullCorrectPlug(c, correctCableX + 95, correctCableY + 2);
    });

    // ── Decorative dust particles ──
    for (let i = 0; i < 8; i++) {
      const dust = this.add.circle(
        Phaser.Math.Between(50, width - 50),
        Phaser.Math.Between(100, height - 60),
        Phaser.Math.Between(1, 3),
        0x555566, 0.3,
      );
      c.add(dust);
      this.tweens.add({
        targets: dust, alpha: 0.05, duration: Phaser.Math.Between(1500, 3000),
        yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500),
      });
    }
  }

  private showSpark(container: Phaser.GameObjects.Container, x: number, y: number, label: string) {
    // Remove previous spark texts
    this.sparkTexts.forEach(t => { if (t.active) t.destroy(); });
    this.sparkTexts = [];

    // Spark emoji
    const spark = this.add.text(x, y - 10, '⚡', {
      fontSize: '28px',
    }).setOrigin(0.5);
    container.add(spark);
    this.sparkTexts.push(spark);

    this.tweens.add({
      targets: spark, alpha: 0, y: y - 40, duration: 600, ease: 'Power2',
      onComplete: () => spark.destroy(),
    });

    // Funny label
    const txt = this.add.text(x, y + 20, label, {
      fontFamily: 'sans-serif', fontSize: '12px', color: '#ffaa44',
      backgroundColor: '#1a1a2e', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setAlpha(0);
    container.add(txt);
    this.sparkTexts.push(txt);

    this.tweens.add({
      targets: txt, alpha: 1, duration: 200,
      onComplete: () => {
        this.tweens.add({
          targets: txt, alpha: 0, duration: 400, delay: 1200,
          onComplete: () => txt.destroy(),
        });
      },
    });

    // Small camera shake
    this.cameras.main.shake(100, 0.003);
  }

  private pullCorrectPlug(container: Phaser.GameObjects.Container, x: number, y: number) {
    this.ended = true;

    // Pull animation — plug moves right
    const pullPlug = this.add.rectangle(x, y, 36, 22, 0x0a0a0a)
      .setStrokeStyle(2, 0x333333);
    container.add(pullPlug);

    // "찌직-" spark text
    const sparkText = this.add.text(x + 30, y - 16, '찌직-', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#ffff44', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setAlpha(0);
    container.add(sparkText);

    this.tweens.add({
      targets: pullPlug, x: x + 80, duration: 400, ease: 'Power2',
    });
    this.tweens.add({
      targets: sparkText, alpha: 1, duration: 100, delay: 150,
      onComplete: () => {
        this.tweens.add({ targets: sparkText, alpha: 0, duration: 300, delay: 300 });
      },
    });

    // After pull, scroll back to monitor and show it going black
    this.time.delayedCall(700, () => {
      this.scrollToView('monitor', () => {
        this.showMonitorShutdown();
      });
    });
  }

  // ════════════════════════════════════════════════
  //  Monitor shutdown sequence
  // ════════════════════════════════════════════════
  private showMonitorShutdown() {
    const { width, height } = this.scale;

    // Black rectangle sweeping from top to bottom over the monitor screen area
    const monX = width / 2;
    const monY = height / 2 - 30;
    const monW = 560;
    const monH = 380;

    const blackScreen = this.add.rectangle(monX, monY - monH / 2, monW, 0, 0x000000)
      .setOrigin(0.5, 0).setDepth(50);

    this.tweens.add({
      targets: blackScreen,
      height: monH,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        // Show "..." in center of black screen
        const dots = this.add.text(monX, monY, '...', {
          fontFamily: 'monospace', fontSize: '32px', color: '#333333',
        }).setOrigin(0.5).setDepth(51).setAlpha(0);

        this.tweens.add({
          targets: dots, alpha: 1, duration: 400,
          onComplete: () => {
            this.time.delayedCall(600, () => {
              // Success text
              const successText = this.add.text(monX, monY + 50, '증거 인멸 완료', {
                fontFamily: 'sans-serif', fontSize: '20px', color: '#44ff44',
                fontStyle: 'bold',
              }).setOrigin(0.5).setDepth(51).setAlpha(0);

              this.tweens.add({
                targets: successText, alpha: 1, duration: 300,
                onComplete: () => {
                  this.time.delayedCall(1000, () => {
                    this.endGame(true);
                  });
                },
              });
            });
          },
        });
      },
    });
  }

  // ════════════════════════════════════════════════
  //  View scrolling
  // ════════════════════════════════════════════════
  private scrollToView(target: 'monitor' | 'underDesk', onComplete?: () => void) {
    if (this.isTweening) return;
    this.isTweening = true;
    this.currentView = target;

    const targetY = target === 'monitor' ? 0 : -this.scale.height;

    this.tweens.add({
      targets: this.worldContainer,
      y: targetY,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        this.isTweening = false;
        if (onComplete) onComplete();
      },
    });
  }

  // ════════════════════════════════════════════════
  //  End game
  // ════════════════════════════════════════════════
  private endGame(success: boolean) {
    if (this.ended && !success) return; // allow success to go through (already set ended=true)
    this.ended = true;

    if (!success) {
      // Fail effect — red flash
      this.cameras.main.flash(400, 255, 50, 50);
      const { width, height } = this.scale;
      const failText = this.add.text(width / 2, height / 2, '부장님이 메시지를 봤습니다...', {
        fontFamily: 'sans-serif', fontSize: '22px', color: '#ff4444',
        fontStyle: 'bold', backgroundColor: '#000000', padding: { x: 16, y: 8 },
      }).setOrigin(0.5).setDepth(200).setAlpha(0);

      this.tweens.add({
        targets: failText, alpha: 1, duration: 300,
      });
    }

    this.time.delayedCall(success ? 200 : 1500, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success });
    });
  }
}

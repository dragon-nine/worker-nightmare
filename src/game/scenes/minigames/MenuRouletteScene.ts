import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지3: 가위바위보 — 을의 생존법
 * 1인칭 카페 카운터. 부장님 등 뒤로 보이는 손을 에스프레소 머신 거울에 비춰 읽고,
 * 일부러 져야 클리어. 3판 져야 성공. 이기면 FAIL.
 */
export class MenuRouletteScene extends Phaser.Scene {
  private stageId = 0;
  private ended = false;

  // RPS state
  private readonly RPS: Array<'rock' | 'paper' | 'scissors'> = ['rock', 'paper', 'scissors'];
  private readonly RPS_EMOJI: Record<string, string> = { rock: '✊', paper: '✋', scissors: '✌️' };


  private bossHand: 'rock' | 'paper' | 'scissors' = 'rock';
  private roundsLost = 0;
  private roundsNeeded = 3;
  private roundLocked = false;

  // Timer
  private timeLeft = 20;
  private timerText!: Phaser.GameObjects.Text;
  private timerBar!: Phaser.GameObjects.Rectangle;
  private timerEvent!: Phaser.Time.TimerEvent;

  // Boss visuals
  private bossHandBehind!: Phaser.GameObjects.Text;
  private mirrorHandText!: Phaser.GameObjects.Text;
  private bossBody!: Phaser.GameObjects.Rectangle;
  private bossHead!: Phaser.GameObjects.Rectangle;
  private bossFace!: Phaser.GameObjects.Text;

  // Round indicator
  private roundText!: Phaser.GameObjects.Text;

  // Buttons
  private buttons: Phaser.GameObjects.Rectangle[] = [];
  private buttonLabels: Phaser.GameObjects.Text[] = [];

  // Mirror shimmer
  private mirrorSurface!: Phaser.GameObjects.Rectangle;

  // Feedback container
  private feedbackContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'MenuRouletteScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.ended = false;
    this.roundsLost = 0;
    this.roundLocked = false;
    this.timeLeft = 20;
    this.buttons = [];
    this.buttonLabels = [];
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#3e2723');

    // -- Top area: title + round indicator --
    this.add.text(width / 2, 28, '가위바위보 — 을의 생존법', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#ffcc80', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 55, '거울을 보고 일부러 져라!', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#a1887f',
    }).setOrigin(0.5);

    this.roundText = this.add.text(width / 2, 82, this.getRoundLabel(), {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#fff176', fontStyle: 'bold',
    }).setOrigin(0.5);

    // -- Timer bar (top) --
    this.add.rectangle(width / 2, 100, width - 40, 8, 0x4e342e);
    this.timerBar = this.add.rectangle(20, 100, width - 40, 8, 0xff7043).setOrigin(0, 0.5);
    this.timerText = this.add.text(width - 20, 100, `${this.timeLeft}s`, {
      fontFamily: 'sans-serif', fontSize: '12px', color: '#ffab91',
    }).setOrigin(1, 0.5);

    // -- LEFT SIDE: Boss character (x: 40-330) --
    this.createBoss();

    // -- CENTER: Espresso machine + mirror (x: 350-610) --
    this.createEspressoMachine();

    // -- BOTTOM: RPS buttons (y: 420-530) --
    this.createButtons();

    // -- Feedback container (reusable) --
    this.feedbackContainer = this.add.container(width / 2, height / 2);
    this.feedbackContainer.setVisible(false);

    // -- Start first round --
    this.startNewRound();

    // -- Timer --
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.ended) return;
        this.timeLeft--;
        this.timerText.setText(`${this.timeLeft}s`);
        this.timerBar.width = (width - 40) * (this.timeLeft / 20);
        if (this.timeLeft <= 5) {
          this.timerBar.setFillStyle(0xef5350);
          this.timerText.setColor('#ef5350');
        }
        if (this.timeLeft <= 0) {
          this.endGame(false);
        }
      },
    });

    // -- Mirror shimmer tween --
    this.tweens.add({
      targets: this.mirrorSurface,
      alpha: { from: 0.55, to: 0.75 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    emitGameState({
      scene: 'MenuRouletteScene', stageId: this.stageId,
      progress: GameManager.progress, allCleared: GameManager.allCleared,
      stress: GameManager.stress,
    });
  }

  // ===== BOSS CHARACTER =====
  private createBoss() {
    const { height } = this.scale;
    const bossX = 180;
    const bossBaseY = height * 0.55;

    // Boss body (back view — dark suit rectangle)
    this.bossBody = this.add.rectangle(bossX, bossBaseY, 140, 200, 0x263238)
      .setStrokeStyle(2, 0x37474f);

    // Boss head (back of head — darker circle-ish rectangle)
    this.bossHead = this.add.rectangle(bossX, bossBaseY - 120, 80, 80, 0x4e342e)
      .setStrokeStyle(2, 0x3e2723);

    // Hair on back of head
    this.add.rectangle(bossX, bossBaseY - 140, 84, 30, 0x1a1a1a);

    // Shoulders
    this.add.rectangle(bossX - 80, bossBaseY - 70, 30, 60, 0x263238)
      .setStrokeStyle(1, 0x37474f);
    this.add.rectangle(bossX + 80, bossBaseY - 70, 30, 60, 0x263238)
      .setStrokeStyle(1, 0x37474f);

    // Boss face (hidden by default — only shown on reactions)
    this.bossFace = this.add.text(bossX, bossBaseY - 120, '', {
      fontSize: '40px',
    }).setOrigin(0.5).setAlpha(0);

    // Boss label
    this.add.text(bossX, bossBaseY + 120, '🤵 부장님 (뒷모습)', {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#8d6e63',
    }).setOrigin(0.5);

    // Boss hand behind back (small, dim — the hint that's hard to see)
    this.bossHandBehind = this.add.text(bossX + 20, bossBaseY + 60, '✊', {
      fontSize: '28px',
    }).setOrigin(0.5).setAlpha(0.35);
  }

  // ===== ESPRESSO MACHINE + MIRROR =====
  private createEspressoMachine() {
    const { height } = this.scale;
    const machineX = 480;
    const machineY = height * 0.45;

    // Machine body
    this.add.rectangle(machineX, machineY, 160, 280, 0x546e7a)
      .setStrokeStyle(3, 0x78909c);

    // Machine top (dome)
    this.add.rectangle(machineX, machineY - 155, 120, 30, 0x607d8b);

    // Machine details — knobs
    this.add.circle(machineX - 30, machineY - 100, 8, 0x90a4ae);
    this.add.circle(machineX + 30, machineY - 100, 8, 0x90a4ae);

    // Coffee dispenser area
    this.add.rectangle(machineX, machineY + 100, 80, 40, 0x37474f);
    this.add.text(machineX, machineY + 100, '☕', {
      fontSize: '20px',
    }).setOrigin(0.5);

    // === MIRROR / REFLECTIVE SURFACE ===
    const mirrorX = machineX;
    const mirrorY = machineY - 20;
    const mirrorW = 110;
    const mirrorH = 100;

    // Mirror backing
    this.add.rectangle(mirrorX, mirrorY, mirrorW + 6, mirrorH + 6, 0x90a4ae);

    // Mirror surface (lighter, reflective)
    this.mirrorSurface = this.add.rectangle(mirrorX, mirrorY, mirrorW, mirrorH, 0xcfd8dc)
      .setAlpha(0.65);

    // Mirror label
    this.add.text(mirrorX, mirrorY + mirrorH / 2 + 14, '반사면', {
      fontFamily: 'sans-serif', fontSize: '11px', color: '#b0bec5',
    }).setOrigin(0.5);

    // Mirror glow border
    const mirrorGlow = this.add.rectangle(mirrorX, mirrorY, mirrorW + 2, mirrorH + 2)
      .setStrokeStyle(2, 0xffffff, 0.4)
      .setFillStyle(0xffffff, 0);

    this.tweens.add({
      targets: mirrorGlow,
      alpha: { from: 0.3, to: 0.8 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Mirror reflection of boss hand (clear — this is the actual hint)
    this.mirrorHandText = this.add.text(mirrorX, mirrorY, '✊', {
      fontSize: '38px',
    }).setOrigin(0.5).setAlpha(0.8).setScale(-1, 1); // horizontally flipped for mirror effect
  }

  // ===== RPS BUTTONS =====
  private createButtons() {
    const { width, height } = this.scale;
    const btnY = height - 70;
    const btnW = 160;
    const btnH = 60;
    const options: Array<'scissors' | 'rock' | 'paper'> = ['scissors', 'rock', 'paper'];
    const labels = ['✌️ 가위', '✊ 바위', '✋ 보'];
    const startX = width / 2 - btnW - 20;

    options.forEach((opt, i) => {
      const x = startX + i * (btnW + 20);

      const btn = this.add.rectangle(x, btnY, btnW, btnH, 0x5d4037)
        .setStrokeStyle(2, 0x8d6e63)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(x, btnY, labels[i], {
        fontFamily: 'sans-serif', fontSize: '22px', color: '#ffcc80', fontStyle: 'bold',
      }).setOrigin(0.5);

      btn.on('pointerover', () => {
        if (!this.roundLocked && !this.ended) {
          btn.setFillStyle(0x795548);
          btn.setScale(1.05);
          label.setScale(1.05);
        }
      });

      btn.on('pointerout', () => {
        btn.setFillStyle(0x5d4037);
        btn.setScale(1);
        label.setScale(1);
      });

      btn.on('pointerdown', () => {
        if (!this.roundLocked && !this.ended) {
          this.onPlayerChoice(opt);
        }
      });

      this.buttons.push(btn);
      this.buttonLabels.push(label);
    });

    // Instruction text
    this.add.text(width / 2, btnY - 48, '당신의 선택:', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#a1887f',
    }).setOrigin(0.5);
  }

  // ===== ROUND LOGIC =====
  private startNewRound() {
    this.roundLocked = false;

    // Pick boss hand randomly
    this.bossHand = Phaser.Math.RND.pick(this.RPS);
    const emoji = this.RPS_EMOJI[this.bossHand];

    // Update boss hand behind back (dim, small)
    this.bossHandBehind.setText(emoji);
    this.bossHandBehind.setAlpha(0.35);

    // Update mirror reflection (clear — the key hint)
    this.mirrorHandText.setText(emoji);
    this.mirrorHandText.setAlpha(0.8);

    // Update round indicator
    this.roundText.setText(this.getRoundLabel());

    // Enable buttons
    this.buttons.forEach(btn => btn.setAlpha(1));
    this.buttonLabels.forEach(lbl => lbl.setAlpha(1));
  }

  private onPlayerChoice(playerHand: 'rock' | 'paper' | 'scissors') {
    if (this.roundLocked || this.ended) return;
    this.roundLocked = true;

    // Disable buttons visually
    this.buttons.forEach(btn => btn.setAlpha(0.5));
    this.buttonLabels.forEach(lbl => lbl.setAlpha(0.5));

    const result = this.resolveRPS(playerHand, this.bossHand);

    if (result === 'win') {
      // Player won — boss is ANGRY — FAIL!
      this.showBossReaction('angry', playerHand);
    } else if (result === 'tie') {
      // Tie — redo round
      this.showTieReaction(playerHand);
    } else {
      // Player lost (intentionally) — boss happy — round success!
      this.roundsLost++;
      this.showBossReaction('happy', playerHand);
    }
  }

  private resolveRPS(player: string, boss: string): 'win' | 'lose' | 'tie' {
    if (player === boss) return 'tie';
    if (
      (player === 'rock' && boss === 'scissors') ||
      (player === 'scissors' && boss === 'paper') ||
      (player === 'paper' && boss === 'rock')
    ) {
      return 'win';
    }
    return 'lose';
  }

  // ===== REACTIONS =====
  private showBossReaction(type: 'angry' | 'happy', playerHand: 'rock' | 'paper' | 'scissors') {
    const { width, height } = this.scale;

    if (type === 'angry') {
      // Boss turns around — angry
      this.bossBody.setFillStyle(0xb71c1c);
      this.bossFace.setText('😤');
      this.bossFace.setAlpha(1);
      this.bossHandBehind.setAlpha(0);

      // Camera shake
      this.cameras.main.shake(400, 0.01);

      // Show fail message
      this.add.rectangle(width / 2, height / 2, 500, 120, 0x000000, 0.8);
      this.add.text(width / 2, height / 2 - 15, '네가 감히 이겨?! 😤', {
        fontFamily: 'sans-serif', fontSize: '30px', color: '#ef5350', fontStyle: 'bold',
      }).setOrigin(0.5);

      this.add.text(width / 2, height / 2 + 25, `당신: ${this.RPS_EMOJI[playerHand]} vs 부장님: ${this.RPS_EMOJI[this.bossHand]}`, {
        fontFamily: 'sans-serif', fontSize: '16px', color: '#ef9a9a',
      }).setOrigin(0.5);

      this.time.delayedCall(1800, () => {
        this.endGame(false);
      });

    } else {
      // Boss happy — bounces
      this.bossFace.setText('😏');
      this.bossFace.setAlpha(1);
      this.bossHandBehind.setAlpha(0);

      // Happy bounce
      this.tweens.add({
        targets: [this.bossBody, this.bossHead, this.bossFace],
        y: '-=15',
        duration: 200,
        yoyo: true,
        repeat: 1,
        ease: 'Bounce.easeOut',
      });

      // Show round success
      const successMsg = this.add.text(width / 2, height * 0.35, `껄껄, 내가 이겼지!`, {
        fontFamily: 'sans-serif', fontSize: '24px', color: '#a5d6a7', fontStyle: 'bold',
      }).setOrigin(0.5);

      const roundClear = this.add.text(width / 2, height * 0.42, `Round ${this.roundsLost}/${this.roundsNeeded} Clear!`, {
        fontFamily: 'sans-serif', fontSize: '18px', color: '#81c784', fontStyle: 'bold',
      }).setOrigin(0.5);

      const matchInfo = this.add.text(width / 2, height * 0.48, `당신: ${this.RPS_EMOJI[playerHand]} vs 부장님: ${this.RPS_EMOJI[this.bossHand]}`, {
        fontFamily: 'sans-serif', fontSize: '14px', color: '#c8e6c9',
      }).setOrigin(0.5);

      if (this.roundsLost >= this.roundsNeeded) {
        // All rounds lost — game clear!
        this.time.delayedCall(1200, () => {
          successMsg.destroy();
          roundClear.destroy();
          matchInfo.destroy();
          this.endGame(true);
        });
      } else {
        // Next round
        this.time.delayedCall(1200, () => {
          successMsg.destroy();
          roundClear.destroy();
          matchInfo.destroy();
          this.resetBossVisuals();
          this.startNewRound();
        });
      }
    }
  }

  private showTieReaction(playerHand: 'rock' | 'paper' | 'scissors') {
    const { width, height } = this.scale;

    const tieMsg = this.add.text(width / 2, height * 0.38, '다시!', {
      fontFamily: 'sans-serif', fontSize: '32px', color: '#fff176', fontStyle: 'bold',
    }).setOrigin(0.5);

    const tieInfo = this.add.text(width / 2, height * 0.45, `둘 다 ${this.RPS_EMOJI[playerHand]} — 비겼다!`, {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#fff9c4',
    }).setOrigin(0.5);

    this.cameras.main.flash(200, 255, 241, 118, false);

    this.time.delayedCall(900, () => {
      tieMsg.destroy();
      tieInfo.destroy();
      this.startNewRound();
    });
  }

  private resetBossVisuals() {
    const { height } = this.scale;
    const bossX = 180;
    const bossBaseY = height * 0.55;

    this.bossBody.setFillStyle(0x263238);
    this.bossBody.setPosition(bossX, bossBaseY);
    this.bossHead.setPosition(bossX, bossBaseY - 120);
    this.bossFace.setAlpha(0);
    this.bossFace.setPosition(bossX, bossBaseY - 120);
    this.bossHandBehind.setAlpha(0.35);
  }

  // ===== END GAME =====
  private endGame(success: boolean) {
    if (this.ended) return;
    this.ended = true;

    if (this.timerEvent) {
      this.timerEvent.destroy();
    }

    const { width, height } = this.scale;

    // Final message
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
      .setDepth(10);

    const resultEmoji = success ? '✅' : '❌';
    const resultText = success
      ? '부장님 기분 UP! 성공적으로 졌습니다!'
      : '부장님 분노! 감히 상관한테...';

    this.add.text(width / 2, height / 2 - 10, `${resultEmoji} ${resultText}`, {
      fontFamily: 'sans-serif', fontSize: '24px',
      color: success ? '#a5d6a7' : '#ef5350', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);

    this.time.delayedCall(1500, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success });
    });
  }

  // ===== HELPERS =====
  private getRoundLabel(): string {
    const cleared = this.roundsLost;
    const needed = this.roundsNeeded;
    const dots = Array.from({ length: needed }, (_, i) => i < cleared ? '●' : '○').join(' ');
    return `${dots}  (${cleared}/${needed} 패배 필요)`;
  }
}

import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지4: 빈말 퍼레이드 — Empty Talk Parade (Soulless Parrot)
 *
 * 회의실에서 부장님의 꼰대 발언에 적절한 빈말로 대응하는 미니게임.
 * 3라운드 동안 안전한 답변(아첨/빈말)을 골라야 승리.
 * 사실폭탄이나 딴소리를 선택하면 즉시 실패.
 */

interface RoundData {
  bossSpeech: string;
  choices: { text: string; safe: boolean }[];
}

const ROUNDS: RoundData[] = [
  {
    bossSpeech: '요즘 MZ세대들은 열정이 부족해!',
    choices: [
      { text: '좋은 인사이트입니다!', safe: true },
      { text: '공감합니다 부장님', safe: true },
      { text: '그건 편견 아닌가요?', safe: false },
      { text: '저도 MZ인데요', safe: false },
    ],
  },
  {
    bossSpeech: '내가 니 나이 때는 밤새 일했어',
    choices: [
      { text: '역시 부장님이십니다!', safe: true },
      { text: '본받겠습니다', safe: true },
      { text: '근로기준법이...', safe: false },
      { text: '지금 몇 시죠?', safe: false },
    ],
  },
  {
    bossSpeech: '이번 분기 목표를 3배로 올리자!',
    choices: [
      { text: '제가 팔로업하겠습니다!', safe: true },
      { text: '도전적인 목표네요!', safe: true },
      { text: '현실적으로 불가능합니다', safe: false },
      { text: '점심 뭐 먹죠?', safe: false },
    ],
  },
];

export class SleepFightScene extends Phaser.Scene {
  private stageId = 0;
  private ended = false;
  private currentRound = 0;
  private totalRounds = 3;
  private roundTimer?: Phaser.Time.TimerEvent;
  private timerText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private bossEmoji!: Phaser.GameObjects.Text;
  private speechBubbleBg!: Phaser.GameObjects.Graphics;
  private speechText!: Phaser.GameObjects.Text;
  private bossReactionText!: Phaser.GameObjects.Text;
  private choiceButtons: Phaser.GameObjects.Container[] = [];
  private buttonsContainer!: Phaser.GameObjects.Container;
  private timeLeft = 5;
  private inputLocked = false;

  constructor() {
    super({ key: 'SleepFightScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.ended = false;
    this.currentRound = 0;
    this.timeLeft = 5;
    this.inputLocked = false;
    this.choiceButtons = [];
  }

  create() {
    const { width } = this.scale;
    this.cameras.main.setBackgroundColor('#f0ece3');

    // ── Top bar (y: 0-60) ───────────────────────────────────
    this.add.rectangle(width / 2, 30, width, 60, 0x3c3c3c);

    this.add.text(20, 30, '🏢 회의실', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.roundText = this.add.text(width / 2, 30, '1 / 3', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.timerText = this.add.text(width - 20, 30, '⏱ 5', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#ff6b6b',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    // ── Center area: Boss (y: 60-320) ───────────────────────
    // Boss desk / podium
    this.add.rectangle(width / 2, 310, 300, 20, 0x8b6f47).setStrokeStyle(2, 0x5c4a2e);

    // Boss emoji
    this.bossEmoji = this.add.text(width / 2, 230, '🤵', {
      fontFamily: 'sans-serif',
      fontSize: '72px',
    }).setOrigin(0.5);

    // Speech bubble background (drawn via graphics)
    this.speechBubbleBg = this.add.graphics();

    // Speech text
    this.speechText = this.add.text(width / 2, 120, '', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#1a1a1a',
      fontStyle: 'bold',
      wordWrap: { width: 360 },
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    // Boss reaction text (appears after choice)
    this.bossReactionText = this.add.text(width / 2, 180, '', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#e94560',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    // ── Bottom section: Answer buttons (y: 340-530) ─────────
    this.buttonsContainer = this.add.container(0, 0);

    // ── Start first round ───────────────────────────────────
    this.startRound();

    emitGameState({
      scene: 'SleepFightScene',
      stageId: this.stageId,
      progress: GameManager.progress,
      allCleared: GameManager.allCleared,
      stress: GameManager.stress,
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  Round flow
  // ═══════════════════════════════════════════════════════════

  private startRound() {
    if (this.ended) return;

    const round = ROUNDS[this.currentRound];
    this.inputLocked = true;
    this.timeLeft = 5;

    // Update round counter
    this.roundText.setText(`${this.currentRound + 1} / ${this.totalRounds}`);
    this.timerText.setText('⏱ 5').setColor('#ff6b6b');

    // Clear previous buttons
    this.clearButtons();

    // Reset boss
    this.bossEmoji.setText('🤵').setScale(1);
    this.bossReactionText.setAlpha(0);

    // Draw speech bubble
    this.drawSpeechBubble(round.bossSpeech);

    // Animate speech bubble appearing
    this.speechText.setText(round.bossSpeech).setAlpha(0);
    this.tweens.add({
      targets: this.speechText,
      alpha: 1,
      duration: 400,
      ease: 'Power2',
    });

    // After 1s delay, show answer buttons
    this.time.delayedCall(1000, () => {
      if (this.ended) return;
      this.showChoices(round.choices);
      this.inputLocked = false;
      this.startTimer();
    });
  }

  private drawSpeechBubble(_text: string) {
    const { width } = this.scale;
    this.speechBubbleBg.clear();

    // Bubble grows slightly each round
    const extraWidth = this.currentRound * 20;
    const extraHeight = this.currentRound * 8;
    const bubbleW = 400 + extraWidth;
    const bubbleH = 60 + extraHeight;
    const bubbleX = width / 2 - bubbleW / 2;
    const bubbleY = 85;

    // Bubble body
    this.speechBubbleBg.fillStyle(0xffffff, 1);
    this.speechBubbleBg.fillRoundedRect(bubbleX, bubbleY, bubbleW, bubbleH, 16);
    this.speechBubbleBg.lineStyle(2, 0xcccccc, 1);
    this.speechBubbleBg.strokeRoundedRect(bubbleX, bubbleY, bubbleW, bubbleH, 16);

    // Tail pointing down toward boss
    const tailX = width / 2;
    const tailY = bubbleY + bubbleH;
    this.speechBubbleBg.fillStyle(0xffffff, 1);
    this.speechBubbleBg.fillTriangle(
      tailX - 10, tailY,
      tailX + 10, tailY,
      tailX, tailY + 16,
    );
    this.speechBubbleBg.lineStyle(2, 0xcccccc, 1);
    this.speechBubbleBg.lineBetween(tailX - 10, tailY, tailX, tailY + 16);
    this.speechBubbleBg.lineBetween(tailX + 10, tailY, tailX, tailY + 16);

    // Update speech text position to center of bubble
    this.speechText.setPosition(width / 2, bubbleY + bubbleH / 2);
  }

  private showChoices(choices: { text: string; safe: boolean }[]) {
    const { width } = this.scale;

    // Shuffle choices
    const shuffled = Phaser.Utils.Array.Shuffle([...choices]);

    const btnW = 210;
    const btnH = 60;
    const gap = 12;
    const totalW = btnW * 2 + gap;
    const startX = (width - totalW) / 2;
    const topY = 355;

    shuffled.forEach((choice, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = startX + col * (btnW + gap) + btnW / 2;
      const y = topY + row * (btnH + gap) + btnH / 2;

      const container = this.add.container(x, y);

      // Button background: safe answers get a very subtle green tint
      const bgColor = choice.safe ? 0xf0f8f0 : 0xf5f5f5;
      const bg = this.add.rectangle(0, 0, btnW, btnH, bgColor)
        .setStrokeStyle(2, 0xbbbbbb)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(0, 0, choice.text, {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#333333',
        fontStyle: 'bold',
        wordWrap: { width: btnW - 20 },
        align: 'center',
      }).setOrigin(0.5);

      container.add([bg, label]);
      container.setAlpha(0);

      // Animate buttons appearing
      this.tweens.add({
        targets: container,
        alpha: 1,
        y: y,
        duration: 300,
        delay: i * 80,
        ease: 'Back.easeOut',
      });

      // Hover effect
      bg.on('pointerover', () => {
        if (this.inputLocked) return;
        bg.setStrokeStyle(3, 0x3182f6);
        this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 100 });
      });
      bg.on('pointerout', () => {
        bg.setStrokeStyle(2, 0xbbbbbb);
        this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
      });

      // Click handler
      bg.on('pointerdown', () => {
        if (this.inputLocked || this.ended) return;
        this.inputLocked = true;
        this.stopTimer();
        this.onChoicePicked(choice.safe);
      });

      this.choiceButtons.push(container);
      this.buttonsContainer.add(container);
    });
  }

  private clearButtons() {
    this.choiceButtons.forEach(btn => btn.destroy());
    this.choiceButtons = [];
  }

  // ═══════════════════════════════════════════════════════════
  //  Timer
  // ═══════════════════════════════════════════════════════════

  private startTimer() {
    this.timeLeft = 5;
    this.roundTimer = this.time.addEvent({
      delay: 1000,
      repeat: 4,
      callback: () => {
        if (this.ended) return;
        this.timeLeft--;
        this.timerText.setText(`⏱ ${this.timeLeft}`);

        // Urgency color
        if (this.timeLeft <= 2) {
          this.timerText.setColor('#ff0000');
          this.tweens.add({
            targets: this.timerText,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 120,
            yoyo: true,
          });
        }

        if (this.timeLeft <= 0) {
          this.inputLocked = true;
          this.onTimeout();
        }
      },
    });
  }

  private stopTimer() {
    if (this.roundTimer) {
      this.roundTimer.destroy();
      this.roundTimer = undefined;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  Outcomes
  // ═══════════════════════════════════════════════════════════

  private onChoicePicked(safe: boolean) {
    if (safe) {
      this.onSafeAnswer();
    } else {
      this.onTrapAnswer();
    }
  }

  private onSafeAnswer() {

    // Boss happy reaction
    this.bossEmoji.setText('😊');
    this.tweens.add({
      targets: this.bossEmoji,
      y: this.bossEmoji.y - 15,
      duration: 200,
      yoyo: true,
      ease: 'Bounce',
    });

    // "역시 김대리!" text
    this.bossReactionText
      .setText('역시 김대리!')
      .setColor('#00b894')
      .setAlpha(0)
      .setScale(0.5);
    this.tweens.add({
      targets: this.bossReactionText,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });

    // Green flash
    this.cameras.main.flash(300, 144, 238, 144, false);

    // Confetti particles (emoji-based)
    this.spawnConfetti();

    // Proceed to next round
    this.time.delayedCall(1200, () => {
      this.currentRound++;
      if (this.currentRound >= this.totalRounds) {
        this.endGame(true);
      } else {
        this.startRound();
      }
    });
  }

  private onTrapAnswer() {
    const { width, height } = this.scale;

    // Boss angry reaction
    this.bossEmoji.setText('😡');

    // "뭐라고?!" text
    this.bossReactionText
      .setText('뭐라고?!')
      .setColor('#e94560')
      .setAlpha(0)
      .setScale(0.5);
    this.tweens.add({
      targets: this.bossReactionText,
      alpha: 1,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      ease: 'Power3',
    });

    // Boss zooms in dramatically
    this.tweens.add({
      targets: this.bossEmoji,
      scaleX: 2.5,
      scaleY: 2.5,
      y: height / 2,
      duration: 500,
      ease: 'Power3',
    });

    // Screen goes red + camera shake
    this.cameras.main.flash(600, 255, 0, 0, false);
    this.cameras.main.shake(500, 0.02);

    // Red overlay
    const redOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0xff0000, 0)
      .setDepth(10);
    this.tweens.add({
      targets: redOverlay,
      fillAlpha: 0.3,
      duration: 300,
    });

    // Fail
    this.time.delayedCall(1200, () => {
      this.endGame(false);
    });
  }

  private onTimeout() {
    const { width, height } = this.scale;

    // "졸았다!" text
    this.bossReactionText
      .setText('졸았다!')
      .setColor('#6c5ce7')
      .setAlpha(0)
      .setScale(0.5);
    this.tweens.add({
      targets: this.bossReactionText,
      alpha: 1,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 400,
      ease: 'Power2',
    });

    // Boss disappointed
    this.bossEmoji.setText('😒');

    // Fade out buttons
    this.tweens.add({
      targets: this.choiceButtons,
      alpha: 0,
      duration: 300,
    });

    // Camera effect
    this.cameras.main.shake(300, 0.01);

    // Sleep emoji floating up
    const zzz = this.add.text(width / 2, height / 2 + 40, '💤', {
      fontSize: '48px',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({
      targets: zzz,
      alpha: 1,
      y: height / 2 - 40,
      duration: 800,
      ease: 'Power1',
    });

    this.time.delayedCall(1200, () => {
      this.endGame(false);
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  Visual effects
  // ═══════════════════════════════════════════════════════════

  private spawnConfetti() {
    const { width } = this.scale;
    const emojis = ['🎉', '✨', '👏', '💯', '⭐'];

    for (let i = 0; i < 8; i++) {
      const emoji = Phaser.Utils.Array.GetRandom(emojis);
      const x = Phaser.Math.Between(100, width - 100);
      const conf = this.add.text(x, 340, emoji, {
        fontSize: '28px',
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({
        targets: conf,
        alpha: 1,
        y: Phaser.Math.Between(80, 280),
        x: x + Phaser.Math.Between(-60, 60),
        duration: 600,
        delay: i * 60,
        ease: 'Power2',
        onComplete: () => {
          this.tweens.add({
            targets: conf,
            alpha: 0,
            y: conf.y + 40,
            duration: 400,
            onComplete: () => conf.destroy(),
          });
        },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  End game
  // ═══════════════════════════════════════════════════════════

  private endGame(success: boolean) {
    if (this.ended) return;
    this.ended = true;
    this.stopTimer();

    const { width, height } = this.scale;

    // Overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
      .setDepth(20);
    this.tweens.add({
      targets: overlay,
      fillAlpha: 0.5,
      duration: 400,
    });

    // Result message
    const msg = success ? '회의 생존 성공!' : '회의에서 낙마...';
    const emoji = success ? '🎊' : '💀';
    const color = success ? '#00b894' : '#e94560';

    const resultText = this.add.text(width / 2, height / 2, `${emoji}\n${msg}`, {
      fontFamily: 'sans-serif',
      fontSize: '32px',
      color,
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0).setDepth(21).setScale(0.5);

    this.tweens.add({
      targets: resultText,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    if (success) {
      this.cameras.main.flash(400, 144, 238, 144, false);
    }

    this.time.delayedCall(1800, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success });
    });
  }
}

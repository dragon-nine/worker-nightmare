import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/* ══════════════════════════════════════
   STAGE 1: 무한의 계단 (2D 2-Lane Version)

   조작: 왼쪽 버튼 = 방향전환, 오른쪽 버튼 = 올라가기
   바라보는 방향의 레인에 다음 계단이 있으면 올라감, 없으면 추락
   ══════════════════════════════════════ */

interface Platform {
  lane: 'left' | 'right';
  y: number;
  visual: Phaser.GameObjects.Image;
}

const PLATFORM_W = 100;
const PLATFORM_H = 20;
const PLATFORM_FRONT = 12;
const STEP_DY = 60; // 계단 간 수직 간격
const FALL_PENALTY_SEC = 3;

export class CommuteScene extends Phaser.Scene {
  private stageId!: number;
  private timeLeft = 60;
  private timerEvent?: Phaser.Time.TimerEvent;
  private timerText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private score = 0;
  private gameOver = false;
  private debugMode = false;

  // Platforms
  private platforms: Platform[] = [];
  private currentPlatIdx = 0;
  private platContainer!: Phaser.GameObjects.Container;

  // Player
  private player!: Phaser.GameObjects.Container;
  private playerSprite!: Phaser.GameObjects.Image;

  // Lane positions (will be set in create)
  private laneX = { left: 0, right: 0 };

  // Direction: 'up' = 같은 레인 유지, 'left'/'right' = 해당 레인으로 이동
  private facingDir: 'up' | 'left' | 'right' = 'up';
  private dirArrow!: Phaser.GameObjects.Text;

  // Current lane the player is on
  private currentLane: 'left' | 'right' = 'left';

  // State
  private isFalling = false;
  private comboCount = 0;
  private bestCombo = 0;

  // Lane divider visuals
  private laneDividers: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super({ key: 'CommuteScene' });
  }

  init(data: { stageId: number; debug?: boolean }) {
    this.stageId = data.stageId;
    this.debugMode = data.debug ?? false;
    this.timeLeft = 60;
    this.score = 0;
    this.gameOver = false;
    this.platforms = [];
    this.currentPlatIdx = 0;
    this.isFalling = false;
    this.comboCount = 0;
    this.bestCombo = 0;
    this.facingDir = 'up';
    this.currentLane = 'left';
  }

  create() {
    const { width, height } = this.scale;
    const stage = GameManager.getCurrentStage();
    this.cameras.main.setBackgroundColor(stage.bgColor);

    // Lane X positions
    const laneGap = 30;
    this.laneX = {
      left: width / 2 - laneGap - PLATFORM_W / 2 + laneGap / 2,
      right: width / 2 + laneGap + PLATFORM_W / 2 - laneGap / 2,
    };

    this.generateFallbackTextures();

    // ── Lane guide lines ──
    this.laneDividers = this.add.graphics().setDepth(1);
    this.laneDividers.lineStyle(1, 0xffffff, 0.08);
    this.laneDividers.lineBetween(width / 2, 0, width / 2, height);

    // ── Platform container ──
    this.platContainer = this.add.container(0, 0);
    this.generateInitialPlatforms(height);

    // ── Player ──
    this.createPlayer();

    // ── HUD ──
    this.scoreText = this.add.text(20, 20, '0 계단', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#ffd700', fontStyle: 'bold',
    }).setDepth(200);

    this.timerText = this.add.text(width - 20, 20, '60', {
      fontFamily: 'sans-serif', fontSize: '28px', color: '#e94560', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(200);

    this.timerEvent = this.time.addEvent({
      delay: 1000, repeat: 59,
      callback: () => {
        this.timeLeft--;
        this.timerText.setText(`${this.timeLeft}`);
        if (this.timeLeft <= 10) this.timerText.setColor('#ff0000');
        if (this.timeLeft <= 0) this.endGame();
      },
    });

    // ── Direction indicator ──
    this.dirArrow = this.add.text(0, 0, '⬆', {
      fontSize: '36px', color: '#ffd700',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(160);
    this.updateDirArrow();

    // ── Two buttons at bottom ──
    this.createButtons(width, height);

    this.emitState();
  }

  /* ══════════════════════════════════════
     Buttons
     ══════════════════════════════════════ */

  private switchBtnLabel!: Phaser.GameObjects.Text;

  private createButtons(width: number, height: number) {
    const btnY = height - 65;
    const btnW = width * 0.42;
    const btnH = 70;
    const gap = width * 0.04;

    // ── 왼쪽: 방향전환 ──
    const leftBtnX = gap + btnW / 2;
    const leftBg = this.add.rectangle(leftBtnX, btnY, btnW, btnH, 0x555555, 0.85)
      .setInteractive({ useHandCursor: true }).setDepth(200);

    // 버튼 라벨: 현재 레인 반대쪽 화살표
    const switchArrow = this.currentLane === 'left' ? '➡' : '⬅';
    this.switchBtnLabel = this.add.text(leftBtnX, btnY - 8, switchArrow, { fontSize: '28px' })
      .setOrigin(0.5).setDepth(201);
    this.add.text(leftBtnX, btnY + 20, '방향전환', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(201);

    leftBg.on('pointerdown', () => {
      if (this.gameOver || this.isFalling) return;
      // 토글: up → 반대 레인 방향, 이미 반대면 → up
      if (this.facingDir === 'up') {
        this.facingDir = this.currentLane === 'left' ? 'right' : 'left';
      } else {
        this.facingDir = 'up';
      }
      this.playerSprite.setFlipX(this.facingDir === 'left');
      this.updateDirArrow();

      this.tweens.add({
        targets: leftBg, scaleX: 0.95, scaleY: 0.95,
        duration: 50, yoyo: true,
      });
    });

    // ── 오른쪽: 올라가기 ──
    const rightBtnX = width - gap - btnW / 2;
    const rightBg = this.add.rectangle(rightBtnX, btnY, btnW, btnH, 0x3182f6, 0.9)
      .setInteractive({ useHandCursor: true }).setDepth(200);
    this.add.text(rightBtnX, btnY - 8, '⬆', { fontSize: '28px' })
      .setOrigin(0.5).setDepth(201);
    this.add.text(rightBtnX, btnY + 20, '올라가기', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(201);

    rightBg.on('pointerdown', () => {
      if (this.gameOver || this.isFalling) return;
      this.tryStep();
      this.tweens.add({
        targets: rightBg, scaleX: 0.95, scaleY: 0.95,
        duration: 50, yoyo: true,
      });
    });
  }

  private updateDirArrow() {
    let arrow: string;
    if (this.facingDir === 'up') {
      arrow = '⬆';
    } else {
      arrow = this.facingDir === 'right' ? '➡' : '⬅';
    }
    this.dirArrow.setText(arrow);
    this.dirArrow.setPosition(this.player.x, this.player.y - 50);

    this.tweens.add({
      targets: this.dirArrow,
      scale: 1.5, duration: 100,
      yoyo: true, ease: 'Quad.easeOut',
    });
  }

  private updateSwitchBtnLabel() {
    const switchArrow = this.currentLane === 'left' ? '➡' : '⬅';
    this.switchBtnLabel.setText(switchArrow);
  }

  /* ══════════════════════════════════════
     Fallback textures
     ══════════════════════════════════════ */

  private generateFallbackTextures() {
    if (!this.textures.exists('stair')) {
      const g = this.add.graphics().setVisible(false);
      g.fillStyle(0x8899bb);
      g.fillRect(0, 0, PLATFORM_W, PLATFORM_H);
      g.fillStyle(0x5a6a8a);
      g.fillRect(0, PLATFORM_H, PLATFORM_W, PLATFORM_FRONT);
      g.lineStyle(1, 0xaabbdd, 0.6);
      g.lineBetween(0, 0, PLATFORM_W, 0);
      g.generateTexture('stair', PLATFORM_W, PLATFORM_H + PLATFORM_FRONT);
      g.destroy();
    }

    if (!this.textures.exists('player-idle')) {
      const g = this.add.graphics().setVisible(false);
      g.fillStyle(0x3182f6);
      g.fillRect(5, 14, 20, 28);
      g.fillStyle(0xffeaa7);
      g.fillCircle(15, 10, 10);
      g.generateTexture('player-idle', 30, 44);
      g.destroy();
    }
    if (!this.textures.exists('player-step')) {
      const g = this.add.graphics().setVisible(false);
      g.fillStyle(0x3182f6);
      g.fillRect(5, 14, 20, 28);
      g.fillStyle(0x2570de);
      g.fillRect(8, 36, 8, 6);
      g.fillStyle(0xffeaa7);
      g.fillCircle(15, 10, 10);
      g.generateTexture('player-step', 30, 44);
      g.destroy();
    }
    if (!this.textures.exists('player-fall')) {
      const g = this.add.graphics().setVisible(false);
      g.fillStyle(0xe74c3c);
      g.fillRect(5, 14, 20, 28);
      g.fillStyle(0xffeaa7);
      g.fillCircle(15, 10, 10);
      g.generateTexture('player-fall', 30, 44);
      g.destroy();
    }
  }

  /* ══════════════════════════════════════
     Platform generation
     ══════════════════════════════════════ */

  private generateInitialPlatforms(height: number) {
    const startY = height - 220;
    const startLane: 'left' | 'right' = 'left';

    // First platform
    this.addPlatform(startLane, startY);

    // Generate ahead
    for (let i = 0; i < 20; i++) {
      this.addNextPlatform();
    }
  }

  private addPlatform(lane: 'left' | 'right', y: number) {
    const x = this.laneX[lane];
    const img = this.add.image(x, y, 'stair').setOrigin(0.5, 0).setDepth(10);
    this.platContainer.add(img);
    this.platforms.push({ lane, y, visual: img });
  }

  private addNextPlatform() {
    const last = this.platforms[this.platforms.length - 1];
    const nextLane: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right';
    this.addPlatform(nextLane, last.y - STEP_DY);
  }

  /* ══════════════════════════════════════
     Player
     ══════════════════════════════════════ */

  private createPlayer() {
    const firstPlat = this.platforms[0];
    const startX = this.laneX[firstPlat.lane];
    const startY = firstPlat.y;

    this.playerSprite = this.add.image(0, -2, 'player-idle').setOrigin(0.5, 1);
    this.player = this.add.container(startX, startY, [this.playerSprite]);
    this.player.setDepth(150);
  }

  private setPlayerTexture(key: string) {
    this.playerSprite.setTexture(key);
  }

  /* ══════════════════════════════════════
     Step logic
     ══════════════════════════════════════ */

  private tryStep() {
    const nextIdx = this.currentPlatIdx + 1;
    const nextPlat = this.platforms[nextIdx];
    if (!nextPlat) return;

    // 올라가기 시 이동할 레인 결정
    const targetLane: 'left' | 'right' =
      this.facingDir === 'up' ? this.currentLane : this.facingDir;

    if (targetLane === nextPlat.lane) {
      // 성공!
      this.currentPlatIdx = nextIdx;
      this.currentLane = targetLane;
      this.score++;
      this.comboCount++;
      if (this.comboCount > this.bestCombo) this.bestCombo = this.comboCount;
      this.scoreText.setText(`${this.score} 계단`);

      // 이동 후 방향 리셋 → 위
      this.facingDir = 'up';
      this.playerSprite.setFlipX(false);

      // Step animation
      this.setPlayerTexture('player-step');
      this.time.delayedCall(100, () => {
        if (!this.isFalling) this.setPlayerTexture('player-idle');
      });

      // Ensure platforms ahead
      while (this.platforms.length - this.currentPlatIdx < 15) {
        this.addNextPlatform();
      }

      // Scroll to new position
      this.scrollToPlayer(nextPlat);

      // 방향전환 버튼 라벨 업데이트 (레인이 바뀌었을 수 있으므로)
      this.updateSwitchBtnLabel();

      if (this.comboCount > 0 && this.comboCount % 10 === 0) {
        this.showPopup(`${this.comboCount} 콤보!`, '#ffd700');
      }

      this.cleanupOldPlatforms();
    } else {
      this.onFall();
    }
  }

  private scrollToPlayer(plat: Platform) {
    const { height } = this.scale;
    const screenX = this.laneX[plat.lane];
    const screenY = height * 0.45;

    // Move container so current platform is at screen center Y
    const targetContainerY = -(plat.y - screenY);

    this.tweens.add({
      targets: this.platContainer,
      y: targetContainerY,
      duration: 120, ease: 'Quad.easeOut',
    });

    // Player moves to correct lane
    this.tweens.add({
      targets: this.player,
      x: screenX,
      y: screenY,
      duration: 120, ease: 'Quad.easeOut',
      onComplete: () => this.updateDirArrow(),
    });
  }

  private cleanupOldPlatforms() {
    while (this.currentPlatIdx > 10) {
      const old = this.platforms.shift()!;
      old.visual.destroy();
      this.currentPlatIdx--;
    }
  }

  /* ══════════════════════════════════════
     Fall
     ══════════════════════════════════════ */

  private onFall() {
    this.isFalling = true;
    this.comboCount = 0;
    this.setPlayerTexture('player-fall');
    this.cameras.main.shake(200, 0.01);

    // 이동하려던 레인으로 떨어지는 연출
    const targetLane: 'left' | 'right' =
      this.facingDir === 'up' ? this.currentLane : this.facingDir;
    const wrongX = this.laneX[targetLane];

    this.tweens.add({
      targets: this.player,
      x: wrongX,
      y: this.player.y + 80, alpha: 0.3,
      duration: 300, ease: 'Quad.easeIn',
      onComplete: () => {
        this.timeLeft = Math.max(0, this.timeLeft - FALL_PENALTY_SEC);
        this.timerText.setText(`${this.timeLeft}`);
        this.showPopup(`추락! -${FALL_PENALTY_SEC}초`, '#ff6b6b');

        if (this.timeLeft <= 0) { this.endGame(); return; }

        this.time.delayedCall(300, () => {
          // 방향 리셋
          this.facingDir = 'up';
          this.playerSprite.setFlipX(false);

          this.setPlayerTexture('player-idle');
          this.player.setAlpha(1);

          // Return to current platform
          const plat = this.platforms[this.currentPlatIdx];
          this.scrollToPlayer(plat);

          const { height } = this.scale;
          this.player.x = this.laneX[plat.lane];
          this.player.y = height * 0.45;
          this.updateDirArrow();
          this.isFalling = false;
        });
      },
    });
  }

  /* ══════════════════════════════════════
     Popup
     ══════════════════════════════════════ */

  private showPopup(message: string, color: string) {
    const { width } = this.scale;
    const popup = this.add.text(width / 2, 80, message, {
      fontFamily: 'sans-serif', fontSize: '22px', color, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(300);

    this.tweens.add({
      targets: popup, y: 50, alpha: 0, scale: 1.3,
      duration: 700, onComplete: () => popup.destroy(),
    });
  }

  /* ══════════════════════════════════════
     Game end
     ══════════════════════════════════════ */

  private endGame() {
    this.gameOver = true;
    this.timerEvent?.remove();

    this.time.delayedCall(500, () => {
      if (this.debugMode) {
        this.scene.start('BootScene');
      } else {
        this.scene.start('ResultScene', {
          stageId: this.stageId,
          score: this.score,
          completed: true,
          timeRemaining: this.timeLeft,
        });
      }
    });
  }

  private emitState() {
    const stage = GameManager.getCurrentStage();
    emitGameState({
      scene: 'CommuteScene',
      stageId: this.stageId,
      progress: GameManager.progress,
      allCleared: false,
      stress: 0,
      time: stage.time,
      period: stage.period,
    });
  }
}

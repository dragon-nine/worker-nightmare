import Phaser from 'phaser';
import type { Lane } from '../constants';
import {
  PADDING, ACTION_BONUS,
  BTN_SIZE, BTN_MARGIN, BTN_BOTTOM_OFFSET, BTN_PRESS_SCALE, BTN_PRESS_DURATION,
} from '../constants';
import { Road } from '../Road';
import { Player } from '../Player';
import { HUD } from '../HUD';

export class CommuteScene extends Phaser.Scene {
  private road!: Road;
  private player!: Player;
  private hud!: HUD;

  private currentRowIdx = 0;
  private score = 0;
  private gameOver = false;
  private isFalling = false;
  private comboCount = 0;
  private bestCombo = 0;
  private justSwitched = false;
  private gameStarted = false;

  private laneX = { left: 0, right: 0 };
  private laneW = 0;
  private tileH = 0;
  private padding = 0;
  private gridGfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'CommuteScene' });
  }

  preload() {
    const assets: [string, string][] = [
      ['tile-straight', 'map/straight.png'],
      ['tile-corner-tl', 'map/corner-tl.png'],
      ['tile-corner-tr', 'map/corner-tr.png'],
      ['tile-corner-bl', 'map/corner-bl.png'],
      ['tile-corner-br', 'map/corner-br.png'],
      ['building1', 'obstacles/building1.png'],
      ['building2', 'obstacles/building2.png'],
      ['rabbit', 'character/rabbit.png'],
      ['btn-forward', 'ui/btn-forward.png'],
      ['btn-switch', 'ui/btn-switch.png'],
    ];
    for (const [key, path] of assets) {
      if (!this.textures.exists(key)) this.load.image(key, path);
    }
  }

  init() {
    this.score = 0;
    this.gameOver = false;
    this.currentRowIdx = 0;
    this.isFalling = false;
    this.comboCount = 0;
    this.bestCombo = 0;
    this.justSwitched = false;
    this.gameStarted = false;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#000000');

    // Lane dimensions
    this.padding = PADDING;
    const roadW = width - this.padding * 2;
    this.laneW = roadW / 2;
    this.tileH = this.laneW;
    this.laneX = {
      left: this.padding + this.laneW / 2,
      right: this.padding + this.laneW + this.laneW / 2,
    };

    // Grid
    this.gridGfx = this.add.graphics().setDepth(10);

    // Road
    this.road = new Road(this, this.laneX, this.laneW, this.tileH);
    this.road.generateInitial(height);

    // Player
    this.player = new Player(this, this.laneX, this.laneW, height - 200);

    // HUD
    this.hud = new HUD(this, () => this.endGame());
    this.hud.create(width);

    // Buttons
    this.createButtons(width, height);
  }

  update() {
    if (!this.gameOver) {
      const { width, height } = this.scale;
      this.drawGrid(width, height);
    }
  }

  /* ── Grid ── */

  private drawGrid(w: number, h: number) {
    this.gridGfx.clear();
    this.gridGfx.lineStyle(2, 0xffffff, 0.3);

    const p = this.padding;
    for (let x = p; x <= w; x += this.laneW) {
      const rx = Math.round(x);
      this.gridGfx.lineBetween(rx, 0, rx, h);
    }
    for (let x = p - this.laneW; x >= 0; x -= this.laneW) {
      const rx = Math.round(x);
      this.gridGfx.lineBetween(rx, 0, rx, h);
    }

    const containerY = this.road.getContainer().y;
    const tileTopBase = this.road.startY - this.tileH / 2 + containerY;
    const offsetY = ((tileTopBase % this.tileH) + this.tileH) % this.tileH;
    for (let y = offsetY; y <= h + this.tileH; y += this.tileH) {
      const ry = Math.round(y);
      this.gridGfx.lineBetween(0, ry, w, ry);
    }
  }

  /* ── Buttons ── */

  private createButtons(width: number, height: number) {
    const btnY = height - BTN_BOTTOM_OFFSET;
    const pressSize = BTN_SIZE * BTN_PRESS_SCALE;

    const leftBtn = this.add.image(BTN_SIZE / 2 + BTN_MARGIN, btnY, 'btn-switch')
      .setDisplaySize(BTN_SIZE, BTN_SIZE)
      .setInteractive({ useHandCursor: true }).setDepth(200);

    leftBtn.on('pointerdown', () => {
      if (this.gameOver || this.isFalling || this.hud.paused) return;
      this.startGame();
      this.switchLane();
      this.tweens.killTweensOf(leftBtn);
      leftBtn.setDisplaySize(pressSize, pressSize);
      this.tweens.add({
        targets: leftBtn, displayWidth: BTN_SIZE, displayHeight: BTN_SIZE,
        duration: BTN_PRESS_DURATION, ease: 'Quad.easeOut',
      });
    });

    const rightBtn = this.add.image(width - BTN_SIZE / 2 - BTN_MARGIN, btnY, 'btn-forward')
      .setDisplaySize(BTN_SIZE, BTN_SIZE)
      .setInteractive({ useHandCursor: true }).setDepth(200);

    rightBtn.on('pointerdown', () => {
      if (this.gameOver || this.isFalling || this.hud.paused) return;
      this.startGame();
      this.moveForward();
      this.tweens.killTweensOf(rightBtn);
      rightBtn.setDisplaySize(pressSize, pressSize);
      this.tweens.add({
        targets: rightBtn, displayWidth: BTN_SIZE, displayHeight: BTN_SIZE,
        duration: BTN_PRESS_DURATION, ease: 'Quad.easeOut',
      });
    });
  }

  /* ── Game start ── */

  private startGame() {
    if (this.gameStarted) return;
    this.gameStarted = true;
    this.hud.startTimer();
  }

  /* ── Movement ── */

  private switchLane() {
    const opposite: Lane = this.player.currentLane === 'left' ? 'right' : 'left';
    const currentRow = this.road.rows[this.currentRowIdx];
    const canSwitch = !this.justSwitched && currentRow?.isTurn;

    if (!canSwitch) {
      this.isFalling = true;
      this.player.animateCrashSwitch(opposite, () => this.onCrash());
      return;
    }

    this.player.switchTo(opposite);
    this.justSwitched = true;
    this.hud.addTime(ACTION_BONUS);
    this.player.animateSwitch(opposite);
  }

  private moveForward() {
    const currentRow = this.road.rows[this.currentRowIdx];
    if (currentRow.isTurn && this.player.currentLane !== currentRow.type) {
      this.onForwardCrash();
      return;
    }

    const nextIdx = this.currentRowIdx + 1;
    const nextRow = this.road.rows[nextIdx];
    if (!nextRow) return;

    const canPass = nextRow.isTurn || nextRow.type === this.player.currentLane;
    if (!canPass) {
      this.onForwardCrash();
      return;
    }

    this.justSwitched = false;
    this.currentRowIdx = nextIdx;
    this.score++;
    this.hud.updateScore(this.score);
    this.hud.addTime(ACTION_BONUS);
    this.comboCount++;
    if (this.comboCount > this.bestCombo) this.bestCombo = this.comboCount;

    while (this.road.rows.length - this.currentRowIdx < 15) {
      this.road.addNextRow();
    }

    this.player.animateForward(() => this.scrollToCurrentRow());

    if (this.comboCount > 0 && this.comboCount % 10 === 0) {
      this.showPopup(`${this.comboCount} 콤보!`, '#ffd700');
    }

    this.currentRowIdx = this.road.cleanupOldRows(this.currentRowIdx);
  }

  private scrollToCurrentRow() {
    const { height } = this.scale;
    const row = this.road.rows[this.currentRowIdx];
    const screenY = height * 0.5;
    const targetContainerY = -(row.y - screenY);

    this.tweens.add({
      targets: this.road.getContainer(),
      y: targetContainerY,
      duration: 100, ease: 'Quad.easeOut',
    });

    this.player.scrollTo(screenY);
  }

  /* ── Crash ── */

  private onForwardCrash() {
    this.player.setHurt(true);
    this.cameras.main.shake(200, 0.015);
    this.player.animateForwardCrash(() => this.endGame());
  }

  private onCrash() {
    this.player.setHurt(true);
    this.cameras.main.shake(200, 0.015);
    this.endGame();
  }

  /* ── Popup ── */

  private showPopup(message: string, color: string) {
    const { width } = this.scale;
    const popup = this.add.text(width / 2, 70, message, {
      fontFamily: 'sans-serif', fontSize: '22px', color, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(300);

    this.tweens.add({
      targets: popup, y: 40, alpha: 0, scale: 1.3,
      duration: 700, onComplete: () => popup.destroy(),
    });
  }

  /* ── Game end ── */

  private endGame() {
    this.gameOver = true;
    this.hud.stopTimer();

    const { width, height } = this.scale;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
      .setDepth(400);
    this.tweens.add({ targets: overlay, fillAlpha: 0.7, duration: 500 });

    const resultText = this.add.text(width / 2, height * 0.35, `점수: ${this.score}`, {
      fontFamily: 'sans-serif', fontSize: '48px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(401).setAlpha(0);

    const comboText = this.add.text(width / 2, height * 0.45, `최대 콤보: ${this.bestCombo}`, {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#aaaacc',
    }).setOrigin(0.5).setDepth(401).setAlpha(0);

    this.time.delayedCall(500, () => {
      this.tweens.add({ targets: resultText, alpha: 1, duration: 300 });
      this.tweens.add({ targets: comboText, alpha: 1, duration: 300, delay: 150 });
    });

    const retryBtn = this.add.rectangle(width / 2, height * 0.6, 220, 56, 0xe94560)
      .setInteractive({ useHandCursor: true }).setDepth(401).setAlpha(0);
    const retryText = this.add.text(width / 2, height * 0.6, '다시하기', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(402).setAlpha(0);

    retryBtn.on('pointerover', () => retryBtn.setFillStyle(0xd63651));
    retryBtn.on('pointerout', () => retryBtn.setFillStyle(0xe94560));
    retryBtn.on('pointerdown', () => this.scene.start('CommuteScene'));

    this.time.delayedCall(800, () => {
      this.tweens.add({ targets: [retryBtn, retryText], alpha: 1, duration: 300 });
    });
  }
}

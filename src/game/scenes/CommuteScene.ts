import Phaser from 'phaser';
import type { Lane } from '../constants';
import {
  PADDING, ACTION_BONUS, START_TIME,
  BTN_SIZE, BTN_MARGIN, BTN_BOTTOM_OFFSET, BTN_PRESS_SCALE, BTN_PRESS_DURATION,
} from '../constants';
import { Road } from '../Road';
import { Player } from '../Player';
import { HUD } from '../HUD';
import { submitGameCenterLeaderBoardScore, openGameCenterLeaderboard, Analytics, eventLog } from '@apps-in-toss/web-framework';

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
  private hasRevived = false;
  private bgm?: Phaser.Sound.BaseSound;

  private laneX = { left: 0, right: 0 };
  private laneW = 0;
  private tileH = 0;
  private padding = 0;
  private gridGfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'CommuteScene' });
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
    this.hasRevived = false;
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
    this.hud = new HUD(this, () => this.onDeath());
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

    // Gameplay BGM
    this.bgm = this.sound.add('bgm-gameplay', { loop: true, volume: 0.35 });
    if (this.hud.isBgmMuted()) (this.bgm as Phaser.Sound.WebAudioSound).setMute(true);
    this.bgm.play();

    // Analytics: 게임 시작
    Analytics.screen({ log_name: 'screen_game' });
    eventLog({ log_name: 'game_start', log_type: 'event', params: {} });
  }

  /* ── Movement ── */

  private switchLane() {
    const opposite: Lane = this.player.currentLane === 'left' ? 'right' : 'left';
    const currentRow = this.road.rows[this.currentRowIdx];
    const canSwitch = !this.justSwitched && currentRow?.isTurn;

    if (!canSwitch) {
      this.isFalling = true;
      this.playSfx('sfx-crash', 0.7);
      this.player.animateCrashSwitch(opposite, () => this.onCrash());
      return;
    }

    this.playSfx('sfx-switch', 0.5);
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

    this.playSfx('sfx-forward', 0.4);
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
      this.playSfx('sfx-combo', 0.7);
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
    this.isFalling = true;
    this.player.setHurt(true);
    this.playSfx('sfx-crash', 0.7);
    this.cameras.main.shake(200, 0.015);
    this.player.animateForwardCrash(() => this.onDeath());
  }

  private onCrash() {
    this.isFalling = true;
    this.player.setHurt(true);
    this.cameras.main.shake(200, 0.015);
    this.onDeath();
  }

  /* ── Death → Revive or Game Over ── */

  private onDeath() {
    this.gameOver = true;
    this.hud.stopTimer();

    if (!this.hasRevived) {
      this.showReviveScreen();
    } else {
      this.endGame();
    }
  }

  private showReviveScreen() {
    const { width, height } = this.scale;

    // BGM 일시정지
    this.bgm?.pause();

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
      .setDepth(400);
    this.tweens.add({ targets: overlay, fillAlpha: 0.8, duration: 400 });

    const reviveItems: Phaser.GameObjects.GameObject[] = [];

    // 부활 아이콘
    const icon = this.add.text(width / 2, height * 0.28, '💀', {
      fontSize: '64px',
    }).setOrigin(0.5).setDepth(401).setAlpha(0);

    const title = this.add.text(width / 2, height * 0.38, '부활하시겠습니까?', {
      fontFamily: 'sans-serif', fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(401).setAlpha(0);

    const desc = this.add.text(width / 2, height * 0.44, '광고를 보고 이어서 플레이하세요!', {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#aaaacc',
    }).setOrigin(0.5).setDepth(401).setAlpha(0);

    const chance = this.add.text(width / 2, height * 0.48, '(1회만 가능)', {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#777799',
    }).setOrigin(0.5).setDepth(401).setAlpha(0);

    // 광고 보기 버튼
    const adBtn = this.add.rectangle(width / 2, height * 0.57, 250, 56, 0x44aa44)
      .setInteractive({ useHandCursor: true }).setDepth(401).setAlpha(0);
    const adText = this.add.text(width / 2, height * 0.57, '▶  광고 보고 부활', {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(402).setAlpha(0);

    adBtn.on('pointerover', () => adBtn.setFillStyle(0x339933));
    adBtn.on('pointerout', () => adBtn.setFillStyle(0x44aa44));
    adBtn.on('pointerdown', () => {
      this.playSfx('sfx-click', 0.6);
      // Analytics: 광고 시청
      eventLog({ log_name: 'ad_watch_revive', log_type: 'event', params: { score: this.score } });
      Analytics.click({ log_name: 'ad_watch_revive' });

      // 임시 광고 시뮬레이션
      this.showFakeAd(reviveItems, overlay, () => this.revive());
    });

    // 건너뛰기 버튼
    const skipBtn = this.add.rectangle(width / 2, height * 0.66, 250, 48, 0x555555)
      .setInteractive({ useHandCursor: true }).setDepth(401).setAlpha(0);
    const skipText = this.add.text(width / 2, height * 0.66, '건너뛰기', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#999999',
    }).setOrigin(0.5).setDepth(402).setAlpha(0);

    skipBtn.on('pointerover', () => skipBtn.setFillStyle(0x666666));
    skipBtn.on('pointerout', () => skipBtn.setFillStyle(0x555555));
    skipBtn.on('pointerdown', () => {
      this.playSfx('sfx-click', 0.6);
      eventLog({ log_name: 'ad_skip_revive', log_type: 'event', params: { score: this.score } });
      // 부활 화면 제거 → 게임 오버
      reviveItems.forEach(item => item.destroy());
      overlay.destroy();
      this.endGame();
    });

    reviveItems.push(overlay, icon, title, desc, chance, adBtn, adText, skipBtn, skipText);

    // 페이드 인
    this.time.delayedCall(300, () => {
      this.tweens.add({ targets: icon, alpha: 1, duration: 300 });
      this.tweens.add({ targets: [title, desc, chance], alpha: 1, duration: 300, delay: 100 });
      this.tweens.add({ targets: [adBtn, adText], alpha: 1, duration: 300, delay: 250 });
      this.tweens.add({ targets: [skipBtn, skipText], alpha: 1, duration: 300, delay: 400 });
    });
  }

  private showFakeAd(
    reviveItems: Phaser.GameObjects.GameObject[],
    overlay: Phaser.GameObjects.Rectangle,
    onComplete: () => void,
  ) {
    const { width, height } = this.scale;

    // 부활 UI 숨기기
    reviveItems.forEach(item => {
      if (item !== overlay && 'setVisible' in item) {
        (item as Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject).setVisible(false);
      }
    });

    // 임시 광고 화면
    const adBg = this.add.rectangle(width / 2, height / 2, width * 0.85, height * 0.5, 0x222222)
      .setStrokeStyle(3, 0xffaa00).setDepth(450);
    const adLabel = this.add.text(width / 2, height * 0.35, '[ 광고 영역 ]', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#ffaa00', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(451);
    const adSub = this.add.text(width / 2, height * 0.42, '실제 광고가 연결되면\n이 화면이 대체됩니다', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#888888', align: 'center',
    }).setOrigin(0.5).setDepth(451);

    // 카운트다운 (3초)
    let countdown = 3;
    const countText = this.add.text(width / 2, height * 0.55, `${countdown}초 후 부활...`, {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(451);

    const adItems: Phaser.GameObjects.GameObject[] = [adBg, adLabel, adSub, countText];

    this.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        countdown--;
        if (countdown > 0) {
          countText.setText(`${countdown}초 후 부활...`);
        } else {
          countText.setText('부활!');
          this.time.delayedCall(500, () => {
            adItems.forEach(item => item.destroy());
            reviveItems.forEach(item => item.destroy());
            overlay.destroy();
            onComplete();
          });
        }
      },
    });
  }

  private revive() {
    this.hasRevived = true;
    this.gameOver = false;
    this.isFalling = false;
    this.comboCount = 0;

    // 플레이어 상태 복구
    this.player.setHurt(false);

    // 시간 복구
    this.hud.timeLeft = START_TIME;
    this.hud.addTime(0); // 타이머 바 갱신
    this.hud.startTimer();

    // BGM 재개
    if (this.bgm) {
      (this.bgm as Phaser.Sound.WebAudioSound).resume();
    }

    this.playSfx('sfx-combo', 0.7);
    this.showPopup('부활!', '#44ff44');
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
    this.bgm?.stop();
    this.playSfx('sfx-game-over', 0.6);

    // Analytics: 게임 오버
    eventLog({
      log_name: 'game_over',
      log_type: 'event',
      params: { score: this.score, best_combo: this.bestCombo, revived: this.hasRevived },
    });

    // 리더보드에 점수 제출
    this.submitScore();

    const { width, height } = this.scale;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
      .setDepth(400);
    this.tweens.add({ targets: overlay, fillAlpha: 0.7, duration: 500 });

    const resultText = this.add.text(width / 2, height * 0.30, `점수: ${this.score}`, {
      fontFamily: 'sans-serif', fontSize: '48px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(401).setAlpha(0);

    const comboText = this.add.text(width / 2, height * 0.40, `최대 콤보: ${this.bestCombo}`, {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#aaaacc',
    }).setOrigin(0.5).setDepth(401).setAlpha(0);

    this.time.delayedCall(500, () => {
      this.tweens.add({ targets: resultText, alpha: 1, duration: 300 });
      this.tweens.add({ targets: comboText, alpha: 1, duration: 300, delay: 150 });
    });

    // 리더보드 보기 버튼
    const lbBtn = this.add.rectangle(width / 2, height * 0.52, 220, 56, 0x3182f6)
      .setInteractive({ useHandCursor: true }).setDepth(401).setAlpha(0);
    const lbText = this.add.text(width / 2, height * 0.52, '랭킹 보기', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(402).setAlpha(0);

    lbBtn.on('pointerover', () => lbBtn.setFillStyle(0x1b6ce5));
    lbBtn.on('pointerout', () => lbBtn.setFillStyle(0x3182f6));
    lbBtn.on('pointerdown', () => {
      this.playSfx('sfx-click', 0.6);
      Analytics.click({ log_name: 'leaderboard_open' });
      openGameCenterLeaderboard();
    });

    // 다시하기 버튼
    const retryBtn = this.add.rectangle(width / 2, height * 0.62, 220, 56, 0xe94560)
      .setInteractive({ useHandCursor: true }).setDepth(401).setAlpha(0);
    const retryText = this.add.text(width / 2, height * 0.62, '다시하기', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(402).setAlpha(0);

    retryBtn.on('pointerover', () => retryBtn.setFillStyle(0xd63651));
    retryBtn.on('pointerout', () => retryBtn.setFillStyle(0xe94560));
    retryBtn.on('pointerdown', () => {
      this.playSfx('sfx-click', 0.6);
      Analytics.click({ log_name: 'game_retry' });
      this.scene.start('CommuteScene');
    });

    this.time.delayedCall(800, () => {
      this.tweens.add({ targets: [lbBtn, lbText], alpha: 1, duration: 300 });
      this.tweens.add({ targets: [retryBtn, retryText], alpha: 1, duration: 300, delay: 150 });
    });
  }

  private playSfx(key: string, volume: number) {
    if (!this.hud.isSfxMuted()) {
      this.sound.play(key, { volume });
    }
  }

  private async submitScore() {
    try {
      await submitGameCenterLeaderBoardScore({ score: String(this.score) });
    } catch {
      // 점수 제출 실패 — 무시
    }
  }
}

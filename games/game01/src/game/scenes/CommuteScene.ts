import Phaser from 'phaser';
import {
  NUM_LANES, VISIBLE_LANES,
  PADDING, START_TIME,
  BTN_MARGIN, BTN_BOTTOM_OFFSET, BTN_PRESS_SCALE, BTN_PRESS_DURATION,
} from '../constants';
import { Road } from '../Road';
import { Player } from '../Player';
import { HUD } from '../HUD';
import { Overlay } from '../Overlay';
import { submitScore as submitLeaderboardScore, openLeaderboard } from '../services/leaderboard';
import { logEvent, logClick, logScreen } from '../services/analytics';

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
  private bgTile?: Phaser.GameObjects.TileSprite;

  private laneWorldX: number[] = [];
  private laneW = 0;
  private tileH = 0;
  private viewLeft = 0;

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

    // 배경 이미지 (타일 반복 + 스크롤)
    if (this.textures.exists('bg-game')) {
      const bgFrame = this.textures.get('bg-game').getSourceImage();
      const scale = width / bgFrame.width;
      this.bgTile = this.add.tileSprite(0, 0, width, height, 'bg-game')
        .setOrigin(0, 0)
        .setTileScale(scale, scale)
        .setDepth(0);
    }

    // 화면에 보이는 2레인 기준으로 크기 계산
    this.laneW = (width - PADDING * 2) / VISIBLE_LANES;
    this.tileH = this.laneW;

    // 5레인의 월드 X 좌표
    this.laneWorldX = [];
    for (let i = 0; i < NUM_LANES; i++) {
      this.laneWorldX.push(PADDING + this.laneW / 2 + i * this.laneW);
    }

    // 시작 레인 = 왼쪽 (0)
    const startLane = 0;
    this.viewLeft = 0;

    this.road = new Road(this, this.laneWorldX, this.laneW, this.tileH, NUM_LANES);
    const PLAYER_Y_RATIO = 1.5 / 4; // 화면 위에서 37.5% 위치
    const playerScreenY = height * PLAYER_Y_RATIO - this.tileH / 2;
    this.road.generateInitial(height, startLane, height * PLAYER_Y_RATIO);

    // 컨테이너 X 오프셋으로 뷰 위치 설정
    this.road.getContainer().setX(-(this.viewLeft * this.laneW));

    const playerScreenX = this.laneScreenX(startLane);
    this.player = new Player(this, this.laneW, playerScreenX, playerScreenY, startLane);

    this.hud = new HUD(this, () => this.onDeath());
    this.hud.create(width);

    this.createButtons(width, height);
  }

  update(_time: number, delta: number) {
    if (!this.gameOver) {
      this.hud.update(delta);
    }
  }

  /* ── View helpers ── */

  /** 레인 번호 → 현재 뷰 기준 화면 X 좌표 */
  private laneScreenX(lane: number): number {
    return PADDING + this.laneW / 2 + (lane - this.viewLeft) * this.laneW;
  }

  /** 레인이 보이도록 viewLeft 계산 */
  private calcViewLeft(lane: number): number {
    let vl = this.viewLeft;
    if (lane < vl) vl = lane;
    if (lane > vl + VISIBLE_LANES - 1) vl = lane - VISIBLE_LANES + 1;
    return Math.max(0, Math.min(vl, NUM_LANES - VISIBLE_LANES));
  }

  /** 뷰 패닝 (컨테이너 X 이동) */
  private panViewTo(newViewLeft: number) {
    if (newViewLeft === this.viewLeft) return;
    this.viewLeft = newViewLeft;
    this.tweens.add({
      targets: this.road.getContainer(),
      x: -(this.viewLeft * this.laneW),
      duration: 120, ease: 'Quad.easeOut',
    });
  }

  /* ── Buttons ── */

  private createButtons(width: number, height: number) {
    const btnSize = this.laneW * 0.85;
    const btnY = height - BTN_BOTTOM_OFFSET;
    const pressSize = btnSize * BTN_PRESS_SCALE;

    const leftBtn = this.add.image(btnSize / 2 + BTN_MARGIN, btnY, 'btn-switch')
      .setDisplaySize(btnSize, btnSize)
      .setInteractive({ useHandCursor: true }).setDepth(200);

    leftBtn.on('pointerdown', () => {
      if (this.gameOver || this.isFalling || this.hud.paused) return;
      this.vibrate(10);
      this.startGame();
      this.switchLane();
      this.tweens.killTweensOf(leftBtn);
      leftBtn.setDisplaySize(pressSize, pressSize);
      this.tweens.add({
        targets: leftBtn, displayWidth: btnSize, displayHeight: btnSize,
        duration: BTN_PRESS_DURATION, ease: 'Quad.easeOut',
      });
    });

    const rightBtn = this.add.image(width - btnSize / 2 - BTN_MARGIN, btnY, 'btn-forward')
      .setDisplaySize(btnSize, btnSize)
      .setInteractive({ useHandCursor: true }).setDepth(200);

    rightBtn.on('pointerdown', () => {
      if (this.gameOver || this.isFalling || this.hud.paused) return;
      this.vibrate(10);
      this.startGame();
      this.moveForward();
      this.tweens.killTweensOf(rightBtn);
      rightBtn.setDisplaySize(pressSize, pressSize);
      this.tweens.add({
        targets: rightBtn, displayWidth: btnSize, displayHeight: btnSize,
        duration: BTN_PRESS_DURATION, ease: 'Quad.easeOut',
      });
    });
  }

  /* ── Game start ── */

  private startGame() {
    if (this.gameStarted) return;
    this.gameStarted = true;
    this.hud.startTimer();

    try {
      this.bgm = this.sound.add('bgm-gameplay', { loop: true, volume: 0.35 });
      if (this.hud.isBgmMuted()) (this.bgm as Phaser.Sound.WebAudioSound).setMute(true);
      this.bgm.play();
    } catch { /* 오디오 재생 실패 — 무시 */ }

    logScreen('screen_game');
    logEvent('game_start');
  }

  /* ── Movement ── */

  private switchLane() {
    const currentRow = this.road.rows[this.currentRowIdx];
    const canSwitch = !this.justSwitched && currentRow?.isTurn;

    if (!canSwitch) {
      this.isFalling = true;
      this.playSfx('sfx-crash', 0.7);
      const lane = this.player.currentLane;
      const crashLane = lane < NUM_LANES - 1 ? lane + 1 : lane - 1;
      const bumpX = this.laneScreenX(crashLane);
      this.player.animateCrashSwitch(bumpX, () => this.onCrash());
      return;
    }

    const targetLane = currentRow.type;
    this.playSfx('sfx-switch', 0.5);
    this.player.switchTo(targetLane);
    this.justSwitched = true;
    this.score++;
    this.hud.updateScore(this.score);
    this.hud.addTime();

    // 뷰 패닝 (타겟 레인이 화면 밖이면)
    this.panViewTo(this.calcViewLeft(targetLane));

    const targetScreenX = this.laneScreenX(targetLane);
    this.player.animateSwitch(targetScreenX);
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
    this.hud.addTime();
    this.comboCount++;
    if (this.comboCount > this.bestCombo) this.bestCombo = this.comboCount;

    while (this.road.rows.length - this.currentRowIdx < 15) {
      this.road.addNextRow();
    }

    this.player.animateForward(() => this.scrollToCurrentRow());

    if (this.comboCount > 0 && this.comboCount % 10 === 0) {
      this.playSfx('sfx-combo', 0.7);
      this.vibrate([12, 40, 12]);
    }

    this.currentRowIdx = this.road.cleanupOldRows(this.currentRowIdx);
  }

  private scrollToCurrentRow() {
    const { height } = this.scale;
    const row = this.road.rows[this.currentRowIdx];
    const PLAYER_Y_RATIO = 1.5 / 4;
    const screenY = height * PLAYER_Y_RATIO;
    const playerOffsetY = this.tileH / 2;
    const targetContainerY = -(row.y - screenY);

    const scrollDelta = targetContainerY - this.road.getContainer().y;
    const bgStartY = this.bgTile?.tilePositionY ?? 0;
    const bgTargetY = bgStartY - scrollDelta * 0.5;

    this.tweens.add({
      targets: this.road.getContainer(),
      y: targetContainerY,
      duration: 100, ease: 'Quad.easeOut',
    });

    if (this.bgTile) {
      this.tweens.add({
        targets: this.bgTile,
        tilePositionY: bgTargetY,
        duration: 100, ease: 'Quad.easeOut',
      });
    }

    const playerScreenX = this.laneScreenX(this.player.currentLane);
    this.player.scrollTo(playerScreenX, screenY - playerOffsetY);
  }

  /* ── Crash ── */

  private onForwardCrash() {
    this.isFalling = true;
    this.player.setHurt(true);
    this.playSfx('sfx-crash', 0.7);
    this.vibrate([30, 40, 60]);
    this.cameras.main.shake(200, 0.015);
    this.player.animateForwardCrash(() => this.onDeath());
  }

  private onCrash() {
    this.isFalling = true;
    this.player.setHurt(true);
    this.vibrate([30, 40, 60]);
    this.cameras.main.shake(200, 0.015);
    this.onDeath();
  }

  /* ── Death → Revive or Game Over ── */

  private onDeath() {
    this.gameOver = true;
    this.hud.stopTimer();
    this.endGame();
  }

  /* ── Ad System ── */

  private showAd(
    reviveItems: Phaser.GameObjects.GameObject[],
    overlay: Phaser.GameObjects.Rectangle,
    onComplete: () => void,
  ) {
    reviveItems.forEach(item => {
      if (item !== overlay && 'setVisible' in item) {
        (item as Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject).setVisible(false);
      }
    });

    const cleanup = () => {
      reviveItems.forEach(item => item.destroy());
      overlay.destroy();
      onComplete();
    };

    const adLoaded = this.tryShowRealAd(cleanup);
    if (!adLoaded) {
      logEvent('ad_fallback_house');
      this.showHouseAd(cleanup);
    }
  }

  private tryShowRealAd(_onComplete: () => void): boolean {
    return false;
  }

  private showHouseAd(onComplete: () => void) {
    const { width, height } = this.scale;
    const adItems: Phaser.GameObjects.GameObject[] = [];

    const adBg = this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1e)
      .setDepth(450);
    adItems.push(adBg);

    adItems.push(this.add.text(width / 2, height * 0.05, 'AD', {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '12px', color: '#666688',
    }).setOrigin(0.5).setDepth(451));

    const iconBg = this.add.circle(width / 2, height * 0.15, 40, 0xe94560).setDepth(451);
    adItems.push(iconBg);
    adItems.push(this.add.text(width / 2, height * 0.15, 'D9', {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(452));

    this.tweens.add({
      targets: iconBg, scale: 1.08, duration: 800,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    adItems.push(this.add.text(width / 2, height * 0.25, '직장인 잔혹시를\n홈 화면에 추가해보세요!', {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
      align: 'center', lineSpacing: 8,
    }).setOrigin(0.5).setDepth(451));

    const stepY = height * 0.38;
    const stepGap = height * 0.08;
    const leftX = 36;
    const numStyle = { fontFamily: 'GMarketSans, sans-serif', fontSize: '22px', color: '#e94560', fontStyle: 'bold' as const };
    const stepStyle = { fontFamily: 'GMarketSans, sans-serif', fontSize: '15px', color: '#ccccdd' };

    adItems.push(this.add.text(leftX, stepY, '1', numStyle).setDepth(451));
    adItems.push(this.add.text(leftX + 30, stepY, '오른쪽 아래  ⬆  아이콘을 누르고,', stepStyle).setDepth(451));

    adItems.push(this.add.text(leftX, stepY + stepGap, '2', numStyle).setDepth(451));
    adItems.push(this.add.text(leftX + 30, stepY + stepGap, '새로 뜬 창을 스크롤해서', stepStyle).setDepth(451));

    adItems.push(this.add.text(leftX, stepY + stepGap * 2, '3', numStyle).setDepth(451));
    adItems.push(this.add.text(leftX + 30, stepY + stepGap * 2, '⊕ 홈 화면에 추가  를 선택하세요', stepStyle).setDepth(451));

    adItems.push(this.add.text(width / 2, height * 0.66, '앱처럼 바로 실행할 수 있어요!', {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '14px', color: '#8888aa',
    }).setOrigin(0.5).setDepth(451));

    let countdown = 3;
    const countText = this.add.text(width / 2, height * 0.78, `${countdown}`, {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '48px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(451);
    adItems.push(countText);

    const countLabel = this.add.text(width / 2, height * 0.84, '잠시 후 부활합니다', {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '14px', color: '#666688',
    }).setOrigin(0.5).setDepth(451);
    adItems.push(countLabel);

    adItems.push(this.add.text(width / 2, height * 0.93, 'DragonNine Studio', {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '11px', color: '#444466',
    }).setOrigin(0.5).setDepth(451));

    logEvent('homescreen_guide_impression', { from: 'house_ad' });

    this.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        countdown--;
        if (countdown > 0) {
          countText.setText(`${countdown}`);
        } else {
          countText.setText('GO!');
          countLabel.setText('부활!');
          this.time.delayedCall(500, () => {
            adItems.forEach(item => item.destroy());
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
    this.justSwitched = false;

    this.player.setHurt(false);
    this.player.resetSprite();

    // 현재 도로 행의 올바른 레인으로 복원
    const row = this.road.rows[this.currentRowIdx];
    if (row) {
      const correctLane = row.isTurn ? row.type : this.player.currentLane;
      // 레인이 현재 행에서 유효하지 않으면 행의 레인으로 강제 이동
      if (row.isTurn && this.player.currentLane !== row.type) {
        this.player.switchTo(correctLane);
      }
      this.panViewTo(this.calcViewLeft(this.player.currentLane));
      this.scrollToCurrentRow();
    }

    this.hud.timeLeft = START_TIME;
    this.hud.elapsed = 30;
    this.hud.updateTimerBar();
    this.hud.startTimer();

    if (this.bgm) {
      (this.bgm as Phaser.Sound.WebAudioSound).resume();
    }

    logEvent('revive_complete', { score: this.score });
    this.playSfx('sfx-combo', 0.7);
    this.showPopup('부활!', '#44ff44');
  }

  /* ── Popup ── */

  private showPopup(message: string, color: string) {
    const { width } = this.scale;
    const popup = this.add.text(width / 2, 70, message, {
      fontFamily: 'GMarketSans, sans-serif', fontSize: '22px', color, fontStyle: 'bold',
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
    this.bgm?.pause();
    this.playSfx('sfx-game-over', 0.6);
    this.vibrate([40, 80, 50, 80]);

    const canRevive = !this.hasRevived;

    logEvent('game_over', { score: this.score, best_combo: this.bestCombo, revived: this.hasRevived });
    this.submitScore();

    const { width, height } = this.scale;
    const ov = new Overlay(this).open({ fadeIn: true });

    // 점수
    const resultText = ov.addText(width / 2, height * 0.28, `점수: ${this.score}`, {
      fontSize: '48px', color: '#ffffff', fontStyle: 'bold',
    }).setAlpha(0);

    this.time.delayedCall(500, () => {
      ov.fadeInItems([resultText]);
    });

    const fadeTargets: { obj: Phaser.GameObjects.GameObject[]; delay: number }[] = [];

    // 부활 버튼 (1회만)
    if (canRevive) {
      const reviveBtn = ov.addButton(width / 2, height * 0.42, 250, 56, '▶  광고 보고 부활', 0x44aa44, () => {
        this.playSfx('sfx-click', 0.6);
        logEvent('revive_ad_click', { score: this.score });
        this.showAd(ov.getItems(), ov.getItems()[0] as Phaser.GameObjects.Rectangle, () => this.revive());
      }, { fontSize: '20px' });
      const reviveHint = ov.addText(width / 2, height * 0.47, '(1회만 가능)', { fontSize: '12px', color: '#777799' }).setAlpha(0);
      fadeTargets.push({ obj: [reviveBtn.bg, reviveBtn.text, reviveHint], delay: 0 });
    }

    // 랭킹/다시하기/홈
    const btnBaseY = canRevive ? 0.54 : 0.42;

    const lb = ov.addButton(width / 2, height * btnBaseY, 220, 56, '랭킹 보기', 0x3182f6, () => {
      this.playSfx('sfx-click', 0.6);
      logClick('leaderboard_open');
      openLeaderboard();
    }, { fontSize: '24px' });
    fadeTargets.push({ obj: [lb.bg, lb.text], delay: canRevive ? 150 : 0 });

    const retry = ov.addButton(width / 2, height * (btnBaseY + 0.10), 220, 56, '다시하기', 0xe94560, () => {
      this.playSfx('sfx-click', 0.6);
      logClick('game_retry');
      this.scene.start('CommuteScene');
    }, { fontSize: '24px' });
    fadeTargets.push({ obj: [retry.bg, retry.text], delay: canRevive ? 300 : 150 });

    const home = ov.addButton(width / 2, height * (btnBaseY + 0.20), 220, 48, '홈으로', 0x555555, () => {
      this.playSfx('sfx-click', 0.6);
      this.scene.start('BootScene');
    }, { color: '#cccccc' });
    fadeTargets.push({ obj: [home.bg, home.text], delay: canRevive ? 450 : 300 });

    this.time.delayedCall(800, () => {
      for (const { obj, delay } of fadeTargets) {
        ov.fadeInItems(obj, delay);
      }
    });
  }

  private vibrate(pattern: number | number[]) {
    try { navigator.vibrate?.(pattern); } catch { /* 미지원 환경 무시 */ }
  }

  private playSfx(key: string, volume: number) {
    if (!this.hud.isSfxMuted()) {
      try { this.sound.play(key, { volume }); } catch { /* 무시 */ }
    }
  }

  private async submitScore() {
    await submitLeaderboardScore(this.score);
  }
}

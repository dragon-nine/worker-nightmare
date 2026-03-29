import Phaser from 'phaser';
import {
  NUM_LANES, VISIBLE_LANES,
  PADDING, START_TIME,
} from '../constants';
import { Road } from '../Road';
import { Player } from '../Player';
import { HUD } from '../HUD';
import { submitScore as submitLeaderboardScore } from '../services/leaderboard';
import { logEvent, logClick, logScreen } from '../services/analytics';
import { gameBus } from '../event-bus';

export class CommuteScene extends Phaser.Scene {
  private road!: Road;
  private player!: Player;
  private hud!: HUD;

  private currentRowIdx = 0;
  private score = 0;
  private gameOver = false;
  private get godMode() { return localStorage.getItem('godMode') === 'true'; }
  private guideCount = 0;
  private isFalling = false;
  private comboCount = 0;
  private bestCombo = 0;
  private justSwitched = false;
  private gameStarted = false;
  private hasRevived = false;
  private bgm?: Phaser.Sound.BaseSound;
  private bgSprites: Phaser.GameObjects.Image[] = [];
  private bgScale = 1;
  private bgNextIdx = 0;   // 다음 재활용 시 사용할 시퀀스 인덱스

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
    this.bgSprites = [];
    this.bgScale = 1;
    this.bgNextIdx = 0;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#000000');

    // 배경 이미지: bg-1→2→3→4→5→6, 이후 4→5→6 무한 루프
    {
      const BG_INITIAL = ['bg-1', 'bg-2', 'bg-3', 'bg-4', 'bg-5', 'bg-6'];
      const BG_LOOP = ['bg-4', 'bg-5', 'bg-6'];
      const getBgKey = (idx: number) =>
        idx < BG_INITIAL.length
          ? BG_INITIAL[idx]
          : BG_LOOP[(idx - BG_INITIAL.length) % BG_LOOP.length];

      if (this.textures.exists('bg-1')) {
        const bgScale = width / this.textures.get('bg-1').getSourceImage().width;
        this.bgScale = bgScale;

        // 위→아래 순서로 배치: bg-1 하단을 화면 하단에 맞추고, 위로 쌓아올림
        // 배경은 아래로 스크롤되므로 위쪽에 여유 버퍼 필요
        // bg-1 하단 = 화면 하단
        let curY = height;
        let i = 0;
        // 화면 위로 충분히 채울 때까지 (버퍼 포함) + 최소 4장
        while (curY > -height * 2 || i < 4) {
          const key = getBgKey(i);
          const srcH = this.textures.get(key).getSourceImage().height * bgScale;
          curY -= srcH;
          const spr = this.add.image(0, curY, key)
            .setOrigin(0, 0)
            .setScale(bgScale)
            .setDepth(0);
          this.bgSprites.push(spr);
          i++;
        }
        this.bgNextIdx = i;
      }

      // getBgKey를 scrollToCurrentRow에서 사용하기 위해 저장
      (this as any)._getBgKey = getBgKey;
    }

    // 화면에 보이는 2레인 기준으로 크기 계산
    this.laneW = (width - PADDING * 2) / VISIBLE_LANES;
    this.tileH = this.laneW;

    // 각 레인의 월드 X 좌표
    this.laneWorldX = [];
    for (let i = 0; i < NUM_LANES; i++) {
      this.laneWorldX.push(PADDING + this.laneW / 2 + i * this.laneW);
    }

    // 시작: 토끼 왼쪽(lane 0), 빈 땅에 서있고 위쪽에 길
    const startLane = 0;
    this.viewLeft = 0;

    this.road = new Road(this, this.laneWorldX, this.laneW, this.tileH, NUM_LANES);
    const PLAYER_Y_RATIO = 3 / 4;
    const playerScreenY = height * PLAYER_Y_RATIO - this.tileH / 2;
    this.road.generateInitialStand(height, startLane, height * PLAYER_Y_RATIO);

    // currentRowIdx = 0 (빈 땅, 전진하면 row 1 도로로 진입)
    this.currentRowIdx = 0;

    // 컨테이너 X 오프셋으로 뷰 위치 설정
    this.road.getContainer().setX(-(this.viewLeft * this.laneW));

    const playerScreenX = this.laneScreenX(startLane);
    this.player = new Player(this, this.laneW, playerScreenX, playerScreenY, startLane);

    this.hud = new HUD(this, () => this.onDeath());
    this.hud.create();

    // 게임플레이 시작 시 React HUD 오버레이 표시
    gameBus.emit('screen-change', 'playing');

    // React → Phaser 이벤트 리스너
    this.setupReactListeners();
  }

  private setupReactListeners() {
    const unsubSwitch = gameBus.on('action-switch', () => {
      if (this.gameOver || this.isFalling || this.hud.paused) return;
      this.vibrate(10);
      this.startGame();
      this.switchLane();
    });

    const unsubForward = gameBus.on('action-forward', () => {
      if (this.gameOver || this.isFalling || this.hud.paused) return;
      this.vibrate(10);
      this.startGame();
      this.moveForward();
    });

    const unsubRevive = gameBus.on('revive', () => {
      logEvent('revive_ad_click', { score: this.score });
      this.showAd([], null as unknown as Phaser.GameObjects.Rectangle, () => {
        gameBus.emit('screen-change', 'playing');
        this.revive();
      });
    });

    const unsubHome = gameBus.on('go-home', () => {
      logClick('game_home');
      gameBus.emit('screen-change', 'main');
      this.scene.start('BootScene');
    });

    const unsubPause = gameBus.on('resume-game', () => {
      this.hud.togglePause();
    });

    const unsubPlaySfx = gameBus.on('play-sfx', (key) => {
      if (key && !this.hud.isSfxMuted()) {
        try { this.sound.play(key, { volume: 0.6 }); } catch { /* 무시 */ }
      }
    });

    const unsubToggleBgm = gameBus.on('toggle-bgm', () => {
      const muted = localStorage.getItem('bgmMuted') === 'true';
      const bgm = this.sound.get('bgm-menu');
      if (bgm) (bgm as Phaser.Sound.WebAudioSound).setMute(muted);
    });

    const unsubGodMode = gameBus.on('toggle-godmode', () => {
      const next = localStorage.getItem('godMode') !== 'true';
      localStorage.setItem('godMode', String(next));
    });

    this.events.on('shutdown', () => {
      unsubSwitch();
      unsubForward();
      unsubRevive();
      unsubHome();
      unsubPause();
      unsubPlaySfx();
      unsubToggleBgm();
      unsubGodMode();
    });
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

  /* ── Game start ── */

  private startGame() {
    if (this.gameStarted) return;
    this.gameStarted = true;
    this.hud.startTimer();

    // BGM은 BootScene(홈)에서부터 계속 재생 — 여기서는 참조만
    this.bgm = this.sound.get('bgm-menu') ?? undefined;

    logScreen('screen_game');
    logEvent('game_start');
    this.guideCount = 0;
    // HUD 마운트 대기 후 가이드 전송
    this.time.delayedCall(100, () => this.emitGuideHint());
  }

  private emitGuideHint() {
    if (localStorage.getItem('tutorialDone') === 'true') {
      gameBus.emit('guide-hint', null);
      return;
    }
    if (this.guideCount >= 5) {
      localStorage.setItem('tutorialDone', 'true');
      gameBus.emit('guide-hint', null);
      return;
    }
    const currentRow = this.road.rows[this.currentRowIdx];
    // 현재 행이 턴이고, 아직 switch 안 했고, 레인이 다르면 → switch
    if (currentRow?.isTurn && !this.justSwitched && currentRow.type !== this.player.currentLane) {
      gameBus.emit('guide-hint', 'switch');
    } else {
      gameBus.emit('guide-hint', 'forward');
    }
  }

  /* ── Movement ── */

  private switchLane() {
    const currentRow = this.road.rows[this.currentRowIdx];
    const canSwitch = !this.justSwitched && currentRow?.isTurn;

    if (!canSwitch) {
      if (this.godMode) return;
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
    this.guideCount++;
    this.emitGuideHint();

    // 뷰 패닝 (타겟 레인이 화면 밖이면)
    this.panViewTo(this.calcViewLeft(targetLane));

    const targetScreenX = this.laneScreenX(targetLane);
    this.player.animateSwitch(targetScreenX);

    // 전환 완료 후 — 옆모습 잠깐 보여준 뒤 뒷모습으로
    this.time.delayedCall(350, () => {
      this.player.faceNextTile(this.player.currentLane);
    });
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
    this.guideCount++;
    this.emitGuideHint();
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
    const PLAYER_Y_RATIO = 3 / 4; // 아래서 1/4 위치
    const screenY = height * PLAYER_Y_RATIO;
    const targetContainerY = -(row.y - screenY);

    const scrollDelta = targetContainerY - this.road.getContainer().y;

    this.tweens.add({
      targets: this.road.getContainer(),
      y: targetContainerY,
      duration: 100, ease: 'Quad.easeOut',
    });

    // 배경 패럴랙스 스크롤 (도로보다 느리게 → 깊이감)
    if (this.bgSprites.length > 0) {
      const dy = scrollDelta * 0.3;
      for (const spr of this.bgSprites) {
        spr.y += dy;
      }

      const getBgKey = (this as any)._getBgKey as (idx: number) => string;

      // 화면 아래로 완전히 벗어난 스프라이트 → 맨 위로 재활용 (텍스처 교체)
      for (const spr of this.bgSprites) {
        if (spr.y > this.scale.height) {
          // 현재 가장 위쪽 스프라이트의 상단 찾기
          let minTop = Infinity;
          for (const s of this.bgSprites) {
            if (s.y < minTop) minTop = s.y;
          }
          // 텍스처 교체 후 바로 위에 이어붙임
          const nextKey = getBgKey(this.bgNextIdx);
          spr.setTexture(nextKey);
          spr.setScale(this.bgScale);
          spr.y = minTop - spr.displayHeight;
          this.bgNextIdx++;
        }
      }
    }

    // 토끼 X만 업데이트 (Y는 고정)
    const playerScreenX = this.laneScreenX(this.player.currentLane);
    this.player.scrollToX(playerScreenX);
  }

  /* ── Crash ── */

  private onForwardCrash() {
    if (this.godMode) return;
    this.isFalling = true;
    this.player.setHurt(true);
    this.playSfx('sfx-crash', 0.7);
    this.vibrate([30, 40, 60]);
    this.cameras.main.shake(200, 0.015);
    this.player.animateForwardCrash(() => this.onDeath());
  }

  private onCrash() {
    if (this.godMode) return;
    this.isFalling = true;
    this.player.setHurt(true);
    this.vibrate([30, 40, 60]);
    this.cameras.main.shake(200, 0.015);
    this.onDeath();
  }

  /* ── Death → Revive or Game Over ── */

  private onDeath() {
    if (this.godMode) {
      this.isFalling = false;
      this.player.setHurt(false);
      this.hud.timeLeft = 5;
      this.hud.startTimer();
      return;
    }
    this.gameOver = true;
    this.hud.stopTimer();
    this.endGame();
  }

  /* ── Ad System ── */

  private showAd(
    _reviveItems: Phaser.GameObjects.GameObject[],
    _overlay: Phaser.GameObjects.Rectangle | null,
    onComplete: () => void,
  ) {
    const adLoaded = this.tryShowRealAd(onComplete);
    if (!adLoaded) {
      logEvent('ad_fallback_house');
      this.showHouseAd(onComplete);
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

    // 토끼 Y 위치를 원래 위치로 복원
    const { height } = this.scale;
    const PLAYER_Y_RATIO = 3 / 4;
    const playerScreenY = height * PLAYER_Y_RATIO - this.tileH / 2;
    this.player.scrollTo(this.player.x, playerScreenY);

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
    if (this.godMode) {
      this.gameOver = false;
      this.isFalling = false;
      this.player.setHurt(false);
      this.hud.timeLeft = 5;
      this.hud.startTimer();
      return;
    }
    this.gameOver = true;
    this.hud.stopTimer();
    this.bgm?.pause();
    this.playSfx('sfx-game-over', 0.6);
    this.vibrate([40, 80, 50, 80]);

    const canRevive = !this.hasRevived;

    logEvent('game_over', { score: this.score, best_combo: this.bestCombo, revived: this.hasRevived });
    this.submitScore();

    const bestScore = Math.max(this.score, Number(localStorage.getItem('bestScore') || '0'));
    localStorage.setItem('bestScore', String(bestScore));

    // React 게임오버 화면으로 전환
    gameBus.emit('game-over-data', { score: this.score, bestScore, canRevive });
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

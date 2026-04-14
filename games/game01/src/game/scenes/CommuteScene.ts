import Phaser from 'phaser';
import {
  NUM_LANES, VISIBLE_LANES,
  PADDING, PLAYER_Y_RATIO,
} from '../constants';
import { Road } from '../Road';
import { Player } from '../Player';
import { HUD } from '../HUD';
import { logEvent } from '../services/analytics';
import { adService } from '../services/ad-service';
import { gameBus } from '../event-bus';
import { hudState } from '../hud-state';
import { storage } from '../services/storage';
import { BackgroundManager } from '../BackgroundManager';
import {
  switchLane as doSwitchLane,
  moveForward as doMoveForward,
  laneScreenX,
  emitGuideHint,
  type MovementDeps,
} from '../MovementController';
import {
  onForwardCrash, onCrash, onDeath,
  type LifecycleDeps,
} from '../GameLifecycle';
import { setupReactListeners } from '../ReactListeners';

export class CommuteScene extends Phaser.Scene {
  private road!: Road;
  private player!: Player;
  private hud!: HUD;

  private currentRowIdx = 0;
  private score = 0;
  private coinsEarnedThisGame = 0;
  private gameOver = false;
  private get godMode() { return storage.getBool('godMode'); }
  private guideCount = 0;
  private isFalling = false;
  private justSwitched = false;
  private gameStarted = false;
  private hasRevived = false;
  /** 부활 시점의 점수 — endGame에서 부활 후 추가 획득량 계산용. -1 = 부활 안 함 */
  private scoreAtRevive = -1;
  private bgm?: Phaser.Sound.BaseSound;
  private bgManager!: BackgroundManager;

  private laneWorldX: number[] = [];
  private laneW = 0;
  private tileH = 0;
  private viewLeft = 0;

  constructor() {
    super({ key: 'CommuteScene' });
  }

  init() {
    this.score = 0;
    this.coinsEarnedThisGame = 0;
    hudState.reset();
    this.gameOver = false;
    this.currentRowIdx = 0;
    this.isFalling = false;
    this.justSwitched = false;
    this.gameStarted = false;
    this.hasRevived = false;
    this.scoreAtRevive = -1;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#000000');

    this.bgManager = new BackgroundManager(this);
    this.bgManager.create();

    this.laneW = (width - PADDING * 2) / VISIBLE_LANES;
    this.tileH = this.laneW;

    this.laneWorldX = [];
    for (let i = 0; i < NUM_LANES; i++) {
      this.laneWorldX.push(PADDING + this.laneW / 2 + i * this.laneW);
    }

    const startLane = 0;
    this.viewLeft = 0;

    this.road = new Road(this, this.laneWorldX, this.laneW, this.tileH, NUM_LANES);
    const playerScreenY = height * PLAYER_Y_RATIO - this.tileH / 2;
    this.road.generateInitialStand(height, startLane, height * PLAYER_Y_RATIO);

    this.currentRowIdx = 0;
    this.road.getContainer().setX(-(this.viewLeft * this.laneW));

    const playerScreenX = laneScreenX(this.movementDeps(), startLane);
    const characterId = storage.getSelectedCharacter();
    this.player = new Player(this, this.laneW, playerScreenX, playerScreenY, startLane, characterId);

    this.hud = new HUD(this, () => onDeath(this.lifecycleDeps()));
    this.hud.create();

    // 중요: 리스너부터 먼저 등록 (GameplayHUD 표시 전에 준비 완료)
    setupReactListeners({
      scene: this,
      hud: this.hud,
      getGameOver: () => this.gameOver,
      getIsFalling: () => this.isFalling,
      getScore: () => this.score,
      startGame: () => this.startGame(),
      switchLane: () => doSwitchLane(this.movementDeps()),
      moveForward: () => doMoveForward(this.movementDeps()),
      getLifecycleDeps: () => this.lifecycleDeps(),
    });

    // 그 다음 React에 playing 화면 표시
    gameBus.emit('screen-change', 'playing');

    adService.preload('revive');
    // 코인 광고는 게임오버 "코인 2배" 버튼에서 사용 — 게임플레이 동안 미리 로드
    adService.preload('coin');
  }

  update(_time: number, delta: number) {
    if (!this.gameOver) {
      this.hud.update(delta);
    }
  }

  /* ── Game start ── */

  private startGame() {
    if (this.gameStarted) return;
    this.gameStarted = true;

    this.bgm = this.sound.get('bgm-menu') ?? undefined;

    logEvent('game_start');
    storage.recordPlayStart();
    this.guideCount = 0;

    const tutorialDone = storage.getBool('tutorialDone');
    if (tutorialDone) {
      this.hud.startTimer();
    }
    // 타이머 미시작 시 첫 moveForward에서 시작됨
    this.time.delayedCall(100, () => emitGuideHint(this.movementDeps()));
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

  /* ── Utility ── */

  private vibrate(pattern: number | number[]) {
    try { navigator.vibrate?.(pattern); } catch { /* 미지원 환경 무시 */ }
  }

  private playSfx(key: string, volume: number) {
    if (!this.hud.isSfxMuted()) {
      try { this.sound.play(key, { volume }); } catch { /* 무시 */ }
    }
  }

  /* ── Deps factories ── */

  private movementDeps(): MovementDeps {
    return {
      scene: this,
      road: this.road,
      player: this.player,
      hud: this.hud,
      bgManager: this.bgManager,
      laneW: this.laneW,
      tileH: this.tileH,
      getViewLeft: () => this.viewLeft,
      setViewLeft: (v) => { this.viewLeft = v; },
      getCurrentRowIdx: () => this.currentRowIdx,
      setCurrentRowIdx: (idx) => { this.currentRowIdx = idx; },
      getScore: () => this.score,
      setScore: (s) => { this.score = s; },
      getJustSwitched: () => this.justSwitched,
      setJustSwitched: (v) => { this.justSwitched = v; },
      getGodMode: () => this.godMode,
      getIsFalling: () => this.isFalling,
      setIsFalling: (v) => { this.isFalling = v; },
      getGuideCount: () => this.guideCount,
      setGuideCount: (c) => { this.guideCount = c; },
      onCrash: () => onCrash(this.lifecycleDeps()),
      onForwardCrash: () => onForwardCrash(this.lifecycleDeps()),
      playSfx: (key, vol) => this.playSfx(key, vol),
      vibrate: (p) => this.vibrate(p),
      getCoinsEarnedThisGame: () => this.coinsEarnedThisGame,
      incrementCoinsEarnedThisGame: () => {
        this.coinsEarnedThisGame += 1;
        hudState.setCoins(this.coinsEarnedThisGame);
        gameBus.emit('coin-update', this.coinsEarnedThisGame);
      },
    };
  }

  private lifecycleDeps(): LifecycleDeps {
    return {
      ...this.movementDeps(),
      getGameOver: () => this.gameOver,
      setGameOver: (v) => { this.gameOver = v; },
      getHasRevived: () => this.hasRevived,
      setHasRevived: (v) => { this.hasRevived = v; },
      getScoreAtRevive: () => this.scoreAtRevive,
      setScoreAtRevive: (v) => { this.scoreAtRevive = v; },
      getBgm: () => this.bgm,
      showPopup: (msg, color) => this.showPopup(msg, color),
    };
  }
}

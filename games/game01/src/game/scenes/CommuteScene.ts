import Phaser from 'phaser';
import {
  NUM_LANES, VISIBLE_LANES,
  PADDING,
} from '../constants';
import { Road } from '../Road';
import { Player } from '../Player';
import { HUD } from '../HUD';
import { logEvent, logScreen } from '../services/analytics';
import { adService } from '../services/ad-service';
import { gameBus } from '../event-bus';
import { storage } from '../services/storage';
import { BackgroundManager } from '../BackgroundManager';
import { showHouseAd } from '../HouseAd';
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
  private gameOver = false;
  private get godMode() { return storage.getBool('godMode'); }
  private guideCount = 0;
  private isFalling = false;
  private comboCount = 0;
  private bestCombo = 0;
  private justSwitched = false;
  private gameStarted = false;
  private hasRevived = false;
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
    const PLAYER_Y_RATIO = 3 / 4;
    const playerScreenY = height * PLAYER_Y_RATIO - this.tileH / 2;
    this.road.generateInitialStand(height, startLane, height * PLAYER_Y_RATIO);

    this.currentRowIdx = 0;
    this.road.getContainer().setX(-(this.viewLeft * this.laneW));

    const playerScreenX = laneScreenX(this.movementDeps(), startLane);
    this.player = new Player(this, this.laneW, playerScreenX, playerScreenY, startLane);

    this.hud = new HUD(this, () => onDeath(this.lifecycleDeps()));
    this.hud.create();

    gameBus.emit('screen-change', 'playing');

    adService.setHouseAdRenderer((onComplete) => showHouseAd(this, onComplete));
    adService.preload();

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

    logScreen('screen_game');
    logEvent('game_start');
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
      getComboCount: () => this.comboCount,
      setComboCount: (c) => { this.comboCount = c; },
      getBestCombo: () => this.bestCombo,
      setBestCombo: (b) => { this.bestCombo = b; },
      getGodMode: () => this.godMode,
      getIsFalling: () => this.isFalling,
      setIsFalling: (v) => { this.isFalling = v; },
      getGuideCount: () => this.guideCount,
      setGuideCount: (c) => { this.guideCount = c; },
      onCrash: () => onCrash(this.lifecycleDeps()),
      onForwardCrash: () => onForwardCrash(this.lifecycleDeps()),
      playSfx: (key, vol) => this.playSfx(key, vol),
      vibrate: (p) => this.vibrate(p),
    };
  }

  private lifecycleDeps(): LifecycleDeps {
    return {
      ...this.movementDeps(),
      getGameOver: () => this.gameOver,
      setGameOver: (v) => { this.gameOver = v; },
      getHasRevived: () => this.hasRevived,
      setHasRevived: (v) => { this.hasRevived = v; },
      getBgm: () => this.bgm,
      showPopup: (msg, color) => this.showPopup(msg, color),
    };
  }
}

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
import { gameBus, type TutorialStep } from '../event-bus';
import { hudState } from '../hud-state';
import { storage } from '../services/storage';
import { getBattleHudSnapshot } from '../services/battle-state';
import { isBattleMode, isStageMode, getCurrentStageId } from '../services/game-mode';
import { obstaclesForCurrentMode, getStage } from '../services/stages';
import { combo } from '../services/combo';
import { BackgroundManager } from '../BackgroundManager';
import { CloudManager } from '../CloudManager';
import { OvertimeManager } from '../OvertimeManager';
import {
  switchLane as doSwitchLane,
  moveForward as doMoveForward,
  laneScreenX,
  scrollToCurrentRow,
  type MovementDeps,
} from '../MovementController';
import {
  onCrash, onDeath, endStage,
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
  /** 튜토리얼 스텝 — 'done' 이면 정상 게임, 그 외 = 튜토리얼 진행 중 */
  private tutorialStep: TutorialStep = 'done';
  private unsubTutorialAdvance: (() => void) | null = null;
  /** 한 탭이 두 스텝 건너뛰는 합성 click 방어용 — React 단 throttle 의 이중 가드 */
  private lastTutorialAdvanceAt = 0;
  /** free-play 시작 시점 스냅샷 — 실패 시 롤백용 */
  private freePlayStart: {
    rowIdx: number;
    playerLane: number;
    playerX: number;
    playerY: number;
    viewLeft: number;
    containerX: number;
    containerY: number;
    justSwitched: boolean;
  } | null = null;
  private freePlaySuccessCount = 0;
  /** free-play 목표 성공 횟수 */
  private readonly FREE_PLAY_TARGET = 3;
  private lastBattleEmitAt = 0;
  private inputLocked = false;
  private isFalling = false;
  private justSwitched = false;
  private gameStarted = false;
  private hasRevived = false;
  /** 부활 시점의 점수 — endGame에서 부활 후 추가 획득량 계산용. -1 = 부활 안 함 */
  private scoreAtRevive = -1;
  private bgManager!: BackgroundManager;
  private cloudManager!: CloudManager;
  private overtimeManager!: OvertimeManager;

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
    this.inputLocked = false;
    this.isFalling = false;
    this.justSwitched = false;
    this.gameStarted = false;
    this.hasRevived = false;
    this.scoreAtRevive = -1;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#000000');

    // 새 게임 시작 — 이전 세션의 콤보 상태 (있다면) 정리
    combo.reset();

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
    const tutorialDoneAtInit = storage.getBool('tutorialDone');
    if (!tutorialDoneAtInit && !isBattleMode()) {
      // 튜토리얼용 도로: row 1 즉시 턴 → 방향전환 연습 가능
      this.road.generateTutorialInitial(height, height * PLAYER_Y_RATIO);
    } else {
      this.road.generateInitialStand(height, startLane, height * PLAYER_Y_RATIO);
    }

    this.currentRowIdx = 0;
    this.road.getContainer().setX(-(this.viewLeft * this.laneW));

    const playerScreenX = laneScreenX(this.movementDeps(), startLane);
    const characterId = storage.getSelectedCharacter();
    this.player = new Player(this, this.laneW, playerScreenX, playerScreenY, startLane, characterId);
    // 씬 종료 시 Player 의 gameBus 리스너 (combo-state 등) 정리
    this.events.once('shutdown', () => this.player.destroy());

    // 모드별 HUD 옵션:
    //   - 대전: 30초 고정, 회복 X
    //   - 스테이지: stage 정의의 maxTime + 고정 timeBonus
    //   - 도전(normal): 기본 5초, 회복은 시간 기반 리니어 커브
    const stageDef = isStageMode() ? getStage(getCurrentStageId()) : undefined;
    this.hud = new HUD(this, () => onDeath(this.lifecycleDeps()), {
      duration: isBattleMode() ? 30 : stageDef?.maxTime,
      allowTimeBonus: !isBattleMode(),
      fixedTimeBonus: stageDef?.timeBonus,
    });
    this.hud.create();

    this.cloudManager = new CloudManager(this);
    this.events.once('shutdown', () => this.cloudManager.stop());

    this.overtimeManager = new OvertimeManager(
      this,
      () => ({ x: this.player.x, y: this.player.y }),
      this.laneW,
    );
    this.events.once('shutdown', () => this.overtimeManager.stop());

    // 중요: 리스너부터 먼저 등록 (GameplayHUD 표시 전에 준비 완료)
    setupReactListeners({
      scene: this,
      hud: this.hud,
      getGameOver: () => this.gameOver,
      getIsFalling: () => this.isFalling,
      getInputLocked: () => this.inputLocked,
      getScore: () => this.score,
      startGame: () => this.startGame(),
      switchLane: () => doSwitchLane(this.movementDeps()),
      moveForward: () => doMoveForward(this.movementDeps()),
      getLifecycleDeps: () => this.lifecycleDeps(),
    });

    // 그 다음 React에 playing 화면 표시
    gameBus.emit('screen-change', 'playing');
    this.emitBattleHud();
    if (isBattleMode()) this.startGame();

    // 튜토리얼 시작 — startGame 전에 독립적으로 구동
    if (!tutorialDoneAtInit && !isBattleMode()) {
      this.tutorialStep = 'intro';
      this.unsubTutorialAdvance = gameBus.on('tutorial-advance', () => this.onTutorialAdvance());
      this.events.once('shutdown', () => {
        this.unsubTutorialAdvance?.();
        this.unsubTutorialAdvance = null;
      });
      this.time.delayedCall(400, () => gameBus.emit('tutorial-step', 'intro'));
      logEvent('tutorial_start');
    }

    adService.preload('revive');
    // 코인 광고는 게임오버 "코인 2배" 버튼에서 사용 — 게임플레이 동안 미리 로드
    adService.preload('coin');
  }

  update(_time: number, delta: number) {
    if (!this.gameOver) {
      this.hud.update(delta);
      combo.tick(_time);
      if (_time - this.lastBattleEmitAt >= 120) {
        this.lastBattleEmitAt = _time;
        this.emitBattleHud();
      }
      // 튜토리얼 transition 중: DOM 미러에 매 프레임 위치 전송
      if (this.tutorialStep === 'transition') {
        gameBus.emit('rabbit-mirror', this.player.getMirrorInfo());
      }
    }
  }

  /* ── Game start ── */

  private startGame() {
    if (this.gameStarted) return;
    this.gameStarted = true;
    this.guideCount = 0;

    if (isBattleMode()) {
      logEvent('game_start');
      storage.recordPlayStart();
      this.inputLocked = true;
      this.time.delayedCall(80, () => gameBus.emit('battle-countdown', 3));
      this.time.delayedCall(1080, () => gameBus.emit('battle-countdown', 2));
      this.time.delayedCall(2080, () => gameBus.emit('battle-countdown', 1));
      this.time.delayedCall(3080, () => {
        gameBus.emit('battle-countdown', null);
        this.inputLocked = false;
        this.hud.startTimer();
        // 대전 / 스테이지 모드는 장애물 없음 — cloudManager.start() 호출 안 함
      });
      return;
    }

    // 튜토리얼 중이면 game_start/recordPlayStart/startTimer 는 finishTutorial 에서 실행.
    // 돌아온 유저(tutorialDone)는 지금 바로 실행.
    if (this.tutorialStep === 'done') {
      logEvent('game_start');
      storage.recordPlayStart();
      this.hud.startTimer();
      if (obstaclesForCurrentMode().cloud) this.cloudManager.start();
    }
  }

  /** 튜토리얼 다이얼로그 탭 → 다음 스텝 */
  private onTutorialAdvance() {
    // React 측에서 350ms throttle 하지만, 양쪽에서 합성 click 안전망
    const now = performance.now();
    if (now - this.lastTutorialAdvanceAt < 250) return;
    this.lastTutorialAdvanceAt = now;
    const cur = this.tutorialStep;
    // intro 탭 → 길 강조 연출 후 path-intro
    if (cur === 'intro') {
      this.setTutorialStep('transition-road');
      this.road.setVisibleForTutorial(false);
      this.player.setVisibleForTutorial(false);
      gameBus.emit('road-mirror', this.road.getMirrorTiles());
      gameBus.emit('rabbit-mirror', this.player.getMirrorInfo());
      this.time.delayedCall(1400, () => {
        this.road.setVisibleForTutorial(true);
        this.player.setVisibleForTutorial(true);
        gameBus.emit('road-mirror', null);
        gameBus.emit('rabbit-mirror', null);
        this.setTutorialStep('path-intro');
      });
      return;
    }
    // after-switch 탭 → free-play 진입. 현재 상태 스냅샷
    if (cur === 'after-switch') {
      this.snapshotFreePlay();
      this.setTutorialStep('free-play');
      return;
    }
    // free-play-fail 탭 → 시작 지점 롤백 후 재시도
    if (cur === 'free-play-fail') {
      this.rollbackFreePlay();
      this.setTutorialStep('free-play');
      return;
    }
    let next: TutorialStep | null = null;
    if (cur === 'path-intro')             next = 'path-rule';
    else if (cur === 'path-rule')         next = 'try-it';
    else if (cur === 'try-it')            next = 'prompt-forward';
    else if (cur === 'after-forward')     next = 'turn-info';
    else if (cur === 'turn-info')         next = 'prompt-switch';
    else if (cur === 'all-learned')       next = 'gauge-intro';
    else if (cur === 'gauge-intro')       next = 'timeout-warning';
    else if (cur === 'timeout-warning')   next = 'timeout-reassure';
    else if (cur === 'timeout-reassure')  next = 'recovery-intro';
    else if (cur === 'recovery-intro')    next = 'speed-tip';
    else if (cur === 'speed-tip')         next = 'finale';
    else if (cur === 'finale')            { this.finishTutorial(); return; }
    if (next) this.setTutorialStep(next);
  }

  /** free-play 시작 시점의 상태 저장 (롤백용) */
  private snapshotFreePlay() {
    const container = this.road.getContainer();
    this.freePlayStart = {
      rowIdx: this.currentRowIdx,
      playerLane: this.player.currentLane,
      playerX: this.player.x,
      playerY: this.player.y,
      viewLeft: this.viewLeft,
      containerX: container.x,
      containerY: container.y,
      justSwitched: this.justSwitched,
    };
    this.freePlaySuccessCount = 0;
    gameBus.emit('free-play-count', { current: 0, target: this.FREE_PLAY_TARGET });
  }

  /** free-play 실패 시 시작 지점으로 복원 */
  private rollbackFreePlay() {
    const s = this.freePlayStart;
    if (!s) return;
    this.currentRowIdx = s.rowIdx;
    this.viewLeft = s.viewLeft;
    this.justSwitched = s.justSwitched;
    this.isFalling = false;
    const container = this.road.getContainer();
    this.tweens.killTweensOf(container);
    container.setPosition(s.containerX, s.containerY);
    this.player.switchTo(s.playerLane);
    this.player.setPosition(s.playerX, s.playerY);
    this.freePlaySuccessCount = 0;
    gameBus.emit('free-play-count', { current: 0, target: this.FREE_PLAY_TARGET });
  }

  private setTutorialStep(step: TutorialStep) {
    this.tutorialStep = step;
    gameBus.emit('tutorial-step', step);
  }

  /** 액션 성공 후 (forward/switch) 튜토리얼 진행 */
  private onTutorialAction(action: 'forward' | 'switch') {
    const s = this.tutorialStep;

    // free-play: 성공 카운트 → 3회 달성 시 all-learned
    if (s === 'free-play') {
      this.freePlaySuccessCount += 1;
      gameBus.emit('free-play-count', { current: this.freePlaySuccessCount, target: this.FREE_PLAY_TARGET });
      if (this.freePlaySuccessCount >= this.FREE_PLAY_TARGET) {
        this.setTutorialStep('all-learned');
      }
      return;
    }

    // prompt-forward / prompt-switch: transition 연출 후 다음 스텝
    let next: TutorialStep | null = null;
    if (s === 'prompt-forward' && action === 'forward') next = 'after-forward';
    else if (s === 'prompt-switch' && action === 'switch') next = 'after-switch';
    if (!next) return;

    this.setTutorialStep('transition');
    gameBus.emit('rabbit-mirror', this.player.getMirrorInfo());
    this.player.setVisibleForTutorial(false);
    this.time.delayedCall(800, () => {
      this.player.setVisibleForTutorial(true);
      gameBus.emit('rabbit-mirror', null);
      this.setTutorialStep(next);
    });
  }

  /** free-play 중 크래시 (전진) — 실제 죽음 대신 애니만 + 실패 모달 */
  private onFreePlayForwardCrash() {
    this.isFalling = true;
    this.playSfx('sfx-crash', 0.7);
    this.vibrate([30, 40, 60]);
    this.cameras.main.shake(200, 0.015);
    this.player.setHurt(true);
    // 일반 죽음(GameLifecycle.onCrash)과 동일한 비율 — 0.7 타일만 휘청
    const bumpY = this.player.y - this.tileH * 0.7;
    this.player.animateForwardCrash(bumpY, () => {
      this.setTutorialStep('free-play-fail');
    });
    logEvent('tutorial_free_play_fail', { type: 'forward', success_count: this.freePlaySuccessCount });
  }

  /** free-play 중 크래시 (방향전환) — MovementController 가 이미 애니 재생. 실패 모달만 */
  private onFreePlaySwitchCrash() {
    // isFalling 은 MovementController switchLane 에서 이미 true
    this.setTutorialStep('free-play-fail');
    logEvent('tutorial_free_play_fail', { type: 'switch', success_count: this.freePlaySuccessCount });
  }

  /** finale 탭 → 본게임 시작: 타이머 ON. 점수/코인은 튜토리얼에서 획득한 그대로 유지.
   *  tutorial_complete + game_start 를 순서대로 로깅 (펀넬 분석용) */
  private finishTutorial() {
    storage.setBool('tutorialDone', true);
    this.setTutorialStep('done');
    logEvent('tutorial_complete', { score: this.score, coins: this.coinsEarnedThisGame });
    logEvent('game_start');
    storage.recordPlayStart();
    this.hud.startTimer();
    if (obstaclesForCurrentMode().cloud) this.cloudManager.start();
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

  private emitBattleHud() {
    gameBus.emit('battle-update', getBattleHudSnapshot(this.score, this.hud.elapsed));
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
      onCrash: (kind, opts) => {
        // 튜토리얼 free-play 중에는 게임오버 대신 자체 핸들러로 라우팅
        if (this.tutorialStep === 'free-play') {
          if (kind === 'forward') this.onFreePlayForwardCrash();
          else this.onFreePlaySwitchCrash();
          return;
        }
        onCrash(this.lifecycleDeps(), kind, opts);
      },
      playSfx: (key, vol) => this.playSfx(key, vol),
      vibrate: (p) => this.vibrate(p),
      getCoinsEarnedThisGame: () => this.coinsEarnedThisGame,
      incrementCoinsEarnedThisGame: () => {
        this.coinsEarnedThisGame += 1;
        hudState.setCoins(this.coinsEarnedThisGame);
        gameBus.emit('coin-update', this.coinsEarnedThisGame);
      },
      getTutorialStep: () => this.tutorialStep,
      onTutorialAction: (action) => this.onTutorialAction(action),
      triggerOvertime: () => this.overtimeManager.trigger(),
      triggerStageClear: () => endStage(this.lifecycleDeps()),
      triggerRewind: (count) => this.startRewind(count),
    };
  }

  /**
   * 뒤로가기 장애물 발동 — N칸 후진 + 후진 애니메이션 동안 입력 차단.
   * 콤보는 자연스럽게 끊김(입력 못 함 → 인터벌 초과 → 자동 만료).
   * 점수는 차감 X (오로지 위치 + 시간 손실).
   */
  private startRewind(count: number) {
    if (this.inputLocked) return;
    const targetIdx = Math.max(0, this.currentRowIdx - count);
    const actualCount = this.currentRowIdx - targetIdx;
    if (actualCount <= 0) return;

    this.inputLocked = true;
    this.player.setHurt(true);
    this.playSfx('sfx-crash', 0.6);
    this.vibrate([30, 50, 30, 50]);

    // 후진 도중 turn 을 가로지르면 캐릭터 lane 도 변경되어야 함 — 목적지 row 의 lane 으로 정렬.
    // scrollToCurrentRow 가 player.currentLane 을 읽어 X 좌표를 결정하므로 먼저 갱신.
    this.currentRowIdx = targetIdx;
    const targetRow = this.road.rows[targetIdx];
    if (targetRow) {
      this.player.currentLane = targetRow.type;
      this.player.faceNextTile(targetRow.type);
    }

    const dur = actualCount * 220;

    // ── 이펙트 ──
    // 빨간 화면 플래시 — 즉각적인 임팩트
    this.cameras.main.flash(180, 255, 70, 70);
    // 카메라 흔들림 — 후진 진행 동안 지속
    this.cameras.main.shake(dur, 0.014);
    // "반려!" 팝업 (직장인 metaphor)
    this.showPopup(`반려! ←${actualCount}`, '#ff8b8b');

    scrollToCurrentRow(this.movementDeps(), dur);

    this.time.delayedCall(dur + 80, () => {
      this.inputLocked = false;
      this.player.setHurt(false);
      this.justSwitched = false;
    });
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
      showPopup: (msg, color) => this.showPopup(msg, color),
    };
  }
}

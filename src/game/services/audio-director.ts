import Phaser from 'phaser';
import { gameBus, type GameScreen } from '../event-bus';
import { storage } from './storage';

/**
 * BGM 단일 소유자 — 화면/광고/탭 가시성/음소거 토글을 모두 수집해
 * 하나의 apply() 로직으로 볼륨/재생 상태를 결정.
 *
 * 외부 규약:
 *   - BootScene.create 에서 init(scene.sound) 1회 호출
 *   - 다른 모듈은 BGM 직접 touch 금지 — 이벤트만 emit (screen-change, ad-show-start/end, toggle-bgm)
 */

const BGM_KEY = 'bgm-menu';
const VOL_FULL = 0.4;
const VOL_DUCKED = 0.15;

/** 볼륨 낮춰 재생할 화면 (게임오버/부활/일시정지는 sfx가 메인이라 BGM은 깎음) */
const DUCKED_SCREENS: ReadonlySet<GameScreen> = new Set<GameScreen>([
  'paused', 'revive-prompt', 'game-over',
]);

class AudioDirectorImpl {
  private sound?: Phaser.Sound.BaseSoundManager;
  private bgm?: Phaser.Sound.WebAudioSound;
  private screen: GameScreen = 'loading';
  private adShowing = false;
  private pageHidden = false;
  private subs: Array<() => void> = [];
  private visHandler = () => {
    this.pageHidden = document.visibilityState === 'hidden';
    this.apply();
  };

  /** BootScene.create 에서 1회 호출 — 중복 init 은 무시 */
  init(sound: Phaser.Sound.BaseSoundManager): void {
    if (this.sound === sound) {
      // 같은 sound manager 로 재진입 (go-home 등) — bgm 인스턴스만 재확보
      this.ensureBgm();
      this.apply();
      return;
    }
    // 새 sound manager (첫 부트) — 이벤트 구독
    this.teardown();
    this.sound = sound;
    this.ensureBgm();
    this.subs.push(
      gameBus.on('screen-change', (s) => { this.screen = s; this.apply(); }),
      gameBus.on('ad-show-start', () => { this.adShowing = true; this.apply(); }),
      gameBus.on('ad-show-end', () => { this.adShowing = false; this.apply(); }),
      gameBus.on('toggle-bgm', () => this.apply()),
    );
    document.addEventListener('visibilitychange', this.visHandler);
    this.apply();
  }

  private teardown(): void {
    for (const unsub of this.subs) unsub();
    this.subs = [];
    document.removeEventListener('visibilitychange', this.visHandler);
  }

  private ensureBgm(): void {
    if (!this.sound) return;
    const existing = this.sound.get(BGM_KEY) as Phaser.Sound.WebAudioSound | null;
    if (existing) {
      this.bgm = existing;
    } else {
      try {
        this.bgm = this.sound.add(BGM_KEY, { loop: true, volume: VOL_FULL }) as Phaser.Sound.WebAudioSound;
      } catch {
        this.bgm = undefined;
      }
    }
  }

  private computeTarget(): { play: boolean; volume: number } {
    if (storage.getBool('bgmMuted')) return { play: false, volume: 0 };
    if (this.pageHidden) return { play: false, volume: 0 };
    if (this.adShowing) return { play: false, volume: 0 };
    if (this.screen === 'revive-ad') return { play: false, volume: 0 };
    return {
      play: true,
      volume: DUCKED_SCREENS.has(this.screen) ? VOL_DUCKED : VOL_FULL,
    };
  }

  private apply(): void {
    this.ensureBgm();
    if (!this.bgm) return;
    const t = this.computeTarget();
    try {
      if (t.play) {
        if (this.bgm.isPaused) {
          this.bgm.resume();
        } else if (!this.bgm.isPlaying) {
          this.bgm.play();
        }
        this.bgm.setVolume(t.volume);
      } else if (this.bgm.isPlaying && !this.bgm.isPaused) {
        this.bgm.pause();
      }
    } catch {
      /* autoplay 차단 / 스킵 */
    }
  }
}

export const audioDirector = new AudioDirectorImpl();

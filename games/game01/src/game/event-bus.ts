/**
 * Phaser ↔ React 이벤트 브릿지
 * Phaser 씬에서 emit → React 컴포넌트에서 subscribe
 */

export type GameScreen = 'loading' | 'main' | 'story' | 'playing' | 'paused' | 'settings' | 'game-over' | 'revive-ad';

export interface GameOverData {
  score: number;
  bestScore: number;
  canRevive: boolean;
}

type EventMap = {
  'screen-change': GameScreen;
  'game-over-data': GameOverData;
  // React → Phaser actions
  'start-game': void;
  'resume-game': void;
  'revive': void;
  'go-home': void;
  'toggle-bgm': void;
  'toggle-sfx': void;
  'play-sfx': string;
  // Gameplay HUD: Phaser → React
  'score-update': number;
  'timer-update': number;  // 0~1 비율
  // Gameplay HUD: React → Phaser
  'action-switch': void;
  'action-forward': void;
  'action-pause': void;
  // Challenge modal
  'show-challenge': number; // score
  // Guide hint: which button to press next ('forward' | 'switch' | null)
  'guide-hint': 'forward' | 'switch' | null;
  // Modals
  'show-ad-remove': void;
  // 부활 광고 실패/스킵 알림 → ReviveFailModal 표시
  'revive-fail': 'skipped' | 'failed';
  // Mock 광고 표시 요청 (DEV 전용 — MockAdModal 트리거)
  'mock-ad-show': void;
  // Toast 알림 (React 오버레이로 렌더)
  'toast': string;
  // Debug
  'toggle-godmode': void;
};

type Listener<T> = (data: T) => void;

class GameEventBus {
  private listeners = new Map<string, Set<Listener<unknown>>>();

  on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as Listener<unknown>);
    return () => set.delete(listener as Listener<unknown>);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const fn of set) fn(data);
    }
  }

  off<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): void {
    this.listeners.get(event)?.delete(listener as Listener<unknown>);
  }
}

export const gameBus = new GameEventBus();

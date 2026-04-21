/**
 * Phaser ↔ React 이벤트 브릿지
 * Phaser 씬에서 emit → React 컴포넌트에서 subscribe
 */

export type GameScreen =
  | 'loading'
  | 'main'
  | 'story'
  | 'playing'
  | 'paused'
  | 'settings'
  | 'revive-prompt' // 부활 옵션 모달 (게임오버 직후)
  | 'game-over'      // 보상/종료 화면
  | 'revive-ad';     // 부활 광고 시청 중

export interface RewardPopupItem {
  kind: 'coin' | 'gem';
  amount: number;
  /** 라벨 (없으면 기본: "코인" / "보석") */
  label?: string;
}

export interface CharacterUnlockPopupData {
  id: string;
  name: string;
  jobTitle: string;
  desc: string;
  src: string;
}

export interface BattleResultData {
  mode: 'bot';
  opponentName: string;
  opponentCharacter: 'rabbit' | 'penguin' | 'sheep' | 'cat' | 'koala' | 'lion';
  playerScore: number;
  opponentScore: number;
  outcome: 'win' | 'lose' | 'draw';
}

export interface BattleHudData {
  active: boolean;
  mode: 'bot';
  opponentName: string;
  opponentCharacter: 'rabbit' | 'penguin' | 'sheep' | 'cat' | 'koala' | 'lion';
  playerScore: number;
  opponentScore: number;
}

export interface GameOverData {
  score: number;
  bestScore: number;
  canRevive: boolean;
  /** 이번 판에서 획득한 코인 수 */
  coinsEarned: number;
  battle?: BattleResultData | null;
}

type EventMap = {
  'screen-change': GameScreen;
  'game-over-data': GameOverData;
  // React → Phaser actions
  'start-game': void;
  'restart-game': void;  // 게임오버 화면에서 바로 재시작
  'resume-game': void;
  'revive': void;            // 광고 시청 → 부활
  'revive-with-gems': void;  // 보석 차감 → 부활 (광고 X)
  'go-home': void;
  'toggle-bgm': void;
  'toggle-sfx': void;
  'play-sfx': string;
  // Gameplay HUD: Phaser → React
  'score-update': number;
  'timer-update': number;  // 0~1 비율
  'coin-update': number;   // 이번 판 획득 코인 수 (누적값 아님)
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
  // 보상 획득 팝업 (코인/보석 등 획득 직후 연출)
  'show-reward': RewardPopupItem[];
  // 캐릭터 구매 완료 축하 팝업
  'show-character-unlock': CharacterUnlockPopupData;
  // 대전 HUD 업데이트
  'battle-update': BattleHudData | null;
  'battle-countdown': number | null;
  // 광고 표시 라이프사이클 — BGM 덕킹 등 사운드 제어용
  'ad-show-start': void;
  'ad-show-end': void;
  // Debug
  'toggle-godmode': void;
  // 서버 프로필 동기 완료 — nickname/character/owned 등 업데이트됨
  'profile-synced': void;
  // 서버 에셋 동기 완료 — coins/gems/owned/selected 캐시 업데이트됨
  'assets-synced': void;
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

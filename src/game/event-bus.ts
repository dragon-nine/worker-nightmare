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

/** 튜토리얼 진행 상태 — 스크립트 시퀀스 */
export type TutorialStep =
  | 'intro'            // 1. 인사
  | 'path-intro'       // 2. 길 따라 앞으로만
  | 'path-rule'        // 3. 벗어나거나 뒤로 가면 실패
  | 'try-it'           // 4. 직접 배워보자
  | 'prompt-forward'   // 5. 앞으로 눌러봐 (입력 대기)
  | 'after-forward'    // 6. 앞으로 = 한 칸 올라감
  | 'turn-info'        // 7. 꺾이는 곳에서 방향전환
  | 'prompt-switch'    // 8. 방향전환 눌러봐 (입력 대기)
  | 'after-switch'     // 9. 방향전환 = 바꾸며 한 칸
  | 'free-play'        // 10. 혼자서 3칸 (입력 대기, 힌트/딤 없음)
  | 'free-play-fail'   // 11. 실패 → 롤백 후 재시도 (탭)
  | 'all-learned'      // 12. 동작 다 배움 → 룰 설명
  | 'gauge-intro'      // 13. 시간 제한 (게이지 강조)
  | 'timeout-warning'  // 14. 시간 다 되면 실패
  | 'timeout-reassure' // 15. 걱정 마세요
  | 'recovery-intro'   // 16. 한 칸마다 시간 회복
  | 'speed-tip'        // 17. 빠르게 = 시간 확보
  | 'finale'           // 18. 본격 시작
  | 'transition'       // 토끼 이동 연출
  | 'transition-road'  // 길 강조 연출 (intro → path-intro)
  | 'done';            // 튜토리얼 종료

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
  // Tutorial: 현재 스텝 (Phaser → React)
  'tutorial-step': TutorialStep;
  // Tutorial: 다이얼로그 탭해서 다음으로 (React → Phaser)
  'tutorial-advance': void;
  // Tutorial transition 중: 토끼 미러 정보 (DOM 오버레이에 CSS 글로우 적용)
  'rabbit-mirror': { x: number; y: number; texKey: string; flipX: boolean; size: number } | null;
  // Tutorial transition-road 중: 도로 타일 전체 미러
  'road-mirror': Array<{ x: number; y: number; w: number; h: number; texKey: string }> | null;
  // Tutorial free-play 카운터 업데이트
  'free-play-count': { current: number; target: number };
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

/**
 * LocalStorage 서비스 — 타입 안전한 키 관리
 *
 * 도메인별 그룹:
 *  - 환경 설정 (audio/debug/tutorial)
 *  - 진행 (best score)
 *  - 재화 (coins, gems)
 *  - 캐릭터 (selected, owned)
 *  - 진척 (출석 / 미션)
 */

const KEYS = {
  // 환경 설정 / 디버그
  godMode: 'godMode',
  bgmMuted: 'bgmMuted',
  sfxMuted: 'sfxMuted',
  tutorialDone: 'tutorialDone',

  // 진행 (점수)
  bestScore: 'bestScore',

  // 재화
  coins: 'coins',
  gems: 'gems',

  // 캐릭터
  selectedCharacter: 'selectedCharacter',
  ownedCharacters: 'ownedCharacters',

  // 진척
  attendance: 'attendance',
  missionState: 'missionState',
  playStats: 'playStats',
  freeRewardState: 'freeRewardState',
  promotionState: 'promotionState',
} as const;

const DEFAULT_CHARACTER = 'rabbit';

type BoolKey = 'godMode' | 'bgmMuted' | 'sfxMuted' | 'tutorialDone';
type NumKey = 'coins' | 'gems' | 'bestScore';

/* ──────────────  Date helpers  ────────────── */

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 이번 주 월요일 (KST 기준) — YYYY-MM-DD */
function thisMondayStr(): string {
  const d = new Date();
  const dow = d.getDay(); // 0=일, 1=월, ..., 6=토
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ──────────────  Types (출석/미션)  ────────────── */

export interface AttendanceState {
  /** 다음 받을 일차 (1~7). 7 받으면 1로 순환. */
  nextDay: number;
  /** 마지막 수령 날짜 (YYYY-MM-DD). 빈 문자열이면 한 번도 수령 안 함. */
  lastClaimDate: string;
}

export interface MissionPeriodState {
  /** 받은 미션 ID 목록 */
  claimed: string[];
  /** 리셋 키 — daily는 YYYY-MM-DD, weekly는 월요일의 YYYY-MM-DD */
  resetKey: string;
}

export interface MissionState {
  daily: MissionPeriodState;
  weekly: MissionPeriodState;
}

/** 미션 진행도 계산용 누적 통계 — 일/주 단위로 자동 리셋 */
export interface PlayStatsPeriod {
  /** 플레이한 판 수 */
  plays: number;
  /** 최고 점수 */
  bestScore: number;
  /** 도전장 보낸 횟수 */
  challenges: number;
  /** 보상형 광고 시청 횟수 */
  adsWatched: number;
  /** 이 기간 동안 획득한 코인 누적 (gameplay/보상 — 상점 보석 교환 제외) */
  coinsEarned: number;
  /** 300점 이상 연속 달성 — 현재 진행 중 연속 카운트 */
  streak300Current: number;
  /** 300점 이상 연속 — 이 기간 최대값 (미션 판정용) */
  streak300Best: number;
  /** 부활 후 추가 획득 점수 — 이 기간 최대값 (단일 판 기준) */
  postReviveDeltaBest: number;
  /** 리셋 키 — daily는 YYYY-MM-DD, weekly는 월요일 YYYY-MM-DD */
  resetKey: string;
}

export interface PlayStats {
  daily: PlayStatsPeriod;
  weekly: PlayStatsPeriod;
}

/** 상점 무료 보상 — 일 N회 제한용 카운트 (매일 자정 리셋) */
export interface FreeRewardState {
  /** 보상 id → 오늘 수령한 횟수 */
  counts: Record<string, number>;
  /** 리셋 키 YYYY-MM-DD */
  resetKey: string;
}

export interface PromotionProgressState {
  /** 연속 플레이 일수 */
  streakDays: number;
  /** 마지막으로 반영한 플레이 날짜 (YYYY-MM-DD) */
  lastPlayedDate: string;
  /** 프로모션 지급 완료 여부 */
  claimed: boolean;
  /** 지급 완료 시각 */
  claimedAt?: string;
}

const DEFAULT_ATTENDANCE: AttendanceState = { nextDay: 1, lastClaimDate: '' };

function defaultFreeRewardState(): FreeRewardState {
  return { counts: {}, resetKey: todayStr() };
}

function defaultPromotionState(): PromotionProgressState {
  return { streakDays: 0, lastPlayedDate: '', claimed: false };
}

function defaultMissionState(): MissionState {
  return {
    daily: { claimed: [], resetKey: todayStr() },
    weekly: { claimed: [], resetKey: thisMondayStr() },
  };
}

function defaultPeriod(resetKey: string): PlayStatsPeriod {
  return {
    plays: 0,
    bestScore: 0,
    challenges: 0,
    adsWatched: 0,
    coinsEarned: 0,
    streak300Current: 0,
    streak300Best: 0,
    postReviveDeltaBest: 0,
    resetKey,
  };
}

function defaultPlayStats(): PlayStats {
  return {
    daily: defaultPeriod(todayStr()),
    weekly: defaultPeriod(thisMondayStr()),
  };
}

/** 옛 PlayStats를 읽었을 때 신규 필드를 0/기본값으로 채워 보존 */
function fillPeriodDefaults(p: PlayStatsPeriod): PlayStatsPeriod {
  return {
    plays: p.plays ?? 0,
    bestScore: p.bestScore ?? 0,
    challenges: p.challenges ?? 0,
    adsWatched: p.adsWatched ?? 0,
    coinsEarned: p.coinsEarned ?? 0,
    streak300Current: p.streak300Current ?? 0,
    streak300Best: p.streak300Best ?? 0,
    postReviveDeltaBest: p.postReviveDeltaBest ?? 0,
    resetKey: p.resetKey,
  };
}

/* ──────────────  In-memory caches (탭 입력 드롭 방지용)  ────────────── */
// 게임 핫 패스(코인 획득, tutorial 체크 등)에서 localStorage 동기 I/O가
// 메인 스레드를 블록해 터치 이벤트가 드롭되는 현상 회피.
// getBool/getNum은 첫 호출 시 localStorage에서 로드 후 메모리 캐시.
// setNum은 메모리 즉시 반영 + 200ms 배치 flush (pagehide/visibilitychange 시 즉시 flush).
// setBool은 메모리 + localStorage 동기 (저빈도라 문제 없음).

const _boolCache: Partial<Record<BoolKey, boolean>> = {};
const _numCache: Partial<Record<NumKey, number>> = {};
const _dirtyNums = new Set<NumKey>();
let _flushTimer: ReturnType<typeof setTimeout> | null = null;

function _flushNumsSync(): void {
  if (_flushTimer != null) {
    clearTimeout(_flushTimer);
    _flushTimer = null;
  }
  for (const key of _dirtyNums) {
    const val = _numCache[key];
    if (val != null) localStorage.setItem(KEYS[key], String(val));
  }
  _dirtyNums.clear();
}

function _scheduleFlushNums(): void {
  if (_flushTimer != null) return;
  _flushTimer = setTimeout(() => {
    _flushTimer = null;
    _flushNumsSync();
  }, 200);
}

// 탭 숨김/페이지 이탈 시 즉시 flush (데이터 유실 방지)
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') _flushNumsSync();
  });
  window.addEventListener('pagehide', _flushNumsSync);
}

export const storage = {
  /* ──────────────  Bool (메모리 캐시된 읽기)  ────────────── */

  getBool(key: BoolKey): boolean {
    const cached = _boolCache[key];
    if (cached !== undefined) return cached;
    const val = localStorage.getItem(KEYS[key]) === 'true';
    _boolCache[key] = val;
    return val;
  },

  setBool(key: BoolKey, value: boolean): void {
    _boolCache[key] = value;
    localStorage.setItem(KEYS[key], String(value));
  },

  removeBool(key: BoolKey): void {
    delete _boolCache[key];
    localStorage.removeItem(KEYS[key]);
  },

  toggleBool(key: BoolKey): boolean {
    const next = !this.getBool(key);
    this.setBool(key, next);
    return next;
  },

  /* ──────────────  Number (메모리 캐시 + 배치 flush)  ────────────── */

  getNum(key: NumKey): number {
    const cached = _numCache[key];
    if (cached !== undefined) return cached;
    const val = Number(localStorage.getItem(KEYS[key]) || '0');
    _numCache[key] = val;
    return val;
  },

  setNum(key: NumKey, value: number): void {
    _numCache[key] = value;
    _dirtyNums.add(key);
    _scheduleFlushNums();
  },

  addNum(key: NumKey, delta: number): number {
    // 방어: NaN/Infinity 거부, 0~MAX_SAFE_INTEGER로 클램프
    if (!Number.isFinite(delta)) {
      console.warn(`[storage] addNum rejected non-finite delta: ${delta}`);
      return this.getNum(key);
    }
    const current = this.getNum(key);
    const raw = current + delta;
    const next = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, raw));
    this.setNum(key, next);
    return next;
  },

  /** 수동 flush — 게임오버 등 결정적 시점에 호출해 즉시 persist */
  flushNums(): void {
    _flushNumsSync();
  },

  /* ──────────────  Best Score (편의 래퍼)  ────────────── */

  getBestScore(): number {
    return this.getNum('bestScore');
  },

  setBestScore(score: number): void {
    this.setNum('bestScore', score);
  },

  updateBestScore(score: number): number {
    const best = Math.max(score, this.getBestScore());
    this.setBestScore(best);
    return best;
  },

  /* ──────────────  Character  ────────────── */

  getSelectedCharacter(): string {
    return localStorage.getItem(KEYS.selectedCharacter) || DEFAULT_CHARACTER;
  },

  setSelectedCharacter(id: string): void {
    localStorage.setItem(KEYS.selectedCharacter, id);
  },

  getOwnedCharacters(): string[] {
    const raw = localStorage.getItem(KEYS.ownedCharacters);
    if (!raw) return [DEFAULT_CHARACTER];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [DEFAULT_CHARACTER];
      return parsed.includes(DEFAULT_CHARACTER) ? parsed : [DEFAULT_CHARACTER, ...parsed];
    } catch {
      return [DEFAULT_CHARACTER];
    }
  },

  isOwnedCharacter(id: string): boolean {
    return this.getOwnedCharacters().includes(id);
  },

  addOwnedCharacter(id: string): void {
    const current = this.getOwnedCharacters();
    if (current.includes(id)) return;
    localStorage.setItem(KEYS.ownedCharacters, JSON.stringify([...current, id]));
  },

  setOwnedCharacters(ids: string[]): void {
    const unique = Array.from(new Set(ids.filter((s) => typeof s === 'string' && s.length > 0)));
    // DEFAULT_CHARACTER 항상 포함 보장
    if (!unique.includes(DEFAULT_CHARACTER)) unique.unshift(DEFAULT_CHARACTER);
    localStorage.setItem(KEYS.ownedCharacters, JSON.stringify(unique));
  },

  /* ──────────────  Attendance  ────────────── */

  getAttendance(): AttendanceState {
    const raw = localStorage.getItem(KEYS.attendance);
    if (!raw) return { ...DEFAULT_ATTENDANCE };
    try {
      const parsed = JSON.parse(raw);
      if (
        typeof parsed?.nextDay === 'number' &&
        parsed.nextDay >= 1 && parsed.nextDay <= 7 &&
        typeof parsed?.lastClaimDate === 'string'
      ) {
        return parsed;
      }
    } catch { /* fallthrough */ }
    return { ...DEFAULT_ATTENDANCE };
  },

  setAttendance(state: AttendanceState): void {
    localStorage.setItem(KEYS.attendance, JSON.stringify(state));
  },

  /** 오늘 이미 받았는지 */
  isAttendanceClaimedToday(): boolean {
    return this.getAttendance().lastClaimDate === todayStr();
  },

  /**
   * 출석 보상 받기 — 오늘 이미 받았으면 null 반환.
   * 성공 시 { day, cycled } 반환 — day는 방금 받은 일차(1~7), cycled는 7→1 순환 여부.
   */
  claimAttendance(): { day: number; cycled: boolean } | null {
    const state = this.getAttendance();
    const today = todayStr();
    if (state.lastClaimDate === today) return null;
    const day = state.nextDay;
    const cycled = day === 7;
    const nextDay = cycled ? 1 : day + 1;
    this.setAttendance({ nextDay, lastClaimDate: today });
    return { day, cycled };
  },

  /* ──────────────  Mission  ────────────── */

  /**
   * 미션 상태 조회 — 날짜/주차가 바뀌었으면 자동 리셋.
   * 따라서 매번 호출해도 안전하며, 모달 마운트 시 한 번 부르면 충분.
   */
  getMissionState(): MissionState {
    const today = todayStr();
    const monday = thisMondayStr();
    const raw = localStorage.getItem(KEYS.missionState);
    let state: MissionState;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        state = isMissionState(parsed) ? parsed : defaultMissionState();
      } catch {
        state = defaultMissionState();
      }
    } else {
      state = defaultMissionState();
    }

    let mutated = false;
    if (state.daily.resetKey !== today) {
      state.daily = { claimed: [], resetKey: today };
      mutated = true;
    }
    if (state.weekly.resetKey !== monday) {
      state.weekly = { claimed: [], resetKey: monday };
      mutated = true;
    }
    if (mutated) this.setMissionState(state);
    return state;
  },

  setMissionState(state: MissionState): void {
    localStorage.setItem(KEYS.missionState, JSON.stringify(state));
  },

  /** 미션 받음 처리 — 중복 추가 안 함. 리턴은 갱신된 상태. */
  addClaimedMission(period: 'daily' | 'weekly', id: string): MissionState {
    const state = this.getMissionState();
    if (!state[period].claimed.includes(id)) {
      state[period].claimed.push(id);
      this.setMissionState(state);
    }
    return state;
  },

  /* ──────────────  Play Stats (미션 진행도 소스)  ────────────── */

  /** 일/주 통계 조회 — 날짜/주차 변경 시 자동 리셋 */
  getPlayStats(): PlayStats {
    const today = todayStr();
    const monday = thisMondayStr();
    const raw = localStorage.getItem(KEYS.playStats);
    let state: PlayStats;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        state = isPlayStats(parsed) ? parsed : defaultPlayStats();
      } catch {
        state = defaultPlayStats();
      }
    } else {
      state = defaultPlayStats();
    }
    let mutated = false;
    // 옛 데이터 호환 — 누락된 신규 필드 채움 (validator는 통과했지만 필드는 빠진 상태)
    const dailyFilled = fillPeriodDefaults(state.daily);
    const weeklyFilled = fillPeriodDefaults(state.weekly);
    if (JSON.stringify(dailyFilled) !== JSON.stringify(state.daily)) {
      state.daily = dailyFilled;
      mutated = true;
    }
    if (JSON.stringify(weeklyFilled) !== JSON.stringify(state.weekly)) {
      state.weekly = weeklyFilled;
      mutated = true;
    }
    if (state.daily.resetKey !== today) {
      state.daily = defaultPeriod(today);
      mutated = true;
    }
    if (state.weekly.resetKey !== monday) {
      state.weekly = defaultPeriod(monday);
      mutated = true;
    }
    if (mutated) this.setPlayStats(state);
    return state;
  },

  setPlayStats(state: PlayStats): void {
    localStorage.setItem(KEYS.playStats, JSON.stringify(state));
  },

  /** 한 판 시작 시 호출 — 일/주 plays 둘 다 +1 */
  recordPlayStart(): void {
    const state = this.getPlayStats();
    state.daily.plays += 1;
    state.weekly.plays += 1;
    this.setPlayStats(state);
  },

  /** 한 판 종료 시 점수 갱신 — bestScore + 300점 streak 처리 */
  recordPlayScore(score: number): void {
    const state = this.getPlayStats();
    for (const key of ['daily', 'weekly'] as const) {
      const p = state[key];
      if (score > p.bestScore) p.bestScore = score;
      if (score >= 300) {
        p.streak300Current += 1;
        if (p.streak300Current > p.streak300Best) p.streak300Best = p.streak300Current;
      } else {
        p.streak300Current = 0;
      }
    }
    this.setPlayStats(state);
  },

  /** 도전장 보낼 때 호출 — 일/주 challenges 둘 다 +1 */
  recordChallenge(): void {
    const state = this.getPlayStats();
    state.daily.challenges += 1;
    state.weekly.challenges += 1;
    this.setPlayStats(state);
  },

  /** 보상형 광고 시청 완료 시 — 일/주 adsWatched 둘 다 +1 */
  recordAdWatched(): void {
    const state = this.getPlayStats();
    state.daily.adsWatched += 1;
    state.weekly.adsWatched += 1;
    this.setPlayStats(state);
  },

  /** 코인 획득 시 누적 — 상점 보석 교환 코인은 호출 X */
  recordCoinEarned(amount: number): void {
    if (amount <= 0) return;
    const state = this.getPlayStats();
    state.daily.coinsEarned += amount;
    state.weekly.coinsEarned += amount;
    this.setPlayStats(state);
  },

  /** 부활 사용한 판 종료 시 — 부활 후 추가 획득 점수의 max 갱신 */
  recordPostReviveScore(delta: number): void {
    if (delta <= 0) return;
    const state = this.getPlayStats();
    for (const key of ['daily', 'weekly'] as const) {
      if (delta > state[key].postReviveDeltaBest) {
        state[key].postReviveDeltaBest = delta;
      }
    }
    this.setPlayStats(state);
  },

  /** 미션 정의에서 사라진 옛 ID들을 claim 리스트에서 정리 (self-healing migration) */
  pruneClaimedMissions(validIds: ReadonlySet<string>): void {
    const state = this.getMissionState();
    const dailyFiltered = state.daily.claimed.filter((id) => validIds.has(id));
    const weeklyFiltered = state.weekly.claimed.filter((id) => validIds.has(id));
    if (
      dailyFiltered.length !== state.daily.claimed.length ||
      weeklyFiltered.length !== state.weekly.claimed.length
    ) {
      state.daily.claimed = dailyFiltered;
      state.weekly.claimed = weeklyFiltered;
      this.setMissionState(state);
    }
  },

  /* ──────────────  Free Reward (상점 일 N회 제한)  ────────────── */

  /** 무료 보상 상태 조회 — 날짜 바뀌면 자동 리셋 */
  getFreeRewardState(): FreeRewardState {
    const today = todayStr();
    const raw = localStorage.getItem(KEYS.freeRewardState);
    let state: FreeRewardState;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        state = isFreeRewardState(parsed) ? parsed : defaultFreeRewardState();
      } catch {
        state = defaultFreeRewardState();
      }
    } else {
      state = defaultFreeRewardState();
    }
    if (state.resetKey !== today) {
      state = { counts: {}, resetKey: today };
      localStorage.setItem(KEYS.freeRewardState, JSON.stringify(state));
    }
    return state;
  },

  /** 특정 보상의 오늘 수령 횟수 */
  getFreeRewardCount(id: string): number {
    return this.getFreeRewardState().counts[id] || 0;
  },

  /** 수령 횟수 +1 후 새 값 반환 */
  incrementFreeRewardCount(id: string): number {
    const state = this.getFreeRewardState();
    const next = (state.counts[id] || 0) + 1;
    state.counts[id] = next;
    localStorage.setItem(KEYS.freeRewardState, JSON.stringify(state));
    return next;
  },

  /* ──────────────  Promotion Progress  ────────────── */

  getPromotionState(): PromotionProgressState {
    const raw = localStorage.getItem(KEYS.promotionState);
    if (!raw) return defaultPromotionState();
    try {
      const parsed = JSON.parse(raw);
      if (
        typeof parsed?.streakDays === 'number' &&
        typeof parsed?.lastPlayedDate === 'string' &&
        typeof parsed?.claimed === 'boolean'
      ) {
        return {
          streakDays: Math.max(0, Math.floor(parsed.streakDays)),
          lastPlayedDate: parsed.lastPlayedDate,
          claimed: parsed.claimed,
          claimedAt: typeof parsed.claimedAt === 'string' ? parsed.claimedAt : undefined,
        };
      }
    } catch { /* fallthrough */ }
    return defaultPromotionState();
  },

  setPromotionState(state: PromotionProgressState): void {
    localStorage.setItem(KEYS.promotionState, JSON.stringify(state));
  },

  /**
   * 하루 1회만 연속 플레이 streak 반영.
   * - 같은 날 여러 판: 유지
   * - 전날 이후 연속 접속: +1
   * - 하루 이상 비면: 1로 리셋
   */
  recordThreeDayPromotionPlay(): PromotionProgressState {
    const state = this.getPromotionState();
    if (state.claimed) return state;
    const today = todayStr();
    if (state.lastPlayedDate === today) return state;

    let streakDays = 1;
    if (state.lastPlayedDate) {
      const prev = new Date(`${state.lastPlayedDate}T00:00:00+09:00`).getTime();
      const curr = new Date(`${today}T00:00:00+09:00`).getTime();
      const diffDays = Math.round((curr - prev) / 86400000);
      streakDays = diffDays === 1 ? state.streakDays + 1 : 1;
    }

    const next = {
      ...state,
      streakDays,
      lastPlayedDate: today,
    };
    this.setPromotionState(next);
    return next;
  },

  markThreeDayPromotionClaimed(): PromotionProgressState {
    const state = this.getPromotionState();
    const next = {
      ...state,
      claimed: true,
      claimedAt: new Date().toISOString(),
    };
    this.setPromotionState(next);
    return next;
  },
};

function isFreeRewardState(v: unknown): v is FreeRewardState {
  if (!v || typeof v !== 'object') return false;
  const s = v as Partial<FreeRewardState>;
  return (
    !!s.counts &&
    typeof s.counts === 'object' &&
    typeof s.resetKey === 'string'
  );
}

function isPlayStats(v: unknown): v is PlayStats {
  if (!v || typeof v !== 'object') return false;
  const s = v as Partial<PlayStats>;
  const okPeriod = (p?: PlayStatsPeriod) =>
    !!p &&
    typeof p.plays === 'number' &&
    typeof p.bestScore === 'number' &&
    typeof p.challenges === 'number' &&
    typeof p.resetKey === 'string';
  return okPeriod(s.daily) && okPeriod(s.weekly);
}

function isMissionState(v: unknown): v is MissionState {
  if (!v || typeof v !== 'object') return false;
  const s = v as Partial<MissionState>;
  const okPeriod = (p?: MissionPeriodState) =>
    !!p && Array.isArray(p.claimed) && typeof p.resetKey === 'string';
  return okPeriod(s.daily) && okPeriod(s.weekly);
}

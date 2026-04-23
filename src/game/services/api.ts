/**
 * Dragon Nine API 클라이언트 — 익명 인증 + 점수/랭킹/프로필
 *
 * 핵심 설계:
 *  - 첫 호출 시 device_id(localStorage 영속) 자동 생성 → /v1/auth/anonymous 호출 → JWT 저장
 *  - 모든 후속 호출은 저장된 토큰 사용. 401이면 1회 재인증 시도.
 *  - 네트워크/서버 실패는 호출자에게 throw — 호출자가 폴백 결정 (로컬 캐시, 무시 등)
 */

const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  'https://dragon-nine-api.dragonnine.workers.dev';
const GAME_ID = 'game01';

// 로컬 개발/디버그 빌드에서 항상 동일한 테스터로 접속한다.
// Toss 유저키 링크도 스킵해서 실제 Toss 계정과 섞이지 않도록.
const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true';
// 서버가 device_id 최소 8자 검증 — 'test'만으론 400.
const DEBUG_DEVICE_ID = 'test-dev';

const KEYS = {
  deviceId: 'api.deviceId',
  token: 'api.token',
  userId: 'api.userId',
};

/* ───── 타입 ───── */
export interface ApiProfile {
  user_id: string;
  game_id: string;
  nickname: string;
  character: string | null;
  best_score: number;
  total_plays: number;
  owned_characters: string; // JSON array 문자열
  created_at: number;
  updated_at: number;
}

/** profile.owned_characters JSON string → string[] (실패 시 빈 배열) */
export function parseOwnedCharacters(profile: ApiProfile | null | undefined): string[] {
  if (!profile?.owned_characters) return [];
  try {
    const arr = JSON.parse(profile.owned_characters);
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}
export interface LeaderEntry {
  rank: number;
  user_id: string;
  nickname: string;
  character: string | null;
  score: number;
}
export interface LeaderboardResponse {
  period: Period;
  top: LeaderEntry[];
  me: LeaderEntry | null;
  around: { above: LeaderEntry[]; below: LeaderEntry[] };
}

/* ───── device_id / token 보관 ───── */
/**
 * UUID v4 생성 — crypto.randomUUID() 가 있으면 그걸, 없으면 getRandomValues 폴백,
 * 마지막으로 Math.random 폴백 (토스 샌드박스/구 웹뷰 대응).
 */
function generateUuid(): string {
  const c = (typeof crypto !== 'undefined' ? crypto : undefined) as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0,4).join('')}-${hex.slice(4,6).join('')}-${hex.slice(6,8).join('')}-${hex.slice(8,10).join('')}-${hex.slice(10,16).join('')}`;
}

function getOrCreateDeviceId(): string {
  if (DEBUG) return DEBUG_DEVICE_ID;
  let id = localStorage.getItem(KEYS.deviceId);
  if (!id) {
    id = generateUuid();
    localStorage.setItem(KEYS.deviceId, id);
  }
  return id;
}
export function getStoredToken(): string | null {
  return localStorage.getItem(KEYS.token);
}
export function getStoredUserId(): string | null {
  return localStorage.getItem(KEYS.userId);
}
function setSession(token: string, userId: string): void {
  localStorage.setItem(KEYS.token, token);
  localStorage.setItem(KEYS.userId, userId);
}
function clearSession(): void {
  localStorage.removeItem(KEYS.token);
  localStorage.removeItem(KEYS.userId);
  localStorage.removeItem('api.tossLinked');
}

/* ───── 저수준 fetch ───── */
async function request<T>(path: string, init: RequestInit & { auth?: boolean; _retry?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Game-Id': GAME_ID,
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.auth) {
    const token = getStoredToken();
    if (!token) throw new ApiError(401, 'not authenticated');
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: 'no-store' });
  if (!res.ok) {
    // 인증 필요한 요청이 401 나면 토큰 무효 (DB 리셋/유저 삭제 등) → 1회 재인증 + 재시도
    if (res.status === 401 && init.auth && !init._retry) {
      clearSession();
      await ensureAuth({ force: true });
      return request<T>(path, { ...init, _retry: true });
    }
    const text = await res.text().catch(() => '');
    throw new ApiError(res.status, text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(`API ${status}: ${message}`);
    this.status = status;
  }
}

/* ───── 인증 ───── */

import { isTossNative } from '../platform';

/**
 * 토스 인앱에서 유저 해시 키 가져오기 (실패 시 null).
 * 게임 카테고리 미니앱에서만 사용 가능.
 */
async function getTossUserId(): Promise<string | null> {
  if (DEBUG) return null;
  if (!isTossNative()) return null;
  try {
    const { getUserKeyForGame } = await import('@apps-in-toss/web-framework');
    const r = await getUserKeyForGame();
    if (r && typeof r === 'object' && 'type' in r && r.type === 'HASH') {
      return r.hash;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 익명 가입/로그인. 토큰이 이미 있어도 강제로 다시 받고 싶으면 force=true.
 * 반환된 profile에서 닉네임/캐릭터/베스트점수를 캐시할 것.
 * is_new_user 는 신규 유저로 판정된 경우 true (튜토리얼/환영 트리거용).
 */
const TOSS_LINKED_KEY = 'api.tossLinked';

export async function ensureAuth(opts: { force?: boolean; defaultNickname?: string; character?: string; ownedCharacters?: string[] } = {}): Promise<{ token: string; profile: ApiProfile; isNewUser: boolean }> {
  const deviceId = getOrCreateDeviceId();
  const tossUserId = await getTossUserId();
  // 토스 ID 가 있는데 아직 서버에 링크 안 된 유저는 한 번 재가입 타게 함 (기기변경 대응 활성화)
  const needTossLink = !!tossUserId && !localStorage.getItem(TOSS_LINKED_KEY);

  if (!opts.force && !needTossLink && getStoredToken()) {
    // 이미 토큰 있음 → 프로필만 가져와서 반환
    try {
      const p = await getMyProfile();
      return { token: getStoredToken()!, profile: p, isNewUser: false };
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401) throw e;
      // 401 → 토큰 만료, 재발급 진행
    }
  }

  const body: Record<string, unknown> = { device_id: deviceId };
  if (tossUserId) body.toss_user_id = tossUserId;
  if (opts.defaultNickname) body.default_nickname = opts.defaultNickname;
  if (opts.character) body.character = opts.character;
  // 신규 가입이면 서버에 보유 목록 임포트 — 기존 유저 재인증이면 서버가 무시
  if (opts.ownedCharacters && opts.ownedCharacters.length > 0) {
    body.owned_characters = opts.ownedCharacters;
  }

  const res = await request<{ token: string; user: { id: string }; profile: ApiProfile; is_new_user?: boolean }>(
    '/v1/auth/anonymous',
    { method: 'POST', body: JSON.stringify(body) },
  );
  setSession(res.token, res.user.id);
  if (tossUserId) localStorage.setItem(TOSS_LINKED_KEY, '1');
  return { token: res.token, profile: res.profile, isNewUser: !!res.is_new_user };
}

/* ───── 프로필 ───── */
export async function getMyProfile(): Promise<ApiProfile> {
  const r = await request<{ profile: ApiProfile }>('/v1/users/me', { auth: true });
  return r.profile;
}
export async function updateMyProfile(input: { nickname?: string; character?: string; owned_characters?: string[]; best_score?: number }): Promise<ApiProfile> {
  const r = await request<{ profile: ApiProfile }>('/v1/users/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
    auth: true,
  });
  return r.profile;
}

/* ───── 점수 ───── */
export async function submitScore(score: number, meta?: Record<string, unknown>): Promise<{ ok: true; score: number; daily_key: string; weekly_key: string }> {
  return request('/v1/scores', {
    method: 'POST',
    body: JSON.stringify({ score, meta }),
    auth: true,
  });
}

/* ───── 랭킹 ───── */
export type Period = 'daily' | 'weekly' | 'alltime';

export async function fetchLeaderboard(period: Period): Promise<LeaderboardResponse> {
  // 인증되어 있으면 me/around 포함시키기 위해 토큰 전달 (없으면 me:null)
  const hasToken = !!getStoredToken();
  return request(`/v1/leaderboard?period=${period}`, hasToken ? { auth: true } : {});
}

/* ───── 이판 점수 기준 랭커 (near-score) ─────
 * 게임오버/부활 화면의 "X 점수까지 N점!" 메시지용.
 * 기본 /leaderboard 의 around 는 "내 오늘 PB 기준" 이라 이번 판 점수가 PB 보다 낮으면
 * 의미 없는 랭커가 잡힘. 이 엔드포인트는 anchor 로 이판 점수를 직접 받음.
 */
export interface NearScoreRow {
  user_id: string;
  nickname: string;
  character: string | null;
  score: number;
}
export interface NearScoreResponse {
  period: Period;
  score: number;
  above: NearScoreRow[];
  below: NearScoreRow[];
}
export async function fetchLeaderboardNearScore(period: Period, score: number): Promise<NearScoreResponse> {
  const hasToken = !!getStoredToken();
  const safeScore = Math.max(0, Math.floor(score));
  return request(
    `/v1/leaderboard/near-score?period=${period}&score=${safeScore}`,
    hasToken ? { auth: true } : {},
  );
}

/* ───── 내 과거 기간별 순위 (보상 조회) ───── */
export interface MyRankEntry {
  period_key: string;
  rank: number;
  score: number;
}
export interface MyRanksResponse {
  daily: MyRankEntry[];
  weekly: MyRankEntry[];
}
export async function fetchMyRanks(fromDaily?: string, fromWeekly?: string): Promise<MyRanksResponse> {
  const params = new URLSearchParams();
  if (fromDaily) params.set('from_daily', fromDaily);
  if (fromWeekly) params.set('from_weekly', fromWeekly);
  return request(`/v1/leaderboard/my-ranks?${params}`, { auth: true });
}

export interface ThreeDayPromotionPrepareResponse {
  promotion_id: string;
  progress_key: string;
  eligible: boolean;
  already_granted: boolean;
  amount: number;
  state: Record<string, unknown>;
}

export interface PromotionAttemptResponse {
  attempt_id: number;
  promotion_id: string;
  progress_key: string;
  amount: number;
}

async function preparePromotion(promotionId: string): Promise<ThreeDayPromotionPrepareResponse> {
  return request(`/v1/promotion/${promotionId}/prepare`, {
    method: 'POST',
    body: JSON.stringify({}),
    auth: true,
  });
}

export async function prepareThreeDayPromotion(): Promise<ThreeDayPromotionPrepareResponse> {
  return preparePromotion('three_day_play_50');
}

async function attemptPromotion(promotionId: string, progressKey: string): Promise<PromotionAttemptResponse> {
  return request(`/v1/promotion/${promotionId}/attempt`, {
    method: 'POST',
    body: JSON.stringify({ progressKey }),
    auth: true,
  });
}

export async function attemptThreeDayPromotion(progressKey: string): Promise<PromotionAttemptResponse> {
  return attemptPromotion('three_day_play_50', progressKey);
}

async function completePromotion(
  promotionId: string,
  input: {
    progressKey: string;
    attemptId: number;
    rewardKey: string;
    amount: number;
    clientMeta?: Record<string, unknown>;
  },
): Promise<{ ok: true; already_granted: boolean }> {
  return request(`/v1/promotion/${promotionId}/complete`, {
    method: 'POST',
    body: JSON.stringify(input),
    auth: true,
  });
}

export async function completeThreeDayPromotion(input: {
  progressKey: string;
  attemptId: number;
  rewardKey: string;
  amount: number;
  clientMeta?: Record<string, unknown>;
}): Promise<{ ok: true; already_granted: boolean }> {
  return completePromotion('three_day_play_50', input);
}

async function failPromotion(
  promotionId: string,
  input: {
    progressKey: string;
    attemptId: number;
    amount: number;
    errorCode?: string;
    errorMessage?: string;
    clientMeta?: Record<string, unknown>;
  },
): Promise<{ ok: true }> {
  return request(`/v1/promotion/${promotionId}/fail`, {
    method: 'POST',
    body: JSON.stringify(input),
    auth: true,
  });
}

export async function failThreeDayPromotion(input: {
  progressKey: string;
  attemptId: number;
  amount: number;
  errorCode?: string;
  errorMessage?: string;
  clientMeta?: Record<string, unknown>;
}): Promise<{ ok: true }> {
  return failPromotion('three_day_play_50', input);
}

export async function postUserActivityEvent(input: {
  eventKind: string;
  eventName: string;
  eventKey?: string;
  eventStatus?: string;
  coinsSnapshot: number;
  gemsSnapshot: number;
  payload?: Record<string, unknown>;
}): Promise<{ ok: true }> {
  return request('/v1/events', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: true,
  });
}

export interface ApiGameAsset {
  user_id: string;
  game_id: string;
  asset_type: string;
  asset_id: string;
  quantity: number;
  created_at?: number;
  updated_at: number;
}

export async function fetchMyAssets(): Promise<ApiGameAsset[]> {
  const r = await request<{ assets: ApiGameAsset[] }>('/v1/users/me/assets', { auth: true });
  return r.assets;
}

export async function upsertMyAsset(input: {
  asset_type: string;
  asset_id: string;
  quantity: number;
}): Promise<ApiGameAsset> {
  const r = await request<{ asset: ApiGameAsset }>('/v1/users/me/assets/upsert', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: true,
  });
  return r.asset;
}

export async function syncMyAssets(input: {
  assets: Array<{
    asset_type: string;
    asset_id: string;
    quantity: number;
  }>;
  replace_types?: string[];
}): Promise<ApiGameAsset[]> {
  const r = await request<{ assets: ApiGameAsset[] }>('/v1/users/me/assets/sync', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: true,
  });
  return r.assets;
}

export async function migrateLocalAssetsV1(input: {
  assets: Array<{
    asset_type: string;
    asset_id: string;
    quantity: number;
  }>;
  loadouts: Array<{
    slot_key: string;
    target_type: string;
    target_id: string;
    meta?: Record<string, unknown>;
  }>;
  meta?: Record<string, unknown>;
}): Promise<{
  migrated: boolean;
  migration_key: string;
  status: 'completed';
  assets: ApiGameAsset[];
  loadouts: ApiGameLoadout[];
}> {
  return request('/v1/users/me/assets/migrate-local-v1', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: true,
  });
}

export interface ApiGameLoadout {
  user_id: string;
  game_id: string;
  slot_key: string;
  target_type: string;
  target_id: string;
  meta_json: string | null;
  created_at?: number;
  updated_at: number;
}

export async function fetchMyLoadouts(): Promise<ApiGameLoadout[]> {
  const r = await request<{ loadouts: ApiGameLoadout[] }>('/v1/users/me/loadouts', { auth: true });
  return r.loadouts;
}

export async function upsertMyLoadout(input: {
  slot_key: string;
  target_type: string;
  target_id: string;
  meta?: Record<string, unknown>;
}): Promise<ApiGameLoadout> {
  const r = await request<{ loadout: ApiGameLoadout }>('/v1/users/me/loadouts/upsert', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: true,
  });
  return r.loadout;
}

export async function syncMyLoadouts(input: {
  loadouts: Array<{
    slot_key: string;
    target_type: string;
    target_id: string;
    meta?: Record<string, unknown>;
  }>;
  replace_slots?: string[];
}): Promise<ApiGameLoadout[]> {
  const r = await request<{ loadouts: ApiGameLoadout[] }>('/v1/users/me/loadouts/sync', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: true,
  });
  return r.loadouts;
}

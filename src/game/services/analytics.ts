import { storage } from './storage';
import { getStoredToken, postUserActivityEvent } from './api';

/**
 * 애널리틱스 서비스 — 서버 `user_events` 테이블만 사용 (source of truth).
 *
 * 호출 규약:
 *   logEvent(name, params?)   — 비즈니스 이벤트 (game_start, purchase_success 등)
 *   logClick(name, params?)   — 버튼 클릭 (UI 인터랙션)
 *   logScreen(name, extra?)   — 화면 진입. previous_screen 자동 첨부
 *   logAuthActivity(name, params?) — 인증 이벤트 (auth_success 등)
 *
 * 기록은 fire-and-forget (void). 토큰 없으면(인증 전) 스킵.
 */

type ParamValue = string | number | boolean;
type Params = Record<string, ParamValue>;
type Kind = 'event' | 'click' | 'screen' | 'auth';

let previousScreen: string | null = null;

// 토큰 도착 전(부팅~인증 완료 100~500ms)에 발생한 이벤트를 버퍼링.
// 인증 완료 후 main.tsx 에서 flushActivityQueue() 호출 → 순서대로 전송.
interface QueuedEvent { kind: Kind; name: string; params: Params; ts: number }
const MAX_QUEUE = 64;
const pending: QueuedEvent[] = [];

async function logServerActivity(
  eventKind: Kind,
  eventName: string,
  params: Params = {},
): Promise<void> {
  if (!getStoredToken()) {
    if (pending.length < MAX_QUEUE) {
      pending.push({ kind: eventKind, name: eventName, params, ts: Date.now() });
    }
    return;
  }
  try {
    // 인덱싱 편의를 위해 자주 쓰는 식별자/상태는 별도 컬럼으로 승격
    const eventKey = typeof params.type === 'string' ? params.type
      : typeof params.menu === 'string' ? params.menu
      : typeof params.kind === 'string' ? params.kind
      : typeof params.id === 'string' ? params.id
      : undefined;
    const eventStatus = typeof params.status === 'string' ? params.status
      : eventName.includes('success') ? 'success'
      : eventName.includes('fail') ? 'failed'
      : eventName.includes('skipped') ? 'skipped'
      : undefined;

    await postUserActivityEvent({
      eventKind,
      eventName,
      eventKey,
      eventStatus,
      coinsSnapshot: storage.getNum('coins'),
      gemsSnapshot: storage.getNum('gems'),
      payload: Object.keys(params).length > 0 ? params : undefined,
    });
  } catch (e) {
    console.warn('[Activity]', e);
  }
}

export function logEvent(name: string, params: Params = {}): void {
  void logServerActivity('event', name, params);
}

export function logClick(name: string, params: Params = {}): void {
  void logServerActivity('click', name, params);
}

export function logScreen(name: string, extra: Params = {}): void {
  const prev = previousScreen;
  previousScreen = name;
  const params: Params = prev ? { previous_screen: prev, ...extra } : { ...extra };
  void logServerActivity('screen', name, params);
}

export function logAuthActivity(name: string, params: Params = {}): void {
  void logServerActivity('auth', name, params);
}

/** 현재 마지막으로 진입했던 화면 이름 — app_background 등 부가 이벤트에서 참조. */
export function getCurrentScreenName(): string | null {
  return previousScreen;
}

/**
 * 인증 완료 후 호출 — 부팅 중 버퍼링된 이벤트를 순서대로 flush.
 * 중복 flush 는 이미 빈 큐 탓에 no-op.
 */
export function flushActivityQueue(): void {
  if (!getStoredToken() || pending.length === 0) return;
  const items = pending.splice(0, pending.length);
  for (const e of items) void logServerActivity(e.kind, e.name, { ...e.params, buffered_ms: Date.now() - e.ts });
}

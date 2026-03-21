import { isToss } from '../platform';

/**
 * 애널리틱스 서비스 — 토스 환경에서만 동작, 그 외 무시
 */

export function safeAnalytics(fn: () => void): void {
  if (!isToss()) return;
  try { fn(); } catch { /* 토스 외부 환경에서는 무시 */ }
}

export async function logEvent(name: string, params: Record<string, string | number | boolean> = {}): Promise<void> {
  if (!isToss()) return;
  try {
    const { eventLog } = await import('@apps-in-toss/web-framework');
    eventLog({ log_name: name, log_type: 'event', params });
  } catch { /* 무시 */ }
}

export async function logClick(name: string): Promise<void> {
  if (!isToss()) return;
  try {
    const { Analytics } = await import('@apps-in-toss/web-framework');
    Analytics.click({ log_name: name });
  } catch { /* 무시 */ }
}

export async function logScreen(name: string): Promise<void> {
  if (!isToss()) return;
  try {
    const { Analytics } = await import('@apps-in-toss/web-framework');
    Analytics.screen({ log_name: name });
  } catch { /* 무시 */ }
}

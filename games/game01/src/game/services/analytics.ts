import { isTossNative, isGoogle } from '../platform';

/**
 * 애널리틱스 서비스 — 토스: 토스 SDK, Google: Firebase Analytics
 */

async function firebaseLogEvent(name: string, params: Record<string, string | number | boolean> = {}): Promise<void> {
  const { FirebaseAnalytics } = await import('@capacitor-firebase/analytics');
  await FirebaseAnalytics.logEvent({ name, params });
}

export async function logEvent(name: string, params: Record<string, string | number | boolean> = {}): Promise<void> {
  try {
    if (isTossNative()) {
      const { eventLog } = await import('@apps-in-toss/web-framework');
      eventLog({ log_name: name, log_type: 'event', params });
    } else if (isGoogle()) {
      await firebaseLogEvent(name, params);
    }
  } catch (e) { console.warn('[Analytics]', e); }
}

export async function logClick(name: string): Promise<void> {
  try {
    if (isTossNative()) {
      const { Analytics } = await import('@apps-in-toss/web-framework');
      Analytics.click({ log_name: name });
    } else if (isGoogle()) {
      await firebaseLogEvent('click', { name });
    }
  } catch (e) { console.warn('[Analytics]', e); }
}

export async function logScreen(name: string): Promise<void> {
  try {
    if (isTossNative()) {
      const { Analytics } = await import('@apps-in-toss/web-framework');
      Analytics.screen({ log_name: name });
    } else if (isGoogle()) {
      const { FirebaseAnalytics } = await import('@capacitor-firebase/analytics');
      await FirebaseAnalytics.setCurrentScreen({ screenName: name });
    }
  } catch (e) { console.warn('[Analytics]', e); }
}

import { isTossNative, isGoogle } from '../platform';
import { storage } from './storage';
import { getStoredToken, postUserActivityEvent } from './api';

/**
 * 애널리틱스 서비스 — 토스: 토스 SDK, Google: Firebase Analytics
 */

async function firebaseLogEvent(name: string, params: Record<string, string | number | boolean> = {}): Promise<void> {
  const { FirebaseAnalytics } = await import('@capacitor-firebase/analytics');
  await FirebaseAnalytics.logEvent({ name, params });
}

async function logServerActivity(
  eventKind: 'event' | 'click' | 'screen' | 'auth',
  eventName: string,
  params: Record<string, string | number | boolean> = {},
): Promise<void> {
  if (!getStoredToken()) return;
  try {
    const eventKey = typeof params.type === 'string'
      ? params.type
      : typeof params.menu === 'string'
        ? params.menu
        : typeof params.kind === 'string'
          ? params.kind
          : undefined;
    const eventStatus = typeof params.status === 'string'
      ? params.status
      : eventName.includes('success')
        ? 'success'
        : eventName.includes('fail')
          ? 'failed'
          : eventName.includes('skipped')
            ? 'skipped'
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

function getServerEventPayload(
  eventKind: 'event' | 'click' | 'screen' | 'auth',
  eventName: string,
  params: Record<string, string | number | boolean>,
): {
  eventKind: 'event' | 'auth';
  eventName: string;
  eventKey?: string;
  eventStatus?: string;
  payload?: Record<string, string | number | boolean>;
} | null {
  if (eventKind === 'auth') {
    return {
      eventKind: 'auth',
      eventName,
      eventStatus: eventName.includes('success') ? 'success' : undefined,
      payload: Object.keys(params).length > 0 ? params : undefined,
    };
  }

  if (eventKind !== 'event') return null;

  const adType = typeof params.type === 'string' ? params.type : undefined;
  switch (eventName) {
    case 'ad_rewarded_show':
      return {
        eventKind: 'event',
        eventName: 'ad_show',
        eventKey: adType,
        payload: adType ? { type: adType } : undefined,
      };
    case 'ad_rewarded_complete':
      return {
        eventKind: 'event',
        eventName: 'ad_complete',
        eventKey: adType,
        eventStatus: 'success',
        payload: adType ? { type: adType } : undefined,
      };
    case 'ad_rewarded_failed':
      return {
        eventKind: 'event',
        eventName: 'ad_failed',
        eventKey: adType,
        eventStatus: 'failed',
        payload: Object.keys(params).length > 0 ? params : undefined,
      };
    case 'ad_rewarded_skipped':
      return {
        eventKind: 'event',
        eventName: 'ad_skipped',
        eventKey: adType,
        eventStatus: 'skipped',
        payload: adType ? { type: adType } : undefined,
      };
    case 'attendance_claim':
      return {
        eventKind: 'event',
        eventName,
        eventStatus: 'success',
        payload: Object.keys(params).length > 0 ? params : undefined,
      };
    case 'mission_claim':
      return {
        eventKind: 'event',
        eventName,
        eventStatus: 'success',
        payload: Object.keys(params).length > 0 ? params : undefined,
      };
    default:
      return null;
  }
}

export async function logEvent(name: string, params: Record<string, string | number | boolean> = {}): Promise<void> {
  try {
    const serverEvent = getServerEventPayload('event', name, params);
    if (serverEvent) {
      void logServerActivity(serverEvent.eventKind, serverEvent.eventName, {
        ...(serverEvent.payload ?? {}),
        ...(serverEvent.eventKey ? { type: serverEvent.eventKey } : {}),
        ...(serverEvent.eventStatus ? { status: serverEvent.eventStatus } : {}),
      });
    }
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

export async function logAuthActivity(name: string, params: Record<string, string | number | boolean> = {}): Promise<void> {
  const serverEvent = getServerEventPayload('auth', name, params);
  if (!serverEvent) return;
  await logServerActivity(serverEvent.eventKind, serverEvent.eventName, {
    ...(serverEvent.payload ?? {}),
    ...(serverEvent.eventKey ? { type: serverEvent.eventKey } : {}),
    ...(serverEvent.eventStatus ? { status: serverEvent.eventStatus } : {}),
  });
}

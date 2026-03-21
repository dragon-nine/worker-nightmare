import { Capacitor } from '@capacitor/core';

/**
 * 플랫폼 감지 — 토스 인앱 vs 네이티브 앱 (Capacitor) vs 웹
 */
export type Platform = 'toss' | 'native' | 'web';

export function detectPlatform(): Platform {
  // 토스 인앱 브라우저 감지
  if (typeof navigator !== 'undefined' && /TOSS/i.test(navigator.userAgent)) {
    return 'toss';
  }
  // Capacitor 네이티브 앱 감지
  if (Capacitor.isNativePlatform()) {
    return 'native';
  }
  return 'web';
}

/** 현재 플랫폼 (앱 시작 시 1회 결정) */
export const currentPlatform: Platform = detectPlatform();

export function isToss(): boolean {
  return currentPlatform === 'toss';
}

export function isNative(): boolean {
  return currentPlatform === 'native';
}

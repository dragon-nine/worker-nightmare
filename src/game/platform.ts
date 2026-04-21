/**
 * 플랫폼 감지 — 토스 인앱 vs 구글(웹/네이티브)
 *
 * 테스트: URL에 ?platform=google 또는 ?platform=toss 추가
 * 빌드: VITE_PLATFORM=google npm run build
 */
export type Platform = 'toss' | 'google';

export function detectPlatform(): Platform {
  // 1. 환경변수 (빌드 시 결정)
  const envPlatform = import.meta.env.VITE_PLATFORM;
  if (envPlatform === 'google' || envPlatform === 'toss') return envPlatform;

  // 2. URL 쿼리 파라미터 (테스트용)
  if (typeof window !== 'undefined') {
    const qp = new URLSearchParams(window.location.search).get('platform');
    if (qp === 'google' || qp === 'toss') return qp;
  }

  // 3. 토스 인앱 브라우저 자동 감지
  if (typeof navigator !== 'undefined' && /TOSS/i.test(navigator.userAgent)) {
    return 'toss';
  }

  // 기본값: toss
  return 'toss';
}

const currentPlatform: Platform = detectPlatform();

export function isToss(): boolean {
  return currentPlatform === 'toss';
}

/** 실제 토스 인앱 브라우저인지 (SDK 호출 가능 여부) */
export function isTossNative(): boolean {
  return typeof navigator !== 'undefined' && /TOSS/i.test(navigator.userAgent);
}

export function isGoogle(): boolean {
  return currentPlatform === 'google';
}

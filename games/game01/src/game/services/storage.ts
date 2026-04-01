/**
 * LocalStorage 서비스 — 타입 안전한 키 관리
 */

const KEYS = {
  godMode: 'godMode',
  bgmMuted: 'bgmMuted',
  sfxMuted: 'sfxMuted',
  tutorialDone: 'tutorialDone',
  bestScore: 'bestScore',
} as const;

type BoolKey = 'godMode' | 'bgmMuted' | 'sfxMuted' | 'tutorialDone';

export const storage = {
  getBool(key: BoolKey): boolean {
    return localStorage.getItem(KEYS[key]) === 'true';
  },

  setBool(key: BoolKey, value: boolean): void {
    localStorage.setItem(KEYS[key], String(value));
  },

  removeBool(key: BoolKey): void {
    localStorage.removeItem(KEYS[key]);
  },

  toggleBool(key: BoolKey): boolean {
    const next = !this.getBool(key);
    this.setBool(key, next);
    return next;
  },

  getBestScore(): number {
    return Number(localStorage.getItem(KEYS.bestScore) || '0');
  },

  setBestScore(score: number): void {
    localStorage.setItem(KEYS.bestScore, String(score));
  },

  updateBestScore(score: number): number {
    const best = Math.max(score, this.getBestScore());
    this.setBestScore(best);
    return best;
  },
};

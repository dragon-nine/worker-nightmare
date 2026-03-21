import { registerPlugin } from '@capacitor/core';

export interface PlayGamesPlugin {
  /** Google Play Games 로그인 */
  signIn(): Promise<{ isSignedIn: boolean }>;
  /** 리더보드에 점수 제출 */
  submitScore(options: { leaderboardId: string; score: number }): Promise<void>;
  /** 리더보드 UI 열기 */
  showLeaderboard(options: { leaderboardId: string }): Promise<void>;
}

export const PlayGames = registerPlugin<PlayGamesPlugin>('PlayGames');

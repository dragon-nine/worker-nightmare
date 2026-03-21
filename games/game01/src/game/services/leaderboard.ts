import { isToss } from '../platform';

/**
 * 리더보드 서비스 — 토스 / Google Play Games Services 분기
 */

// ── 토스 리더보드 ──

async function submitToss(score: number): Promise<void> {
  const { submitGameCenterLeaderBoardScore } = await import('@apps-in-toss/web-framework');
  await submitGameCenterLeaderBoardScore({ score: String(score) });
}

function openToss(): void {
  import('@apps-in-toss/web-framework').then(({ openGameCenterLeaderboard }) => {
    openGameCenterLeaderboard();
  });
}

// ── Google Play Games Services ──
// TODO: Google Play Console에서 게임 생성 후 leaderboardId 설정
const GPGS_LEADERBOARD_ID = '';

async function submitGPGS(score: number): Promise<void> {
  if (!GPGS_LEADERBOARD_ID) {
    console.warn('[GPGS] leaderboardId가 설정되지 않았습니다');
    return;
  }
  try {
    const { PlayGames } = await import('../plugins/play-games');
    await PlayGames.submitScore({
      leaderboardId: GPGS_LEADERBOARD_ID,
      score,
    });
  } catch (e) {
    console.warn('[GPGS] 점수 제출 실패:', e);
  }
}

async function openGPGS(): Promise<void> {
  if (!GPGS_LEADERBOARD_ID) {
    console.warn('[GPGS] leaderboardId가 설정되지 않았습니다');
    return;
  }
  try {
    const { PlayGames } = await import('../plugins/play-games');
    await PlayGames.showLeaderboard({ leaderboardId: GPGS_LEADERBOARD_ID });
  } catch (e) {
    console.warn('[GPGS] 리더보드 열기 실패:', e);
  }
}

// ── 공개 API ──

export async function submitScore(score: number): Promise<void> {
  try {
    if (isToss()) {
      await submitToss(score);
    } else {
      await submitGPGS(score);
    }
  } catch {
    // 점수 제출 실패 — 무시
  }
}

export function openLeaderboard(): void {
  if (isToss()) {
    openToss();
  } else {
    openGPGS();
  }
}

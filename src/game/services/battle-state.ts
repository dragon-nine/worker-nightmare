import { storage } from './storage';
import { isBattleMode } from './game-mode';

type CharKey = 'rabbit' | 'penguin' | 'sheep' | 'cat' | 'koala' | 'lion';
type BattleMode = 'bot';
type BattleOutcome = 'win' | 'lose' | 'draw';

interface BotBattleProfile {
  nickname: string;
  character: CharKey;
  paceSeconds: number;
  targetScore: number;
}

export interface BattleHudSnapshot {
  active: boolean;
  mode: BattleMode;
  opponentName: string;
  opponentCharacter: CharKey;
  playerScore: number;
  opponentScore: number;
}

export interface BattleResult {
  mode: BattleMode;
  opponentName: string;
  opponentCharacter: CharKey;
  playerScore: number;
  opponentScore: number;
  outcome: BattleOutcome;
}

const BOT_NAMES = ['칼퇴요정', '야근헌터', '출근러버', '월급루팡', '퇴근전설', '보고서마왕'];
const BOT_CHARACTERS: CharKey[] = ['rabbit', 'penguin', 'sheep', 'cat', 'koala', 'lion'];

let currentBattle: BotBattleProfile | null = null;

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function getBotProgress(elapsed: number, paceSeconds: number): number {
  const t = clamp(elapsed / paceSeconds, 0, 1);
  return 1 - Math.pow(1 - t, 1.28);
}

function createBotProfile(): BotBattleProfile {
  const best = storage.getBestScore();
  const baseTarget = clamp(best > 0 ? Math.round(best * 0.9) : 90, 70, 520);
  const variance = Math.floor(Math.random() * 61) - 20;
  const targetScore = clamp(baseTarget + variance, 60, 560);
  const paceSeconds = clamp(22 + Math.random() * 14, 20, 36);

  return {
    nickname: randomItem(BOT_NAMES),
    character: randomItem(BOT_CHARACTERS),
    targetScore,
    paceSeconds,
  };
}

export function startBotBattle(): void {
  currentBattle = createBotProfile();
}

export function clearBattle(): void {
  currentBattle = null;
}

export function hasActiveBattle(): boolean {
  return currentBattle !== null;
}

export function getBattleHudSnapshot(playerScore: number, elapsed: number): BattleHudSnapshot | null {
  if (!currentBattle || !isBattleMode()) return null;
  const progress = getBotProgress(elapsed, currentBattle.paceSeconds);
  const opponentScore = Math.round(currentBattle.targetScore * progress);
  return {
    active: true,
    mode: 'bot',
    opponentName: currentBattle.nickname,
    opponentCharacter: currentBattle.character,
    playerScore,
    opponentScore,
  };
}

export function settleBattle(playerScore: number, elapsed: number): BattleResult | null {
  if (!currentBattle || !isBattleMode()) return null;
  const progress = getBotProgress(elapsed, currentBattle.paceSeconds);
  const opponentScore = Math.round(currentBattle.targetScore * progress);
  const outcome: BattleOutcome =
    playerScore > opponentScore ? 'win' : playerScore < opponentScore ? 'lose' : 'draw';

  return {
    mode: 'bot',
    opponentName: currentBattle.nickname,
    opponentCharacter: currentBattle.character,
    playerScore,
    opponentScore,
    outcome,
  };
}

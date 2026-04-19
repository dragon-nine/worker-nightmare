export type GameMode = 'normal' | 'battle';

let currentGameMode: GameMode = 'normal';

export function getGameMode(): GameMode {
  return currentGameMode;
}

export function setGameMode(mode: GameMode): void {
  currentGameMode = mode;
}

export function isBattleMode(): boolean {
  return currentGameMode === 'battle';
}

export function resetGameMode(): void {
  currentGameMode = 'normal';
}

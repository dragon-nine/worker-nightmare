export type GameMode = 'normal' | 'battle' | 'stage';

let currentGameMode: GameMode = 'normal';
let currentStageId = 1;

export function getGameMode(): GameMode {
  return currentGameMode;
}

export function setGameMode(mode: GameMode): void {
  currentGameMode = mode;
}

export function isBattleMode(): boolean {
  return currentGameMode === 'battle';
}

export function isStageMode(): boolean {
  return currentGameMode === 'stage';
}

export function getCurrentStageId(): number {
  return currentStageId;
}

export function setCurrentStageId(id: number): void {
  currentStageId = id;
}

export function resetGameMode(): void {
  currentGameMode = 'normal';
  currentStageId = 1;
}

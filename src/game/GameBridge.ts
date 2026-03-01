export interface GameState {
  scene: string;
  stageId?: number;
  progress: number;
  allCleared: boolean;
  stress: number;
  time?: string;
  period?: 'AM' | 'PM';
  successCount?: number;
}

export function emitGameState(state: GameState) {
  window.dispatchEvent(new CustomEvent('game-state', { detail: state }));
}

export function emitJumpToStage(stageIndex: number) {
  window.dispatchEvent(new CustomEvent('jump-to-stage', { detail: { stageIndex } }));
}

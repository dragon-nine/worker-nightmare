export interface GameState {
  scene: string;
  stageId?: number;
  progress: number;
  allCleared: boolean;
}

export function emitGameState(state: GameState) {
  window.dispatchEvent(new CustomEvent('game-state', { detail: state }));
}

import { STAGES } from './data/stages';
import type { MinigameDef } from '../types/game';

class GameManagerClass {
  private clearedStages = new Set<number>();

  clearStage(stageId: number) {
    this.clearedStages.add(stageId);
  }

  isStageCleared(stageId: number): boolean {
    return this.clearedStages.has(stageId);
  }

  isStageUnlocked(stageId: number): boolean {
    if (stageId === 1) return true;
    return this.clearedStages.has(stageId - 1);
  }

  get progress(): number {
    return this.clearedStages.size;
  }

  get allCleared(): boolean {
    return this.clearedStages.size >= STAGES.length;
  }

  getRandomMinigame(stageId: number): MinigameDef {
    const stage = STAGES.find(s => s.id === stageId)!;
    return stage.minigames[Math.floor(Math.random() * stage.minigames.length)];
  }

  reset() {
    this.clearedStages.clear();
  }
}

export const GameManager = new GameManagerClass();

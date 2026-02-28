export interface MinigameDef {
  id: number;
  sceneKey: string;
  name: string;
  description: string;
}

export interface StageDef {
  id: number;
  name: string;
  emoji: string;
  minigames: MinigameDef[];
}

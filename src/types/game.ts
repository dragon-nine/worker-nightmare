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
  time: string;
  period: 'AM' | 'PM';
  bgColor: string;
  minigames: MinigameDef[];
}

export interface ChatMessage {
  sender?: string;
  text: string;
  type: 'left' | 'right' | 'thought' | 'system';
}

export interface NarrativeDef {
  stageIndex: number;
  time: string;
  period: 'AM' | 'PM';
  bgColor: string;
  isPrologue?: boolean;
  messages: ChatMessage[];
}

export interface StageResult {
  stageId: number;
  success: boolean;
}

export type GradeKey = 'sage' | 'pro' | 'burnout' | 'angry' | 'newbie';

export interface Grade {
  key: GradeKey;
  emoji: string;
  title: string;
  comment: string;
}

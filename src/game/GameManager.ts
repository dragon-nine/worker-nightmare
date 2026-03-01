import { STAGES } from './data/stages';
import { NARRATIVES } from './data/narrative';
import type { MinigameDef, StageResult, Grade, NarrativeDef } from '../types/game';

const GRADES: Grade[] = [
  { key: 'sage', emoji: '🏆', title: '해탈한 현자', comment: '직장이 놀이터인 사람' },
  { key: 'pro', emoji: '😊', title: '프로 직장인', comment: '다 해내긴 했는데... 괜찮으세요?' },
  { key: 'burnout', emoji: '🔥', title: '번아웃 전사', comment: '퇴사 사유: 전부 다' },
  { key: 'angry', emoji: '😤', title: '분노의 직장인', comment: '오늘자 퇴사 예정자' },
  { key: 'newbie', emoji: '💀', title: '사회초년생', comment: '첫 출근인가요...?' },
];

class GameManagerClass {
  private _currentStageIndex = 0;
  private _stress = 0;
  private _results: StageResult[] = [];

  get currentStageIndex() { return this._currentStageIndex; }
  get stress() { return this._stress; }
  get results() { return [...this._results]; }

  get successCount(): number {
    return this._results.filter(r => r.success).length;
  }

  get progress(): number {
    return this._results.length;
  }

  get allCleared(): boolean {
    return this._results.length >= STAGES.length;
  }

  get isLastStage(): boolean {
    return this._currentStageIndex >= STAGES.length - 1;
  }

  getCurrentStage() {
    return STAGES[this._currentStageIndex] ?? STAGES[STAGES.length - 1];
  }

  getNarrative(): NarrativeDef {
    return NARRATIVES[this._currentStageIndex] ?? NARRATIVES[NARRATIVES.length - 1];
  }

  getRandomMinigame(stageId: number): MinigameDef {
    const stage = STAGES.find(s => s.id === stageId)!;
    return stage.minigames[Math.floor(Math.random() * stage.minigames.length)];
  }

  recordResult(stageId: number, success: boolean) {
    this._results.push({ stageId, success });
    this._stress = Math.min(100, this._stress + (success ? 5 : 15));
  }

  addStress(amount: number) {
    this._stress = Math.min(100, Math.max(0, this._stress + amount));
  }

  advanceStage() {
    this._currentStageIndex++;
  }

  getGrade(): Grade {
    const s = this.successCount;
    const stress = this._stress;

    if (s === 10 && stress < 50) return GRADES[0]; // 해탈한 현자
    if (s === 10) return GRADES[1]; // 프로 직장인
    if (s >= 7) return GRADES[2]; // 번아웃 전사
    if (s >= 4) return GRADES[3]; // 분노의 직장인
    return GRADES[4]; // 사회초년생
  }

  jumpToStage(index: number) {
    this._currentStageIndex = Math.max(0, Math.min(index, STAGES.length - 1));
  }

  reset() {
    this._currentStageIndex = 0;
    this._stress = 0;
    this._results = [];
  }
}

export const GameManager = new GameManagerClass();

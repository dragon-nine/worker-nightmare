import { STAGES } from '../../game/data/stages';
import type { GameState } from '../../game/GameBridge';
import styles from './LeftPanel.module.css';

interface Props {
  gameState: GameState;
}

export function LeftPanel({ gameState }: Props) {
  const currentStage = STAGES.find(s => s.id === gameState.stageId) ?? null;
  const timeDisplay = gameState.time
    ? `${gameState.time} ${gameState.period ?? ''}`
    : null;

  return (
    <aside className={styles.panel}>
      <div className={styles.card}>
        <div className={styles.cardTitle}>게임 소개</div>
        <p className={styles.description}>
          평범한 직장인의 하루를 처음부터 끝까지 체험하세요.
          아침 7시부터 밤 11시까지, 과연 살아남을 수 있을까?
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>조작법</div>
        <ul className={styles.controlList}>
          <li className={styles.controlItem}>
            <span className={styles.controlKey}>클릭</span>
            터치 / 탭
          </li>
          <li className={styles.controlItem}>
            <span className={styles.controlKey}>길게 누르기</span>
            홀드 액션
          </li>
          <li className={styles.controlItem}>
            <span className={styles.controlKey}>타이밍</span>
            정확한 순간에 터치
          </li>
        </ul>
      </div>

      {currentStage && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>현재 스테이지</div>
          {timeDisplay && (
            <div className={styles.timeDisplay}>{timeDisplay}</div>
          )}
          <div className={styles.currentStage}>
            <span className={styles.stageEmoji}>{currentStage.emoji}</span>
            <div className={styles.stageInfo}>
              <span className={styles.stageLabel}>STAGE {currentStage.id}</span>
              <span className={styles.stageName}>{currentStage.name}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

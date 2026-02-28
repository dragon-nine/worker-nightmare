import { STAGES } from '../../game/data/stages';
import type { GameState } from '../../game/GameBridge';
import styles from './RightPanel.module.css';

interface Props {
  gameState: GameState;
}

export function RightPanel({ gameState }: Props) {
  const { progress } = gameState;
  const percent = (progress / STAGES.length) * 100;

  return (
    <aside className={styles.panel}>
      <div className={styles.card}>
        <div className={styles.cardTitle}>진행도</div>
        <div className={styles.progressList}>
          {STAGES.map((stage) => {
            const cleared = stage.id <= progress;
            const isCurrent = stage.id === progress + 1;

            let dotClass = styles.dotCurrent;
            let nameClass = `${styles.stageName} ${styles.stageNameActive}`;
            let statusClass = styles.statusCurrent;
            let statusText = '도전';

            if (cleared) {
              dotClass = styles.dotCleared;
              nameClass = styles.stageName;
              statusClass = styles.statusCleared;
              statusText = '✓';
            } else if (isCurrent) {
              dotClass = styles.dotCurrent;
              nameClass = `${styles.stageName} ${styles.stageNameActive}`;
              statusClass = styles.statusCurrent;
              statusText = '진행중';
            }

            return (
              <div key={stage.id} className={styles.progressItem}>
                <div className={`${styles.progressDot} ${dotClass}`} />
                <span className={nameClass}>
                  {stage.emoji} {stage.name}
                </span>
                <span className={`${styles.stageStatus} ${statusClass}`}>
                  {statusText}
                </span>
              </div>
            );
          })}
        </div>
        <div className={styles.progressBarOuter}>
          <div
            className={styles.progressBarInner}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>통계</div>
        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{progress}</div>
            <div className={styles.statLabel}>클리어</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{STAGES.length - progress}</div>
            <div className={styles.statLabel}>남은 스테이지</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

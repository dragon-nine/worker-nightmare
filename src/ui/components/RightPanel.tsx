import { STAGES } from '../../game/data/stages';
import { emitJumpToStage } from '../../game/GameBridge';
import type { GameState } from '../../game/GameBridge';
import styles from './RightPanel.module.css';

interface Props {
  gameState: GameState;
}

export function RightPanel({ gameState }: Props) {
  const { progress, stress, successCount } = gameState;
  const stressPercent = Math.floor(stress ?? 0);
  const survived = successCount ?? 0;

  const handleStageClick = (stageIndex: number) => {
    emitJumpToStage(stageIndex);
  };

  return (
    <aside className={styles.panel}>
      {/* 스트레스 게이지 */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>스트레스</div>
        <div className={styles.stressInfo}>
          <span className={styles.stressValue}>{stressPercent}%</span>
          <span className={styles.stressFace}>
            {stressPercent < 30 ? '😊' : stressPercent < 60 ? '😐' : stressPercent < 80 ? '😤' : '🤯'}
          </span>
        </div>
        <div className={styles.progressBarOuter}>
          <div
            className={styles.stressBarInner}
            style={{
              width: `${stressPercent}%`,
              background: stressPercent > 70 ? '#ff0000' : stressPercent > 40 ? '#ff8800' : '#e94560',
            }}
          />
        </div>
      </div>

      {/* 오늘의 하루 타임라인 */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>오늘의 하루</div>
        <div className={styles.progressList}>
          {STAGES.map((stage, i) => {
            const isDone = i < progress;
            const isCurrent = i === progress;

            let dotClass = styles.dotLocked;
            let nameClass = styles.stageName;
            let statusText = '';

            if (isDone) {
              dotClass = styles.dotCleared;
              statusText = '✓';
            } else if (isCurrent) {
              dotClass = styles.dotCurrent;
              nameClass = `${styles.stageName} ${styles.stageNameActive}`;
              statusText = '▶';
            }

            return (
              <div
                key={stage.id}
                className={`${styles.progressItem} ${styles.clickable}`}
                onClick={() => handleStageClick(i)}
                title={`${stage.minigames[0].name} 바로 플레이`}
              >
                <span className={styles.timeLabel}>{stage.time}</span>
                <div className={`${styles.progressDot} ${dotClass}`} />
                <span className={nameClass}>
                  {stage.emoji} {stage.name}
                </span>
                <span className={`${styles.stageStatus} ${isDone ? styles.statusCleared : isCurrent ? styles.statusCurrent : styles.statusLocked}`}>
                  {statusText}
                </span>
                <span className={styles.playBtn}>▶</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 통계 */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>통계</div>
        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{survived}</div>
            <div className={styles.statLabel}>성공</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{progress - survived}</div>
            <div className={styles.statLabel}>실패</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

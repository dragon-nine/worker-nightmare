import { GameContainer } from './GameContainer';
import styles from './PageLayout.module.css';

export function PageLayout() {
  return (
    <div className={styles.mobileContainer}>
      <GameContainer />
      <div className={styles.rotateOverlay}>
        <div className={styles.rotateIcon}>📱</div>
        <p>화면을 세로로 돌려주세요</p>
      </div>
    </div>
  );
}

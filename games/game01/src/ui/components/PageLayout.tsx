import { GameContainer } from './GameContainer';
import styles from './PageLayout.module.css';

export function PageLayout() {
  return (
    <div className={styles.mobileContainer}>
      <GameContainer />
    </div>
  );
}

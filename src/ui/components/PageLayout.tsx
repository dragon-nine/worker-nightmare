import { useViewport } from '../hooks/useViewport';
import { useGameState } from '../hooks/useGameState';
import { Background } from './Background';
import { Header } from './Header';
import { Footer } from './Footer';
import { PhoneFrame } from './PhoneFrame';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { GameContainer } from './GameContainer';
import styles from './PageLayout.module.css';

export function PageLayout() {
  const mode = useViewport();
  const gameState = useGameState();

  // Mobile: game only, no surrounding UI
  if (mode === 'mobile') {
    return (
      <div className={styles.mobileContainer}>
        <GameContainer />
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <Background />
      <Header />
      <div className={styles.body}>
        {mode === 'desktop' && <LeftPanel gameState={gameState} />}
        <div className={styles.phoneWrapper}>
          <PhoneFrame>
            <GameContainer />
          </PhoneFrame>
        </div>
        {mode === 'desktop' && <RightPanel gameState={gameState} />}
      </div>
      <Footer />
    </div>
  );
}

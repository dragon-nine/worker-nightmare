import { useState, useCallback } from 'react';
import { gameBus } from '../../game/event-bus';
import { storage } from '../../game/services/storage';
import { DESIGN_W } from '../../game/layout-types';
import { LayoutRenderer } from '../components/LayoutRenderer';
import { getRandomChallengeQuote } from '../../game/challenge-quotes';
import type { ScreenLayoutJSON } from '../types/screen-layout';
import challengeLayout from '../../../public/layout/challenge.json';
import styles from './overlay.module.css';

const MAX_W = 500;
const scale = Math.min(window.innerWidth, MAX_W) / DESIGN_W;

const IMAGE_MAP: Record<string, string> = {
  'el-mn77g1az-eah6': 'challenge/challenge-rabbit.png',
};

interface Props {
  score: number;
  onClose: () => void;
}

export function ChallengeOverlay({ score, onClose }: Props) {
  const bestScore = storage.getBestScore();
  const isNewRecord = score >= bestScore && bestScore > 0;
  const [message, setMessage] = useState(() => getRandomChallengeQuote(score, isNewRecord));

  const handleRefresh = useCallback(() => {
    gameBus.emit('play-sfx', 'sfx-click');
    setMessage(getRandomChallengeQuote(score, isNewRecord));
  }, [score, isNewRecord]);

  const handleCTA = useCallback(() => {
    gameBus.emit('play-sfx', 'sfx-click');
    alert('카카오톡 공유 기능은 추후 연동 예정입니다.');
  }, []);

  const handleClose = useCallback(() => {
    gameBus.emit('play-sfx', 'sfx-click');
    onClose();
  }, [onClose]);

  return (
    <div
      className={`${styles.overlay} ${styles.fadeIn}`}
      style={{ zIndex: 200 }}
      onClick={handleClose}
    >
      <div className={styles.dim} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        <LayoutRenderer
          elements={(challengeLayout as ScreenLayoutJSON).elements}
          scale={scale}
          screenW={Math.min(window.innerWidth, MAX_W)}
          screenH={window.innerHeight}
          screenPadding={(challengeLayout as ScreenLayoutJSON).padding}
          groupVAlign={(challengeLayout as ScreenLayoutJSON).groupVAlign || 'center'}
          imageMap={IMAGE_MAP}
          textOverrides={{
            'el-mn77cn6d-10ow': `${score}`,
            'el-mn77d2bq-63xr': message,
          }}
          clickHandlers={{
            'el-ch-btn-refresh': handleRefresh,
            'el-mn77csp4-zktq': handleCTA,
          }}
        />
      </div>
    </div>
  );
}

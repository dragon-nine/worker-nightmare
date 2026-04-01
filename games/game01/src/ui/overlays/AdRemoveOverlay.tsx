import { useCallback, useState } from 'react';
import { gameBus } from '../../game/event-bus';
import { DESIGN_W } from '../../game/layout-types';
import { LayoutRenderer } from '../components/LayoutRenderer';
import type { ScreenLayoutJSON } from '../types/screen-layout';
import { purchaseAdRemove } from '../../game/services/billing';
import adRemoveLayout from '../../../public/layout/ad-remove.json';
import styles from './overlay.module.css';

const MAX_W = 500;
const scale = Math.min(window.innerWidth, MAX_W) / DESIGN_W;

interface Props {
  onClose: () => void;
}

export function AdRemoveOverlay({ onClose }: Props) {
  const [purchasing, setPurchasing] = useState(false);

  const handleClose = useCallback(() => {
    gameBus.emit('play-sfx', 'sfx-click');
    onClose();
  }, [onClose]);

  const handlePurchase = useCallback(async () => {
    if (purchasing) return;
    gameBus.emit('play-sfx', 'sfx-click');
    setPurchasing(true);
    try {
      const success = await purchaseAdRemove();
      if (success) {
        onClose();
        // 광고 제거 완료 — 다음 광고부터 적용
      }
    } finally {
      setPurchasing(false);
    }
  }, [purchasing, onClose]);

  return (
    <div
      className={`${styles.overlay} ${styles.fadeIn}`}
      style={{ zIndex: 200 }}
      onClick={handleClose}
    >
      <div className={styles.dim} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        <LayoutRenderer
          elements={(adRemoveLayout as ScreenLayoutJSON).elements}
          scale={scale}
          screenW={Math.min(window.innerWidth, MAX_W)}
          screenH={window.innerHeight}
          screenPadding={(adRemoveLayout as ScreenLayoutJSON).padding}
          groupVAlign={(adRemoveLayout as ScreenLayoutJSON).groupVAlign || 'center'}
          clickHandlers={{
            'el-mn7e58qt-fdki': handlePurchase,
          }}
        />
      </div>
    </div>
  );
}

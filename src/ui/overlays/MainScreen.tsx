import { useEffect, useState } from 'react';
import { gameBus } from '../../game/event-bus';
import { logScreen } from '../../game/services/analytics';
import { adService } from '../../game/services/ad-service';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { BottomTabBar, type HomeTab as TabKey } from './home/BottomTabBar';
import { HomeTab } from './home/HomeTab';
import { ShopTab } from './home/ShopTab';
import { CharactersTab } from './home/CharactersTab';
import { RankingTab } from './home/RankingTab';
import styles from './overlay.module.css';

export function MainScreen() {
  const scale = useResponsiveScale();
  const [tab, setTab] = useState<TabKey>('home');

  // 홈 탭 진입 시 현재 탭 화면 추적 (GameContainer의 screen_main 이후에 로깅)
  useEffect(() => {
    logScreen(`screen_main_${tab}`);
  }, [tab]);

  const handleTabChange = (next: TabKey) => {
    if (next === tab) return;
    gameBus.emit('play-sfx', 'sfx-click');
    // 상점 진입 시 무료 코인/보석 광고 미리 로드 — 카드 탭 시 즉시 표시
    if (next === 'shop') {
      adService.preload('gem');
      adService.preload('coin');
    }
    setTab(next);
  };

  return (
    <div
      className={styles.overlay}
      style={{
        // 페이지 베이스 — 홈 탭은 자체 배경을 덮어씌움
        background: '#0a0a14',
      }}
    >
      {/* ── 탭 컨텐츠 (배경 + 탭별 헤더 포함) ── */}
      {tab === 'home' && <HomeTab scale={scale} />}
      {tab === 'shop' && <ShopTab scale={scale} />}
      {tab === 'ranking' && <RankingTab scale={scale} />}
      {tab === 'characters' && <CharactersTab scale={scale} />}

      {/* ── 하단 탭바 ── */}
      <BottomTabBar active={tab} onChange={handleTabChange} scale={scale} />
    </div>
  );
}

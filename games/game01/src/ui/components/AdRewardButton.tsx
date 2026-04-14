import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { TapButton } from './TapButton';
import { adService, type AdRewardType } from '../../game/services/ad-service';
import { gameBus } from '../../game/event-bus';
import { storage } from '../../game/services/storage';

interface Props {
  /**
   * 광고 시청 완료 시 호출.
   * 실제 보상 지급(잔액 충전, 토스트 등)은 이 콜백에서.
   */
  onReward: () => void;
  /** 리워드 타입 — adGroupId 결정. 기본 'gem' */
  rewardType?: AdRewardType;
  /** 자식 요소 — 카드 안의 시각적 컨텐츠. TapButton과 동일하게 사용. */
  children?: ReactNode;
  /** 추가 스타일 */
  style?: CSSProperties;
  /** className */
  className?: string;
  /** 누름 효과 강도 (기본 0.95) */
  pressScale?: number;
  /** 스크롤 컨테이너 안에 있을 때 */
  scrollSafe?: boolean;
  /**
   * 스킵 시 토스트 메시지. 기본 "광고를 끝까지 봐주세요".
   * null로 전달하면 토스트 비활성화.
   */
  skippedToast?: string | null;
  /**
   * 실패 시 토스트 메시지. 기본 "광고를 불러올 수 없어요".
   */
  failedToast?: string | null;
  /** 마운트 시 자동으로 광고 preload (기본 true) */
  autoPreload?: boolean;
}

/**
 * 광고 보기 → 보상 지급 흐름을 한 컴포넌트로 추상화.
 *
 * 사용:
 * ```tsx
 * <AdRewardButton rewardType="gem" onReward={() => storage.addNum('gems', 5)}>
 *   <YourCardContent />
 * </AdRewardButton>
 * ```
 *
 * 내부 동작:
 * 1. 마운트 시 adService.preload(rewardType) (광고 미리 로드)
 * 2. 탭 시 adService.showRewarded(rewardType) 호출
 * 3. 결과별 분기:
 *    - 'rewarded' → onReward() 호출
 *    - 'skipped'  → 안내 토스트
 *    - 'failed'   → 실패 토스트
 */
export function AdRewardButton({
  onReward,
  rewardType = 'gem',
  children,
  style,
  className,
  pressScale = 0.95,
  scrollSafe = false,
  skippedToast = '광고를 끝까지 봐주세요',
  failedToast = '광고를 불러올 수 없어요',
  autoPreload = true,
}: Props) {
  // 마운트 시 광고 preload
  useEffect(() => {
    if (autoPreload) adService.preload(rewardType);
  }, [autoPreload, rewardType]);

  const handleTap = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    adService.showRewarded(rewardType, (result) => {
      if (result.kind === 'rewarded') {
        storage.recordAdWatched();
        onReward();
      } else if (result.kind === 'skipped') {
        if (skippedToast) gameBus.emit('toast', skippedToast);
      } else {
        if (failedToast) gameBus.emit('toast', failedToast);
      }
    });
  };

  return (
    <TapButton
      onTap={handleTap}
      style={style}
      className={className}
      pressScale={pressScale}
      scrollSafe={scrollSafe}
    >
      {children}
    </TapButton>
  );
}

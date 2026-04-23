/**
 * RivalCard 에 넣을 격려 메시지 계산 — 게임오버/이어서 도전 양쪽에서 공용.
 *
 * 톤 분리:
 *   - gameover: "잘했어요" 계열 칭찬/격려 톤. 결과 화면에서 다음 판 의지 유도.
 *   - revive : "더 가자" 도전/액션 톤. 부활 버튼 동기 유발.
 *
 * 우선순위: Rival Chase (서버 일간 랭킹 바로 위 유저) > PB 폴백.
 * 네트워크 실패/지연에도 빈 상태 없게 PB 메시지를 즉시 세팅 → 응답 시 rival 로 갱신.
 *
 * ※ 순수 계산 함수만 모아둠. 컴포넌트는 `./RivalCard` — 분리 이유는 vite-react Fast Refresh 호환
 *   (한 파일이 컴포넌트 + 헬퍼를 같이 export 하면 HMR 시 전체 invalidate).
 */

export type RivalMessage = {
  kind: 'rival' | 'top' | 'pb-new' | 'pb-close' | 'pb-none';
  title: string;
  subtitle?: string;
};

export type RivalContext = 'gameover' | 'revive';

/** Rival Chase — 내 위 랭커가 있을 때 */
export function computeRivalMessage(nickname: string, gap: number, context: RivalContext): RivalMessage {
  if (context === 'gameover') {
    return {
      kind: 'rival',
      title: '거의 다 왔어요! 🔥',
      subtitle: `${nickname} 점수까지 ${gap}점!`,
    };
  }
  // revive
  return {
    kind: 'rival',
    title: `${gap}점만 더 획득하고`,
    subtitle: `${nickname} 점수 도전?`,
  };
}

/** 1등 (위 랭커 없음) */
export function computeTopMessage(context: RivalContext): RivalMessage {
  return context === 'gameover'
    ? { kind: 'top', title: '오늘의 1등 👑', subtitle: '자리 굳혀봅시다' }
    : { kind: 'top', title: '오늘의 1등 👑', subtitle: '부활해서 굳히기' };
}

/** 이번 판이 rival 을 이미 넘은 경우 (gap <= 0) */
export function computeSurpassMessage(context: RivalContext): RivalMessage {
  return context === 'gameover'
    ? { kind: 'pb-new', title: '순위 상승! 🎉', subtitle: '기세 타서 한 판 더!' }
    : { kind: 'pb-new', title: '순위 상승! 🎉', subtitle: '부활해서 더 올라가요' };
}

/** PB 기반 폴백 — 랭킹 로드 전/실패 시 즉시 표시 */
export function computePbMessage(score: number, bestScore: number, context: RivalContext): RivalMessage {
  const isNew = score >= bestScore && score > 0;
  const gap = Math.max(0, bestScore - score);
  if (context === 'gameover') {
    if (bestScore === 0) return { kind: 'pb-none', title: '첫 판 잘 버텼어요!', subtitle: '이제 시작이에요, 한 판 더' };
    if (isNew) return { kind: 'pb-new', title: '최고기록 갱신! 🎯', subtitle: '기세 탔어요, 한 판 더!' };
    return { kind: 'pb-close', title: '아쉬워요! 🫢', subtitle: `최고기록까지 ${gap}점만 더!` };
  }
  // revive
  if (bestScore === 0) return { kind: 'pb-none', title: '첫 판 완료!', subtitle: '부활해서 감 잡아봐요' };
  if (isNew) return { kind: 'pb-new', title: '최고기록 갱신! 🔥', subtitle: '부활해서 기세 이어가자' };
  return { kind: 'pb-close', title: `최고기록까지 ${gap}점!`, subtitle: '부활하면 바로 넘어요' };
}

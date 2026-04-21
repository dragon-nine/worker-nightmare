/**
 * HUD 라이브 상태 — GameplayHUD가 언마운트/재마운트(부활 흐름)될 때
 * 0으로 초기화되며 순간적으로 깜빡이는 것을 막기 위한 캐시.
 *
 * 이벤트 버스는 순수 pub/sub이라 과거 값을 재전송하지 않으므로,
 * 새로 마운트된 구독자는 다음 emit이 올 때까지 초기값을 보게 된다.
 * 여기 값을 사용해 useState 초기값을 공급한다.
 */
let score = 0;
let coins = 0;

export const hudState = {
  getScore: () => score,
  getCoins: () => coins,
  setScore: (v: number) => { score = v; },
  setCoins: (v: number) => { coins = v; },
  /** 새 게임 시작 시 호출 */
  reset: () => { score = 0; coins = 0; },
};

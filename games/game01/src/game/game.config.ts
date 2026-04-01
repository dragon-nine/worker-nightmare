/**
 * 게임별 설정 — game02 복제 시 이 파일만 수정하면 됨
 */

export const gameConfig = {
  /** 게임 ID (레이아웃 로더, 에셋 경로에 사용) */
  gameId: 'game01',

  /** 게임 제목 */
  title: '직장인 잔혹사',

  /** 하우스 광고 문구 */
  houseAdText: '직장인 잔혹시를\n홈 화면에 추가해보세요!',

  /** Google Play Games 리더보드 ID */
  gpgsLeaderboardId: 'CgkIqPj85N0LEAIQAA',

  /** AdMob 보상형 광고 단위 ID */
  admobRewardedAdUnitId: 'ca-app-pub-3788530115276232/7954231034',

  /** 에셋 매니페스트 */
  assets: {
    images: [
      ['tile-straight', 'map/straight.png'],
      ['tile-corner-tl', 'map/corner-tl.png'],
      ['tile-corner-tr', 'map/corner-tr.png'],
      ['tile-corner-bl', 'map/corner-bl.png'],
      ['tile-corner-br', 'map/corner-br.png'],
      ['tile-road-start', 'map/road-start.png'],
      ['bg-1', 'background/bg-1.jpg'],
      ['bg-2', 'background/bg-2.jpg'],
      ['bg-3', 'background/bg-3.jpg'],
      ['bg-4', 'background/bg-4.jpg'],
      ['bg-5', 'background/bg-5.jpg'],
      ['bg-6', 'background/bg-6.jpg'],
      ['rabbit-front', 'character/rabbit-front.png'],
      ['rabbit-back', 'character/rabbit-back.png'],
      ['rabbit-side', 'character/rabbit-side.png'],
      ['btn-forward', 'ui/btn-forward.png'],
      ['btn-switch', 'ui/btn-switch.png'],
      ['btn-pause', 'ui/btn-pause.png'],
      ['gauge-empty', 'ui/gauge-empty.png'],
      ['gauge-full', 'ui/gauge-full.png'],
      ['go-rabbit', 'game-over-screen/gameover-rabbit.png'],
    ] as [string, string][],
    audio: [
      ['bgm-menu', 'audio/bgm/menu.mp3'],
      ['sfx-click', 'audio/sfx/click.ogg'],
      ['sfx-switch', 'audio/sfx/switch.ogg'],
      ['sfx-forward', 'audio/sfx/forward.ogg'],
      ['sfx-crash', 'audio/sfx/crash.ogg'],
      ['sfx-combo', 'audio/sfx/combo.ogg'],
      ['sfx-timer-warning', 'audio/sfx/timer-warning.ogg'],
      ['sfx-game-over', 'audio/sfx/game-over.ogg'],
    ] as [string, string][],
  },
} as const;

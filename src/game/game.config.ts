/**
 * 게임별 설정 — game02 복제 시 이 파일만 수정하면 됨
 */

export const gameConfig = {
  /** 게임 ID (레이아웃 로더, 에셋 경로에 사용) */
  gameId: 'game01',

  /** 게임 제목 */
  title: '직장인 잔혹사',

  /** Google Play Games 리더보드 ID */
  gpgsLeaderboardId: 'CgkIqPj85N0LEAIQAA',

  /** AdMob 보상형 광고 단위 ID (리워드 타입별) */
  admobAdUnitIds: {
    revive: 'ca-app-pub-3788530115276232/7954231034',
    gem:    'ca-app-pub-3788530115276232/7954231034',
    coin:   'ca-app-pub-3788530115276232/7954231034',
    coin2x: 'ca-app-pub-3788530115276232/7954231034',
  },

  /** 토스 보상형 광고 그룹 ID (콘솔에서 리워드 타입별 발급) */
  tossAdGroupIds: {
    revive: 'ait.v2.live.ee6fbe56b6d94778',
    gem:    'ait.v2.live.b656de3993f1428b',
    coin:   'ait.v2.live.385454088e194ab5',
    coin2x: 'ait.v2.live.385454088e194ab5',
  },

  /** 토스 인앱결제 상품 SKU (콘솔에서 등록) */
  tossIap: {
    /** 부활 광고 제거 — ₩1,980 */
    adRemove: 'ait.0000022726.795abd69.150c18aa70.5694726938',
    /** 보석 30개 — ₩1,100 */
    gem30:    'ait.0000022726.a2d13fdb.2fdad31ef1.5907389658',
    /** 보석 165개 (보너스 +15) — ₩5,500 */
    gem165:   'ait.0000022726.44e0f6c3.86ad0c1970.5907417978',
    /** 보석 500개 (보너스 +100) — ₩11,000 */
    gem500:   'ait.0000022726.fbba5e9d.661613997b.5907452732',
  },

  /**
   * 공유 시 사용할 스토어 / 딥링크 URL (플랫폼별).
   * - google: Google Play 스토어 URL
   * - tossDeepLink: 토스 미니앱 딥링크 (`intoss://<appName>` 형식)
   *   → Toss SDK의 getTossShareLink()로 웹 공유 가능 링크로 변환 후 share()에 전달
   *   → appName은 granite.config.ts의 appName과 동일해야 함 ('worker-nightmare')
   */
  shareUrl: {
    google: 'https://play.google.com/store/apps/details?id=com.dragonnine.game01',
    tossDeepLink: 'intoss://worker-nightmare',
  },

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
      ['penguin-front', 'character/penguin-front.png'],
      ['penguin-back', 'character/penguin-back.png'],
      ['penguin-side', 'character/penguin-side.png'],
      ['sheep-front', 'character/sheep-front.png'],
      ['sheep-back', 'character/sheep-back.png'],
      ['sheep-side', 'character/sheep-side.png'],
      ['cat-front', 'character/cat-front.png'],
      ['cat-back', 'character/cat-back.png'],
      ['cat-side', 'character/cat-side.png'],
      ['lion-front', 'character/lion-front.png'],
      ['lion-back', 'character/lion-back.png'],
      ['lion-side', 'character/lion-side.png'],
      ['koala-front', 'character/koala-front.png'],
      ['koala-back', 'character/koala-back.png'],
      ['koala-side', 'character/koala-side.png'],
      ['btn-forward', 'ui/btn-forward.png'],
      ['btn-switch', 'ui/btn-switch.png'],
      ['btn-pause', 'ui/btn-pause.png'],
      ['gauge-empty', 'ui/gauge-empty.png'],
      ['gauge-full', 'ui/gauge-full.png'],
      ['go-rabbit', 'game-over-screen/gameover-rabbit.png'],
      ['coin', 'items/coin.png'],
    ] as [string, string][],
    /** 스프라이트시트 (가로 배치): [key, path, frameWidth, frameHeight, frameCount]. 자동으로 `${key}-walk` 루프 anim 생성 */
    spritesheets: [
      ['rabbit-back', 'character/rabbit-back.png', 512, 512, 3],
      ['rabbit-side', 'character/rabbit-side.png', 512, 512, 3],
      ['rabbit-dust-fwd', 'character/rabbit-dust-fwd.png', 512, 512, 4],
      ['rabbit-dust-side', 'character/rabbit-dust-side.png', 512, 512, 4],
    ] as [string, string, number, number, number][],
    svgs: [] as [string, string, number, number][],
    audio: [
      ['bgm-menu', 'audio/bgm/menu.mp3'],
      ['sfx-click', 'audio/sfx/click.ogg'],
      ['sfx-switch', 'audio/sfx/switch.ogg'],
      ['sfx-forward', 'audio/sfx/forward.ogg'],
      ['sfx-crash', 'audio/sfx/crash.ogg'],
      ['sfx-coin', 'audio/sfx/coin.ogg'],
      ['sfx-timer-warning', 'audio/sfx/timer-warning.ogg'],
      ['sfx-game-over', 'audio/sfx/game-over.ogg'],
      ['sfx-reward', 'audio/sfx/reward.wav'],
    ] as [string, string][],
  },
} as const;

# 직장인 잔혹사 (game01)

2레인 도로 러너 게임. Phaser 3 + React 하이브리드.

## 게임 정보
- 이름: "직장인 잔혹사"
- 장르: 2레인 도로 러너
- 기준 해상도: 390×844 (iPhone 14)

## 현재 상태
- 게임플레이: Phaser 3 (CommuteScene)
- UI 화면: React DOM 오버레이 (MainScreen, GameOverScreen, PauseOverlay, SettingsOverlay, GameplayHUD)
- 서버 API: Dragon Nine API 연동 (인증/점수/리더보드/보상/프로필)
- 캐릭터 6종: rabbit(기본), penguin(1500coin), sheep(2500coin), cat(4500coin), koala(6000coin), lion(150gem)

## 주요 파일
- `src/game/config.ts` — Phaser 설정
- `src/game/scenes/BootScene.ts` — 에셋 프리로드 + BGM
- `src/game/scenes/CommuteScene.ts` — 게임플레이 로직
- `src/game/layout-types.ts` — 레이아웃 엔진 (computeLayout)
- `src/game/layout-loader.ts` — 레이아웃 JSON 로드
- `src/game/default-layouts.ts` — 기본 레이아웃 값
- `src/game/HUD.ts` — 타이머/점수 로직 → React HUD로 전달
- `src/game/Player.ts` / `Road.ts` — 게임 로직
- `src/ui/overlays/` — React UI 오버레이들
- `src/game/services/api.ts` — Dragon Nine API 클라이언트 (인증/점수/리더보드/프로필)
- `src/game/services/rewards.ts` — 랭킹 보상 정책 (getReward) + 기간 키 유틸

## 에셋 경로
```
public/
├── main-screen/      — main-bg, main-text, main-btn
├── game-over-screen/ — gameover-rabbit, btn-revive/home/challenge/ranking
├── character/        — {rabbit,penguin,sheep,cat,koala,lion}-{front,back,side}.png
├── map/              — straight, corner tiles
├── ui/               — btn-pause, btn-forward, btn-switch, gauge
├── background/       — game-bg
├── audio/bgm/        — menu.mp3
├── audio/sfx/        — click, switch, forward, crash, combo, timer-warning, game-over
└── layout/           — main-screen.json, game-over.json, gameplay.json
```

## 레이아웃 시스템
- 그룹 요소: order 순 세로 배치, gapPx 간격 (마이너스 허용), 화면 중앙 정렬
- 앵커 요소: 화면 모서리 기준 offset
- 모든 px는 `screenWidth / 390` 비율로 스케일
- admin 에디터에서 조절 → `public/layout/{screen}.json` 저장
- 텍스트 fontSize도 같은 비율로 스케일링 필요

## Phaser 설정
- antialias: true, roundPixels: false
- resolution: devicePixelRatio (레티나 지원)
- 모든 텍스처에 LINEAR 필터 적용
- 에셋 크기: 표시 크기의 2~3x 준비

## Cloudflare R2 Storage
- bucket: dragon-nine
- public URL: https://pub-a6e8e0aec44d4a69ae3ed4e096c5acc5.r2.dev
- 경로: game01/{category}/{filename}

## 서버 연동 (Dragon Nine API)
- API: https://dragon-nine-api.dragonnine.workers.dev
- 인증: 앱 부팅 시 `ensureAuth()` (main.tsx) → 토큰 localStorage 저장, 401 자동 재인증
- 토스 유저키: `getUserKeyForGame()` 로 toss_user_id 링크 (기기변경 대응)
- 점수 제출: 게임오버 시 `submitApiScore()` (GameLifecycle.ts)
- 리더보드: RankingModal (홈+게임오버), skeleton 로딩, 탭 15초 메모리 캐시
- 보상: 홈 진입 시 `fetchMyRanks()` → 로컬 코인/보석 적립 (reward.lastDailyKey/lastWeeklyKey)
- 프로필 싱크: 닉네임(서버 자동발급), 캐릭터(선택/구매 시 PATCH), 보유목록(부팅 시 union), 베스트점수(로컬>서버 시 PATCH)
- 닉네임 규칙: 한글/영어/숫자 1~8자, 공백·특수문자 불가
- crypto.randomUUID 폴백: 토스 샌드박스/구 WebView 대응

## 토스 앱인토스
- 빌드: `npm run build:toss` (ait build)
- 개발: `npm run dev:toss` (granite dev, port 8081+5173)
- 배포: `npx ait deploy` (API 키 필요)

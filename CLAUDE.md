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
- 레이아웃 정의는 `public/layout/{screen}.json`
- 텍스트 fontSize도 같은 비율로 스케일링 필요

## Phaser 설정
- antialias: true, roundPixels: false
- resolution: devicePixelRatio (레티나 지원)
- 모든 텍스처에 LINEAR 필터 적용
- 에셋 크기: 표시 크기의 2~3x 준비

## 입력 처리 규약 (중요)
- **DOM 요소 탭은 반드시 TapButton / TapDiv / useNativeTap 경유**. raw `onClick` 금지 (Galaxy WebView 가 React 합성 이벤트를 2번 발사하는 버그).
- 용도별: 버튼(press 애니 필요)=`TapButton`, 게임 인풋(즉시 발사)=`TapButton rapid`, 클릭 가능한 div(자체 press 연출)=`TapDiv`
- 커스텀 컴포넌트 prop (`<StartButton onClick={...} />`) 은 허용 — 내부가 위 셋 중 하나 경유하면 됨
- ESLint `no-restricted-syntax` 룰로 소문자 DOM 태그의 `onClick` 차단. 불가피한 예외는 `// eslint-disable-next-line no-restricted-syntax -- 사유` 로 명시

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

## 최근 작업 메모 (2026-04-19)
- 홈:
  - 시작 버튼 등장 타이밍을 다른 에셋과 동일하게 정리
  - 대전 메뉴 추가, 아이콘/색상 노란 번개로 정리
- 대전 모드:
  - `normal` / `battle` 모드 분리 (`src/game/services/game-mode.ts`)
  - 봇 상대 전용 상태 추가 (`src/game/services/battle-state.ts`)
  - 홈에서 `대전` 탭 시 봇 대전으로 바로 진입
  - 카운트다운 `3-2-1` 후 자동 시작
  - 대전 시간은 현재 `30초`
  - 대전에서는 코인 획득/코인 HUD 없음
  - 잘못된 입력은 즉사 대신 패널티(짧은 멈춤/흔들림/복귀)
  - 패널티 후 캐릭터가 올바른 방향을 다시 보도록 수정
  - 좌측 세로 대전 진행 바 추가
- 대전 결과:
  - 일반 게임오버/부활 흐름과 분리
  - 전용 결과 화면에서 `WIN / LOSE / DRAW`, 거리 차이, 내 닉네임/상대 정보 표시
  - 이긴 카드 하이라이트 추가
  - 하단 버튼은 기존 게임오버 버튼 스타일 재사용
- 배포:
  - 커밋: `df4c1ea` `feat: add bot battle mode flow`
  - 브랜치 `1.2.0` 원격 푸시 완료
  - Apps in Toss 재빌드 후 배포 완료
  - deploymentId: `019da4a0-6037-7e75-857c-a2917e2958f2`

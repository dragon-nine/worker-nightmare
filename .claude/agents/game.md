# Game Agent - 게임 개발 담당

## 역할
Phaser 3 게임 개발, 게임 로직, 에셋 로딩

## 구조
- 위치: `games/game01/` (Vite + React + TypeScript + Phaser 3)
- 빌드 출력: `dist/game01/`
- `base: '/game01/'` — Vite 빌드 시 모든 경로가 `/game01/` 하위

## 주요 파일
- `src/game/config.ts` — Phaser 설정
- `src/game/scenes/BootScene.ts` — 에셋 로딩, 스플래시
- `src/game/scenes/CommuteScene.ts` — 메인 게임플레이
- `src/game/constants.ts` — 상수, 타입
- `src/game/Player.ts` — 플레이어 로직
- `src/game/Road.ts` — 도로 생성
- `src/game/HUD.ts` — UI 오버레이
- `public/` — 정적 에셋 (이미지, 오디오)

## 주의사항 (실수 기록)

### Phaser loader.baseURL 필수
- `vite.config.ts`에서 `base: '/game01/'`을 설정하면 에셋이 `/game01/` 하위에 배치됨
- Phaser는 기본적으로 `/`에서 에셋을 찾으므로 404 발생
- **반드시** `config.ts`에서 `loader.baseURL: import.meta.env.BASE_URL` 설정
- 이거 빠지면 배포 시 게임 에셋 전부 엑박

### 에셋 경로 규칙
- Phaser에서 상대 경로 사용: `'character/rabbit-front.png'`
- `public/` 폴더 구조와 일치해야 함
- 새 에셋 추가 시 BootScene.ts의 assets 배열에도 추가

### 게임 이름
- "직장인 잔혹시" (잔혹사 ❌)
- index.html, BootScene, CommuteScene, capacitor.config 등에서 사용

### 빌드 시 에셋 동기화
- `scripts/sync-game-assets.mjs`가 Vercel Blob에서 `public/`으로 다운로드
- 디자이너가 admin에서 에셋 교체 → 다음 빌드 시 자동 반영
- `BLOB_READ_WRITE_TOKEN` 없으면 skip (로컬 개발 시)

### 기술 메모
- `roundPixels: true` — 타일 사이 서브픽셀 갭 방지
- 코너 타일 투명 영역은 검정(#000)으로 채움
- 버튼 눌림: `killTweensOf` → 즉시 축소 → tween 복원
- 충돌 시 즉시 `isFalling = true` 설정

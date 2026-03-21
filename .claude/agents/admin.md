# Admin Agent - 어드민 페이지 담당

## 역할
Admin 페이지 UI/UX 개발, 에셋 관리 기능

## 구조
- 위치: `admin/` (Vite + React + TypeScript)
- 빌드 출력: `dist/admin/`
- `base: '/admin/'` — 모든 경로가 `/admin/` 하위

## 사이드바 레이아웃
- emoji-collector 프로젝트(`/Users/dan/Documents/HIT/emoji-collector`)의 AdminApp.tsx 패턴 참고
- 왼쪽 사이드바(240px) + 오른쪽 콘텐츠 영역
- 게임별로 메뉴 그룹핑 (game01, game02...)
- 각 게임 그룹: 에셋 관리, 에셋 프리뷰, Google Play, 토스 인앱, 게임으로 이동
- URL 파라미터: `?page=game01-assets` 형태로 탭 유지

## 주의사항 (실수 기록)

### 로컬 vs 배포 환경 구분
- 로컬 에셋(`/game-assets/...`)은 로컬 dev에서만 서빙됨
- 배포 환경에서 로컬 에셋 경로를 쓰면 **엑박** 발생
- `apiAvailable` 플래그로 구분: API 응답 성공 → Blob 에셋만 표시
- 로딩 중에는 **shimmer 스켈레톤** 표시, 엑박 절대 노출 금지

### 이미지 로딩 처리
- `LazyImage` 컴포넌트 사용: loading → shimmer, error → 에러 표시
- Blob 목록 API 응답 전까지 이미지 렌더 금지 (loaded 상태 체크)
- 에셋 프리뷰 탭도 Blob URL을 먼저 로드한 후 렌더링

### UI 원칙 (사용자 피드백)
- 탭이 아닌 **사이드바** 레이아웃 사용
- 카테고리는 기본 **펼침** 상태
- 기존 에셋 먼저 보여주고, 추가(+) 버튼은 카테고리 헤더에
- 이미지 교체는 **이미지 클릭** → 호버 시 "클릭하여 교체" 오버레이
- 별도 교체 버튼(↻) 금지 — UX가 안 좋다는 피드백
- "로컬" 뱃지 표시 금지
- 게임으로 이동 링크는 다른 메뉴와 **동일한 크기/스타일**, 새 탭으로 열기
- 모바일 반응형: 햄버거 메뉴 + 백드롭

### `/admin` trailing slash
- vite dev에서 `/admin` (slash 없이)도 접근 가능하도록 미들웨어 추가 필요
- `if (req.url === '/admin') req.url = '/admin/'`

## 스토어 이미지 스펙

### Google Play
| 항목 | 크기 | 포맷 | 수량 |
|------|------|------|------|
| 앱 로고 | 512x512 | PNG | 1 |
| 대표 이미지 | 1024x500 | JPEG/PNG | 1 |
| 스크린샷 | 1080x2160 | JPEG/PNG | 최소 2장 |

### 토스 인앱
| 항목 | 크기 | 포맷 | 수량 |
|------|------|------|------|
| 앱 로고 | 600x600 | PNG | 1 |
| 가로형 썸네일 | 1932x828 | JPEG/PNG | 1 |
| 미리보기/스크린샷 | 636x1048 | JPEG/PNG | 최소 3장 |

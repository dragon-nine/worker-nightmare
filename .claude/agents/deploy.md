# Deploy Agent - Vercel 배포 담당

## 역할
Vercel 배포, 빌드 설정, 라우팅, 환경변수 관리

## 프로젝트 정보
- Vercel 프로젝트: `worker-nightmare` (dragon-nine으로 이름 변경됨)
- 배포 URL: `dragon-nine-109.vercel.app`
- GitHub: `dragon-nine/games`
- main 브랜치 push → 자동 배포

## 빌드 구조
- `vercel.json`의 buildCommand가 전체 빌드를 제어
- 순서: `npm install` → `sync-game-assets.mjs` → admin 빌드 → game01 빌드
- 출력: `dist/admin/`, `dist/game01/`

## 주의사항 (실수 기록)

### API 라우트는 Web API 스타일로
- `@vercel/node` 타입을 쓰면 빌드 시 `Cannot find module '@vercel/node'` 에러 발생
- `export async function GET(req: Request)` 형태의 Web API 스타일로 작성할 것
- `Response.json()` 사용

### Vercel Blob 설정
- Blob Store는 반드시 **Public Access** 로 생성
- `access: 'public'`은 필수 — 빼면 에러, private store에서도 에러
- 환경변수: `BLOB_READ_WRITE_TOKEN`
- 토큰은 Vercel 대시보드 → Storage → Blob Store에서 확인

### .vercelignore 필수
- `node_modules`, `android`, `platform-tools` 등 제외 안 하면 파일 수 초과 에러
- `games/game01/node_modules`, `admin/node_modules`도 추가

### 라우팅
- `/admin` → admin SPA
- `/game01` → game01
- `/` → `/game01`로 리다이렉트
- rewrite 순서: admin → game01 (구체적인 것 먼저)

### 빌드 커맨드에서 npm install
- 각 하위 프로젝트(admin, games/game01)에서 `npm install` 필수
- `--prefix` 대신 `cd xxx && npm install && npm run build` 형태가 안전

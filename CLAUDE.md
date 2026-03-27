# Dragon Nine Games

멀티게임 모노레포. 각 게임은 `games/` 하위에, 공용 admin/api/scripts는 루트에 위치.

## 구조
```
├── admin/          — 에셋/레이아웃 관리 어드민 (Vite + React)
├── api/            — Vercel serverless functions (R2 Storage API)
├── scripts/        — 빌드/동기화 스크립트
├── games/game01/   — 직장인 잔혹사 (Phaser 3 + React 하이브리드)
├── vercel.json     — 라우팅 + 빌드 커맨드
└── 에이전트: 상위 DragonNine/.claude/agents/ 에 위치 (레포 밖)
```

## 빌드
```bash
npm run build:all     # admin + game01 빌드
npm run dev:admin     # admin dev server (localhost:5173) — game01도 같이 서빙
npm run dev:game01    # game01 단독 dev server
```

## 배포
- main push → Vercel 자동 배포
- URL: dragon-nine-109.vercel.app
- /admin — 어드민 페이지
- /game01 — 게임
- 스토리지: Cloudflare R2 (버킷: dragon-nine)

## 핵심 규칙
- Phaser config에 `loader.baseURL: import.meta.env.BASE_URL` 필수
- Storage API는 Web API 스타일 (`export async function GET/POST`)
- R2는 Public Access 활성화 필수
- admin 로딩 시 엑박 금지 — shimmer skeleton 사용
- number input은 NumInput 컴포넌트 사용 (type="number" 금지)

## 아키텍처 원칙
- **게임플레이** → Phaser 3 (캔버스)
- **UI 화면** (메인 메뉴, 게임오버, 설정) → React + HTML/CSS (DOM 오버레이)
- **이유**: Phaser 캔버스 UI는 DPI/텍스트/이미지 품질 이슈. DOM UI가 업계 표준.
- admin 레이아웃 에디터와 게임 UI가 동일 기술(HTML/CSS)이면 1:1 일치 보장

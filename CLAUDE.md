# Dragon Nine Games

멀티게임 모노레포. 각 게임은 `games/` 하위에, 공용 admin/api/scripts는 루트에 위치.

## 구조
```
├── admin/          — 에셋 관리 어드민 (Vite + React)
├── api/            — Vercel serverless functions (Blob API)
├── scripts/        — 빌드/동기화 스크립트
├── games/game01/   — 직장인 잔혹시 (Phaser 3 + Vite + React)
├── vercel.json     — 라우팅 + 빌드 커맨드
└── .claude/agents/ — 역할별 에이전트 (deploy, admin, game, assets)
```

## 빌드
```bash
npm run build:all     # admin + game01 빌드
npm run dev:admin     # admin dev server (localhost:5174/admin)
npm run dev:game01    # game01 dev server
npm run upload-assets # 로컬 에셋 → Vercel Blob 업로드
npm run sync-assets   # Vercel Blob → 로컬 public/ 동기화
```

## 배포
- main push → Vercel 자동 배포
- URL: dragon-nine-109.vercel.app
- /admin — 어드민 페이지
- /game01 — 게임

## 핵심 규칙
- 게임 이름: "직장인 잔혹**시**" (잔혹사 ❌)
- Phaser config에 `loader.baseURL: import.meta.env.BASE_URL` 필수
- Blob API는 Web API 스타일 (`export async function GET/POST`)
- Blob Store는 Public Access, `access: 'public'` 필수
- admin 로딩 시 엑박 금지 — shimmer skeleton 사용

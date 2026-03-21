# Assets Agent - 에셋 관리 담당

## 역할
Vercel Blob 에셋 업로드/다운로드, 로컬-원격 동기화

## Vercel Blob 설정
- Store: Public Access (필수)
- 환경변수: `BLOB_READ_WRITE_TOKEN`
- SDK: `@vercel/blob` (루트 package.json에 설치됨)

## Blob 경로 규칙
```
game01/character/   ← 게임 에셋
game01/map/
game01/obstacles/
game01/ui/
game01/audio/

store/game01/google-play/icon/        ← 스토어 이미지
store/game01/google-play/feature/
store/game01/google-play/screenshots/
store/game01/toss/icon/
store/game01/toss/thumbnail/
store/game01/toss/screenshots/
```

## 스크립트

### 로컬 → Blob 업로드 (최초 1회)
```bash
export BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx
npm run upload-assets
```
- `scripts/upload-local-assets.mjs`
- `games/game01/public/` 하위 파일을 Blob에 업로드
- `allowOverwrite: true`, `addRandomSuffix: false` — 같은 이름이면 덮어쓰기

### Blob → 로컬 다운로드 (빌드 시)
```bash
npm run sync-assets
```
- `scripts/sync-game-assets.mjs`
- Blob의 `game01/` prefix 파일을 `games/game01/public/`에 다운로드
- `BLOB_READ_WRITE_TOKEN` 없으면 skip
- Vercel 빌드 시 자동 실행됨

## API 라우트 (admin용)
- `GET /api/blob-list?prefix=xxx` — 목록 조회
- `POST /api/blob-upload?prefix=xxx&filename=xxx` — 업로드 (body: raw file)
- `POST /api/blob-delete` — 삭제 (body: `{url}`)

## 주의사항 (실수 기록)

### access: 'public' 필수
- `put()` 호출 시 `access: 'public'` 빼면 에러
- Blob Store 자체도 Public으로 생성해야 함
- Private store + `access: 'public'` 조합도 에러

### 파일 덮어쓰기
- `allowOverwrite: true` + `addRandomSuffix: false` 필수
- 안 하면 파일명에 랜덤 suffix 붙어서 네이밍 꼬임

### 에셋 총 크기
- 현재 game01 에셋: ~2MB (이미지 + 오디오)
- git에 두기에 충분한 크기
- Blob은 디자이너 업로드/관리용, 빌드 시 동기화

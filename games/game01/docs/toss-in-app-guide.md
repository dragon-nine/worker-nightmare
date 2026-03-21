# 토스 인앱 (Apps in Toss) 마이그레이션 가이드

## 개요

현재 Phaser 게임을 **토스 앱 내 WebView**에서 실행하는 구조로 전환하는 가이드.
Vercel URL 접속이 아니라, 빌드 결과물을 `.ait` 파일로 패키징해서 토스 콘솔에 업로드하는 방식.

---

## 1. 사전 준비

### 필수
- 토스 개발자 콘솔 가입: https://apps-in-toss.toss.im
- 만 19세 이상
- 토스 비즈니스 계정 (개인도 가능, 사업자등록 별도)

### 앱 등록 시 필요한 것
- 앱 로고: 600x600 PNG, 불투명 배경
- 스크린샷: 최소 3장 (세로) 또는 1장 (가로)
- 앱 이름 + appName 식별자 (변경 불가, 딥링크에 사용: `intoss://{appName}`)
- 게임등급분류 서류 (GRAC)

### 계정 & 워크스페이스 구조

```
대표 (또는 누구든) → 토스 비즈니스 계정 생성 → 워크스페이스 생성 (최고관리자)
                                                    ↓
                                              팀원 초대 (멤버)
                                                    ↓
                                          초대받은 멤버도 샌드박스 테스트 가능
```

- **워크스페이스 생성자** = 최고관리자. 한 사업체당 하나의 워크스페이스
- **팀원 초대**: 초대받을 사람도 **토스 비즈니스 계정이 먼저 있어야** 함
- **샌드박스 앱 로그인** = 토스 비즈니스 계정 + 해당 워크스페이스 멤버여야 가능
- 콘솔 접근 없이는 샌드박스 테스트 불가

**개인 개발자 빠른 시작 (사업자등록 없이):**
1. 본인이 토스 비즈니스 계정 생성
2. 본인이 직접 워크스페이스 생성 (자동으로 최고관리자)
3. 앱 등록 → 샌드박스 테스트 (Game Login + 리더보드까지 가능)
4. 사업자등록은 광고/결제 붙일 때만 필요

**팀으로 개발할 때:**
1. 대표가 워크스페이스 생성
2. 팀원들 각자 토스 비즈니스 계정 생성
3. 대표가 콘솔에서 팀원 초대
4. 팀원은 초대 수락 후 샌드박스 접근 가능

---

## 2. 사업자등록 없이 쓸 수 있는 기능

| 기능 | 사업자등록 필요? | 샌드박스 테스트 |
|---|---|---|
| Game Login | **불필요** | O (목 데이터) |
| 리더보드 / 게임 프로필 | **불필요** | O |
| 세그먼트, 푸시 | **불필요** | - |
| 인앱 광고 (AdMob) | **필요** | X (샌드박스 미지원) |
| 토스페이 | **필요** | O (계약 필요) |
| 인앱결제 (IAP) | **필요** | O (계약 필요) |
| 토스 로그인 (일반) | **필요** | O |

> **결론**: 사업자등록 없이 Game Login + 리더보드까지 개발/테스트 가능.
> 광고와 결제는 사업자등록 후에만 사용 가능.

---

## 3. 프로젝트 세팅

### SDK 설치
```bash
npm install @apps-in-toss/web-framework
npx ait init  # web-framework 선택
```

### granite.config.ts 설정
```ts
export default {
  appName: 'worker-nightmare',        // 콘솔에 등록한 앱 이름
  brand: {
    displayName: '직장인 잔혹사',
    icon: '로고 URL',
    primaryColor: '#e94560',
  },
  web: {
    host: '0.0.0.0',                  // 실기기 테스트 시 네트워크 IP
    port: 5173,
    commands: {
      dev: 'vite --host',
      build: 'vite build',
    },
  },
};
```

> SDK 2.0.2 이상 필수 (1.x 빌드는 업로드 불가)

---

## 4. 개발 & 테스트 흐름

### 4-1. 로컬 개발
```bash
npm run dev
```
기존 Vite 개발 서버와 동일. HMR 지원.

### 4-2. 샌드박스 테스트
1. 토스 샌드박스 앱 설치 (콘솔에서 다운로드)
2. 토스 비즈니스 계정으로 로그인
3. `intoss://{appName}` 으로 접속

**iOS 시뮬레이터:**
- Xcode + iOS 15+ 설치
- 샌드박스 앱을 시뮬레이터에 드래그 설치

**Android:**
```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:5173 tcp:5173
```

### 4-3. 실제 토스 앱 테스트
```bash
npm run build          # .ait 파일 생성
npx ait deploy         # 콘솔에 업로드 (API 키 필요)
```
콘솔에서 QR 코드 생성 → 토스 앱으로 스캔 → 실제 환경 테스트

> 심사 제출 전 최소 1회 실제 토스 앱 테스트 필수

---

## 5. 기존 Vercel 배포와의 차이

| | Vercel (현재) | 토스 인앱 |
|---|---|---|
| 접근 방법 | 브라우저 URL | 토스 앱 내 WebView |
| 배포 방식 | `git push` → 자동 배포 | `.ait` 빌드 → 콘솔 업로드 |
| 테스트 | URL 접속 | 샌드박스 앱 or QR 스캔 |
| 번들 제한 | 없음 | 100MB (초과 시 CDN 분리) |
| 인증 | 쿠키 가능 | 쿠키 불가 (토큰 기반만) |
| HTTPS | 선택 | 필수 (샌드박스에서만 HTTP 허용) |
| 추가 기능 | 없음 | 토스 로그인, 리더보드, 토스페이, AdMob |

---

## 6. 사용 가능한 SDK 기능

### 인증
- **Game Login**: 서버 불필요, 사업자등록 불필요. 게임 전용 유저 식별
- **Toss Login**: OAuth2 기반 (사업자등록 필요)

### 게임
- **Game Profile**: 유저 등록 + 환영 메시지
- **Leaderboard**: 랭킹, 친구 대결, 점수 공유

### 결제
- **Toss Pay**: 인앱 결제 (별도 가맹점 키 필요)
- **IAP**: 소모품(코인, 힌트) / 비소모품(프리미엄, 광고 제거)

### 광고 (AdMob)
- 전면 광고, 보상형 광고, 배너 광고
- 테스트 ID:
  - 전면: `ait-ad-test-interstitial-id`
  - 보상형: `ait-ad-test-rewarded-id`
  - 배너: `ait-ad-test-banner-id`
- **개발 중 반드시 테스트 ID 사용** (프로덕션 ID 사용 시 제재)

### 기타
- 햅틱 피드백, 클립보드, 네트워크 상태 감지
- 로컬 스토리지, 공유, Lottie 애니메이션
- Safe Area 대응

---

## 7. 심사 & 출시

### 심사 과정 (2~3 영업일)
1. **운영 심사**: 앱 정보, 메타데이터
2. **기능 심사**: 크로스 플랫폼 동작 확인
3. **디자인 심사**: 토스 UI 가이드라인
4. **보안 심사**: 개인정보 보호

### 게임 심사 필수 체크리스트
- [ ] 10초 내 초기 화면 로드
- [ ] 오디오 on/off 제어 가능
- [ ] 백그라운드 진입 시 오디오 정지, 복귀 시 재개
- [ ] 기기 음소거 시 오디오 정지
- [ ] 닫기 버튼 (우상단) 동작
- [ ] 종료 확인 모달
- [ ] Safe Area 대응 (다이나믹 아일랜드 포함)
- [ ] 2초 이상 인터랙션 지연 없음
- [ ] Game Login으로 유저 식별 + 플레이 기록 유지
- [ ] 전체화면 레이아웃 사용

---

## 8. CORS 설정

프로덕션과 테스트 환경에서 허용할 Origin:
- 프로덕션: `https://{appName}.apps.tossmini.com`
- 테스트: `https://{appName}.private-apps.tossmini.com`

---

## 9. AI 개발 지원 (MCP 서버)

```bash
brew tap toss/tap && brew install ax
claude mcp add --transport stdio apps-in-toss ax mcp start
```

LLM용 전체 문서: https://developers-apps-in-toss.toss.im/llms-full.txt

---

## 참고 링크

### 주요 사이트
- 개발자 콘솔: https://apps-in-toss.toss.im
- 개발 문서 (메인): https://developers-apps-in-toss.toss.im/
- 개발자 커뮤니티: https://techchat-apps-in-toss.toss.im/
- GitHub 예제: https://github.com/toss?q=apps-in-toss
- 문의: https://apps-in-toss.channel.io/workflows/787658

### 개발 문서 상세 페이지
- 전체 개요: https://developers-apps-in-toss.toss.im/development/overview.html
- 사업자등록 안내: https://developers-apps-in-toss.toss.im/prepare/register-business.html
- 콘솔 & 워크스페이스: https://developers-apps-in-toss.toss.im/prepare/console-workspace.html
- 앱 등록: https://developers-apps-in-toss.toss.im/prepare/register-app.html
- 샌드박스 테스트: https://developers-apps-in-toss.toss.im/development/test/sandbox.html
- 실제 토스 앱 테스트: https://developers-apps-in-toss.toss.im/development/test/real-toss.html
- 심사 & 출시: https://developers-apps-in-toss.toss.im/release/review.html
- 게임 심사 체크리스트: https://developers-apps-in-toss.toss.im/release/checklist-game.html
- 정책 & 제한사항: https://developers-apps-in-toss.toss.im/policy/overview.html

### SDK & API 문서
- Web Framework SDK: https://developers-apps-in-toss.toss.im/sdk/web-framework.html
- Game Login: https://developers-apps-in-toss.toss.im/sdk/game-login.html
- Leaderboard: https://developers-apps-in-toss.toss.im/sdk/leaderboard.html
- Toss Pay: https://developers-apps-in-toss.toss.im/sdk/toss-pay.html
- In-App Purchase: https://developers-apps-in-toss.toss.im/sdk/iap.html
- 광고 (AdMob): https://developers-apps-in-toss.toss.im/sdk/ads.html
- Server API: https://developers-apps-in-toss.toss.im/api/overview.html

### AI 개발 지원
- LLM용 전체 문서: https://developers-apps-in-toss.toss.im/llms-full.txt
- 코드 예제 인덱스: https://developers-apps-in-toss.toss.im/tutorials/examples.html

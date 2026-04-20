import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ensureAuth, parseOwnedCharacters } from './game/services/api';
import { storage } from './game/services/storage';
import { gameBus } from './game/event-bus';
import { logAuthActivity } from './game/services/analytics';
import { bootstrapLocalStateFromServerAssets, syncAllAssetsFromStorage } from './game/services/assets';
import './index.css';

// 백그라운드에서 익명 인증 + 프로필 동기 (UI 블록 X)
const localOwned = storage.getOwnedCharacters();
ensureAuth({
  character: storage.getSelectedCharacter(),
  ownedCharacters: localOwned,
})
  .then(({ profile, isNewUser }) => {
    void logAuthActivity('login_success', {
      is_new_user: isNewUser,
      total_plays: profile.total_plays,
    });
    return bootstrapLocalStateFromServerAssets().catch((e) => {
      console.warn('[assets] bootstrap failed:', e);
    }).then(() => ({ profile, isNewUser }));
  })
  .then(({ profile, isNewUser }) => {
    // 서버 닉네임을 로컬과 동기화 (서버가 첫 가입 시 기본 닉네임 발급)
    if (profile.nickname && !localStorage.getItem('nickname')) {
      localStorage.setItem('nickname', profile.nickname);
    }
    // 신규 유저 플래그 — 튜토리얼/환영 트리거가 소비 후 clear
    if (isNewUser) localStorage.setItem('app.isNewUser', '1');
    // 보유 캐릭터: 서버 ∪ 로컬 → 로컬 반영 + (둘이 다르면) 서버로 push
    const serverOwned = parseOwnedCharacters(profile);
    const union = Array.from(new Set([...serverOwned, ...localOwned]));
    storage.setOwnedCharacters(union);
    // 서버에 부족한 데이터 일괄 push (owned + best_score 마이그레이션)
    const needOwnedPush = union.length > serverOwned.length;
    const localBest = storage.getBestScore();
    const needBestPush = localBest > 0 && localBest > profile.best_score;
    if (needOwnedPush || needBestPush) {
      import('./game/services/api').then(({ updateMyProfile }) => {
        const patch: Record<string, unknown> = {};
        if (needOwnedPush) patch.owned_characters = union;
        if (needBestPush) patch.best_score = localBest;
        updateMyProfile(patch).catch((e) =>
          console.warn('[api] profile sync failed:', e),
        );
      });
    }
    // UI 에 프로필 동기 완료 알림 (닉네임 등 다시 읽도록)
    gameBus.emit('profile-synced', undefined);
    void syncAllAssetsFromStorage();
  })
  .catch((e) => {
    console.warn('[api] auth failed, continuing offline:', e);
    // 샌드박스/네이티브에선 DevTools 접근이 어려우니 화면 토스트로 알림
    setTimeout(() => {
      gameBus.emit('toast', `서버 연결 실패: ${e instanceof Error ? e.message : String(e)}`.slice(0, 80));
    }, 800);
  });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

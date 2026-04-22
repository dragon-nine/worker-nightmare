import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ensureAuth, parseOwnedCharacters } from './game/services/api';
import { storage } from './game/services/storage';
import { gameBus } from './game/event-bus';
import { logAuthActivity } from './game/services/analytics';
import { migrateLocalAssetsToServerOnce } from './game/services/assets';
import './index.css';

// 백그라운드에서 익명 인증 + 프로필 동기 (UI 블록 X)
// DEBUG 빌드에서는 device_id 가 고정 테스터라서, 저장된 토큰이 다른 유저의 것일 수
// 있다. 부팅 시 강제 재인증으로 항상 테스터 세션을 보장.
const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true';
const localOwned = storage.getOwnedCharacters();
ensureAuth({
  force: DEBUG,
  character: storage.getSelectedCharacter(),
  ownedCharacters: localOwned,
})
  .then(({ profile, isNewUser }) => {
    void logAuthActivity('login_success', {
      is_new_user: isNewUser,
      total_plays: profile.total_plays,
    });
    return { profile, isNewUser };
  })
  .then(({ profile, isNewUser }) => {
    // 서버 닉네임이 원본이다. 로컬 닉네임은 UI 캐시로만 사용한다.
    if (profile.nickname) {
      localStorage.setItem('nickname', profile.nickname);
    }
    // 신규 유저 플래그 — 튜토리얼/환영 트리거가 소비 후 clear
    if (isNewUser) localStorage.setItem('app.isNewUser', '1');
    const serverOwned = parseOwnedCharacters(profile);
    if (DEBUG) {
      // 디버그: 서버가 단일 진실 원천. 로컬을 서버 값으로 덮어쓰고 push 는 생략.
      storage.setOwnedCharacters(serverOwned);
      if (profile.character) storage.setSelectedCharacter(profile.character);
      storage.setBestScore(profile.best_score);
    } else {
      // 보유 캐릭터: 서버 ∪ 로컬 → 로컬 반영 + (둘이 다르면) 서버로 push
      const union = Array.from(new Set([...serverOwned, ...localOwned]));
      storage.setOwnedCharacters(union);
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
    }
    // UI 에 프로필 동기 완료 알림 (닉네임 등 다시 읽도록)
    gameBus.emit('profile-synced', undefined);
    void migrateLocalAssetsToServerOnce().catch((e) => {
      console.warn('[assets] migration failed:', e);
    });
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

import { useState, useCallback } from 'react';
import { gameBus } from '../../game/event-bus';
import { storage } from '../../game/services/storage';

export function useAudioToggles() {
  const [bgmMuted, setBgmMuted] = useState(storage.getBool('bgmMuted'));
  const [sfxMuted, setSfxMuted] = useState(storage.getBool('sfxMuted'));

  const handleBgmToggle = useCallback(() => {
    // BGM 토글은 SFX 상태와 독립 — 항상 클릭음 재생
    gameBus.emit('play-sfx', 'sfx-click');
    const next = !bgmMuted;
    setBgmMuted(next);
    storage.setBool('bgmMuted', next);
    gameBus.emit('toggle-bgm', undefined);
  }, [bgmMuted]);

  const handleSfxToggle = useCallback(() => {
    const wasEnabled = !sfxMuted;
    // 끄는 경우: 상태 변경 전에 클릭음 재생 (아직 SFX 활성 상태)
    if (wasEnabled) {
      gameBus.emit('play-sfx', 'sfx-click');
    }

    const next = !sfxMuted;
    setSfxMuted(next);
    storage.setBool('sfxMuted', next);
    gameBus.emit('toggle-sfx', undefined);

    // 켜는 경우: 상태 변경 후에 클릭음 재생 (이제 활성 상태)
    if (!wasEnabled) {
      gameBus.emit('play-sfx', 'sfx-click');
    }
  }, [sfxMuted]);

  return { bgmMuted, sfxMuted, handleBgmToggle, handleSfxToggle };
}

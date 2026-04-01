import { useState, useCallback } from 'react';
import { gameBus } from '../../game/event-bus';
import { storage } from '../../game/services/storage';

export function useAudioToggles() {
  const [bgmMuted, setBgmMuted] = useState(storage.getBool('bgmMuted'));
  const [sfxMuted, setSfxMuted] = useState(storage.getBool('sfxMuted'));

  const handleBgmToggle = useCallback(() => {
    const next = !bgmMuted;
    setBgmMuted(next);
    storage.setBool('bgmMuted', next);
    gameBus.emit('toggle-bgm', undefined);
  }, [bgmMuted]);

  const handleSfxToggle = useCallback(() => {
    const next = !sfxMuted;
    setSfxMuted(next);
    storage.setBool('sfxMuted', next);
    gameBus.emit('toggle-sfx', undefined);
  }, [sfxMuted]);

  return { bgmMuted, sfxMuted, handleBgmToggle, handleSfxToggle };
}

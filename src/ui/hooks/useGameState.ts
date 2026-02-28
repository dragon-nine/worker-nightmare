import { useEffect, useState } from 'react';
import type { GameState } from '../../game/GameBridge';

const DEFAULT_STATE: GameState = {
  scene: 'BootScene',
  progress: 0,
  allCleared: false,
};

export function useGameState(): GameState {
  const [state, setState] = useState<GameState>(DEFAULT_STATE);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<GameState>).detail;
      setState(detail);
    };

    window.addEventListener('game-state', handler);
    return () => window.removeEventListener('game-state', handler);
  }, []);

  return state;
}

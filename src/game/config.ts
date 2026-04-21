import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { CommuteScene } from './scenes/CommuteScene';

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: Math.min(window.innerWidth, 500),
    height: window.innerHeight,
    parent,
    backgroundColor: '#0a0a14',
    antialias: true,
    roundPixels: false,
    render: {
      pixelArt: false,
    },
    // Phaser 입력 전역 비활성화 — 모든 게임 입력은 React HUD에서 처리.
    // Phaser가 canvas에 touch/pointer 리스너를 달면 React DOM 버튼 이벤트와
    // 경쟁해 iOS WebKit에서 드롭 유발. (이전엔 토스에서만 비활성화됨)
    input: { touch: false, mouse: false },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    loader: {
      baseURL: import.meta.env.BASE_URL,
    },
    scene: [BootScene, CommuteScene],
  };
}

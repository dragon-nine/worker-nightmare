import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { CommuteScene } from './scenes/CommuteScene';

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent,
    backgroundColor: '#0a0a14',
    roundPixels: true,
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

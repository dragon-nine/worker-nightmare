import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { StageSelectScene } from './scenes/StageSelectScene';
import { MinigameIntroScene } from './scenes/MinigameIntroScene';
import { ResultScene } from './scenes/ResultScene';
import { EndingScene } from './scenes/EndingScene';
import { AlarmScene } from './scenes/minigames/AlarmScene';
import { BootingScene } from './scenes/minigames/BootingScene';
import { MenuRouletteScene } from './scenes/minigames/MenuRouletteScene';
import { SleepFightScene } from './scenes/minigames/SleepFightScene';
import { FileSaveScene } from './scenes/minigames/FileSaveScene';
import { AltTabScene } from './scenes/minigames/AltTabScene';
import { ChargingScene } from './scenes/minigames/ChargingScene';
import { MosquitoScene } from './scenes/minigames/MosquitoScene';
import { SomekScene } from './scenes/minigames/SomekScene';
import { ResignScene } from './scenes/minigames/ResignScene';

export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: '#f5f5f5',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [
      BootScene, StageSelectScene, MinigameIntroScene, ResultScene, EndingScene,
      AlarmScene, BootingScene, MenuRouletteScene, SleepFightScene, FileSaveScene,
      AltTabScene, ChargingScene, MosquitoScene, SomekScene, ResignScene,
    ],
  };
}

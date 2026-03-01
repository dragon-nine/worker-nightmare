import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGameConfig } from '../../game/config';
import { GameManager } from '../../game/GameManager';
import { STAGES } from '../../game/data/stages';

const GAME_CONTAINER_ID = 'game-container';

export function GameContainer() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) return;

    const config = createGameConfig(GAME_CONTAINER_ID);
    gameRef.current = new Phaser.Game(config);

    // React → Phaser: 스테이지 점프 이벤트 리스너
    const jumpHandler = (e: Event) => {
      const { stageIndex } = (e as CustomEvent).detail;
      const game = gameRef.current;
      if (!game) return;

      const stage = STAGES[stageIndex];
      if (!stage) return;

      const minigame = stage.minigames[0];

      // GameManager 상태 설정
      GameManager.jumpToStage(stageIndex);

      // 실행 중인 모든 씬 정지
      game.scene.getScenes(true).forEach(s => game.scene.stop(s));

      // 해당 미니게임 바로 시작
      game.scene.start(minigame.sceneKey, { stageId: stage.id });
    };

    window.addEventListener('jump-to-stage', jumpHandler);

    return () => {
      window.removeEventListener('jump-to-stage', jumpHandler);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      id={GAME_CONTAINER_ID}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
      }}
    />
  );
}

import Phaser from 'phaser';
import { GameManager } from '../GameManager';
import { STAGES } from '../data/stages';
import { emitGameState } from '../GameBridge';

export class StageSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StageSelectScene' });
  }

  create() {
    // 전부 클리어했으면 엔딩으로
    if (GameManager.allCleared) {
      this.scene.start('EndingScene');
      return;
    }

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#f5f5f5');

    // 헤더 바
    const headerH = 60;
    this.add.rectangle(width / 2, 0, width, headerH, 0x1a1a2e).setOrigin(0.5, 0);
    this.add.text(width / 2 - 100, headerH / 2, '오늘의 할 일', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2 + 100, headerH / 2, `${GameManager.progress} / 10 클리어`, {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#e94560',
    }).setOrigin(0.5);

    // 2행 x 5열 그리드
    const cols = 5;
    const rows = 2;
    const gridPadX = 30;
    const gridPadTop = headerH + 20;
    const gridGap = 12;
    const cellW = (width - gridPadX * 2 - gridGap * (cols - 1)) / cols;
    const availableH = height - gridPadTop - 20;
    const cellH = (availableH - gridGap) / rows;

    STAGES.forEach((stage, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = gridPadX + col * (cellW + gridGap) + cellW / 2;
      const y = gridPadTop + row * (cellH + gridGap) + cellH / 2;

      const cleared = GameManager.isStageCleared(stage.id);

      // 카드 배경
      const cardColor = cleared ? 0xe8f5e9 : 0xffffff;
      const borderColor = cleared ? 0x00b894 : 0xe94560;
      const card = this.add.rectangle(x, y, cellW, cellH, cardColor)
        .setStrokeStyle(2, borderColor);

      // 스테이지 번호 (좌상단)
      this.add.text(x - cellW / 2 + 10, y - cellH / 2 + 8, `S${stage.id}`, {
        fontFamily: 'sans-serif', fontSize: '12px', color: '#999999', fontStyle: 'bold',
      });

      // 이모지 (중앙 위)
      this.add.text(x, y - 18, stage.emoji, {
        fontSize: '32px',
      }).setOrigin(0.5);

      // 스테이지 이름 (중앙 아래)
      this.add.text(x, y + 22, stage.name, {
        fontFamily: 'sans-serif', fontSize: '14px',
        color: '#1a1a1a', fontStyle: 'bold',
      }).setOrigin(0.5);

      // 상태 표시 (하단)
      let statusText: string;
      let statusColor: string;
      if (cleared) {
        statusText = '✓ 클리어';
        statusColor = '#00b894';
      } else {
        statusText = '도전 →';
        statusColor = '#e94560';
      }

      this.add.text(x, y + cellH / 2 - 14, statusText, {
        fontFamily: 'sans-serif', fontSize: '12px', color: statusColor, fontStyle: 'bold',
      }).setOrigin(0.5);

      // 클릭 이벤트 (미클리어 스테이지)
      if (!cleared) {
        card.setInteractive({ useHandCursor: true });
        card.on('pointerover', () => card.setFillStyle(0xfff0f0));
        card.on('pointerout', () => card.setFillStyle(0xffffff));
        card.on('pointerdown', () => {
          const minigame = GameManager.getRandomMinigame(stage.id);
          this.scene.start('MinigameIntroScene', {
            stageId: stage.id,
            stageName: stage.name,
            stageEmoji: stage.emoji,
            minigameName: minigame.name,
            minigameDesc: minigame.description,
            minigameSceneKey: minigame.sceneKey,
          });
        });

        // 펄스 효과
        this.tweens.add({
          targets: card, scaleX: 1.03, scaleY: 1.03,
          duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      }
    });

    emitGameState({ scene: 'StageSelectScene', progress: GameManager.progress, allCleared: GameManager.allCleared });
  }
}

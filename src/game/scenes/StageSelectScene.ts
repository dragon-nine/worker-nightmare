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

    const { width } = this.scale;
    this.cameras.main.setBackgroundColor('#f5f5f5');

    // 헤더
    this.add.rectangle(width / 2, 0, width, 90, 0x1a1a2e).setOrigin(0.5, 0);
    this.add.text(width / 2, 28, '오늘의 할 일', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 58, `${GameManager.progress} / 10 클리어`, {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#e94560',
    }).setOrigin(0.5);

    // 스테이지 리스트
    const startY = 115;
    const rowH = 70;

    STAGES.forEach((stage, i) => {
      const y = startY + i * rowH;
      const cleared = GameManager.isStageCleared(stage.id);
      const unlocked = GameManager.isStageUnlocked(stage.id);

      // 연결선
      if (i < STAGES.length - 1) {
        this.add.rectangle(28, y + rowH / 2, 3, rowH, cleared ? 0x00b894 : 0xdddddd);
      }

      // 역 점
      const dotColor = cleared ? 0x00b894 : unlocked ? 0xe94560 : 0xcccccc;
      this.add.circle(28, y, 12, dotColor);

      if (cleared) {
        this.add.text(28, y, '✓', {
          fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5);
      } else {
        this.add.text(28, y, `${stage.id}`, {
          fontFamily: 'sans-serif', fontSize: '11px',
          color: unlocked ? '#ffffff' : '#999999', fontStyle: 'bold',
        }).setOrigin(0.5);
      }

      // 카드 배경
      const cardColor = cleared ? 0xe8f5e9 : unlocked ? 0xffffff : 0xf0f0f0;
      const borderColor = cleared ? 0x00b894 : unlocked ? 0xe94560 : 0xdddddd;
      const card = this.add.rectangle(width / 2 + 18, y, width - 75, 56, cardColor)
        .setStrokeStyle(1.5, borderColor);

      // 스테이지 이름
      this.add.text(58, y - 10, `${stage.emoji} ${stage.name}`, {
        fontFamily: 'sans-serif', fontSize: '16px',
        color: unlocked ? '#1a1a1a' : '#aaaaaa', fontStyle: 'bold',
      }).setOrigin(0, 0.5);

      // 상태 표시
      let statusText: string;
      let statusColor: string;
      if (cleared) {
        statusText = '클리어!';
        statusColor = '#00b894';
      } else if (unlocked) {
        statusText = '도전 →';
        statusColor = '#e94560';
      } else {
        statusText = '잠김';
        statusColor = '#cccccc';
      }

      this.add.text(width - 25, y - 10, statusText, {
        fontFamily: 'sans-serif', fontSize: '13px', color: statusColor, fontStyle: 'bold',
      }).setOrigin(1, 0.5);

      // 미니게임 이름 표시 (클리어된 경우)
      if (cleared) {
        this.add.text(58, y + 10, '완료', {
          fontFamily: 'sans-serif', fontSize: '11px', color: '#888888',
        }).setOrigin(0, 0.5);
      }

      // 클릭 이벤트 (해금된 미클리어 스테이지만)
      if (unlocked && !cleared) {
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

        // 현재 도전 가능 스테이지 펄스 효과
        this.tweens.add({
          targets: card, scaleX: 1.02, scaleY: 1.02,
          duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      }
    });

    emitGameState({ scene: 'StageSelectScene', progress: GameManager.progress, allCleared: GameManager.allCleared });
  }
}

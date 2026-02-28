import Phaser from 'phaser';
import { GameManager } from '../GameManager';
import { emitGameState } from '../GameBridge';
import type { ChatMessage, NarrativeDef } from '../../types/game';

export class NarrativeScene extends Phaser.Scene {
  private narrativeData!: NarrativeDef;
  private messageIndex = 0;
  private canAdvance = false;

  constructor() {
    super({ key: 'NarrativeScene' });
  }

  create() {
    this.messageIndex = 0;
    this.canAdvance = false;

    this.narrativeData = GameManager.getNarrative();

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(this.narrativeData.bgColor);

    // 스트레스에 따른 비네팅
    if (GameManager.stress > 50) {
      const alpha = Math.min(0.3, (GameManager.stress - 50) / 200);
      this.add.rectangle(width / 2, height / 2, width, height, 0xff0000, alpha).setDepth(50);
    }

    // 상단 바: 시간 + 스트레스
    this.add.rectangle(width / 2, 0, width, 44, 0x000000, 0.5).setOrigin(0.5, 0).setDepth(10);

    const timeStr = `${this.narrativeData.time} ${this.narrativeData.period}`;
    this.add.text(24, 22, timeStr, {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(11);

    // 스트레스 바
    const stressBarX = width - 200;
    this.add.text(stressBarX - 10, 22, '스트레스', {
      fontFamily: 'sans-serif', fontSize: '12px', color: '#888888',
    }).setOrigin(1, 0.5).setDepth(11);

    this.add.rectangle(stressBarX + 75, 22, 150, 12, 0x333333).setDepth(11);
    const stressW = 148 * (GameManager.stress / 100);
    if (stressW > 0) {
      const stressColor = GameManager.stress > 70 ? 0xff0000 : GameManager.stress > 40 ? 0xff8800 : 0xe94560;
      this.add.rectangle(stressBarX + 2, 22, stressW, 10, stressColor)
        .setOrigin(0, 0.5).setDepth(11);
    }

    this.add.text(width - 20, 22, `${Math.floor(GameManager.stress)}%`, {
      fontFamily: 'sans-serif', fontSize: '12px', color: '#aaaaaa',
    }).setOrigin(1, 0.5).setDepth(11);

    // 프롤로그 특별 연출
    if (this.narrativeData.isPrologue) {
      this.showPrologue();
    } else {
      this.showMessages();
    }

    const stage = GameManager.getCurrentStage();
    emitGameState({
      scene: 'NarrativeScene',
      stageId: stage.id,
      progress: GameManager.progress,
      allCleared: GameManager.allCleared,
      stress: GameManager.stress,
      time: this.narrativeData.time,
      period: this.narrativeData.period,
      successCount: GameManager.successCount,
    });
  }

  private showPrologue() {
    const { width, height } = this.scale;

    // "월요일 아침" 큰 텍스트 페이드인
    const dayText = this.add.text(width / 2, height * 0.3, '월요일 아침', {
      fontFamily: 'sans-serif', fontSize: '40px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: dayText, alpha: 1, duration: 1000,
      onComplete: () => {
        this.time.delayedCall(800, () => {
          this.tweens.add({
            targets: dayText, alpha: 0, duration: 500,
            onComplete: () => {
              dayText.destroy();
              this.showMessages();
            },
          });
        });
      },
    });
  }

  private showMessages() {
    const { width, height } = this.scale;
    const messages = this.narrativeData.messages;
    const startY = 70;
    const isDark = this.isDarkBg();
    let currentY = startY;

    const showNext = () => {
      if (this.messageIndex >= messages.length) {
        this.showAdvancePrompt();
        return;
      }

      const msg = messages[this.messageIndex];
      this.messageIndex++;

      const { objects, totalHeight } = this.createBubble(msg, width, currentY, isDark);

      // 등장 애니메이션
      objects.forEach(obj => {
        const go = obj as Phaser.GameObjects.Components.Alpha & Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject;
        go.setAlpha(0);
        const targetY = go.y;
        go.y = targetY + 15;
        this.tweens.add({
          targets: go, alpha: 1, y: targetY, duration: 300, ease: 'Back.easeOut',
        });
      });

      currentY += totalHeight + 12;

      // 자동 스크롤: 메시지가 화면 아래로 넘어가면 조정
      if (currentY > height - 80) {
        currentY = height - 80;
      }

      this.time.delayedCall(400, showNext);
    };

    showNext();
  }

  private createBubble(msg: ChatMessage, sceneW: number, y: number, isDark: boolean): { objects: Phaser.GameObjects.GameObject[], totalHeight: number } {
    const objects: Phaser.GameObjects.GameObject[] = [];
    let totalHeight = 0;

    if (msg.type === 'system') {
      const text = this.add.text(sceneW / 2, y, msg.text, {
        fontFamily: 'sans-serif', fontSize: '14px', color: isDark ? '#666688' : '#888888',
        align: 'center',
      }).setOrigin(0.5, 0);
      objects.push(text);
      totalHeight = text.height + 4;
      return { objects, totalHeight };
    }

    if (msg.type === 'thought') {
      const text = this.add.text(sceneW / 2, y, msg.text, {
        fontFamily: 'sans-serif', fontSize: '18px', color: isDark ? '#8888aa' : '#666688',
        fontStyle: 'italic', align: 'center',
      }).setOrigin(0.5, 0);
      objects.push(text);
      totalHeight = text.height + 4;
      return { objects, totalHeight };
    }

    const isLeft = msg.type === 'left';
    const bubbleMaxW = 340;
    const bubbleX = isLeft ? 30 : sceneW - 30;
    let cursorY = y;

    // 발신자 이름
    if (isLeft && msg.sender) {
      const nameText = this.add.text(bubbleX, cursorY, msg.sender, {
        fontFamily: 'sans-serif', fontSize: '12px', color: isDark ? '#888899' : '#888888',
      }).setOrigin(0, 0);
      objects.push(nameText);
      cursorY += 18;
    }

    // 말풍선 텍스트 (먼저 만들어서 크기 측정)
    const textObj = this.add.text(0, 0, msg.text, {
      fontFamily: 'sans-serif', fontSize: '16px',
      color: isLeft ? '#1a1a1a' : '#ffffff',
      wordWrap: { width: bubbleMaxW - 24 },
      lineSpacing: 4,
    });
    const textW = Math.min(textObj.width + 24, bubbleMaxW);
    const textH = textObj.height + 16;
    textObj.destroy();

    // 말풍선 배경
    const bgColor = isLeft ? 0xf0f0f0 : 0x3182f6;
    const bgX = isLeft ? bubbleX + textW / 2 : bubbleX - textW / 2;
    const bg = this.add.rectangle(bgX, cursorY + textH / 2, textW, textH, bgColor)
      .setStrokeStyle(0);
    // 둥근 모서리 효과를 위해 strokeStyle 없는 rect 사용
    objects.push(bg);

    // 텍스트
    const txtX = isLeft ? bubbleX + 12 : bubbleX - textW + 12;
    const txt = this.add.text(txtX, cursorY + 8, msg.text, {
      fontFamily: 'sans-serif', fontSize: '16px',
      color: isLeft ? '#1a1a1a' : '#ffffff',
      wordWrap: { width: bubbleMaxW - 24 },
      lineSpacing: 4,
    });
    objects.push(txt);

    totalHeight = (cursorY - y) + textH;
    return { objects, totalHeight };
  }

  private showAdvancePrompt() {
    const { width, height } = this.scale;
    const isDark = this.isDarkBg();

    const prompt = this.add.text(width / 2, height - 30, '터치하세요 ▶', {
      fontFamily: 'sans-serif', fontSize: '16px',
      color: isDark ? '#555577' : '#888888',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: prompt, alpha: 0.4, duration: 800, yoyo: true, repeat: -1,
    });

    this.time.delayedCall(200, () => {
      this.canAdvance = true;
    });

    this.input.on('pointerdown', () => {
      if (!this.canAdvance) return;
      this.canAdvance = false;

      // 스트레스 +2 (시간이 지나면서 쌓이는 스트레스)
      GameManager.addStress(2);

      const stage = GameManager.getCurrentStage();
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
  }

  private isDarkBg(): boolean {
    const bg = this.narrativeData.bgColor;
    // 간단한 밝기 판단: #으로 시작하는 6자리 hex
    const r = parseInt(bg.slice(1, 3), 16);
    const g = parseInt(bg.slice(3, 5), 16);
    const b = parseInt(bg.slice(5, 7), 16);
    return (r + g + b) / 3 < 128;
  }
}

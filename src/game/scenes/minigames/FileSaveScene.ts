import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지5: 파일 저장의 저주
 * - 여러 파일이 화면에 표시됨
 * - "진짜 최종" 파일을 찾아 터치
 * - 잘못 터치하면 실패
 * - 파일들이 셔플됨
 */
export class FileSaveScene extends Phaser.Scene {
  private stageId = 0;
  private ended = false;

  private fileNames = [
    '보고서.docx',
    '보고서_수정.docx',
    '보고서_최종.docx',
    '보고서_최종(2).docx',
    '보고서_최종_수정.docx',
    '보고서_진짜최종.docx',
    '보고서_최종_final.docx',
    '보고서_진짜최종_리얼마지막.docx',  // 정답
    '보고서_제발이게마지막.docx',
  ];
  private correctFile = '보고서_진짜최종_리얼마지막.docx';
  private fileObjects: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'FileSaveScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.ended = false;
    this.fileObjects = [];
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#f5f5f5');

    // 윈도우 탐색기 느낌
    this.add.rectangle(width / 2, 0, width, 80, 0x2b579a).setOrigin(0.5, 0);
    this.add.text(20, 25, '📁 내 문서 > 보고서', {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff',
    });
    this.add.text(width / 2, 60, '올바른 최종 파일을 찾으세요!', {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#aaccff',
    }).setOrigin(0.5);

    // 파일 배치
    const shuffled = Phaser.Utils.Array.Shuffle([...this.fileNames]);
    const cols = 2;
    const cellW = (width - 30) / cols;
    const cellH = 75;
    const startY = 100;

    shuffled.forEach((name, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 15 + col * cellW + cellW / 2;
      const y = startY + row * cellH + cellH / 2;

      const container = this.add.container(x, y);

      const bg = this.add.rectangle(0, 0, cellW - 10, cellH - 8, 0xffffff)
        .setStrokeStyle(1, 0xdddddd)
        .setInteractive({ useHandCursor: true });

      // 파일 아이콘
      const icon = this.add.text(-cellW / 2 + 15, 0, '📄', { fontSize: '24px' }).setOrigin(0, 0.5);

      // 파일 이름 (긴 이름은 줄바꿈)
      const displayName = name.length > 16
        ? name.substring(0, 16) + '\n' + name.substring(16)
        : name;
      const text = this.add.text(-cellW / 2 + 42, 0, displayName, {
        fontFamily: 'sans-serif', fontSize: '11px', color: '#333333',
        wordWrap: { width: cellW - 65 },
      }).setOrigin(0, 0.5);

      container.add([bg, icon, text]);
      this.fileObjects.push(container);

      bg.on('pointerover', () => bg.setFillStyle(0xe3f2fd));
      bg.on('pointerout', () => bg.setFillStyle(0xffffff));

      bg.on('pointerdown', () => {
        if (this.ended) return;
        this.ended = true;

        if (name === this.correctFile) {
          bg.setFillStyle(0xc8e6c9);
          bg.setStrokeStyle(2, 0x00b894);
          this.time.delayedCall(800, () => {
            this.scene.start('ResultScene', { stageId: this.stageId, success: true });
          });
        } else {
          bg.setFillStyle(0xffcdd2);
          bg.setStrokeStyle(2, 0xff4444);
          this.add.text(width / 2, height - 60, `❌ 그건 최종이 아닙니다...`, {
            fontFamily: 'sans-serif', fontSize: '16px', color: '#e94560', fontStyle: 'bold',
          }).setOrigin(0.5);
          this.time.delayedCall(1200, () => {
            this.scene.start('ResultScene', { stageId: this.stageId, success: false });
          });
        }
      });
    });

    // 시간 제한
    let timeLeft = 10;
    const timerText = this.add.text(width - 15, 90, `${timeLeft}s`, {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#e94560', fontStyle: 'bold',
    }).setOrigin(1, 0);

    this.time.addEvent({
      delay: 1000, repeat: 9,
      callback: () => {
        if (this.ended) return;
        timeLeft--;
        timerText.setText(`${timeLeft}s`);
        if (timeLeft <= 0) {
          this.ended = true;
          this.scene.start('ResultScene', { stageId: this.stageId, success: false });
        }
      },
    });

    // 파일 셔플 애니메이션 (5초마다)
    this.time.addEvent({
      delay: 5000,
      callback: () => {
        if (this.ended) return;
        this.shuffleFiles();
      },
    });

    emitGameState({ scene: 'FileSaveScene', stageId: this.stageId, progress: GameManager.progress, allCleared: GameManager.allCleared });
  }

  private shuffleFiles() {
    const positions = this.fileObjects.map(f => ({ x: f.x, y: f.y }));
    Phaser.Utils.Array.Shuffle(positions);

    this.fileObjects.forEach((file, i) => {
      this.tweens.add({
        targets: file,
        x: positions[i].x, y: positions[i].y,
        duration: 400, ease: 'Cubic.easeInOut',
      });
    });
  }
}

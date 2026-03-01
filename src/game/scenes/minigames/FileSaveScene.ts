import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지5: 저장의 저주 — The Curse of Saving
 * .docx → .pdf 로 확장자를 바꿔야 성공
 * 잘못된 확장자로 저장하면 파일이 기하급수적으로 복제됨
 */
export class FileSaveScene extends Phaser.Scene {
  private stageId = 0;
  private ended = false;

  // Filename editing state
  private currentFilename = '보고서_최종_진짜최종_이게마지막.docx';
  private editing = false;
  private cursorVisible = true;
  private cursorTimer?: Phaser.Time.TimerEvent;
  private multiplicationCount = 0;

  // Display objects
  private filenameText!: Phaser.GameObjects.Text;
  private cursorText!: Phaser.GameObjects.Text;
  private fileIconEmoji!: Phaser.GameObjects.Text;
  private fileIconRect!: Phaser.GameObjects.Rectangle;
  private keyboardContainer!: Phaser.GameObjects.Container;
  private folderContainer!: Phaser.GameObjects.Container;
  private timerText!: Phaser.GameObjects.Text;
  private duplicatedFiles: Phaser.GameObjects.Container[] = [];
  private bossText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'FileSaveScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.ended = false;
    this.editing = false;
    this.cursorVisible = true;
    this.multiplicationCount = 0;
    this.currentFilename = '보고서_최종_진짜최종_이게마지막.docx';
    this.duplicatedFiles = [];
  }

  create() {
    const { width, height } = this.scale;

    // ── Desktop background (dark blue/teal like Windows) ──
    this.cameras.main.setBackgroundColor('#0c3547');
    this.add.rectangle(width / 2, height / 2, width, height, 0x0c3547);

    // Subtle desktop grid pattern
    for (let gx = 0; gx < width; gx += 80) {
      for (let gy = 0; gy < height; gy += 80) {
        this.add.rectangle(gx, gy, 1, 1, 0x1a5568, 0.3);
      }
    }

    // ── Folder window (centered white rectangle) ──
    const folderW = 700;
    const folderH = 400;
    const folderX = width / 2;
    const folderY = height / 2 - 20;

    this.folderContainer = this.add.container(folderX, folderY);

    // Window shadow
    const shadow = this.add.rectangle(4, 4, folderW, folderH, 0x000000, 0.3);
    this.folderContainer.add(shadow);

    // Window body
    const windowBody = this.add.rectangle(0, 0, folderW, folderH, 0xffffff);
    windowBody.setStrokeStyle(1, 0xcccccc);
    this.folderContainer.add(windowBody);

    // Title bar
    const titleBarH = 36;
    const titleBar = this.add.rectangle(0, -folderH / 2 + titleBarH / 2, folderW, titleBarH, 0x2b579a);
    this.folderContainer.add(titleBar);

    // Title bar text
    const titleText = this.add.text(-folderW / 2 + 14, -folderH / 2 + titleBarH / 2, '📁 보고서 폴더', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.folderContainer.add(titleText);

    // Window control buttons (decorative)
    const btnY = -folderH / 2 + titleBarH / 2;
    const closeBtn = this.add.rectangle(folderW / 2 - 20, btnY, 24, 20, 0xe04040);
    const maxBtn = this.add.rectangle(folderW / 2 - 48, btnY, 24, 20, 0x2b579a);
    const minBtn = this.add.rectangle(folderW / 2 - 76, btnY, 24, 20, 0x2b579a);
    const closeTxt = this.add.text(folderW / 2 - 20, btnY, '✕', {
      fontSize: '12px', color: '#ffffff',
    }).setOrigin(0.5);
    this.folderContainer.add([closeBtn, maxBtn, minBtn, closeTxt]);

    // ── File icon (large Word document) ──
    const fileY = -40;

    // Blue rectangle for Word doc icon
    this.fileIconRect = this.add.rectangle(-10, fileY - 20, 80, 100, 0x2b579a, 1);
    this.fileIconRect.setStrokeStyle(2, 0x1a3d6e);
    this.folderContainer.add(this.fileIconRect);

    // "W" text on the icon
    this.fileIconEmoji = this.add.text(-10, fileY - 20, 'W', {
      fontFamily: 'serif',
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.folderContainer.add(this.fileIconEmoji);

    // Folded corner effect
    const corner = this.add.triangle(
      -10 + 40, fileY - 20 - 50,
      0, 0,
      -20, 0,
      0, 20,
      0x6699cc
    );
    this.folderContainer.add(corner);

    // ── Filename text (clickable) ──
    this.filenameText = this.add.text(-10, fileY + 50, this.currentFilename, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#333333',
      backgroundColor: '#ffffff',
      padding: { x: 6, y: 3 },
      wordWrap: { width: 400 },
      align: 'center',
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    this.folderContainer.add(this.filenameText);

    // Cursor (blinking "|")
    this.cursorText = this.add.text(0, fileY + 50, '|', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#0066cc',
      fontStyle: 'bold',
    }).setOrigin(0, 0).setVisible(false);
    this.folderContainer.add(this.cursorText);

    // Hint text
    const hintText = this.add.text(-10, fileY + 85, '👆 파일명을 클릭하여 수정하세요', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#888888',
    }).setOrigin(0.5, 0);
    this.folderContainer.add(hintText);

    // Click on filename to start editing
    this.filenameText.on('pointerdown', () => {
      if (this.ended || this.editing) return;
      this.startEditing();
      hintText.setVisible(false);
    });

    // Hover effect
    this.filenameText.on('pointerover', () => {
      if (!this.editing && !this.ended) {
        this.filenameText.setBackgroundColor('#e3f2fd');
      }
    });
    this.filenameText.on('pointerout', () => {
      if (!this.editing) {
        this.filenameText.setBackgroundColor('#ffffff');
      }
    });

    // ── Virtual keyboard (hidden initially) ──
    this.createKeyboard();

    // ── Timer (20 seconds) ──
    let timeLeft = 20;
    this.timerText = this.add.text(width - 20, 14, `⏱ ${timeLeft}초`, {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(1, 0);

    this.time.addEvent({
      delay: 1000,
      repeat: 19,
      callback: () => {
        if (this.ended) return;
        timeLeft--;
        this.timerText.setText(`⏱ ${timeLeft}초`);
        if (timeLeft <= 5) {
          this.timerText.setColor('#ff4444');
        }
        if (timeLeft <= 0) {
          this.ended = true;
          this.showFailMessage('팀장님이 보고서를 받지 못했다...');
          this.time.delayedCall(1500, () => {
            this.scene.start('ResultScene', { stageId: this.stageId, success: false });
          });
        }
      },
    });

    // Boss instruction text
    this.bossText = this.add.text(width / 2, height - 16, '', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#ffcc00',
      fontStyle: 'bold',
    }).setOrigin(0.5, 1).setDepth(100);

    // Emit game state
    emitGameState({
      scene: 'FileSaveScene',
      stageId: this.stageId,
      progress: GameManager.progress,
      allCleared: GameManager.allCleared,
      stress: GameManager.stress,
    });
  }

  // ── Start editing mode ──
  private startEditing(): void {
    this.editing = true;

    // Highlight filename background
    this.filenameText.setBackgroundColor('#fff9c4');
    this.filenameText.setStyle({
      ...this.filenameText.style,
      color: '#000000',
    });

    // Show blinking cursor
    this.cursorText.setVisible(true);
    this.updateCursorPosition();
    this.startCursorBlink();

    // Slide keyboard up
    this.showKeyboard();
  }

  // ── Create virtual keyboard ──
  private createKeyboard(): void {
    const { width, height } = this.scale;
    const kbH = 140;

    this.keyboardContainer = this.add.container(width / 2, height + kbH / 2);
    this.keyboardContainer.setDepth(50);

    // Keyboard background
    const kbBg = this.add.rectangle(0, 0, width, kbH, 0x2c2c2c);
    this.keyboardContainer.add(kbBg);

    // Top border
    const kbBorder = this.add.rectangle(0, -kbH / 2, width, 2, 0x555555);
    this.keyboardContainer.add(kbBorder);

    // Key layout
    // Row 1: letters
    const row1Keys = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
    // Row 2: letters
    const row2Keys = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
    // Row 3: special keys
    const row3Keys = ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '←', '↵'];

    const keyW = 60;
    const keyH = 34;
    const gap = 6;
    const rowYStart = -kbH / 2 + 18;

    // Row 1
    this.createKeyRow(row1Keys, rowYStart, keyW, keyH, gap, row1Keys.length);

    // Row 2
    this.createKeyRow(row2Keys, rowYStart + keyH + gap, keyW, keyH, gap, row2Keys.length);

    // Row 3 (with wider backspace and enter)
    this.createKeyRow(row3Keys, rowYStart + (keyH + gap) * 2, keyW, keyH, gap, row3Keys.length);
  }

  private createKeyRow(
    keys: string[],
    y: number,
    keyW: number,
    keyH: number,
    gap: number,
    total: number,
  ): void {
    const totalWidth = total * keyW + (total - 1) * gap;
    const startX = -totalWidth / 2 + keyW / 2;

    keys.forEach((key, i) => {
      const x = startX + i * (keyW + gap);
      let thisKeyW = keyW;
      let bgColor = 0x444444;
      let textColor = '#ffffff';
      let fontSize = '16px';

      // Style special keys differently
      if (key === '←') {
        bgColor = 0x884444;
        textColor = '#ffaaaa';
        fontSize = '18px';
      } else if (key === '↵') {
        bgColor = 0x2b579a;
        textColor = '#aaddff';
        fontSize = '18px';
      } else if (key === '.') {
        bgColor = 0x555555;
        textColor = '#ffcc00';
        fontSize = '20px';
      }

      const keyBg = this.add.rectangle(x, y, thisKeyW, keyH, bgColor)
        .setStrokeStyle(1, 0x666666)
        .setInteractive({ useHandCursor: true });

      const keyLabel = this.add.text(x, y, key, {
        fontFamily: 'sans-serif',
        fontSize,
        color: textColor,
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // Key press effects
      keyBg.on('pointerdown', () => {
        if (this.ended) return;
        keyBg.setFillStyle(0x777777);
        this.handleKeyPress(key);
      });
      keyBg.on('pointerup', () => keyBg.setFillStyle(bgColor));
      keyBg.on('pointerout', () => keyBg.setFillStyle(bgColor));

      this.keyboardContainer.add([keyBg, keyLabel]);
    });
  }

  // ── Show keyboard with slide-up animation ──
  private showKeyboard(): void {
    const { height } = this.scale;
    const kbH = 140;

    this.tweens.add({
      targets: this.keyboardContainer,
      y: height - kbH / 2,
      duration: 350,
      ease: 'Back.easeOut',
    });

    // Slide the folder window up slightly to make room
    this.tweens.add({
      targets: this.folderContainer,
      y: this.folderContainer.y - 50,
      duration: 350,
      ease: 'Cubic.easeOut',
    });
  }

  // ── Handle key presses ──
  private handleKeyPress(key: string): void {
    if (!this.editing || this.ended) return;

    if (key === '←') {
      // Backspace
      if (this.currentFilename.length > 0) {
        this.currentFilename = this.currentFilename.slice(0, -1);
      }
    } else if (key === '↵') {
      // Enter — check the result
      this.handleEnter();
      return;
    } else {
      // Append character
      this.currentFilename += key;
    }

    // Update display
    this.filenameText.setText(this.currentFilename);
    this.updateCursorPosition();
  }

  // ── Handle Enter key ──
  private handleEnter(): void {
    const name = this.currentFilename.toLowerCase();

    if (name.endsWith('.pdf')) {
      // SUCCESS — changed to PDF
      this.ended = true;
      this.editing = false;
      this.cursorText.setVisible(false);
      if (this.cursorTimer) this.cursorTimer.destroy();

      this.showSuccess();
    } else {
      // TRAP — file multiplies!
      this.multiplicationCount++;
      this.multiplyFiles();

      if (this.multiplicationCount >= 3) {
        // Too many files — FAIL
        this.ended = true;
        this.editing = false;
        this.cursorText.setVisible(false);
        if (this.cursorTimer) this.cursorTimer.destroy();

        this.time.delayedCall(800, () => {
          this.showFailMessage('폴더 용량 초과!');
          this.time.delayedCall(1500, () => {
            this.scene.start('ResultScene', { stageId: this.stageId, success: false });
          });
        });
      }
    }
  }

  // ── Multiply files (trap animation) ──
  private multiplyFiles(): void {
    const currentCount = Math.pow(2, this.multiplicationCount);
    const prevCount = Math.pow(2, this.multiplicationCount - 1);
    const newFiles = currentCount - prevCount;

    // Camera shake
    this.cameras.main.shake(200, 0.005);

    // Warning flash
    const flash = this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2,
      this.scale.width, this.scale.height,
      0xff0000, 0.2,
    ).setDepth(80);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      onComplete: () => flash.destroy(),
    });

    // Show warning text
    const warnText = this.add.text(
      this.scale.width / 2, this.scale.height / 2 - 100,
      `⚠ 파일이 복제되었습니다! (${currentCount}개)`,
      {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#ff4444',
        fontStyle: 'bold',
        backgroundColor: '#ffffff',
        padding: { x: 10, y: 5 },
      },
    ).setOrigin(0.5).setDepth(90);

    this.tweens.add({
      targets: warnText,
      alpha: 0,
      y: warnText.y - 40,
      duration: 1500,
      delay: 500,
      onComplete: () => warnText.destroy(),
    });

    // Spawn duplicate file icons scattered in the folder
    for (let i = 0; i < newFiles && i < 12; i++) {
      const randX = Phaser.Math.Between(-280, 280);
      const randY = Phaser.Math.Between(-100, 100);

      const dupeContainer = this.add.container(0, 0);

      // Small file icon
      const dupeRect = this.add.rectangle(0, 0, 40, 50, 0x2b579a, 0.7);
      dupeRect.setStrokeStyle(1, 0x1a3d6e);
      const dupeW = this.add.text(0, 0, 'W', {
        fontFamily: 'serif',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // Mini filename
      const dupeName = this.add.text(0, 32, this.currentFilename.length > 15
        ? this.currentFilename.slice(0, 12) + '...'
        : this.currentFilename, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#666666',
      }).setOrigin(0.5, 0);

      dupeContainer.add([dupeRect, dupeW, dupeName]);
      this.folderContainer.add(dupeContainer);
      this.duplicatedFiles.push(dupeContainer);

      // Animate: scatter from center
      dupeContainer.setScale(0);
      dupeContainer.setPosition(0, -20);

      this.tweens.add({
        targets: dupeContainer,
        x: randX,
        y: randY,
        scale: 0.8 + Math.random() * 0.4,
        angle: Phaser.Math.Between(-15, 15),
        duration: 400,
        delay: i * 50,
        ease: 'Back.easeOut',
      });
    }
  }

  // ── Success sequence ──
  private showSuccess(): void {
    const { width, height } = this.scale;

    // Transform icon: blue Word → red PDF
    this.tweens.add({
      targets: this.fileIconRect,
      scaleX: 0,
      duration: 200,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.fileIconRect.setFillStyle(0xcc2222);
        this.fileIconRect.setStrokeStyle(2, 0x881111);
        this.fileIconEmoji.setText('🔒');
        this.fileIconEmoji.setFontSize(36);

        this.tweens.add({
          targets: this.fileIconRect,
          scaleX: 1,
          duration: 200,
          ease: 'Cubic.easeOut',
        });
      },
    });

    // Remove duplicated files if any
    this.duplicatedFiles.forEach((f, i) => {
      this.tweens.add({
        targets: f,
        alpha: 0,
        scale: 0,
        duration: 300,
        delay: i * 30,
        onComplete: () => f.destroy(),
      });
    });

    // Sound effect text: "철컥!"
    this.time.delayedCall(500, () => {
      const sfx = this.add.text(width / 2, height / 2 - 140, '철컥!', {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        color: '#ffcc00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(100).setScale(0);

      this.tweens.add({
        targets: sfx,
        scale: 1.2,
        duration: 300,
        ease: 'Back.easeOut',
        yoyo: true,
        hold: 300,
      });
    });

    // Boss voice
    this.time.delayedCall(1200, () => {
      this.bossText.setText('👔 "음, 더 수정할 수가 없군. 결재!"');
      this.bossText.setAlpha(0);
      this.tweens.add({
        targets: this.bossText,
        alpha: 1,
        duration: 400,
      });
    });

    // Update filename display
    this.filenameText.setText(this.currentFilename);
    this.filenameText.setBackgroundColor('#c8e6c9');
    this.filenameText.setStyle({
      ...this.filenameText.style,
      color: '#1b5e20',
    });

    // Slide keyboard away
    this.tweens.add({
      targets: this.keyboardContainer,
      y: height + 100,
      duration: 400,
      ease: 'Cubic.easeIn',
    });

    // Transition to ResultScene
    this.time.delayedCall(2500, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success: true });
    });
  }

  // ── Fail message overlay ──
  private showFailMessage(msg: string): void {
    const { width, height } = this.scale;

    // Dim overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
      .setDepth(90);

    // Fail text
    const failText = this.add.text(width / 2, height / 2, `💀 ${msg}`, {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#ff4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(91).setScale(0);

    this.tweens.add({
      targets: failText,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });

    // Camera shake
    this.cameras.main.shake(300, 0.01);
  }

  // ── Cursor blinking ──
  private startCursorBlink(): void {
    this.cursorTimer = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        this.cursorVisible = !this.cursorVisible;
        this.cursorText.setVisible(this.cursorVisible && this.editing);
      },
    });
  }

  private updateCursorPosition(): void {
    // Position the cursor at the end of the filename text
    this.filenameText.getBounds();
    const textWidth = this.filenameText.width;

    // cursorText is a child of folderContainer, so we compute position relative to the container
    // filenameText is centered (origin 0.5, 0), so the right edge = filenameText.x + textWidth/2
    this.cursorText.setPosition(
      this.filenameText.x + textWidth / 2 + 2,
      this.filenameText.y,
    );
  }
}

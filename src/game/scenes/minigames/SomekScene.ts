import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지9: 술자리 탈출 — Escape from Dinner (Receipt Rope)
 * Point-and-click escape room in a restaurant bathroom.
 *
 * Solution: pick up receipts + tape → combine into rope → use rope on window.
 * Traps: door (boss catches you), toilet paper on window (tears), plunger on window (bounces).
 */

interface InventoryItem {
  key: string;
  emoji: string;
  label: string;
}

const ITEM_RECEIPTS: InventoryItem = { key: 'receipts', emoji: '🧾', label: '영수증 뭉치' };
const ITEM_TAPE: InventoryItem = { key: 'tape', emoji: '🔵', label: '청테이프' };
const ITEM_TOILET_PAPER: InventoryItem = { key: 'paper', emoji: '🧻', label: '화장지' };
const ITEM_PLUNGER: InventoryItem = { key: 'plunger', emoji: '🪠', label: '뚫어뻥' };
const ITEM_ROPE: InventoryItem = { key: 'rope', emoji: '🪢', label: '영수증 밧줄' };

export class SomekScene extends Phaser.Scene {
  private stageId = 0;
  private ended = false;

  // Inventory
  private inventory: InventoryItem[] = [];
  private inventorySlots: Phaser.GameObjects.Container[] = [];
  private draggingItem: InventoryItem | null = null;
  private dragSprite: Phaser.GameObjects.Text | null = null;

  // Scene interactable flags
  private receiptsTaken = false;
  private tapeTaken = false;
  private toiletPaperTaken = false;
  private plungerTaken = false;

  // Scene objects (for drop targets)
  private windowRect!: Phaser.GameObjects.Rectangle;
  private doorContainer!: Phaser.GameObjects.Container;

  // UI
  private messageText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private timerEvent!: Phaser.Time.TimerEvent;
  private timeLeft = 20;

  // Scene item sprites (to remove when picked up)
  private toiletPaperText!: Phaser.GameObjects.Text;
  private tapeText!: Phaser.GameObjects.Text;
  private plungerText!: Phaser.GameObjects.Text;
  private receiptsText!: Phaser.GameObjects.Text;

  // Inventory bar
  private inventoryBar!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'SomekScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.ended = false;
    this.inventory = [];
    this.inventorySlots = [];
    this.draggingItem = null;
    this.dragSprite = null;
    this.receiptsTaken = false;
    this.tapeTaken = false;
    this.toiletPaperTaken = false;
    this.plungerTaken = false;
    this.timeLeft = 20;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1a1f1a');

    // === BACKGROUND: bathroom tiles ===
    this.drawBathroomBackground(width, height);

    // === LEFT AREA (x: 0-300): Sink, mirror, items ===
    this.drawLeftArea(width, height);

    // === CENTER (x: 300-660): Door ===
    this.drawCenterArea(width, height);

    // === RIGHT AREA (x: 660-960): Window, plunger ===
    this.drawRightArea(width, height);

    // === BOTTOM: Receipts in pocket ===
    this.drawPocketArea(width, height);

    // === INVENTORY BAR (y: 490-540) ===
    this.drawInventoryBar(width, height);

    // === MESSAGE TEXT ===
    this.messageText = this.add.text(width / 2, height * 0.82, '', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#ffdd88',
      align: 'center',
      wordWrap: { width: 500 },
    }).setOrigin(0.5).setDepth(100);

    // === TIMER ===
    this.timerText = this.add.text(width - 20, 16, `⏱ ${this.timeLeft}`, {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#ff6666',
      fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(100);

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      repeat: 19,
      callback: () => {
        this.timeLeft--;
        this.timerText.setText(`⏱ ${this.timeLeft}`);
        if (this.timeLeft <= 5) {
          this.timerText.setColor('#ff0000');
          this.tweens.add({
            targets: this.timerText,
            scale: 1.3,
            duration: 100,
            yoyo: true,
          });
        }
        if (this.timeLeft <= 0 && !this.ended) {
          this.failTimeout();
        }
      },
    });

    // === DRAG HANDLING ===
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.dragSprite && this.draggingItem) {
        this.dragSprite.setPosition(pointer.x, pointer.y);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.dragSprite && this.draggingItem) {
        this.handleDrop(pointer.x, pointer.y);
      }
    });

    emitGameState({
      scene: 'SomekScene',
      stageId: this.stageId,
      progress: GameManager.progress,
      allCleared: GameManager.allCleared,
      stress: GameManager.stress,
    });
  }

  // ===================== DRAWING METHODS =====================

  private drawBathroomBackground(width: number, height: number) {
    // Floor tiles
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 20; col++) {
        const shade = (row + col) % 2 === 0 ? 0x222822 : 0x1e241e;
        this.add.rectangle(
          col * 50 + 25, row * 50 + 25, 48, 48, shade
        ).setAlpha(0.6);
      }
    }

    // Wall (upper 3/4)
    this.add.rectangle(width / 2, height * 0.35, width, height * 0.7, 0x2a332a)
      .setOrigin(0.5, 0.5);

    // Wall tile lines (horizontal)
    for (let y = 0; y < height * 0.7; y += 40) {
      this.add.rectangle(width / 2, y, width, 1, 0x333d33).setAlpha(0.5);
    }
    // Wall tile lines (vertical)
    for (let x = 0; x < width; x += 60) {
      this.add.rectangle(x, height * 0.35, 1, height * 0.7, 0x333d33).setAlpha(0.3);
    }

    // Floor (lower portion)
    this.add.rectangle(width / 2, height * 0.85, width, height * 0.3, 0x3a3530);
  }

  private drawLeftArea(_width: number, height: number) {
    // Mirror above sink
    const mirrorX = 150;
    const mirrorY = height * 0.15;
    this.add.rectangle(mirrorX, mirrorY, 100, 70, 0x556677)
      .setStrokeStyle(3, 0x888888);
    this.add.rectangle(mirrorX, mirrorY, 90, 60, 0x667788).setAlpha(0.6);

    // Sink / 세면대
    const sinkX = 150;
    const sinkY = height * 0.42;
    // Sink basin
    this.add.rectangle(sinkX, sinkY, 140, 50, 0x888888)
      .setStrokeStyle(2, 0x666666);
    // Sink pedestal
    this.add.rectangle(sinkX, sinkY + 55, 30, 80, 0x777777);
    // Faucet
    this.add.rectangle(sinkX, sinkY - 20, 8, 25, 0xaaaaaa);
    this.add.rectangle(sinkX + 8, sinkY - 30, 20, 6, 0xaaaaaa);

    // Toilet paper on sink (interactive)
    this.toiletPaperText = this.add.text(sinkX - 40, sinkY - 15, '🧻', {
      fontSize: '28px',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.toiletPaperText.on('pointerdown', () => this.pickUpToiletPaper());

    // Blue tape on sink (interactive)
    this.tapeText = this.add.text(sinkX + 40, sinkY - 15, '🔵', {
      fontSize: '24px',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    // Label
    this.add.text(sinkX + 40, sinkY - 35, '청테이프', {
      fontFamily: 'sans-serif',
      fontSize: '10px',
      color: '#88aacc',
    }).setOrigin(0.5);
    this.tapeText.on('pointerdown', () => this.pickUpTape());
  }

  private drawCenterArea(_width: number, height: number) {
    const doorX = 480;
    const doorY = height * 0.33;
    const doorW = 120;
    const doorH = 260;

    this.doorContainer = this.add.container(doorX, doorY);

    // Door frame
    const doorFrame = this.add.rectangle(0, 0, doorW + 10, doorH + 10, 0x1a1410);
    this.doorContainer.add(doorFrame);

    // Door body
    const doorBody = this.add.rectangle(0, 0, doorW, doorH, 0x4a3828)
      .setStrokeStyle(2, 0x3a2818);
    this.doorContainer.add(doorBody);

    // Door panels
    const panel1 = this.add.rectangle(0, -50, doorW - 20, 70, 0x3e2e1e)
      .setStrokeStyle(1, 0x5a4a3a);
    const panel2 = this.add.rectangle(0, 50, doorW - 20, 70, 0x3e2e1e)
      .setStrokeStyle(1, 0x5a4a3a);
    this.doorContainer.add([panel1, panel2]);

    // Door handle
    const handle = this.add.circle(40, 10, 8, 0xccaa44)
      .setStrokeStyle(1, 0xaa8833);
    this.doorContainer.add(handle);

    // Door label
    const doorLabel = this.add.text(0, -doorH / 2 - 15, '🚪', {
      fontSize: '24px',
    }).setOrigin(0.5);
    this.doorContainer.add(doorLabel);

    // Make door interactive
    doorBody.setInteractive({ useHandCursor: true });
    doorBody.on('pointerdown', () => this.trapDoor());
  }

  private drawRightArea(width: number, height: number) {
    // Window HIGH UP on wall
    const winX = width - 150;
    const winY = height * 0.12;
    const winW = 90;
    const winH = 60;

    // Window frame
    this.add.rectangle(winX, winY, winW + 8, winH + 8, 0x555555);
    this.windowRect = this.add.rectangle(winX, winY, winW, winH, 0x112244)
      .setStrokeStyle(2, 0x666666);

    // Window cross bars
    this.add.rectangle(winX, winY, 2, winH, 0x666666);
    this.add.rectangle(winX, winY, winW, 2, 0x666666);

    // Night sky hint through window
    this.add.text(winX, winY, '🌙', {
      fontSize: '18px',
    }).setOrigin(0.5);

    // Label
    this.add.text(winX, winY + winH / 2 + 12, '(높은 창문)', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#777777',
    }).setOrigin(0.5);

    // Plunger leaning against wall
    const plungerX = width - 80;
    const plungerY = height * 0.55;

    // Plunger stick
    this.add.rectangle(plungerX, plungerY - 15, 6, 60, 0xaa8844);
    // Plunger cup
    this.add.ellipse(plungerX, plungerY + 15, 30, 18, 0x3a2222);

    this.plungerText = this.add.text(plungerX, plungerY - 10, '🪠', {
      fontSize: '36px',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.plungerText.on('pointerdown', () => this.pickUpPlunger());
  }

  private drawPocketArea(width: number, _height: number) {
    // Pocket area at bottom
    const pocketX = width / 2;
    const pocketY = 460;

    // Pants pocket visual
    this.add.rectangle(pocketX, pocketY, 100, 40, 0x2a2a3a)
      .setStrokeStyle(1, 0x444455);

    // Receipts sticking out
    this.receiptsText = this.add.text(pocketX, pocketY - 8, '🧾🧾🧾', {
      fontSize: '20px',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.add.text(pocketX, pocketY + 18, '주머니', {
      fontFamily: 'sans-serif',
      fontSize: '10px',
      color: '#888888',
    }).setOrigin(0.5);

    this.receiptsText.on('pointerdown', () => this.pickUpReceipts());
  }

  private drawInventoryBar(width: number, _height: number) {
    this.inventoryBar = this.add.container(0, 0).setDepth(90);

    // Background bar
    const barBg = this.add.rectangle(width / 2, 515, width - 40, 44, 0x111115, 0.85)
      .setStrokeStyle(1, 0x444455);
    this.inventoryBar.add(barBg);

    // Inventory label
    const label = this.add.text(40, 515, '아이템:', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#666688',
    }).setOrigin(0, 0.5);
    this.inventoryBar.add(label);

    // 5 empty slots
    for (let i = 0; i < 5; i++) {
      const slotX = 130 + i * 80;
      const slotY = 515;
      const slot = this.add.container(slotX, slotY);

      const slotBg = this.add.rectangle(0, 0, 60, 36, 0x222233)
        .setStrokeStyle(1, 0x3a3a4a);
      slot.add(slotBg);

      this.inventoryBar.add(slot);
      this.inventorySlots.push(slot);
    }
  }

  // ===================== ITEM PICKUP =====================

  private pickUpReceipts() {
    if (this.ended || this.receiptsTaken) return;
    this.receiptsTaken = true;
    this.addToInventory(ITEM_RECEIPTS);
    this.showMessage('주머니 속 영수증이 끝도 없이 나온다...');
    this.glowAndRemove(this.receiptsText);
  }

  private pickUpTape() {
    if (this.ended || this.tapeTaken) return;
    this.tapeTaken = true;
    this.addToInventory(ITEM_TAPE);
    this.showMessage('청테이프를 손에 넣었다.');
    this.glowAndRemove(this.tapeText);
  }

  private pickUpToiletPaper() {
    if (this.ended || this.toiletPaperTaken) return;
    this.toiletPaperTaken = true;
    this.addToInventory(ITEM_TOILET_PAPER);
    this.showMessage('화장지를 챙겼다.');
    this.glowAndRemove(this.toiletPaperText);
  }

  private pickUpPlunger() {
    if (this.ended || this.plungerTaken) return;
    this.plungerTaken = true;
    this.addToInventory(ITEM_PLUNGER);
    this.showMessage('뚫어뻥을 집어들었다.');
    this.glowAndRemove(this.plungerText);
  }

  private glowAndRemove(obj: Phaser.GameObjects.Text) {
    this.tweens.add({
      targets: obj,
      scale: 1.5,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => obj.destroy(),
    });
  }

  // ===================== INVENTORY SYSTEM =====================

  private addToInventory(item: InventoryItem) {
    this.inventory.push(item);
    this.refreshInventoryDisplay();
  }

  private removeFromInventory(key: string) {
    this.inventory = this.inventory.filter(i => i.key !== key);
    this.refreshInventoryDisplay();
  }

  private refreshInventoryDisplay() {
    // Clear old slot contents
    for (const slot of this.inventorySlots) {
      // Remove all children except the background rectangle (first child)
      while (slot.list.length > 1) {
        const child = slot.list[slot.list.length - 1];
        slot.remove(child, true);
      }
    }

    // Populate slots
    for (let i = 0; i < this.inventory.length && i < 5; i++) {
      const item = this.inventory[i];
      const slot = this.inventorySlots[i];

      const itemText = this.add.text(0, 0, item.emoji, {
        fontSize: '22px',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true, draggable: false });

      // On pointer down: start dragging
      itemText.on('pointerdown', () => {
        if (this.ended) return;
        this.startDrag(item);
      });

      slot.add(itemText);

      // Slot label
      const slotLabel = this.add.text(0, 22, item.label, {
        fontFamily: 'sans-serif',
        fontSize: '8px',
        color: '#aaaacc',
      }).setOrigin(0.5);
      slot.add(slotLabel);
    }
  }

  private startDrag(item: InventoryItem) {
    if (this.ended) return;
    this.draggingItem = item;
    const pointer = this.input.activePointer;
    this.dragSprite = this.add.text(pointer.x, pointer.y, item.emoji, {
      fontSize: '32px',
    }).setOrigin(0.5).setDepth(200).setAlpha(0.85);
  }

  private handleDrop(x: number, y: number) {
    if (!this.draggingItem || this.ended) {
      this.cleanupDrag();
      return;
    }

    const item = this.draggingItem;
    this.cleanupDrag();

    // Check: dropped on window?
    const winBounds = this.windowRect.getBounds();
    if (Phaser.Geom.Rectangle.Contains(winBounds, x, y)) {
      this.handleDropOnWindow(item);
      return;
    }

    // Check: dropped on another inventory slot?
    for (let i = 0; i < this.inventory.length && i < 5; i++) {
      const other = this.inventory[i];
      if (other.key === item.key) continue;

      const slot = this.inventorySlots[i];
      const slotBounds = new Phaser.Geom.Rectangle(
        slot.x - 30, slot.y - 18, 60, 36
      );
      if (Phaser.Geom.Rectangle.Contains(slotBounds, x, y)) {
        this.handleCombine(item, other);
        return;
      }
    }

    // Dropped on door?
    const doorBounds = new Phaser.Geom.Rectangle(
      480 - 65, this.scale.height * 0.33 - 135, 130, 270
    );
    if (Phaser.Geom.Rectangle.Contains(doorBounds, x, y)) {
      this.showMessage('문에는 사용할 수 없다...');
      return;
    }

    // Dropped nowhere useful
    this.showMessage('여기에는 사용할 수 없다.');
  }

  private cleanupDrag() {
    if (this.dragSprite) {
      this.dragSprite.destroy();
      this.dragSprite = null;
    }
    this.draggingItem = null;
  }

  // ===================== DROP INTERACTIONS =====================

  private handleDropOnWindow(item: InventoryItem) {
    if (item.key === 'rope') {
      this.successEscape();
      return;
    }

    if (item.key === 'paper') {
      // TRAP: toilet paper tears
      this.removeFromInventory('paper');
      this.showMessage('찢어졌다... 화장지로는 역부족이다.');
      // Tear animation
      const tearText = this.add.text(this.scale.width - 150, this.scale.height * 0.12, '💨', {
        fontSize: '28px',
      }).setOrigin(0.5).setDepth(150);
      this.tweens.add({
        targets: tearText,
        y: this.scale.height * 0.35,
        alpha: 0,
        duration: 800,
        ease: 'Quad.easeOut',
        onComplete: () => tearText.destroy(),
      });
      return;
    }

    if (item.key === 'plunger') {
      // TRAP: plunger bounces off
      this.removeFromInventory('plunger');
      this.showMessage('통! 뚫어뻥이 튕겨나갔다!');
      // Bounce animation
      const bounceEmoji = this.add.text(this.scale.width - 150, this.scale.height * 0.12, '🪠', {
        fontSize: '28px',
      }).setOrigin(0.5).setDepth(150);
      this.tweens.add({
        targets: bounceEmoji,
        y: this.scale.height * 0.7,
        x: this.scale.width - 200,
        duration: 600,
        ease: 'Bounce.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: bounceEmoji,
            alpha: 0,
            duration: 300,
            onComplete: () => bounceEmoji.destroy(),
          });
        },
      });
      return;
    }

    // Other items on window
    this.showMessage('이걸로는 창문을 통과할 수 없다.');
  }

  private handleCombine(itemA: InventoryItem, itemB: InventoryItem) {
    const keys = [itemA.key, itemB.key].sort();

    // Valid combination: receipts + tape = rope
    if (keys[0] === 'receipts' && keys[1] === 'tape') {
      this.removeFromInventory('receipts');
      this.removeFromInventory('tape');

      // Crafting animation
      this.showMessage('영수증과 테이프로 밧줄을 만들었다!');

      const craftFx = this.add.text(this.scale.width / 2, this.scale.height / 2, '🧾 + 🔵 = 🪢', {
        fontSize: '36px',
      }).setOrigin(0.5).setDepth(200).setAlpha(0);

      this.tweens.add({
        targets: craftFx,
        alpha: 1,
        scale: 1.3,
        duration: 400,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: craftFx,
            alpha: 0,
            y: this.scale.height / 2 - 40,
            duration: 500,
            delay: 400,
            onComplete: () => {
              craftFx.destroy();
              this.addToInventory(ITEM_ROPE);
            },
          });
        },
      });
      return;
    }

    // Invalid combination
    this.showMessage('이 조합은 아무 일도 일어나지 않는다...');
  }

  // ===================== TRAP: DOOR =====================

  private trapDoor() {
    if (this.ended) return;
    this.ended = true;
    this.timerEvent.remove();

    const { height } = this.scale;

    // Door opens slightly
    this.tweens.add({
      targets: this.doorContainer,
      x: this.doorContainer.x - 20,
      scaleX: 0.85,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Light from outside
        const light = this.add.rectangle(460, height * 0.33, 30, 260, 0xffeeaa, 0.4)
          .setDepth(50);

        // Boss appears
        this.time.delayedCall(400, () => {
          const boss = this.add.text(455, height * 0.3, '🤵', {
            fontSize: '50px',
          }).setOrigin(0.5).setDepth(55).setAlpha(0);

          this.tweens.add({
            targets: boss,
            alpha: 1,
            duration: 200,
          });

          this.showMessage('어? 김대리 어디 가? 한잔 더!');

          // Door slams shut
          this.time.delayedCall(800, () => {
            light.destroy();
            this.tweens.add({
              targets: this.doorContainer,
              x: this.doorContainer.x + 20,
              scaleX: 1,
              duration: 150,
              ease: 'Quad.easeIn',
            });

            // Camera shake
            this.cameras.main.shake(200, 0.01);

            this.time.delayedCall(1200, () => {
              this.scene.start('ResultScene', { stageId: this.stageId, success: false });
            });
          });
        });
      },
    });
  }

  // ===================== FAIL: TIMEOUT =====================

  private failTimeout() {
    if (this.ended) return;
    this.ended = true;
    this.timerEvent.remove();

    this.cameras.main.flash(300, 80, 0, 0);
    this.showMessage('부장님이 화장실까지 찾아왔다...');

    const boss = this.add.text(this.scale.width / 2, this.scale.height / 2, '🤵', {
      fontSize: '64px',
    }).setOrigin(0.5).setDepth(200).setScale(0);

    this.tweens.add({
      targets: boss,
      scale: 1.5,
      duration: 600,
      ease: 'Back.easeOut',
    });

    this.time.delayedCall(2000, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success: false });
    });
  }

  // ===================== SUCCESS =====================

  private successEscape() {
    if (this.ended) return;
    this.ended = true;
    this.timerEvent.remove();

    const { width, height } = this.scale;
    const winX = width - 150;
    const winY = height * 0.12;

    // Rope attaches to window
    this.removeFromInventory('rope');
    this.showMessage('영수증 밧줄을 창문에 걸었다!');

    // Draw rope dangling from window
    const ropeSegments: Phaser.GameObjects.Text[] = [];
    for (let i = 0; i < 6; i++) {
      const seg = this.add.text(winX, winY + 30 + i * 22, '🪢', {
        fontSize: '16px',
      }).setOrigin(0.5).setAlpha(0).setDepth(60);
      ropeSegments.push(seg);
    }

    // Animate rope appearing segment by segment
    ropeSegments.forEach((seg, i) => {
      this.tweens.add({
        targets: seg,
        alpha: 1,
        duration: 150,
        delay: i * 100,
      });
    });

    // Character climbing
    this.time.delayedCall(800, () => {
      const climber = this.add.text(winX, height * 0.65, '🧑', {
        fontSize: '32px',
      }).setOrigin(0.5).setDepth(70);

      this.tweens.add({
        targets: climber,
        y: winY,
        duration: 1500,
        ease: 'Quad.easeInOut',
        onComplete: () => {
          // Character disappears through window
          this.tweens.add({
            targets: climber,
            alpha: 0,
            scale: 0.3,
            duration: 300,
          });

          // Camera pan up + fade to night sky
          this.cameras.main.pan(winX, winY, 800, 'Sine.easeInOut');

          this.time.delayedCall(500, () => {
            // Night sky overlay
            const sky = this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a2e)
              .setDepth(150).setAlpha(0);
            this.tweens.add({
              targets: sky,
              alpha: 0.9,
              duration: 600,
            });

            // Stars
            for (let s = 0; s < 12; s++) {
              const starX = Phaser.Math.Between(100, width - 100);
              const starY = Phaser.Math.Between(50, height - 150);
              const star = this.add.text(starX, starY, '⭐', {
                fontSize: `${Phaser.Math.Between(10, 18)}px`,
              }).setOrigin(0.5).setDepth(160).setAlpha(0);
              this.tweens.add({
                targets: star,
                alpha: Phaser.Math.FloatBetween(0.4, 1),
                duration: 400,
                delay: 300 + s * 80,
              });
            }

            // Moon
            const moon = this.add.text(width / 2, height * 0.25, '🌙', {
              fontSize: '48px',
            }).setOrigin(0.5).setDepth(160).setAlpha(0);
            this.tweens.add({
              targets: moon,
              alpha: 1,
              duration: 500,
              delay: 500,
            });

            // Success text
            const successText = this.add.text(width / 2, height * 0.55, '탈출 성공!', {
              fontFamily: 'sans-serif',
              fontSize: '48px',
              color: '#00ff88',
              fontStyle: 'bold',
              stroke: '#003322',
              strokeThickness: 4,
            }).setOrigin(0.5).setDepth(170).setScale(0);

            this.tweens.add({
              targets: successText,
              scale: 1,
              duration: 500,
              delay: 800,
              ease: 'Back.easeOut',
            });

            const subText = this.add.text(width / 2, height * 0.68, '자유다... 오늘 밤만이라도.', {
              fontFamily: 'sans-serif',
              fontSize: '18px',
              color: '#aaddaa',
            }).setOrigin(0.5).setDepth(170).setAlpha(0);

            this.tweens.add({
              targets: subText,
              alpha: 1,
              duration: 400,
              delay: 1200,
            });

            this.time.delayedCall(3000, () => {
              this.scene.start('ResultScene', { stageId: this.stageId, success: true });
            });
          });
        },
      });
    });
  }

  // ===================== UI HELPERS =====================

  private showMessage(msg: string) {
    this.messageText.setText(msg);
    this.messageText.setAlpha(1);

    // Auto-fade after a while
    this.tweens.killTweensOf(this.messageText);
    this.tweens.add({
      targets: this.messageText,
      alpha: 0,
      duration: 400,
      delay: 2500,
    });
  }
}

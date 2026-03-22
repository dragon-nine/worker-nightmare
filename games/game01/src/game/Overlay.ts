import Phaser from 'phaser';

const DIM_ALPHA = 0.90;
const DIM_COLOR = 0x000000;
const CONTENT_DEPTH = 401;
const OVERLAY_DEPTH = 400;

export class Overlay {
  private scene: Phaser.Scene;
  private items: Phaser.GameObjects.GameObject[] = [];
  private dimRect?: Phaser.GameObjects.Rectangle;
  private onCloseCallback?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** 오버레이 열기 (딤 배경 생성) */
  open(options?: { fadeIn?: boolean; onClose?: () => void; gradient?: { top: string; bottom: string } }): this {
    const { width, height } = this.scene.scale;
    this.onCloseCallback = options?.onClose;

    if (options?.gradient) {
      // 캔버스 그라데이션 배경 (위→아래, 불투명)
      const texKey = '__ov_grad__';
      if (this.scene.textures.exists(texKey)) this.scene.textures.remove(texKey);
      const canvas = this.scene.textures.createCanvas(texKey, width, height)!;
      const ctx = canvas.context;
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, options.gradient.top);
      grad.addColorStop(1, options.gradient.bottom);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      canvas.refresh();

      const bg = this.scene.add.image(width / 2, height / 2, texKey)
        .setDepth(OVERLAY_DEPTH).setInteractive();
      if (options.fadeIn) {
        bg.setAlpha(0);
        this.scene.tweens.add({ targets: bg, alpha: 1, duration: 400 });
      } else {
        bg.setAlpha(1);
      }
      this.items.push(bg);
      this.dimRect = undefined as unknown as Phaser.GameObjects.Rectangle;
    } else if (options?.fadeIn) {
      this.dimRect = this.scene.add.rectangle(width / 2, height / 2, width, height, DIM_COLOR, 0)
        .setDepth(OVERLAY_DEPTH).setInteractive();
      this.scene.tweens.add({ targets: this.dimRect, fillAlpha: DIM_ALPHA, duration: 400 });
    } else {
      this.dimRect = this.scene.add.rectangle(width / 2, height / 2, width, height, DIM_COLOR, DIM_ALPHA)
        .setDepth(OVERLAY_DEPTH).setInteractive();
    }

    if (this.dimRect) this.items.push(this.dimRect);
    return this;
  }

  /** 딤 영역 클릭 시 닫기 활성화 */
  closeOnDimClick(): this {
    this.dimRect?.on('pointerdown', () => this.close());
    return this;
  }

  /** 텍스트 추가 */
  addText(x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
    const obj = this.scene.add.text(x, y, text, {
      fontFamily: 'GMarketSans, sans-serif',
      ...style,
    }).setOrigin(0.5).setDepth(CONTENT_DEPTH);
    this.items.push(obj);
    return obj;
  }

  /** 버튼 추가 (배경 사각형 + 텍스트) */
  addButton(
    x: number, y: number, w: number, h: number,
    label: string, color: number,
    onClick: () => void,
    textStyle?: Partial<Phaser.Types.GameObjects.Text.TextStyle>,
  ): { bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text } {
    const bg = this.scene.add.rectangle(x, y, w, h, color)
      .setInteractive({ useHandCursor: true }).setDepth(CONTENT_DEPTH).setAlpha(0);
    const text = this.scene.add.text(x, y, label, {
      fontFamily: 'GMarketSans, sans-serif',
      fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
      ...textStyle,
    }).setOrigin(0.5).setDepth(CONTENT_DEPTH + 1).setAlpha(0);

    const hoverColor = Phaser.Display.Color.ValueToColor(color).darken(15).color;
    bg.on('pointerover', () => bg.setFillStyle(hoverColor));
    bg.on('pointerout', () => bg.setFillStyle(color));
    bg.on('pointerdown', onClick);

    this.items.push(bg, text);
    return { bg, text };
  }

  /** 임의의 게임 오브젝트를 오버레이에 등록 */
  add<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.items.push(obj);
    return obj;
  }

  /** 등록된 아이템들을 페이드인 */
  fadeInItems(targets: Phaser.GameObjects.GameObject[], delay = 0): this {
    this.scene.tweens.add({
      targets, alpha: 1, duration: 300, delay,
    });
    return this;
  }

  /** 오버레이 닫기 (모든 아이템 destroy) */
  close() {
    this.onCloseCallback?.();
    this.items.forEach(item => item.destroy());
    this.items = [];
    this.dimRect = undefined;
  }

  /** 아이템 목록 반환 */
  getItems() {
    return this.items;
  }

  /** 컨텐츠용 depth 반환 */
  static get DEPTH() { return CONTENT_DEPTH; }
  static get DEPTH_TOP() { return CONTENT_DEPTH + 1; }
}

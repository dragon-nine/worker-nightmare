/**
 * 배경 패럴랙스 스크롤 관리
 * 초기: bg-1→2→3→4→5→6, 이후 4→5→6 무한 루프
 */

const BG_INITIAL = ['bg-1', 'bg-2', 'bg-3', 'bg-4', 'bg-5', 'bg-6'];
const BG_LOOP = ['bg-4', 'bg-5', 'bg-6'];
const PARALLAX_FACTOR = 0.05;

function getBgKey(idx: number): string {
  return idx < BG_INITIAL.length
    ? BG_INITIAL[idx]
    : BG_LOOP[(idx - BG_INITIAL.length) % BG_LOOP.length];
}

export class BackgroundManager {
  private sprites: Phaser.GameObjects.Image[] = [];
  private bgScale = 1;
  private nextIdx = 0;
  private screenHeight: number;

  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.screenHeight = scene.scale.height;
  }

  create() {
    const { width, height } = this.scene.scale;
    if (!this.scene.textures.exists('bg-1')) return;

    this.bgScale = width / this.scene.textures.get('bg-1').getSourceImage().width;

    let curY = height;
    let i = 0;
    while (curY > -height * 2 || i < 4) {
      const key = getBgKey(i);
      const srcH = this.scene.textures.get(key).getSourceImage().height * this.bgScale;
      curY -= srcH;
      const spr = this.scene.add.image(0, curY, key)
        .setOrigin(0, 0)
        .setScale(this.bgScale)
        .setDepth(0);
      this.sprites.push(spr);
      i++;
    }
    this.nextIdx = i;
  }

  scroll(scrollDelta: number) {
    if (this.sprites.length === 0) return;

    const dy = scrollDelta * PARALLAX_FACTOR;
    for (const spr of this.sprites) {
      spr.y += dy;
    }

    for (const spr of this.sprites) {
      if (spr.y > this.screenHeight) {
        let minTop = Infinity;
        for (const s of this.sprites) {
          if (s.y < minTop) minTop = s.y;
        }
        const nextKey = getBgKey(this.nextIdx);
        spr.setTexture(nextKey);
        spr.setScale(this.bgScale);
        spr.y = minTop - spr.displayHeight;
        this.nextIdx++;
      }
    }
  }
}

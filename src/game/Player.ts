import Phaser from 'phaser';
import type { Lane, LanePositions } from './constants';
import { RABBIT_SIZE_RATIO } from './constants';

export class Player {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Image;
  private laneX: LanePositions;
  private rabbitSize: number;
  currentLane: Lane = 'left';

  constructor(scene: Phaser.Scene, laneX: LanePositions, laneW: number, startY: number) {
    this.scene = scene;
    this.laneX = laneX;

    this.rabbitSize = laneW * RABBIT_SIZE_RATIO;
    this.sprite = scene.add.image(laneX.left, startY, 'rabbit-front')
      .setDisplaySize(this.rabbitSize, this.rabbitSize)
      .setOrigin(0.5, 0.5)
      .setDepth(150);
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  setHurt(hurt: boolean) {
    this.sprite.setTint(hurt ? 0xff4444 : 0xffffff);
  }

  switchTo(lane: Lane) {
    this.currentLane = lane;
  }

  /** 텍스처를 옆면으로 전환 (오른쪽이 기본, 왼쪽은 flipX) */
  private setSideTexture(targetLane: Lane) {
    this.sprite.setTexture('rabbit-side');
    this.sprite.setDisplaySize(this.rabbitSize, this.rabbitSize);
    this.sprite.setFlipX(targetLane === 'left');
  }

  /** 텍스처를 뒷면으로 전환 */
  private setBackTexture() {
    this.sprite.setTexture('rabbit-back');
    this.sprite.setDisplaySize(this.rabbitSize, this.rabbitSize);
    this.sprite.setFlipX(false);
  }

  /** 전환 실패: 옆면 → 부딪힘 → onDone */
  animateCrashSwitch(targetLane: Lane, onDone: () => void) {
    this.setSideTexture(targetLane);
    this.sprite.setAngle(0);
    const bumpX = this.sprite.x + (targetLane === 'right' ? 30 : -30);
    this.scene.tweens.add({
      targets: this.sprite, x: bumpX,
      duration: 80, ease: 'Quad.easeOut',
      onComplete: onDone,
    });
  }

  /** 전환 성공: 옆면 → 이동 */
  animateSwitch(targetLane: Lane) {
    this.setSideTexture(targetLane);
    this.sprite.setAngle(0);
    this.scene.tweens.add({
      targets: this.sprite,
      x: this.laneX[targetLane],
      duration: 120, ease: 'Quad.easeOut',
    });
  }

  /** 전진 충돌: 위로 튕김 → onDone */
  animateForwardCrash(onDone: () => void) {
    this.setBackTexture();
    const originY = this.sprite.y;
    this.scene.tweens.add({
      targets: this.sprite,
      y: originY - 25,
      duration: 100, ease: 'Quad.easeOut',
      yoyo: true,
      onComplete: onDone,
    });
  }

  /** 전진 성공: 뒷면 → scrollTo */
  animateForward(onAngleReset: () => void) {
    this.setBackTexture();
    this.sprite.setAngle(0);
    onAngleReset();
  }

  /** 스크롤 후 위치 맞추기 */
  scrollTo(screenY: number) {
    this.scene.tweens.add({
      targets: this.sprite,
      x: this.laneX[this.currentLane],
      y: screenY,
      duration: 100, ease: 'Quad.easeOut',
    });
  }
}

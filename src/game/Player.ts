import Phaser from 'phaser';
import type { Lane, LanePositions } from './constants';
import { RABBIT_SIZE_RATIO } from './constants';

export class Player {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Image;
  private laneX: LanePositions;
  currentLane: Lane = 'left';

  constructor(scene: Phaser.Scene, laneX: LanePositions, laneW: number, startY: number) {
    this.scene = scene;
    this.laneX = laneX;

    const rabbitSize = laneW * RABBIT_SIZE_RATIO;
    this.sprite = scene.add.image(laneX.left, startY, 'rabbit')
      .setDisplaySize(rabbitSize, rabbitSize)
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

  /** 전환 실패: 회전 → 부딪힘 → onDone */
  animateCrashSwitch(targetLane: Lane, onDone: () => void) {
    const targetAngle = targetLane === 'right' ? 90 : -90;
    this.scene.tweens.add({
      targets: this.sprite,
      angle: targetAngle,
      duration: 100, ease: 'Quad.easeOut',
      onComplete: () => {
        const bumpX = this.sprite.x + (targetLane === 'right' ? 30 : -30);
        this.scene.tweens.add({
          targets: this.sprite, x: bumpX,
          duration: 80, ease: 'Quad.easeOut',
          onComplete: onDone,
        });
      },
    });
  }

  /** 전환 성공: 회전 → 이동 */
  animateSwitch(targetLane: Lane) {
    const targetAngle = targetLane === 'right' ? 90 : -90;
    this.scene.tweens.add({
      targets: this.sprite,
      angle: targetAngle,
      duration: 100, ease: 'Quad.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.sprite,
          x: this.laneX[targetLane],
          duration: 120, ease: 'Quad.easeOut',
        });
      },
    });
  }

  /** 전진 충돌: 위로 튕김 → onDone */
  animateForwardCrash(onDone: () => void) {
    const originY = this.sprite.y;
    this.scene.tweens.add({
      targets: this.sprite,
      y: originY - 25,
      duration: 100, ease: 'Quad.easeOut',
      yoyo: true,
      onComplete: onDone,
    });
  }

  /** 전진 성공: 각도 리셋 → scrollTo */
  animateForward(onAngleReset: () => void) {
    this.scene.tweens.add({
      targets: this.sprite,
      angle: 0,
      duration: 80, ease: 'Quad.easeOut',
      onComplete: onAngleReset,
    });
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

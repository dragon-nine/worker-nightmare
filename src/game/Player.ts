import Phaser from 'phaser';
import { RABBIT_SIZE_RATIO } from './constants';

export class Player {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Image;
  private rabbitSize: number;
  private characterId: string;
  currentLane = 0;

  /** 캐릭터별 텍스처 키 */
  private get keyFront() { return `${this.characterId}-front`; }
  private get keyBack()  { return `${this.characterId}-back`; }
  private get keySide()  { return `${this.characterId}-side`; }

  constructor(
    scene: Phaser.Scene,
    laneW: number,
    startX: number,
    startY: number,
    startLane: number,
    characterId = 'rabbit',
  ) {
    this.scene = scene;
    this.currentLane = startLane;
    this.characterId = characterId;

    this.rabbitSize = laneW * RABBIT_SIZE_RATIO;
    this.sprite = scene.add.image(startX, startY, this.keyFront)
      .setDisplaySize(this.rabbitSize, this.rabbitSize)
      .setOrigin(0.5, 0.5)
      .setDepth(150);
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  setHurt(hurt: boolean) {
    this.sprite.setTint(hurt ? 0xff4444 : 0xffffff);
  }

  /** 부활 시 스프라이트 상태 복구 */
  resetSprite() {
    this.sprite.setAlpha(1);
    this.sprite.setScale(1);
    this.sprite.setAngle(0);
    this.sprite.setTexture(this.keyFront);
    this.sprite.setDisplaySize(this.rabbitSize, this.rabbitSize);
  }

  switchTo(lane: number) {
    this.currentLane = lane;
  }

  /** 전환 성공: 타겟 화면 X로 이동 */
  animateSwitch(targetScreenX: number) {
    const goingRight = targetScreenX > this.sprite.x;
    this.sprite.setTexture(this.keySide);
    this.sprite.setFlipX(!goingRight);
    this.sprite.setDisplaySize(this.rabbitSize, this.rabbitSize);
    this.sprite.setAngle(0);
    this.scene.tweens.add({
      targets: this.sprite,
      x: targetScreenX,
      duration: 120, ease: 'Quad.easeOut',
    });
  }

  /** 전환 실패: 잘못된 레인으로 이동 → 떨어짐 */
  animateCrashSwitch(bumpX: number, onDone: () => void) {
    const goingRight = bumpX > this.sprite.x;
    this.sprite.setTexture(this.keySide);
    this.sprite.setDisplaySize(this.rabbitSize, this.rabbitSize);
    this.sprite.setFlipX(!goingRight);
    this.sprite.setAngle(0);

    // 1단계: 잘못된 레인으로 이동
    this.scene.tweens.add({
      targets: this.sprite,
      x: bumpX,
      duration: 120, ease: 'Quad.easeOut',
      onComplete: () => {
        // 2단계: 떨어짐
        this.animateFall(onDone);
      },
    });
  }

  /** 전진 성공 */
  animateForward(onDone: () => void) {
    this.sprite.setTexture(this.keyBack);
    this.sprite.setDisplaySize(this.rabbitSize, this.rabbitSize);
    this.sprite.setFlipX(false);
    this.sprite.setAngle(0);
    onDone();
  }

  /** 다음 타일 방향을 바라보도록 스프라이트 변경 */
  faceNextTile(nextLane: number) {
    if (nextLane > this.currentLane) {
      // 다음이 오른쪽
      this.sprite.setTexture(this.keySide);
      this.sprite.setFlipX(false);
    } else if (nextLane < this.currentLane) {
      // 다음이 왼쪽
      this.sprite.setTexture(this.keySide);
      this.sprite.setFlipX(true);
    } else {
      // 같은 레인 (직진)
      this.sprite.setTexture(this.keyBack);
      this.sprite.setFlipX(false);
    }
    this.sprite.setDisplaySize(this.rabbitSize, this.rabbitSize);
    this.sprite.setAngle(0);
  }

  /** 전진 충돌: 한 칸 전진 → 떨어짐 */
  animateForwardCrash(onDone: () => void) {
    this.sprite.setTexture(this.keyBack);
    this.sprite.setDisplaySize(this.rabbitSize, this.rabbitSize);
    this.sprite.setAngle(0);

    // 1단계: 한 칸 위로 이동 (전진 시도)
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.sprite.y - this.rabbitSize,
      duration: 120, ease: 'Quad.easeOut',
      onComplete: () => {
        // 2단계: 떨어짐
        this.animateFall(onDone);
      },
    });
  }

  /** 대전 패널티: 잠깐 앞으로 튕겼다가 제자리 복귀 */
  animateForwardPenalty(onDone: () => void) {
    const startY = this.sprite.y;
    this.sprite.setTexture(this.keyBack);
    this.sprite.setDisplaySize(this.rabbitSize, this.rabbitSize);
    this.sprite.setAngle(0);

    this.scene.tweens.add({
      targets: this.sprite,
      y: startY - this.rabbitSize * 0.22,
      duration: 90,
      ease: 'Quad.easeOut',
      yoyo: true,
      hold: 180,
      onComplete: () => {
        this.sprite.setY(startY);
        onDone();
      },
    });
  }

  /** 대전 패널티: 잘못된 방향으로 살짝 튕겼다가 제자리 복귀 */
  animateSwitchPenalty(direction: 'left' | 'right', onDone: () => void) {
    const startX = this.sprite.x;
    const offset = this.rabbitSize * 0.18 * (direction === 'right' ? 1 : -1);
    this.sprite.setTexture(this.keySide);
    this.sprite.setDisplaySize(this.rabbitSize, this.rabbitSize);
    this.sprite.setFlipX(direction === 'left');
    this.sprite.setAngle(0);

    this.scene.tweens.add({
      targets: this.sprite,
      x: startX + offset,
      duration: 90,
      ease: 'Quad.easeOut',
      yoyo: true,
      hold: 180,
      onComplete: () => {
        this.sprite.setX(startX);
        onDone();
      },
    });
  }

  /** 공통 낙하: 정면 전환 → 후들후들 → 쏙! 빨려들어감 */
  private animateFall(onDone: () => void) {
    this.sprite.setTexture(this.keyFront);
    this.sprite.setDisplaySize(this.rabbitSize, this.rabbitSize);
    this.sprite.setFlipX(false);
    this.sprite.setAngle(0);

    const baseX = this.sprite.x;

    // 1단계: 후들후들 떨림 (허우적대는 느낌)
    let shakeCount = 0;
    const shakeEvent = this.scene.time.addEvent({
      delay: 40,
      repeat: 7,
      callback: () => {
        shakeCount++;
        const offset = (shakeCount % 2 === 0 ? 1 : -1) * 5;
        this.sprite.setX(baseX + offset);
        this.sprite.setAngle(offset * 0.8);
      },
    });

    // 2단계: 쏙! 빨려들어감
    this.scene.time.delayedCall(350, () => {
      shakeEvent.destroy();
      this.sprite.setX(baseX);
      this.sprite.setAngle(0);

      // 살짝 커졌다가 (으악!) → 쏙 빨려들어감
      const curScaleX = this.sprite.scaleX;
      const curScaleY = this.sprite.scaleY;
      this.scene.tweens.add({
        targets: this.sprite,
        scaleX: curScaleX * 1.15,
        scaleY: curScaleY * 1.15,
        duration: 80,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: this.sprite,
            scaleX: 0,
            scaleY: 0,
            y: this.sprite.y + 20,
            alpha: 0,
            duration: 250,
            ease: 'Back.easeIn',
            onComplete: onDone,
          });
        },
      });
    });
  }

  /** 스크롤 후 위치 맞추기 */
  scrollTo(screenX: number, screenY: number) {
    this.scene.tweens.add({
      targets: this.sprite,
      x: screenX,
      y: screenY,
      duration: 100, ease: 'Quad.easeOut',
    });
  }

  /** X만 업데이트 (Y 고정) */
  scrollToX(screenX: number) {
    this.scene.tweens.add({
      targets: this.sprite,
      x: screenX,
      duration: 100, ease: 'Quad.easeOut',
    });
  }
}

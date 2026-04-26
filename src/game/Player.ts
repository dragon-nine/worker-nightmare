import Phaser from 'phaser';
import { RABBIT_SIZE_RATIO } from './constants';
import { CHARACTER_SPECS } from './game.config';

/** dust 효과 1회 재생 시간 (ms). 한 번 시작되면 캐릭터 이동 시간과 무관하게 이 길이만큼 살아있다 사라짐. */
const DUST_DURATION_MS = 400;

/** 떨어지기 직전 단계 시간 (ms) — 흔들림 또는 fall anim 1회 재생 후 곧바로 suck-in 단계로 넘어감. */
const FALL_PRE_SUCK_MS = 350;

export class Player {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Sprite;
  private rabbitSize: number;
  private characterId: string;
  /** 한 번에 한 dust 만 — 이전 dust 가 살아있으면 새 dust 가 spawn 될 때 destroy. */
  private activeDust: Phaser.GameObjects.Sprite | null = null;
  currentLane = 0;

  /** 캐릭터별 텍스처 키 */
  private get keyFront() { return `${this.characterId}-front`; }
  private get keyBack()  { return `${this.characterId}-back`; }
  private get keySide()  { return `${this.characterId}-side`; }
  private get keyFall()  { return `${this.characterId}-fall`; }

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
    this.sprite = scene.add.sprite(startX, startY, this.keyFront)
      .setDisplaySize(this.rabbitSize, this.rabbitSize)
      .setOrigin(0.5, 0.5)
      .setDepth(150);
    // 1회짜리 anim 이 끝나면 첫 프레임 (정지 포즈) 으로 복귀.
    // 단, fall anim 은 suck-in 연출이 곧바로 이어지므로 마지막 tumbling 프레임을 유지.
    this.sprite.on('animationcomplete', (anim: Phaser.Animations.Animation) => {
      if (anim.key === `${this.keyFall}-walk`) return;
      this.sprite.setFrame(0);
    });
  }

  /**
   * 걸을 때 먼지 이펙트 스폰 (1회 재생 후 자동 삭제). 이동 지속시간과 무관하게 DUST_DURATION_MS 로 여운.
   * 오프셋/크기는 `CHARACTER_SPECS[characterId].dust` 에서 조회 (dust-preview.html 로 조정한 값).
   * 반환된 sprite 에 caller 가 tween 을 걸면 캐릭터 이동을 따라감.
   * 캐릭터에 dust spec 이 등록되지 않았거나 anim 이 없으면 null.
   */
  private spawnDust(variant: 'fwd' | 'side', flipX = false): Phaser.GameObjects.Sprite | null {
    const dustSpec = CHARACTER_SPECS[this.characterId]?.dust;
    if (!dustSpec) return null;

    const texKey = `${this.characterId}-dust-${variant}`;
    const animKey = `${texKey}-walk`;
    if (!this.scene.anims.exists(animKey)) return null;

    const offsets = dustSpec[variant];
    // 옆 dust: 이동 방향 반대쪽(뒤쪽) 에 위치 — flipX=true → 왼쪽 이동 → dust 는 오른쪽.
    // 앞 dust: xOffset=0 이라 flipX 무관하게 같은 위치.
    const trailX = this.rabbitSize * offsets.xOffset;
    const x = this.sprite.x + (flipX ? trailX : -trailX);
    const y = this.sprite.y + this.rabbitSize * offsets.yOffset;
    const size = this.rabbitSize * offsets.size;

    // 이전 dust 가 아직 살아있으면 즉시 제거 — 빠른 연속 동작에서 잔상 방지
    if (this.activeDust && this.activeDust.active) {
      this.activeDust.destroy();
    }

    const dust = this.scene.add.sprite(x, y, texKey)
      .setDisplaySize(size, size)
      .setOrigin(0.5, 0.5)
      .setDepth(this.sprite.depth - 1)
      .setFlipX(flipX);

    dust.play({ key: animKey, duration: DUST_DURATION_MS });
    dust.once('animationcomplete', () => {
      dust.destroy();
      if (this.activeDust === dust) this.activeDust = null;
    });
    this.activeDust = dust;
    return dust;
  }

  /**
   * 방향 텍스처 전환.
   * - `durationMs` 지정: 그 시간 동안 `${key}-walk` anim 1회 재생 (한 칸 이동 중)
   * - 생략: 정지 프레임(0) — 방향만 재지정, 부활 복구, 튕김 등
   */
  private setFacing(key: string, durationMs?: number) {
    const animKey = `${key}-walk`;
    if (durationMs != null && this.scene.anims.exists(animKey)) {
      this.sprite.play({ key: animKey, duration: durationMs });
    } else {
      if (this.sprite.anims.isPlaying) this.sprite.anims.stop();
      this.sprite.setTexture(key);
      this.sprite.setFrame(0);
    }
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  setHurt(hurt: boolean) {
    this.sprite.setTint(hurt ? 0xff4444 : 0xffffff);
  }

  /** 튜토리얼 transition 중 Phaser 스프라이트 숨김 — DOM 미러가 대체 렌더 */
  setVisibleForTutorial(visible: boolean) {
    this.sprite.setAlpha(visible ? 1 : 0);
  }

  /** free-play 롤백 시 즉시 위치 복원용 */
  setPosition(x: number, y: number) {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setPosition(x, y);
    this.sprite.setAlpha(1);
    this.sprite.setScale(1);
    this.sprite.setAngle(0);
    this.sprite.clearTint();
    this.setFacing(this.keyFront);
    this.sprite.setDisplaySize(this.rabbitSize, this.rabbitSize);
  }

  /** DOM 미러 렌더용 정보 추출 */
  getMirrorInfo() {
    return {
      x: this.sprite.x,
      y: this.sprite.y,
      texKey: this.sprite.texture.key,
      flipX: this.sprite.flipX,
      size: this.rabbitSize,
    };
  }

  /** 부활 시 스프라이트 상태 복구 */
  resetSprite() {
    this.sprite.setAlpha(1);
    this.sprite.setScale(1);
    this.sprite.setAngle(0);
    this.setFacing(this.keyFront);
    this.sprite.setDisplaySize(this.rabbitSize, this.rabbitSize);
  }

  switchTo(lane: number) {
    this.currentLane = lane;
  }

  /** 전환 성공: 타겟 화면 X로 이동 */
  animateSwitch(targetScreenX: number, duration = 120) {
    const goingRight = targetScreenX > this.sprite.x;
    const startX = this.sprite.x;
    this.setFacing(this.keySide, duration);
    this.sprite.setFlipX(!goingRight);
    this.sprite.setDisplaySize(this.rabbitSize, this.rabbitSize);
    this.sprite.setAngle(0);
    const dust = this.spawnDust('side', !goingRight);
    this.scene.tweens.add({
      targets: this.sprite,
      x: targetScreenX,
      duration, ease: 'Quad.easeOut',
    });
    // dust 도 토끼 이동량만큼 같이 이동 (따라다님)
    if (dust) {
      this.scene.tweens.add({
        targets: dust,
        x: dust.x + (targetScreenX - startX),
        duration, ease: 'Quad.easeOut',
      });
    }
  }

  /** 전환 실패: 잘못된 레인으로 이동 → 떨어짐 */
  animateCrashSwitch(bumpX: number, onDone: () => void) {
    const goingRight = bumpX > this.sprite.x;
    this.setFacing(this.keySide, 120);
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

  /** 전진 성공 — scroll duration 동안 back-walk anim 재생 */
  animateForward(scrollDuration: number, onDone: () => void) {
    this.setFacing(this.keyBack, scrollDuration);
    this.sprite.setDisplaySize(this.rabbitSize, this.rabbitSize);
    this.sprite.setFlipX(false);
    this.sprite.setAngle(0);
    this.spawnDust('fwd');
    onDone();
  }

  /** 다음 타일 방향을 바라보도록 스프라이트 변경 (방향만 재지정 — anim 없이 정지 프레임) */
  faceNextTile(nextLane: number) {
    if (nextLane > this.currentLane) {
      // 다음이 오른쪽
      this.setFacing(this.keySide);
      this.sprite.setFlipX(false);
    } else if (nextLane < this.currentLane) {
      // 다음이 왼쪽
      this.setFacing(this.keySide);
      this.sprite.setFlipX(true);
    } else {
      // 같은 레인 (직진)
      this.setFacing(this.keyBack);
      this.sprite.setFlipX(false);
    }
    this.sprite.setDisplaySize(this.rabbitSize, this.rabbitSize);
    this.sprite.setAngle(0);
  }

  /**
   * 전진 충돌: 한 칸 전진 시도 → 떨어짐.
   * @param bumpY 1단계에서 토끼가 도달할 절대 Y 좌표 (보통 caller 가 `player.y - tileH` 로 한 타일 위 계산).
   *              symmetry: animateCrashSwitch 가 절대 X(bumpX) 받는 것과 동일한 패턴.
   */
  animateForwardCrash(bumpY: number, onDone: () => void) {
    this.setFacing(this.keyBack, 120);
    this.sprite.setDisplaySize(this.rabbitSize, this.rabbitSize);
    this.sprite.setAngle(0);

    // 1단계: 지정된 Y 좌표로 이동 (전진 시도)
    this.scene.tweens.add({
      targets: this.sprite,
      y: bumpY,
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
    this.setFacing(this.keyBack);
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
    this.setFacing(this.keySide);
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

  /**
   * 공통 낙하: 1단계 허우적대기 → 2단계 쏙! 빨려들어감.
   * - 1단계: `fall` 스프라이트시트가 있는 캐릭터는 fall anim 1회 재생 (스프라이트가 모션 표현),
   *   없으면 정적 `-front` 이미지에 좌우 흔들림 + 각도 위블 폴백.
   * - 2단계: 위치/각도 정리 후 살짝 커졌다가(으악!) 0 으로 빨려들어가며 페이드.
   */
  private animateFall(onDone: () => void) {
    this.sprite.setDisplaySize(this.rabbitSize, this.rabbitSize);
    this.sprite.setFlipX(false);
    this.sprite.setAngle(0);

    const baseX = this.sprite.x;
    const hasFallAnim = !!CHARACTER_SPECS[this.characterId]?.fall;
    let shakeEvent: Phaser.Time.TimerEvent | null = null;

    if (hasFallAnim) {
      // 스프라이트시트로 떨어짐 모션 표현 — 마지막 tumbling 프레임이 유지됨 (animationcomplete 핸들러 참고)
      this.setFacing(this.keyFall, FALL_PRE_SUCK_MS);
    } else {
      // 정적 이미지 폴백: 흔들림 + 각도 위블로 허우적대는 느낌
      this.setFacing(this.keyFront);
      let shakeCount = 0;
      shakeEvent = this.scene.time.addEvent({
        delay: 40,
        repeat: 7,
        callback: () => {
          shakeCount++;
          const offset = (shakeCount % 2 === 0 ? 1 : -1) * 5;
          this.sprite.setX(baseX + offset);
          this.sprite.setAngle(offset * 0.8);
        },
      });
    }

    // 2단계: 쏙! 빨려들어감
    this.scene.time.delayedCall(FALL_PRE_SUCK_MS, () => {
      if (shakeEvent) {
        shakeEvent.destroy();
        this.sprite.setX(baseX);
        this.sprite.setAngle(0);
      }

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

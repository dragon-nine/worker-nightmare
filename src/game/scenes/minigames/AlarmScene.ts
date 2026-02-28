import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지1: 스마트폰 망치로 깨부수기
 * - 알람이 울리고 '중지' 버튼이 나타남
 * - 중지 버튼은 가짜 — 아무리 눌러도 안 꺼짐
 * - 3번 탭 후 화면 구석에 망치 등장
 * - 망치를 폰 위에 드래그하면 깨부수기 성공
 *
 * 핵심: "이 게임은 보이는 대로 믿으면 안 된다"는 룰 교육
 */
export class AlarmScene extends Phaser.Scene {
  private stageId = 0;
  private ended = false;
  private fakeTapCount = 0;
  private hammer!: Phaser.GameObjects.Text;
  private hammerRevealed = false;
  private phone!: Phaser.GameObjects.Container;
  private stopBtn!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'AlarmScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.ended = false;
    this.fakeTapCount = 0;
    this.hammerRevealed = false;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0a0a14');

    // ── 스마트폰 (중앙) ──
    const phoneX = width / 2;
    const phoneY = height * 0.42;
    const phoneW = 160;
    const phoneH = 280;

    this.phone = this.add.container(phoneX, phoneY);

    // 폰 몸체
    const phoneBg = this.add.rectangle(0, 0, phoneW, phoneH, 0x1a1a2e)
      .setStrokeStyle(4, 0x333366);
    this.phone.add(phoneBg);

    // 알람 화면 (빨간 배경)
    const alarmScreen = this.add.rectangle(0, 0, phoneW - 10, phoneH - 10, 0xff1a1a);
    this.phone.add(alarmScreen);

    // 알람 아이콘
    const alarmIcon = this.add.text(0, -70, '⏰', { fontSize: '56px' }).setOrigin(0.5);
    this.phone.add(alarmIcon);

    // 시간 표시
    const timeText = this.add.text(0, -15, '07:00', {
      fontFamily: 'sans-serif', fontSize: '32px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.phone.add(timeText);

    // 폰 진동
    this.tweens.add({
      targets: this.phone, angle: { from: -2, to: 2 },
      duration: 60, yoyo: true, repeat: -1,
    });

    // 알람 아이콘 흔들림
    this.tweens.add({
      targets: alarmIcon, angle: { from: -15, to: 15 },
      duration: 100, yoyo: true, repeat: -1,
    });

    // 화면 깜빡임
    this.tweens.add({
      targets: alarmScreen, alpha: { from: 1, to: 0.7 },
      duration: 300, yoyo: true, repeat: -1,
    });

    // ── 가짜 '중지' 버튼 ──
    this.stopBtn = this.add.container(0, 65);
    const btnBg = this.add.rectangle(0, 0, 120, 44, 0xffffff, 0.9)
      .setStrokeStyle(2, 0xffffff);
    const btnText = this.add.text(0, 0, '중지', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#ff1a1a', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.stopBtn.add([btnBg, btnText]);
    this.stopBtn.setSize(120, 44);
    this.stopBtn.setInteractive({ useHandCursor: true });
    this.phone.add(this.stopBtn);

    // 안내 텍스트
    this.add.text(width / 2, height * 0.85, '알람을 꺼주세요!', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#666688',
    }).setOrigin(0.5);

    // ── 가짜 버튼 탭 ──
    this.stopBtn.on('pointerdown', () => this.onFakeTap());

    // ── 타이머 (15초) ──
    let timeLeft = 15;
    const timerText = this.add.text(width - 30, 30, `${timeLeft}s`, {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#555577',
    }).setOrigin(1, 0.5);

    this.time.addEvent({
      delay: 1000, repeat: 14,
      callback: () => {
        if (this.ended) return;
        timeLeft--;
        timerText.setText(`${timeLeft}s`);
        if (timeLeft <= 5) timerText.setColor('#e94560');
        if (timeLeft <= 0) {
          this.ended = true;
          this.add.text(width / 2, height * 0.92, '알람이 이겼다...', {
            fontFamily: 'sans-serif', fontSize: '22px', color: '#e94560', fontStyle: 'bold',
          }).setOrigin(0.5);
          this.time.delayedCall(1200, () => {
            this.scene.start('ResultScene', { stageId: this.stageId, success: false });
          });
        }
      },
    });

    // ── 망치 (화면 밖에 숨김) ──
    this.hammer = this.add.text(width + 60, height * 0.5, '🔨', {
      fontSize: '52px',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true, draggable: true });

    this.input.setDraggable(this.hammer);

    this.input.on('drag', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
      if (obj === this.hammer) {
        (obj as Phaser.GameObjects.Text).x = dragX;
        (obj as Phaser.GameObjects.Text).y = dragY;
      }
    });

    this.input.on('dragend', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (obj !== this.hammer || this.ended) return;
      const dist = Phaser.Math.Distance.Between(
        (obj as Phaser.GameObjects.Text).x,
        (obj as Phaser.GameObjects.Text).y,
        phoneX, phoneY,
      );
      if (dist < 120) this.smashPhone();
    });

    emitGameState({
      scene: 'AlarmScene', stageId: this.stageId,
      progress: GameManager.progress, allCleared: GameManager.allCleared,
      stress: GameManager.stress,
    });
  }

  /* 가짜 중지 버튼 탭 */
  private onFakeTap() {
    if (this.ended) return;
    this.fakeTapCount++;

    const { width, height } = this.scale;

    // 버튼 흔들림
    this.tweens.add({
      targets: this.stopBtn, x: { from: -5, to: 5 },
      duration: 50, yoyo: true, repeat: 2,
      onComplete: () => { this.stopBtn.x = 0; },
    });

    // 탭 횟수별 반응
    const reactions = [
      '...?',
      '안 꺼진다?',
      '왜 안 돼??',
      '이거 고장남?',
      '다른 방법이 필요해...',
    ];
    const msgIdx = Math.min(this.fakeTapCount - 1, reactions.length - 1);

    const msg = this.add.text(width / 2, height * 0.74, reactions[msgIdx], {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#e94560',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: msg, alpha: 1, y: height * 0.70,
      duration: 300,
      onComplete: () => {
        this.tweens.add({
          targets: msg, alpha: 0, duration: 600, delay: 400,
          onComplete: () => msg.destroy(),
        });
      },
    });

    // 카메라 흔들림 (점점 강하게)
    const intensity = Math.min(0.005 + this.fakeTapCount * 0.002, 0.015);
    this.cameras.main.shake(100, intensity);

    // 3번 탭 후 망치 등장
    if (this.fakeTapCount >= 3 && !this.hammerRevealed) {
      this.revealHammer();
    }
  }

  /* 망치 등장 */
  private revealHammer() {
    this.hammerRevealed = true;
    const { width, height } = this.scale;

    // 시선 유도 이모지
    const hint = this.add.text(width - 55, height * 0.40, '👀', {
      fontSize: '24px',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: hint, alpha: 1, duration: 500,
      onComplete: () => {
        this.tweens.add({
          targets: hint, alpha: 0, duration: 1000, delay: 1500,
          onComplete: () => hint.destroy(),
        });
      },
    });

    // 망치 슬라이드 인
    this.tweens.add({
      targets: this.hammer, x: width - 55,
      duration: 800, ease: 'Back.easeOut',
    });
  }

  /* 폰 깨부수기 — 카타르시스 */
  private smashPhone() {
    if (this.ended) return;
    this.ended = true;

    const { width, height } = this.scale;

    // 애니메이션 정지
    this.tweens.killAll();

    // 망치 내려치기
    this.hammer.setDepth(10);
    this.tweens.add({
      targets: this.hammer,
      x: width / 2, y: height * 0.42,
      scale: 2, angle: -45,
      duration: 200, ease: 'Quad.easeIn',
      onComplete: () => {
        // 이펙트
        this.cameras.main.shake(500, 0.03);
        this.cameras.main.flash(300, 255, 255, 255);

        this.phone.setVisible(false);
        this.hammer.setVisible(false);

        // 폭발
        this.add.text(width / 2, height * 0.42, '💥', {
          fontSize: '100px',
        }).setOrigin(0.5);

        // 파편
        const shards = ['📱', '✨', '⚡', '💫', '🔥'];
        for (let i = 0; i < 8; i++) {
          const shard = this.add.text(
            width / 2, height * 0.42,
            Phaser.Math.RND.pick(shards),
            { fontSize: '28px' },
          ).setOrigin(0.5);

          this.tweens.add({
            targets: shard,
            x: width / 2 + Phaser.Math.Between(-200, 200),
            y: height * 0.42 + Phaser.Math.Between(-150, 150),
            alpha: 0, scale: 0.3,
            angle: Phaser.Math.Between(-180, 180),
            duration: 800, ease: 'Quad.easeOut',
            onComplete: () => shard.destroy(),
          });
        }

        // 성공 메시지
        this.time.delayedCall(600, () => {
          this.cameras.main.setBackgroundColor('#0d2818');

          this.add.text(width / 2, height * 0.30, '📵', {
            fontSize: '72px',
          }).setOrigin(0.5);

          this.add.text(width / 2, height * 0.52, '알람 영구 정지', {
            fontFamily: 'sans-serif', fontSize: '32px', color: '#00b894', fontStyle: 'bold',
          }).setOrigin(0.5);

          this.add.text(width / 2, height * 0.65, '때로는 상식을 벗어나야 합니다', {
            fontFamily: 'sans-serif', fontSize: '16px', color: '#448866',
          }).setOrigin(0.5);
        });

        this.time.delayedCall(2500, () => {
          this.scene.start('ResultScene', { stageId: this.stageId, success: true });
        });
      },
    });
  }
}

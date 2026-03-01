import Phaser from 'phaser';
import { GameManager } from '../../GameManager';
import { emitGameState } from '../../GameBridge';

/**
 * 스테이지8: "가족 거짓말" — Family Lies (AI Auto-Pilot)
 * KakaoTalk 채팅 인터페이스. 가족 메시지가 쏟아지는 가운데
 * 입력란은 함정(오토컴플릿 지옥), 설정의 AI 챗봇 토글이 정답.
 */
export class MosquitoScene extends Phaser.Scene {
  private stageId = 0;
  private ended = false;

  // Layout constants
  private readonly BG_COLOR = 0xb2c7d9;
  private readonly TOP_BAR_H = 50;

  private readonly CHAT_TOP = 50;
  private readonly CHAT_BOTTOM = 450;
  private readonly BUBBLE_YELLOW = 0xfef01b;
  private readonly BUBBLE_BLUE = 0x4f9cef;


  // Chat state
  private chatContainer!: Phaser.GameObjects.Container;
  private chatMask!: Phaser.Display.Masks.GeometryMask;
  // chatScrollY tracked via chatContainer.y
  private familyMessages: string[] = [];
  private familyMsgIndex = 0;
  private messageYCursor = 0;
  private profileEmojis: Record<string, string> = {};
  private profileColors: Record<string, number> = {};

  // Keyboard / trap state
  private keyboardContainer!: Phaser.GameObjects.Container;
  private keyboardVisible = false;
  private autocompleteStep = 0;
  private typingText!: Phaser.GameObjects.Text;
  private sendButton!: Phaser.GameObjects.Container;

  // Settings popup
  private settingsPopup!: Phaser.GameObjects.Container;
  private settingsOpen = false;

  // Timer
  private timeLeft = 15;
  private timerText!: Phaser.GameObjects.Text;
  private timerEvent!: Phaser.Time.TimerEvent;
  private messageEvent!: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'MosquitoScene' });
  }

  init(data: { stageId: number }) {
    this.stageId = data.stageId;
    this.ended = false;
    // chatScrollY reset
    this.familyMsgIndex = 0;
    this.messageYCursor = 0;
    this.keyboardVisible = false;
    this.autocompleteStep = 0;
    this.settingsOpen = false;
    this.timeLeft = 15;
  }

  create() {
    const { width, height } = this.scale;

    // ── Background ──
    this.cameras.main.setBackgroundColor(this.BG_COLOR);

    // ── Family message pool ──
    this.familyMessages = [
      '여보|언제 와?',
      '엄마|밥은 먹었어?',
      '딸|아빠 보고싶어 🥺',
      '여보|오늘도 야근이야?',
      '엄마|몸은 괜찮니?',
      '딸|아빠 빨리 와...',
      '여보|전화 좀 받아봐',
      '엄마|밥 차려놨는데...',
      '딸|아빠 나 상 받았어!',
      '여보|...읽씹?',
      '엄마|걱정된다 얘야',
      '딸|아빠 안 오는거야? 😢',
      '여보|하...',
    ];

    this.profileEmojis = { '여보': '👩', '엄마': '👵', '딸': '👧' };
    this.profileColors = { '여보': 0xffb6c1, '엄마': 0xc8e6c9, '딸': 0xffe0b2 };

    // ── Chat area container (masked) ──
    this.chatContainer = this.add.container(0, 0);
    const maskShape = this.make.graphics({});
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, this.CHAT_TOP, width, this.CHAT_BOTTOM - this.CHAT_TOP);
    this.chatMask = maskShape.createGeometryMask();
    this.chatContainer.setMask(this.chatMask);
    this.messageYCursor = this.CHAT_TOP + 10;

    // ── Top bar ──
    this.createTopBar(width);

    // ── Bottom input bar ──
    this.createBottomBar(width, height);

    // ── Keyboard (hidden initially) ──
    this.createKeyboard(width, height);

    // ── Settings popup (hidden initially) ──
    this.createSettingsPopup(width, height);

    // ── Add first couple of messages immediately ──
    this.addFamilyMessage();
    this.time.delayedCall(800, () => {
      if (!this.ended) this.addFamilyMessage();
    });

    // ── Message timer: new family messages every 2-3s ──
    this.messageEvent = this.time.addEvent({
      delay: 2500,
      loop: true,
      callback: () => {
        if (!this.ended && !this.settingsOpen) {
          this.addFamilyMessage();
        }
      },
    });

    // ── Countdown timer ──
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      repeat: 14,
      callback: () => {
        if (this.ended) return;
        this.timeLeft--;
        this.timerText.setText(`${this.timeLeft}s`);
        if (this.timeLeft <= 5) {
          this.timerText.setColor('#e94560');
        }
        if (this.timeLeft <= 0) {
          this.endGame(false, '읽씹 24시간...\n가족 분노 게이지 MAX 💢');
        }
      },
    });

    emitGameState({
      scene: 'MosquitoScene',
      stageId: this.stageId,
      progress: GameManager.progress,
      allCleared: GameManager.allCleared,
      stress: GameManager.stress,
    });
  }

  // ═══════════════════════════════════════════
  //  TOP BAR
  // ═══════════════════════════════════════════
  private createTopBar(w: number) {
    this.add.rectangle(w / 2, this.TOP_BAR_H / 2, w, this.TOP_BAR_H, 0x4a6984)
      .setDepth(10);

    // Back button (decorative)
    this.add.text(16, this.TOP_BAR_H / 2, '< 뒤로', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#ffffff',
    }).setOrigin(0, 0.5).setDepth(11);

    // Title
    this.add.text(w / 2, this.TOP_BAR_H / 2, '👨‍👩‍👧 가족 채팅방', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);

    // Hamburger menu (decorative)
    this.add.text(w - 70, this.TOP_BAR_H / 2, '≡', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(11);

    // Timer (top-right, subtle)
    this.timerText = this.add.text(w / 2, this.TOP_BAR_H / 2 + 18, `${this.timeLeft}s`, {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#c0d8e8', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);

    // ⚙️ Settings gear — THE SOLUTION
    const gearText = this.add.text(w - 28, this.TOP_BAR_H / 2, '⚙️', {
      fontSize: '22px',
    }).setOrigin(0.5).setDepth(11).setInteractive({ useHandCursor: true });

    // Subtle pulse to hint (very subtle)
    this.tweens.add({
      targets: gearText,
      alpha: { from: 1, to: 0.6 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    gearText.on('pointerdown', () => {
      if (this.ended) return;
      this.openSettings();
    });
  }

  // ═══════════════════════════════════════════
  //  BOTTOM INPUT BAR (TRAP)
  // ═══════════════════════════════════════════
  private createBottomBar(w: number, h: number) {
    const barY = this.CHAT_BOTTOM;
    const barH = h - barY;

    // Bar background
    this.add.rectangle(w / 2, barY + barH / 2, w, barH, 0xf0f0f0).setDepth(10);
    this.add.rectangle(w / 2, barY, w, 1, 0xcccccc).setDepth(10);

    // Input field
    const inputBg = this.add.rectangle(w / 2 - 30, barY + barH / 2, w - 120, 40, 0xffffff)
      .setStrokeStyle(1, 0xcccccc).setDepth(10).setInteractive({ useHandCursor: true });

    const placeholder = this.add.text(w / 2 - 30, barY + barH / 2, '메시지 입력...', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#999999',
    }).setOrigin(0.5).setDepth(11);

    // Send button
    this.add.text(w - 35, barY + barH / 2, '➤', {
      fontFamily: 'sans-serif', fontSize: '28px', color: '#4a6984',
    }).setOrigin(0.5).setDepth(11);

    // Plus icon (left side, decorative)
    this.add.text(25, barY + barH / 2, '+', {
      fontFamily: 'sans-serif', fontSize: '28px', color: '#888888', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);

    // TRAP: Clicking input field
    inputBg.on('pointerdown', () => {
      if (this.ended || this.settingsOpen) return;
      placeholder.setVisible(false);
      this.showKeyboard();
    });
  }

  // ═══════════════════════════════════════════
  //  KEYBOARD (TRAP)
  // ═══════════════════════════════════════════
  private createKeyboard(w: number, h: number) {
    this.keyboardContainer = this.add.container(0, 0).setDepth(20).setVisible(false);

    // Keyboard background
    const kbH = 180;
    const kbY = h - kbH;
    const kbBg = this.add.rectangle(w / 2, kbY + kbH / 2, w, kbH, 0xd1d5db);
    this.keyboardContainer.add(kbBg);

    // Fake key rows
    const rows = [
      'ㅂ ㅈ ㄷ ㄱ ㅅ ㅛ ㅕ ㅑ ㅐ ㅔ',
      'ㅁ ㄴ ㅇ ㄹ ㅎ ㅗ ㅓ ㅏ ㅣ',
      'ㅋ ㅌ ㅊ ㅍ ㅠ ㅜ ㅡ',
    ];
    rows.forEach((row, ri) => {
      const keys = row.split(' ');
      const startX = (w - keys.length * 42) / 2 + 21;
      keys.forEach((key, ki) => {
        const kx = startX + ki * 42;
        const ky = kbY + 25 + ri * 48;
        const keyBg = this.add.rectangle(kx, ky, 38, 40, 0xffffff, 0.9).setStrokeStyle(1, 0xaaaaaa);
        const keyTxt = this.add.text(kx, ky, key, {
          fontFamily: 'sans-serif', fontSize: '16px', color: '#333333',
        }).setOrigin(0.5);
        this.keyboardContainer.add([keyBg, keyTxt]);

        keyBg.setInteractive({ useHandCursor: true });
        keyBg.on('pointerdown', () => {
          if (this.ended) return;
          this.onKeyTapped();
        });
      });
    });

    // Spacebar
    const spaceBar = this.add.rectangle(w / 2, kbY + 25 + 3 * 48, 200, 38, 0xffffff, 0.9)
      .setStrokeStyle(1, 0xaaaaaa).setInteractive({ useHandCursor: true });
    const spaceTxt = this.add.text(w / 2, kbY + 25 + 3 * 48, 'space', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#666666',
    }).setOrigin(0.5);
    this.keyboardContainer.add([spaceBar, spaceTxt]);
    spaceBar.on('pointerdown', () => {
      if (!this.ended) this.onKeyTapped();
    });

    // Autocomplete suggestion bar (above keyboard)
    const sugBg = this.add.rectangle(w / 2, kbY - 22, w, 44, 0xf8f8f8);
    this.keyboardContainer.add(sugBg);

    this.typingText = this.add.text(20, kbY - 22, '', {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#333333',
      wordWrap: { width: w - 100 },
    }).setOrigin(0, 0.5);
    this.keyboardContainer.add(this.typingText);

    // Send button in suggestion bar
    this.sendButton = this.add.container(0, 0).setVisible(false);
    const sendBg = this.add.rectangle(w - 50, kbY - 22, 70, 34, 0x4a6984, 1)
      .setInteractive({ useHandCursor: true });
    const sendTxt = this.add.text(w - 50, kbY - 22, '전송', {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.sendButton.add([sendBg, sendTxt]);
    this.keyboardContainer.add(this.sendButton);

    sendBg.on('pointerdown', () => {
      if (this.ended) return;
      this.onTrapSend();
    });
  }

  private showKeyboard() {
    if (this.keyboardVisible) return;
    this.keyboardVisible = true;
    this.keyboardContainer.setVisible(true);
    this.autocompleteStep = 0;
    this.typingText.setText('');
    this.sendButton.setVisible(false);

    // Start autocomplete after a brief pause
    this.time.delayedCall(400, () => {
      if (this.keyboardVisible && !this.ended) {
        this.triggerAutocomplete();
      }
    });
  }

  private onKeyTapped() {
    // Any key press triggers the autocomplete if not already running
    if (this.autocompleteStep === 0) {
      this.triggerAutocomplete();
    }
  }

  private triggerAutocomplete() {
    const badMessages = [
      '일찍 갈 생각 없어. 퇴사할래',
      '밥 같은 거 안 먹어도 돼. 귀찮아',
      '보고싶지 않아. 회사가 더 좋아',
    ];

    const msgIndex = Math.min(this.autocompleteStep, badMessages.length - 1);
    const fullText = badMessages[msgIndex];
    this.autocompleteStep++;

    // Type out character by character (creepy AI effect)
    this.typingText.setText('');
    let charIndex = 0;

    const typeEvent = this.time.addEvent({
      delay: 50,
      repeat: fullText.length - 1,
      callback: () => {
        if (this.ended) { typeEvent.destroy(); return; }
        charIndex++;
        this.typingText.setText(fullText.substring(0, charIndex));
        if (charIndex >= fullText.length) {
          this.sendButton.setVisible(true);
        }
      },
    });
  }

  private onTrapSend() {
    // Send the terrible auto-completed message
    const sentText = this.typingText.text;
    this.addPlayerBubble(sentText);

    // Hide keyboard
    this.keyboardVisible = false;
    this.keyboardContainer.setVisible(false);

    // Family reaction
    this.time.delayedCall(1000, () => {
      if (this.ended) return;
      this.addFamilyBubble('여보', '...뭐?! 😡');
      this.time.delayedCall(800, () => {
        if (this.ended) return;
        this.addFamilyBubble('엄마', '너 지금 무슨 소리를 하는거니?!');
        this.time.delayedCall(600, () => {
          if (!this.ended) {
            this.endGame(false, '오토컴플릿의 노예...\n가족 관계 파탄 💔');
          }
        });
      });
    });
  }

  // ═══════════════════════════════════════════
  //  SETTINGS POPUP (SOLUTION)
  // ═══════════════════════════════════════════
  private createSettingsPopup(w: number, h: number) {
    this.settingsPopup = this.add.container(0, 0).setDepth(30).setVisible(false);

    // Dim overlay
    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.5);
    overlay.setInteractive(); // block clicks through
    this.settingsPopup.add(overlay);

    // Popup card
    const popW = 360;
    const popH = 300;
    const popX = w / 2;
    const popY = h / 2;

    const card = this.add.rectangle(popX, popY, popW, popH, 0xffffff, 1)
      .setStrokeStyle(2, 0xcccccc);
    this.settingsPopup.add(card);

    // Title
    const title = this.add.text(popX, popY - popH / 2 + 30, '채팅 설정', {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#333333', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.settingsPopup.add(title);

    // Divider
    const divider = this.add.rectangle(popX, popY - popH / 2 + 55, popW - 40, 1, 0xeeeeee);
    this.settingsPopup.add(divider);

    // Option 1: 알림 (decorative, ON)
    this.createSettingRow(popX, popY - 45, '🔔 알림', true, true);

    // Option 2: 채팅방 배경 (decorative)
    this.createSettingRow(popX, popY + 5, '🎨 채팅방 배경', false, true);

    // Option 3: 야근용 챗봇 AI — THE SOLUTION
    this.createSettingRow(popX, popY + 55, '🤖 야근용 챗봇 AI', false, false);

    // Close button
    const closeBtn = this.add.text(popX + popW / 2 - 20, popY - popH / 2 + 15, '✕', {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#999999',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.settingsPopup.add(closeBtn);
    closeBtn.on('pointerdown', () => {
      this.closeSettings();
    });
  }

  private createSettingRow(cx: number, cy: number, label: string, initialOn: boolean, decorative: boolean) {
    const rowW = 320;

    // Label
    const labelText = this.add.text(cx - rowW / 2, cy, label, {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#333333',
    }).setOrigin(0, 0.5);
    this.settingsPopup.add(labelText);

    // Toggle track
    const trackW = 50;
    const trackH = 26;
    const trackX = cx + rowW / 2 - trackW / 2;
    const trackColor = initialOn ? 0x4cd964 : 0xcccccc;
    const track = this.add.rectangle(trackX, cy, trackW, trackH, trackColor)
      .setStrokeStyle(1, 0xbbbbbb);
    track.setData('isOn', initialOn);

    // Rounded ends visual (approximate with small circles)
    const leftCap = this.add.circle(trackX - trackW / 2 + trackH / 2, cy, trackH / 2 - 1, trackColor);
    const rightCap = this.add.circle(trackX + trackW / 2 - trackH / 2, cy, trackH / 2 - 1, trackColor);

    // Toggle knob
    const knobX = initialOn
      ? trackX + trackW / 2 - trackH / 2
      : trackX - trackW / 2 + trackH / 2;
    const knob = this.add.circle(knobX, cy, 10, 0xffffff).setStrokeStyle(1, 0xaaaaaa);

    // Status text
    const statusText = this.add.text(trackX, cy + 18, initialOn ? 'ON' : 'OFF', {
      fontFamily: 'sans-serif', fontSize: '11px', color: '#888888',
    }).setOrigin(0.5);

    this.settingsPopup.add([track, leftCap, rightCap, knob, statusText]);

    if (!decorative) {
      // Make the whole toggle area interactive
      const hitArea = this.add.rectangle(trackX, cy, trackW + 20, trackH + 20, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      this.settingsPopup.add(hitArea);

      hitArea.on('pointerdown', () => {
        if (this.ended) return;
        const isOn = track.getData('isOn');
        if (!isOn) {
          // Animate toggle ON
          track.setData('isOn', true);
          const onColor = 0x4cd964;

          this.tweens.add({
            targets: knob,
            x: trackX + trackW / 2 - trackH / 2,
            duration: 200,
            ease: 'Back.easeOut',
          });

          // Change track color
          this.time.delayedCall(100, () => {
            track.setFillStyle(onColor);
            leftCap.setFillStyle(onColor);
            rightCap.setFillStyle(onColor);
            statusText.setText('ON');
          });

          // Trigger solution
          this.time.delayedCall(600, () => {
            this.onAIChatbotActivated();
          });
        }
      });
    }
  }

  private openSettings() {
    if (this.settingsOpen || this.ended) return;
    this.settingsOpen = true;

    // Hide keyboard if visible
    if (this.keyboardVisible) {
      this.keyboardVisible = false;
      this.keyboardContainer.setVisible(false);
    }

    this.settingsPopup.setVisible(true);
    this.settingsPopup.setAlpha(0);
    this.tweens.add({
      targets: this.settingsPopup,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
    });
  }

  private closeSettings() {
    this.settingsOpen = false;
    this.tweens.add({
      targets: this.settingsPopup,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        this.settingsPopup.setVisible(false);
      },
    });
  }

  // ═══════════════════════════════════════════
  //  AI CHATBOT ACTIVATED (SUCCESS PATH)
  // ═══════════════════════════════════════════
  private onAIChatbotActivated() {
    if (this.ended) return;
    this.ended = true;
    this.timerEvent.destroy();
    this.messageEvent.destroy();

    // Close settings popup
    this.closeSettings();

    // Show typing indicator "..."
    this.time.delayedCall(500, () => {
      const typingBubble = this.addTypingIndicator();

      this.time.delayedCall(1500, () => {
        // Remove typing indicator
        typingBubble.destroy();

        // Send the perfect message (right-aligned, blue)
        this.addPlayerBubble('사랑하는 여보♥ 금방 마무리하고 갈게! 사랑해!');

        this.time.delayedCall(600, () => {
          // Cute emoticon
          this.addPlayerBubble('🥰');

          this.time.delayedCall(1000, () => {
            // Family reaction
            this.addFamilyBubble('여보', '화이팅! 💪');

            this.time.delayedCall(600, () => {
              this.addFamilyBubble('딸', '아빠 최고! 💕');

              this.time.delayedCall(800, () => {
                // Flash success
                this.cameras.main.flash(300, 200, 255, 200);

                const { width, height } = this.scale;
                this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4)
                  .setDepth(40);
                const successText = this.add.text(width / 2, height / 2, 'AI 챗봇 가동 성공! 🤖✨\n가족 평화 유지 완료', {
                  fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff',
                  fontStyle: 'bold', align: 'center',
                }).setOrigin(0.5).setDepth(41);

                this.tweens.add({
                  targets: successText,
                  scale: { from: 0.5, to: 1 },
                  duration: 400,
                  ease: 'Back.easeOut',
                });

                this.time.delayedCall(2000, () => {
                  this.scene.start('ResultScene', { stageId: this.stageId, success: true });
                });
              });
            });
          });
        });
      });
    });
  }

  // ═══════════════════════════════════════════
  //  CHAT BUBBLE HELPERS
  // ═══════════════════════════════════════════
  private addFamilyMessage() {
    if (this.familyMsgIndex >= this.familyMessages.length) {
      this.familyMsgIndex = 0; // loop
    }
    const entry = this.familyMessages[this.familyMsgIndex++];
    const [sender, msg] = entry.split('|');
    this.addFamilyBubble(sender, msg);
  }

  private addFamilyBubble(sender: string, message: string) {
    const profileEmoji = this.profileEmojis[sender] || '👤';
    const profileColor = this.profileColors[sender] || 0xdddddd;

    const bubbleGroup = this.add.container(0, this.messageYCursor);
    bubbleGroup.setAlpha(0);

    // Profile circle
    const profileCircle = this.add.circle(30, 12, 16, profileColor);
    const profileText = this.add.text(30, 12, profileEmoji, {
      fontSize: '18px',
    }).setOrigin(0.5);

    // Sender name
    const nameText = this.add.text(55, -2, sender, {
      fontFamily: 'sans-serif', fontSize: '12px', color: '#555555',
    });

    // Bubble
    const maxBubbleW = 280;
    const tempText = this.add.text(0, 0, message, {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#333333',
      wordWrap: { width: maxBubbleW - 20 },
    });
    const textW = Math.min(tempText.width + 20, maxBubbleW);
    const textH = tempText.height + 14;
    tempText.destroy();

    const bubble = this.add.rectangle(55 + textW / 2, 14 + textH / 2, textW, textH, this.BUBBLE_YELLOW)
      .setStrokeStyle(1, 0xe0d200);

    const msgText = this.add.text(55 + 10, 14 + 7, message, {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#333333',
      wordWrap: { width: maxBubbleW - 20 },
    });

    // Timestamp
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const timestamp = this.add.text(55 + textW + 8, 14 + textH - 14, timeStr, {
      fontFamily: 'sans-serif', fontSize: '10px', color: '#999999',
    });

    bubbleGroup.add([profileCircle, profileText, nameText, bubble, msgText, timestamp]);
    this.chatContainer.add(bubbleGroup);

    // Slide-in animation
    bubbleGroup.x = -30;
    this.tweens.add({
      targets: bubbleGroup,
      x: 10,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });

    const bubbleHeight = textH + 28;
    this.messageYCursor += bubbleHeight;

    // Scroll chat if messages go below visible area
    this.scrollChatIfNeeded();
  }

  private addPlayerBubble(message: string) {
    const { width } = this.scale;
    const maxBubbleW = 260;

    const bubbleGroup = this.add.container(0, this.messageYCursor);
    bubbleGroup.setAlpha(0);

    // Measure text
    const tempText = this.add.text(0, 0, message, {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff',
      wordWrap: { width: maxBubbleW - 20 },
    });
    const textW = Math.min(tempText.width + 20, maxBubbleW);
    const textH = tempText.height + 14;
    tempText.destroy();

    const bubbleX = width - 20 - textW / 2;
    const bubble = this.add.rectangle(bubbleX, textH / 2, textW, textH, this.BUBBLE_BLUE)
      .setStrokeStyle(1, 0x3a7cc0);

    const msgText = this.add.text(bubbleX - textW / 2 + 10, 7, message, {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff',
      wordWrap: { width: maxBubbleW - 20 },
    });

    // Read receipt + timestamp
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const readReceipt = this.add.text(bubbleX - textW / 2 - 8, textH - 14, '1', {
      fontFamily: 'sans-serif', fontSize: '10px', color: '#f0c040',
    }).setOrigin(1, 0);
    const timestamp = this.add.text(bubbleX - textW / 2 - 8, textH - 2, timeStr, {
      fontFamily: 'sans-serif', fontSize: '10px', color: '#999999',
    }).setOrigin(1, 0);

    bubbleGroup.add([bubble, msgText, readReceipt, timestamp]);
    this.chatContainer.add(bubbleGroup);

    // Slide in from right
    bubbleGroup.x = 30;
    this.tweens.add({
      targets: bubbleGroup,
      x: 0,
      alpha: 1,
      duration: 250,
      ease: 'Power2',
    });

    const bubbleHeight = textH + 16;
    this.messageYCursor += bubbleHeight;

    this.scrollChatIfNeeded();
  }

  private addTypingIndicator(): Phaser.GameObjects.Container {
    const bubbleGroup = this.add.container(10, this.messageYCursor);

    // Profile
    const profileCircle = this.add.circle(30, 12, 16, 0xffb6c1);
    const profileText = this.add.text(30, 12, '🤖', { fontSize: '18px' }).setOrigin(0.5);

    // Typing bubble with animated dots
    const bubble = this.add.rectangle(85, 18, 60, 30, this.BUBBLE_YELLOW)
      .setStrokeStyle(1, 0xe0d200);

    const dot1 = this.add.circle(70, 18, 4, 0x888888);
    const dot2 = this.add.circle(85, 18, 4, 0x888888);
    const dot3 = this.add.circle(100, 18, 4, 0x888888);

    bubbleGroup.add([profileCircle, profileText, bubble, dot1, dot2, dot3]);
    this.chatContainer.add(bubbleGroup);

    // Animate dots bouncing
    [dot1, dot2, dot3].forEach((dot, i) => {
      this.tweens.add({
        targets: dot,
        y: dot.y - 6,
        duration: 400,
        yoyo: true,
        repeat: -1,
        delay: i * 150,
        ease: 'Sine.easeInOut',
      });
    });

    this.scrollChatIfNeeded();
    return bubbleGroup;
  }

  private scrollChatIfNeeded() {
    const visibleBottom = this.CHAT_BOTTOM - 10;
    if (this.messageYCursor > visibleBottom) {
      const scrollAmount = this.messageYCursor - visibleBottom + 20;
      this.tweens.add({
        targets: this.chatContainer,
        y: -scrollAmount,
        duration: 300,
        ease: 'Power2',
      });
    }
  }

  // ═══════════════════════════════════════════
  //  END GAME
  // ═══════════════════════════════════════════
  private endGame(success: boolean, message?: string) {
    if (this.ended) return;
    this.ended = true;
    this.timerEvent.destroy();
    this.messageEvent.destroy();

    const { width, height } = this.scale;

    // Dim overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5).setDepth(40);

    this.add.text(width / 2, height / 2, message || '실패...', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#ff6b6b',
      fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5).setDepth(41);

    this.cameras.main.shake(300, 0.01);

    this.time.delayedCall(2000, () => {
      this.scene.start('ResultScene', { stageId: this.stageId, success });
    });
  }
}

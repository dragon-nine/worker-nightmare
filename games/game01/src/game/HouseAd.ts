import { logEvent } from './services/analytics';
import { gameConfig } from './game.config';

/**
 * 하우스 광고 (부활 시 홈화면 추가 안내) — Phaser 씬 위에 렌더링
 */
export function showHouseAd(scene: Phaser.Scene, onComplete: () => void) {
  const { width, height } = scene.scale;
  const adItems: Phaser.GameObjects.GameObject[] = [];

  const adBg = scene.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1e)
    .setDepth(450);
  adItems.push(adBg);

  adItems.push(scene.add.text(width / 2, height * 0.05, 'AD', {
    fontFamily: 'GMarketSans, sans-serif', fontSize: '12px', color: '#666688',
  }).setOrigin(0.5).setDepth(451));

  const iconBg = scene.add.circle(width / 2, height * 0.15, 40, 0xe94560).setDepth(451);
  adItems.push(iconBg);
  adItems.push(scene.add.text(width / 2, height * 0.15, 'D9', {
    fontFamily: 'GMarketSans, sans-serif', fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(452));

  scene.tweens.add({
    targets: iconBg, scale: 1.08, duration: 800,
    yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });

  adItems.push(scene.add.text(width / 2, height * 0.25, gameConfig.houseAdText, {
    fontFamily: 'GMarketSans, sans-serif', fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
    align: 'center', lineSpacing: 8,
  }).setOrigin(0.5).setDepth(451));

  const stepY = height * 0.38;
  const stepGap = height * 0.08;
  const leftX = 36;
  const numStyle = { fontFamily: 'GMarketSans, sans-serif', fontSize: '22px', color: '#e94560', fontStyle: 'bold' as const };
  const stepStyle = { fontFamily: 'GMarketSans, sans-serif', fontSize: '15px', color: '#ccccdd' };

  adItems.push(scene.add.text(leftX, stepY, '1', numStyle).setDepth(451));
  adItems.push(scene.add.text(leftX + 30, stepY, '오른쪽 아래  ⬆  아이콘을 누르고,', stepStyle).setDepth(451));

  adItems.push(scene.add.text(leftX, stepY + stepGap, '2', numStyle).setDepth(451));
  adItems.push(scene.add.text(leftX + 30, stepY + stepGap, '새로 뜬 창을 스크롤해서', stepStyle).setDepth(451));

  adItems.push(scene.add.text(leftX, stepY + stepGap * 2, '3', numStyle).setDepth(451));
  adItems.push(scene.add.text(leftX + 30, stepY + stepGap * 2, '⊕ 홈 화면에 추가  를 선택하세요', stepStyle).setDepth(451));

  adItems.push(scene.add.text(width / 2, height * 0.66, '앱처럼 바로 실행할 수 있어요!', {
    fontFamily: 'GMarketSans, sans-serif', fontSize: '14px', color: '#8888aa',
  }).setOrigin(0.5).setDepth(451));

  let countdown = 3;
  const countText = scene.add.text(width / 2, height * 0.78, `${countdown}`, {
    fontFamily: 'GMarketSans, sans-serif', fontSize: '48px', color: '#ffffff', fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(451);
  adItems.push(countText);

  const countLabel = scene.add.text(width / 2, height * 0.84, '잠시 후 부활합니다', {
    fontFamily: 'GMarketSans, sans-serif', fontSize: '14px', color: '#666688',
  }).setOrigin(0.5).setDepth(451);
  adItems.push(countLabel);

  adItems.push(scene.add.text(width / 2, height * 0.93, 'DragonNine Studio', {
    fontFamily: 'GMarketSans, sans-serif', fontSize: '11px', color: '#444466',
  }).setOrigin(0.5).setDepth(451));

  logEvent('homescreen_guide_impression', { from: 'house_ad' });

  scene.time.addEvent({
    delay: 1000,
    repeat: 2,
    callback: () => {
      countdown--;
      if (countdown > 0) {
        countText.setText(`${countdown}`);
      } else {
        countText.setText('GO!');
        countLabel.setText('부활!');
        scene.time.delayedCall(500, () => {
          adItems.forEach(item => item.destroy());
          onComplete();
        });
      }
    },
  });
}

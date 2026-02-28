import { useCallback } from 'react';
import styles from './Header.module.css';

export function Header() {
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  const share = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: '직장인 잔혹사',
        text: '오늘도 출근합니다... 당신은 퇴사에 성공할 수 있을까?',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.title}>
        <span className={styles.titleMain}>직장인</span>
        <span className={styles.titleAccent}>잔혹사</span>
      </div>
      <div className={styles.actions}>
        <button className={styles.iconBtn} onClick={toggleFullscreen} title="전체화면">
          ⛶
        </button>
        <button className={styles.iconBtn} onClick={share} title="공유">
          🔗
        </button>
      </div>
    </header>
  );
}

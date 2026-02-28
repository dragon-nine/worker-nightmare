import { useMemo } from 'react';
import styles from './Background.module.css';

const ICONS = ['📎', '📊', '☕', '💼', '📋', '⏰', '🖨️', '📂', '🗂️', '💻'];

interface FloatingIcon {
  emoji: string;
  left: number;
  delay: number;
  duration: number;
  opacity: number;
  size: number;
}

export function Background() {
  const icons = useMemo<FloatingIcon[]>(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      emoji: ICONS[i % ICONS.length],
      left: (i / 18) * 100 + Math.random() * 5,
      delay: Math.random() * 20,
      duration: 18 + Math.random() * 14,
      opacity: 0.03 + Math.random() * 0.03,
      size: 22 + Math.random() * 14,
    }));
  }, []);

  return (
    <div className={styles.background}>
      <div className={styles.grid} />
      {icons.map((icon, i) => (
        <span
          key={i}
          className={styles.icon}
          style={{
            left: `${icon.left}%`,
            bottom: '-40px',
            fontSize: `${icon.size}px`,
            opacity: icon.opacity,
            animationDuration: `${icon.duration}s`,
            animationDelay: `${icon.delay}s`,
          }}
        >
          {icon.emoji}
        </span>
      ))}
    </div>
  );
}

import type { ReactNode } from 'react';
import styles from './PhoneFrame.module.css';

interface Props {
  children: ReactNode;
}

export function PhoneFrame({ children }: Props) {
  return (
    <div className={styles.frame}>
      <div className={styles.screen}>
        {children}
      </div>
    </div>
  );
}

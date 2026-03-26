import { useState, useEffect, useCallback } from 'react';
import { gameBus } from '../../game/event-bus';
import { getRandomChallengeQuote } from '../../game/challenge-quotes';
import styles from './overlay.module.css';

const R2_BASE = 'https://pub-a6e8e0aec44d4a69ae3ed4e096c5acc5.r2.dev';

interface Props {
  score: number;
  onClose: () => void;
}

export function ChallengeOverlay({ score, onClose }: Props) {
  const bestScore = Number(localStorage.getItem('bestScore') || '0');
  const isNewRecord = score >= bestScore && bestScore > 0;
  const [message, setMessage] = useState(() => getRandomChallengeQuote(score, isNewRecord));
  const [challengeImages, setChallengeImages] = useState<string[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  // R2에서 challenge 이미지 목록 로드
  useEffect(() => {
    fetch(`/api/blob-list?prefix=game01/challenge/`)
      .then((r) => r.ok ? r.json() : { blobs: [] })
      .then((data: { blobs: { pathname: string }[] }) => {
        const urls = data.blobs
          .filter((b) => /\.(png|jpe?g|webp)$/i.test(b.pathname))
          .map((b) => `${R2_BASE}/${b.pathname}`);
        setChallengeImages(urls);
        if (urls.length > 0) {
          setCurrentImage(urls[Math.floor(Math.random() * urls.length)]);
        }
      })
      .catch(() => {});
  }, []);

  const handleRefresh = useCallback(() => {
    gameBus.emit('play-sfx', 'sfx-click');
    setMessage(getRandomChallengeQuote(score, isNewRecord));
    if (challengeImages.length > 0) {
      setCurrentImage(challengeImages[Math.floor(Math.random() * challengeImages.length)]);
    }
  }, [challengeImages]);

  const handleCTA = useCallback(() => {
    gameBus.emit('play-sfx', 'sfx-click');
    // TODO: 카카오톡 공유 연동
    alert('카카오톡 공유 기능은 추후 연동 예정입니다.');
  }, []);

  const handleClose = useCallback(() => {
    gameBus.emit('play-sfx', 'sfx-click');
    onClose();
  }, [onClose]);

  return (
    <div
      className={`${styles.overlay} ${styles.fadeIn}`}
      style={{ zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Dim backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} onClick={handleClose} />

      {/* Modal */}
      <div
        className={styles.fadeInUp}
        style={{
          position: 'relative',
          width: 'min(360px, 92vw)',
          backgroundColor: '#2a292e',
          borderRadius: 20,
          padding: '26px 12px 26px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          animationDelay: '0.1s',
        }}
      >
        {/* Close button — 모달 우상단 바깥쪽에 걸쳐서 떠있음 */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: -14,
            right: -14,
            width: 32,
            height: 32,
            background: '#000',
            border: 'none',
            borderRadius: '50%',
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            zIndex: 1,
          }}
        >
          ✕
        </button>

        {/* Score */}
        <div style={{
          paddingTop: 16,
          paddingBottom: currentImage ? 8 : 24,
          fontSize: 72,
          fontWeight: 900,
          color: '#ffffff',
          fontFamily: '"Black Han Sans", "GMarketSans", sans-serif',
          lineHeight: 1.1,
          textAlign: 'center',
        }}>
          {score}
        </div>

        {/* Challenge image */}
        {currentImage && (
          <div style={{ width: '40%', maxWidth: 120 }}>
            <img
              src={currentImage}
              alt="challenge"
              style={{ width: '100%', height: 'auto', borderRadius: 12, objectFit: 'contain' }}
            />
          </div>
        )}

        {/* Message card */}
        <div style={{
          width: '100%',
          backgroundColor: '#1a1a1f',
          color: '#ffffff',
          fontSize: 14,
          borderRadius: 12,
          padding: 20,
          textAlign: 'center',
          lineHeight: 1.6,
          whiteSpace: 'pre-line',
        }}>
          {message}
        </div>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#3c3c44',
            color: '#969696',
            fontSize: 13,
            fontWeight: 700,
            border: 'none',
            borderRadius: 20,
            padding: '8px 16px',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 14 }}>↻</span>
          다른 멘트로 바꾸기
        </button>

        {/* CTA button */}
        <button
          onClick={handleCTA}
          style={{
            width: '100%',
            backgroundColor: '#000000',
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 700,
            border: 'none',
            borderRadius: 12,
            padding: '16px 24px',
            cursor: 'pointer',
          }}
        >
          카카오톡으로 도전장 보내기
        </button>
      </div>
    </div>
  );
}

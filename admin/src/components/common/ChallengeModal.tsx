import type { CSSProperties } from 'react'
import CloseButton from './CloseButton'
import ScoreDisplay from './ScoreDisplay'
import MessageCard from './MessageCard'
import RefreshButton from './RefreshButton'
import CTAButton from './CTAButton'

interface ChallengeModalProps {
  score?: number
  imageSrc?: string
  message?: string
  ctaText?: string
  refreshText?: string
  modalBg?: string
  onClose?: () => void
  onRefresh?: () => void
  onCTA?: () => void
  style?: CSSProperties
}

export default function ChallengeModal({
  score = 1000,
  imageSrc,
  message = '퇴근 직전 1000에서 \'잠깐만\' 당했다.\n분하면 도전해봐',
  ctaText = '카카오톡으로 도전장 보내기',
  refreshText = '다른 멘트로 바꾸기',
  modalBg = '#2a292e',
  onClose,
  onRefresh,
  onCTA,
  style,
}: ChallengeModalProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: 340,
        backgroundColor: modalBg,
        borderRadius: 20,
        padding: '24px 20px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        ...style,
      }}
    >
      {/* Close button */}
      <CloseButton
        onClick={onClose}
        style={{ position: 'absolute', top: 12, right: 12 }}
      />

      {/* Score */}
      <div style={{ paddingTop: 16, paddingBottom: imageSrc ? 8 : 24 }}>
        <ScoreDisplay score={score} />
      </div>

      {/* Challenge image */}
      {imageSrc && (
        <div style={{ width: '60%', maxWidth: 180 }}>
          <img
            src={imageSrc}
            alt="challenge"
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: 12,
              objectFit: 'contain',
            }}
          />
        </div>
      )}

      {/* Message card */}
      <MessageCard
        message={message}
        style={{ width: '100%' }}
      />

      {/* Refresh button */}
      <RefreshButton onClick={onRefresh}>
        {refreshText}
      </RefreshButton>

      {/* CTA button */}
      <CTAButton onClick={onCTA}>
        {ctaText}
      </CTAButton>
    </div>
  )
}

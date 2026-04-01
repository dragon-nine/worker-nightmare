export interface Quote {
  line1: string
  line2?: string
}

export interface ChallengeQuote {
  text: string
  type: 'normal' | 'record'
}

export interface SectionProps {
  gameId: string
  onBanner: (type: 'success' | 'error', message: string) => void
}

export type ContentTabId = 'gameover' | 'challenge'

export const QUOTES_KEY = (gameId: string) => `${gameId}/content/quotes.json`
export const CHALLENGE_KEY = (gameId: string) => `${gameId}/content/challenge-quotes.json`

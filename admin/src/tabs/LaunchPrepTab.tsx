import { buildGroups } from './launch-prep/types'
import LaunchGroup from './launch-prep/LaunchGroup'

interface Props {
  gameId: string
  gameName: string
  onBanner: (type: 'success' | 'error', message: string) => void
  embedded?: boolean
}

export default function LaunchPrepTab({ gameId, gameName, onBanner, embedded }: Props) {
  const groups = buildGroups(gameId)
  return (
    <div>
      {!embedded && (
        <>
          <h1 className="page-title">출시 준비</h1>
          <p className="page-subtitle">{gameName} — 이미지 하나로 관리, 플랫폼별 다운로드</p>
        </>
      )}
      <div className="lp-info">
        원본 이미지를 하나 올리고, 다운로드 버튼으로 각 플랫폼에 맞는 크기로 받으세요.
      </div>
      <div className="lp-row">
        <LaunchGroup group={groups[0]} onBanner={onBanner} />
        <LaunchGroup group={groups[1]} onBanner={onBanner} />
      </div>
      <LaunchGroup group={groups[2]} onBanner={onBanner} />
    </div>
  )
}

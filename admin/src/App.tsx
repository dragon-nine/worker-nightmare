import { useState, useCallback } from 'react'
import TabNav from './components/TabNav'
import GameAssetsTab from './tabs/GameAssetsTab'
import AssetPreviewTab from './tabs/AssetPreviewTab'
import GooglePlayTab from './tabs/GooglePlayTab'
import TossInAppTab from './tabs/TossInAppTab'
import PlaceholderTab from './tabs/PlaceholderTab'
import Banner from './components/Banner'

export type PageId =
  | 'game01-assets'
  | 'game01-preview'
  | 'game01-google-play'
  | 'game01-toss'
  | 'game02-assets'
  | 'game02-preview'
  | 'game02-google-play'
  | 'game02-toss'

function getInitialPage(): PageId {
  const params = new URLSearchParams(window.location.search)
  return (params.get('page') as PageId) || 'game01-assets'
}

export default function App() {
  const [page, setPage] = useState<PageId>(getInitialPage)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handlePageChange = useCallback((newPage: PageId) => {
    setPage(newPage)
    setSidebarOpen(false)
    const url = new URL(window.location.href)
    url.searchParams.set('page', newPage)
    window.history.replaceState({}, '', url.toString())
  }, [])

  const showBanner = useCallback((type: 'success' | 'error', message: string) => {
    setBanner({ type, message })
  }, [])

  return (
    <div className="admin-root">
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? '\u2715' : '\u2630'}
      </button>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <TabNav activePage={page} onPageChange={handlePageChange} open={sidebarOpen} />
      <main className="admin-content">
        {page === 'game01-assets' && <GameAssetsTab gameId="game01" gameName="직장인 잔혹시" onBanner={showBanner} />}
        {page === 'game01-preview' && <AssetPreviewTab gameId="game01" />}
        {page === 'game01-google-play' && <GooglePlayTab gameId="game01" gameName="직장인 잔혹시" onBanner={showBanner} />}
        {page === 'game01-toss' && <TossInAppTab gameId="game01" gameName="직장인 잔혹시" onBanner={showBanner} />}
        {page === 'game02-assets' && <PlaceholderTab title="game02 에셋 관리" message="game02 프로젝트가 생성되면 활성화됩니다." />}
        {page === 'game02-preview' && <PlaceholderTab title="game02 에셋 프리뷰" message="game02 프로젝트가 생성되면 활성화됩니다." />}
        {page === 'game02-google-play' && <PlaceholderTab title="game02 Google Play" message="game02 프로젝트가 생성되면 활성화됩니다." />}
        {page === 'game02-toss' && <PlaceholderTab title="game02 토스 인앱" message="game02 프로젝트가 생성되면 활성화됩니다." />}
      </main>
      {banner && (
        <Banner type={banner.type} message={banner.message} onDismiss={() => setBanner(null)} />
      )}
    </div>
  )
}

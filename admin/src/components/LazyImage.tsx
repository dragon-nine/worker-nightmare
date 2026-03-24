import { useState, useEffect, useRef } from 'react'

interface Props {
  src: string
  alt: string
  style?: React.CSSProperties
  className?: string
}

export default function LazyImage({ src, alt, style, className }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const retryCount = useRef(0)
  const imgRef = useRef<HTMLImageElement>(null)

  // IntersectionObserver — 화면에 보일 때만 로드 시작
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // src 바뀌면 리셋
  useEffect(() => {
    setStatus('idle')
    retryCount.current = 0
    if (visible) setStatus('loading')
  }, [src, visible])

  // visible 되면 로드 시작
  useEffect(() => {
    if (visible && status === 'idle') setStatus('loading')
  }, [visible, status])

  const handleError = () => {
    if (retryCount.current < 2) {
      retryCount.current++
      setTimeout(() => {
        if (imgRef.current) {
          imgRef.current.src = ''
          imgRef.current.src = src
        }
      }, 1000 * retryCount.current)
    } else {
      setStatus('error')
    }
  }

  return (
    <div ref={containerRef} style={style}>
      {(status === 'idle' || status === 'loading') && (
        <div className="img-placeholder" style={{ width: '100%', height: '100%' }} />
      )}
      {status === 'error' && (
        <div className="img-error" style={{ width: '100%', height: '100%' }}>!</div>
      )}
      {status !== 'idle' && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={className}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            display: status === 'loaded' ? undefined : 'none',
          }}
          onLoad={() => setStatus('loaded')}
          onError={handleError}
        />
      )}
    </div>
  )
}

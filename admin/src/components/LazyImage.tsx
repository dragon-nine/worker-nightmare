import { useState, useEffect } from 'react'

interface Props {
  src: string
  alt: string
  style?: React.CSSProperties
  className?: string
}

export default function LazyImage({ src, alt, style, className }: Props) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  // Reset status when src changes (handles cache-busted URLs)
  useEffect(() => {
    setStatus('loading')
  }, [src])

  return (
    <>
      {status === 'loading' && (
        <div className="img-placeholder" style={style} />
      )}
      {status === 'error' && (
        <div className="img-error" style={style}>!</div>
      )}
      <img
        src={src}
        alt={alt}
        className={className}
        style={{
          ...style,
          display: status === 'loaded' ? undefined : 'none',
        }}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </>
  )
}

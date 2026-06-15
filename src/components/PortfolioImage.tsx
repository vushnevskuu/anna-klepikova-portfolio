import { useEffect, useRef, useState } from 'react'
import type { PortfolioPhoto } from '../data/photos'
import { getAssetUrl } from '../utils/getAssetUrl'

type PortfolioImageProps = {
  photo: PortfolioPhoto
  layerRole: 'previous' | 'current'
  isVisible: boolean
  isEntering?: boolean
  isLeaving?: boolean
  photoLayout: 'horizontal' | 'vertical' | 'mobile'
  priority?: boolean
  onDimensions?: (naturalWidth: number, naturalHeight: number) => void
}

export function PortfolioImage({
  photo,
  layerRole,
  isVisible,
  isEntering = false,
  isLeaving = false,
  photoLayout,
  priority = false,
  onDimensions,
}: PortfolioImageProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const onDimensionsRef = useRef(onDimensions)
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  onDimensionsRef.current = onDimensions

  useEffect(() => {
    setFailed(false)
    setLoaded(false)

    const img = imgRef.current
    if (img?.complete && img.naturalWidth > 0) {
      setLoaded(true)
      onDimensionsRef.current?.(img.naturalWidth, img.naturalHeight)
    }
  }, [photo.src])

  const layerClassName = [
    'portfolio-image-layer',
    `portfolio-image-layer--${photoLayout}`,
    layerRole,
    isVisible ? 'is-active' : '',
    isEntering ? 'is-entering' : '',
    isLeaving ? 'is-leaving' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={layerClassName} aria-hidden={!isVisible}>
      {failed ? (
        <p className="portfolio-image__error" role="alert">
          Unable to load {photo.alt}
        </p>
      ) : (
        <img
          ref={imgRef}
          className={`portfolio-image portfolio-image--${photoLayout}${loaded ? ' portfolio-image--loaded' : ''}`}
          src={getAssetUrl(photo.src)}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onLoad={(event) => {
            const img = event.currentTarget
            setLoaded(true)
            onDimensionsRef.current?.(img.naturalWidth, img.naturalHeight)
          }}
          onError={() => {
            setFailed(true)
            setLoaded(false)
          }}
        />
      )}
    </div>
  )
}

import { useState } from 'react'
import type { PortfolioPhoto } from '../data/photos'
import { getAssetUrl } from '../utils/getAssetUrl'

type PortfolioImageProps = {
  photo: PortfolioPhoto
  visible: boolean
  photoLayout: 'horizontal' | 'vertical' | 'mobile'
  priority?: boolean
  onDimensions?: (naturalWidth: number, naturalHeight: number) => void
}

export function PortfolioImage({
  photo,
  visible,
  photoLayout,
  priority = false,
  onDimensions,
}: PortfolioImageProps) {
  const [failed, setFailed] = useState(false)

  return (
    <div
      className={
        visible
          ? 'portfolio-image-layer portfolio-image-layer--visible'
          : 'portfolio-image-layer portfolio-image-layer--hidden'
      }
      aria-hidden={!visible}
    >
      {failed ? (
        <p className="portfolio-image__error" role="alert">
          Unable to load {photo.alt}
        </p>
      ) : (
        <img
          className={`portfolio-image portfolio-image--${photoLayout}`}
          src={getAssetUrl(photo.src)}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onLoad={(event) => {
            const img = event.currentTarget
            onDimensions?.(img.naturalWidth, img.naturalHeight)
          }}
          onError={() => {
            setFailed(true)
          }}
        />
      )}
    </div>
  )
}

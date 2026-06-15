import type { PortfolioPhoto } from '../data/photos'
import { resolveOrientation } from '../hooks/useImagePreloader'

export function getPhotoOrientation(
  photo: PortfolioPhoto,
  index: number,
  detected: Record<number, 'horizontal' | 'vertical'>,
): 'horizontal' | 'vertical' {
  if (photo.orientation) {
    return photo.orientation
  }

  if (detected[index]) {
    return detected[index]
  }

  if (photo.width !== undefined && photo.height !== undefined) {
    return photo.width >= photo.height ? 'horizontal' : 'vertical'
  }

  return 'horizontal'
}

export function syncDetectedOrientation(
  photo: PortfolioPhoto,
  naturalWidth: number,
  naturalHeight: number,
): 'horizontal' | 'vertical' {
  return resolveOrientation(photo, naturalWidth, naturalHeight)
}

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PortfolioPhoto } from '../data/photos'
import { getAssetUrl } from '../utils/getAssetUrl'
import { wrapIndex } from '../utils/wrapIndex'

const NEIGHBOR_RANGE = 2

type UseImagePreloaderResult = {
  isDecoded: (index: number) => boolean
  decodePhoto: (index: number) => Promise<boolean>
}

export function useImagePreloader(
  photos: PortfolioPhoto[],
  activeIndex: number,
  preloadDistance = NEIGHBOR_RANGE,
): UseImagePreloaderResult {
  const [decodedIndices, setDecodedIndices] = useState<Set<number>>(() => new Set())
  const cacheRef = useRef<Map<number, HTMLImageElement>>(new Map())
  const inflightRef = useRef<Map<number, Promise<boolean>>>(new Map())
  const decodedRef = useRef(decodedIndices)
  decodedRef.current = decodedIndices

  const decodePhoto = useCallback(
    async (index: number): Promise<boolean> => {
      if (index < 0 || index >= photos.length) {
        return false
      }

      if (decodedRef.current.has(index)) {
        return true
      }

      const inflight = inflightRef.current.get(index)
      if (inflight) {
        return inflight
      }

      const promise = new Promise<boolean>((resolve) => {
        const cached = cacheRef.current.get(index)
        if (cached?.complete && cached.naturalWidth > 0) {
          setDecodedIndices((prev) => new Set(prev).add(index))
          resolve(true)
          return
        }

        const img = cached ?? new Image()
        img.src = getAssetUrl(photos[index].src)

        if (index === 0) {
          img.fetchPriority = 'high'
        }

        const finish = (success: boolean) => {
          if (success) {
            cacheRef.current.set(index, img)
            setDecodedIndices((prev) => new Set(prev).add(index))
          }
          inflightRef.current.delete(index)
          resolve(success)
        }

        img.onload = () => {
          if (typeof img.decode === 'function') {
            img
              .decode()
              .then(() => finish(true))
              .catch(() => finish(true))
          } else {
            finish(true)
          }
        }

        img.onerror = () => finish(false)
      })

      inflightRef.current.set(index, promise)
      return promise
    },
    [photos],
  )

  useEffect(() => {
    const indices: number[] = []
    for (let offset = -preloadDistance; offset <= preloadDistance; offset += 1) {
      indices.push(wrapIndex(activeIndex + offset, photos.length))
    }

    indices.forEach((index) => {
      void decodePhoto(index)
    })
  }, [activeIndex, decodePhoto, photos.length, preloadDistance])

  const isDecoded = useCallback(
    (index: number) => decodedIndices.has(index),
    [decodedIndices],
  )

  return { isDecoded, decodePhoto }
}

export function resolveOrientation(
  photo: PortfolioPhoto,
  naturalWidth: number,
  naturalHeight: number,
): 'horizontal' | 'vertical' {
  if (photo.orientation) {
    return photo.orientation
  }
  return naturalWidth >= naturalHeight ? 'horizontal' : 'vertical'
}

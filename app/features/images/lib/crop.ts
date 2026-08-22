export interface ImageCrop {
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

export type ImageAspect = 'landscape' | 'square'

export interface ImagePoint {
  readonly x: number
  readonly y: number
}

export interface ImageSize {
  readonly height: number
  readonly width: number
}

export function calculateCrop(
  image: ImageSize,
  ratio: number,
  point: ImagePoint,
  zoom: number,
): ImageCrop {
  if (!image.height || !image.width) {
    return {
      height: 1,
      width: 1,
      x: 0,
      y: 0,
    }
  }

  const imageRatio = image.width / image.height
  const baseWidth = imageRatio > ratio ? ratio / imageRatio : 1
  const baseHeight = imageRatio > ratio ? 1 : imageRatio / ratio
  const width = baseWidth / zoom
  const height = baseHeight / zoom

  return {
    height,
    width,
    x: Math.min(Math.max(point.x - width / 2, 0), 1 - width),
    y: Math.min(Math.max(point.y - height / 2, 0), 1 - height),
  }
}

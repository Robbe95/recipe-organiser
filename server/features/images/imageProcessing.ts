import sharp from 'sharp'

import { writeWebp } from './imageStorage'

export const imageVariants = {
  desktop: {
    height: 1200,
    width: 1600,
  },
  mobile: {
    height: 600,
    width: 800,
  },
  tablet: {
    height: 900,
    width: 1200,
  },
  thumbnail: {
    height: 240,
    width: 240,
  },
} as const

export type ImageVariant = keyof typeof imageVariants | 'full'

export interface ImageCrop {
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

function toPixels(crop: ImageCrop, width: number, height: number) {
  return {
    height: Math.max(1, Math.round(crop.height * height)),
    left: Math.max(0, Math.round(crop.x * width)),
    top: Math.max(0, Math.round(crop.y * height)),
    width: Math.max(1, Math.round(crop.width * width)),
  }
}

export async function processImage(input: {
  crop: ImageCrop
  image: Buffer
  keyPrefix: string
}) {
  const metadata = await sharp(input.image, { failOn: 'none' }).metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error('The uploaded file is not a readable image.')
  }

  const crop = toPixels(input.crop, metadata.width, metadata.height)

  if (crop.left + crop.width > metadata.width || crop.top + crop.height > metadata.height) {
    throw new Error('The selected crop is outside the uploaded image.')
  }

  const source = sharp(input.image, { failOn: 'none' }).extract(crop).rotate()
  const variants = Object.entries(imageVariants) as [
    Exclude<ImageVariant, 'full'>,
    {
      height: number
      width: number
    },
  ][]
  const keys = {} as Record<ImageVariant, string>

  await Promise.all(variants.map(async ([name, dimensions]) => {
    const key = `${input.keyPrefix}/${name}.webp`
    const body = await source
      .clone()
      .resize({
        fit: 'cover',
        height: dimensions.height,
        width: dimensions.width,
      })
      .webp({ quality: 82 })
      .toBuffer()

    await writeWebp({
      body,
      key,
    })
    keys[name] = key
  }))

  const fullKey = `${input.keyPrefix}/full.webp`
  await writeWebp({
    body: await source
      .clone()
      .resize({
        fit: 'inside',
        height: 2400,
        width: 2400,
        withoutEnlargement: true,
      })
      .webp({ quality: 86 })
      .toBuffer(),
    key: fullKey,
  })
  keys.full = fullKey

  return {
    height: crop.height,
    keys,
    width: crop.width,
  }
}

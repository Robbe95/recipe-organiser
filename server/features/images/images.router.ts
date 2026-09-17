import { ORPCError } from '@orpc/server'
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import { eq } from 'drizzle-orm'
import * as v from 'valibot'

import { db } from '../../db'
import { protectedProcedure } from '../../orpc/procedure'
import { processImage } from './imageProcessing'
import {
  createReadUrl,
  deleteObject,
  readObject,
} from './imageStorage'
import { imageAsset } from './schema'

const maxUploadBytes = 12 * 1024 * 1024
const imageContentTypes = [
  'image/avif',
  'image/heic',
  'image/heif',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const
const cropSchema = v.object({
  height: v.pipe(v.number(), v.minValue(0.01), v.maxValue(1)),
  width: v.pipe(v.number(), v.minValue(0.01), v.maxValue(1)),
  x: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  y: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
})
const uploadInputSchema = v.object({
  contentType: v.picklist(imageContentTypes),
  crop: cropSchema,
  fileName: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(180)),
  focalX: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  focalY: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  size: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(maxUploadBytes)),
})
const completeInputSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  contentType: v.picklist(imageContentTypes),
  crop: cropSchema,
  focalX: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  focalY: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  sourceKey: v.pipe(v.string(), v.minLength(1), v.maxLength(500)),
})

function requiredBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN

  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN must be configured for image storage.')
  }

  return token
}

function assertOwnTemporaryKey(userId: string, imageId: string, sourceKey: string) {
  const expectedKey = `recipes/${userId}/incoming/${imageId}`

  if (sourceKey !== expectedKey) {
    throw new ORPCError('FORBIDDEN')
  }
}

type ImageVariantName = 'desktop' | 'full' | 'mobile' | 'tablet' | 'thumbnail'
type ImageVariantUrls = Record<ImageVariantName, string>

async function resolveVariantUrls(image: {
  id: string
  variantKeys: Record<ImageVariantName, string>
  variantUrls: Partial<ImageVariantUrls> | null
}): Promise<ImageVariantUrls> {
  if (
    image.variantUrls?.desktop
    && image.variantUrls.full
    && image.variantUrls.mobile
    && image.variantUrls.tablet
    && image.variantUrls.thumbnail
  ) {
    return image.variantUrls as ImageVariantUrls
  }

  const variantUrls = Object.fromEntries(await Promise.all(
    Object.entries(image.variantKeys).map(async ([
      name,
      key,
    ]) => [
      name,
      await createReadUrl(key),
    ]),
  )) as ImageVariantUrls

  await db.update(imageAsset).set({
    variantUrls,
  }).where(eq(imageAsset.id, image.id))

  return variantUrls
}

const createUpload = protectedProcedure
  .input(uploadInputSchema)
  .handler(async ({
    context, input,
  }) => {
    const id = crypto.randomUUID()
    const sourceKey = `recipes/${context.user.id}/incoming/${id}`

    return {
      id,
      clientToken: await generateClientTokenFromReadWriteToken({
        addRandomSuffix: false,
        allowedContentTypes: [
          input.contentType,
        ],
        maximumSizeInBytes: maxUploadBytes,
        pathname: sourceKey,
        token: requiredBlobToken(),
        validUntil: Date.now() + 60 * 5 * 1000,
      }),
      sourceKey,
    }
  })

const completeUpload = protectedProcedure
  .input(completeInputSchema)
  .handler(async ({
    context, input,
  }) => {
    assertOwnTemporaryKey(context.user.id, input.id, input.sourceKey)

    let stage = 'reading the uploaded file'

    try {
      stage = 'creating image variants'

      const processed = await processImage({
        crop: input.crop,
        image: await readObject(input.sourceKey),
        keyPrefix: `recipes/${context.user.id}/images/${input.id}`,
      })

      stage = 'saving image metadata'

      const image = await db.insert(imageAsset).values({
        id: input.id,
        createdById: context.user.id,
        crop: input.crop,
        focalX: input.focalX,
        focalY: input.focalY,
        height: processed.height,
        sourceKey: input.sourceKey,
        variantKeys: processed.keys,
        variantUrls: processed.urls,
        width: processed.width,
      }).returning()

      return image[0]
    }
    catch (error) {
      console.error('Unable to process recipe image.', {
        imageId: input.id,
        contentType: input.contentType,
        error,
        sourceKey: input.sourceKey,
        stage,
      })

      throw new ORPCError('BAD_REQUEST', {
        message: 'We could not process that image. Please try a different file.',
      })
    }
    finally {
      await deleteObject(input.sourceKey).catch((error) => {
        console.error('Unable to remove temporary recipe image.', error)
      })
    }
  })

const listImages = protectedProcedure
  .input(v.object({}))
  .handler(async ({
    context,
  }) => {
    const images = await db.query.imageAsset.findMany({
      orderBy: (table, {
        desc,
      }) => desc(table.createdAt),
      where: eq(imageAsset.createdById, context.user.id),
    })

    return Promise.all(images.map(async (image) => ({
      ...image,
      urls: await resolveVariantUrls(image),
    })))
  })

export const imageRouter = {
  completeUpload,
  createUpload,
  listImages,
}

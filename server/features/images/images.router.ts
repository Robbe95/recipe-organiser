import { eq } from 'drizzle-orm'
import { ORPCError } from '@orpc/server'
import * as v from 'valibot'

import {
  db,
} from '../../db'
import { imageAsset } from '../../db/schema'
import { protectedProcedure } from '../../orpc/procedure'
import {
  createReadUrl,
  createUploadUrl,
  deleteObject,
  readObject,
} from './imageStorage'
import {
  imageVariants,
  processImage,
} from './imageProcessing'

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
  contentType: v.picklist(imageContentTypes),
  crop: cropSchema,
  focalX: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  focalY: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  id: v.pipe(v.string(), v.uuid()),
  sourceKey: v.pipe(v.string(), v.minLength(1), v.maxLength(500)),
})

function assertOwnTemporaryKey(userId: string, imageId: string, sourceKey: string) {
  const expectedKey = `recipes/${userId}/incoming/${imageId}`

  if (sourceKey !== expectedKey) {
    throw new ORPCError('FORBIDDEN')
  }
}

const createUpload = protectedProcedure
  .input(uploadInputSchema)
  .handler(async ({
    context,
    input,
  }) => {
    const id = crypto.randomUUID()
    const sourceKey = `recipes/${context.user.id}/incoming/${id}`

    return {
      id,
      sourceKey,
      uploadUrl: await createUploadUrl({
        contentType: input.contentType,
        key: sourceKey,
      }),
    }
  })

const completeUpload = protectedProcedure
  .input(completeInputSchema)
  .handler(async ({
    context,
    input,
  }) => {
    assertOwnTemporaryKey(context.user.id, input.id, input.sourceKey)

    try {
      const processed = await processImage({
        crop: input.crop,
        image: await readObject(input.sourceKey),
        keyPrefix: `recipes/${context.user.id}/images/${input.id}`,
      })
      const image = await db.insert(imageAsset).values({
        createdById: context.user.id,
        crop: input.crop,
        focalX: input.focalX,
        focalY: input.focalY,
        height: processed.height,
        id: input.id,
        sourceKey: input.sourceKey,
        variantKeys: processed.keys,
        width: processed.width,
      }).returning()

      return image[0]
    }
    catch (error) {
      console.error('Unable to process recipe image.', error)
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
  .handler(async ({ context }) => {
    const images = await db.query.imageAsset.findMany({
      orderBy: (table, {
        desc,
      }) => desc(table.createdAt),
      where: eq(imageAsset.createdById, context.user.id),
    })

    return Promise.all(images.map(async (image) => ({
      ...image,
      urls: Object.fromEntries(await Promise.all(
        Object.entries(image.variantKeys).map(async ([name, key]) => [
          name,
          await createReadUrl(key),
        ]),
      )),
    })))
  })

export const imageRouter = {
  createUpload,
  imageVariants,
  completeUpload,
  listImages,
}

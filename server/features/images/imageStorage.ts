import { Buffer } from 'node:buffer'

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function requiredEnvironment(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} must be configured for image storage.`)
  }

  return value
}

function getStorageConfig() {
  return {
    bucket: requiredEnvironment('S3_BUCKET'),
    credentials: {
      accessKeyId: requiredEnvironment('S3_ACCESS_KEY_ID'),
      secretAccessKey: requiredEnvironment('S3_SECRET_ACCESS_KEY'),
    },
    endpoint: requiredEnvironment('S3_ENDPOINT'),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    region: process.env.S3_REGION || 'auto',
  }
}

function storageClient() {
  const config = getStorageConfig()

  return new S3Client({
    credentials: config.credentials,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    region: config.region,
  })
}

export async function createUploadUrl(input: {
  contentType: string
  key: string
}) {
  const config = getStorageConfig()

  return await getSignedUrl(
    storageClient(),
    new PutObjectCommand({
      Bucket: config.bucket,
      ContentType: input.contentType,
      Key: input.key,
    }),
    {
      expiresIn: 60 * 5,
    },
  )
}

export async function readObject(key: string): Promise<Buffer> {
  const config = getStorageConfig()
  const response = await storageClient().send(new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  }))

  if (!response.Body) {
    throw new Error('Uploaded image could not be read from storage.')
  }

  return Buffer.from(await response.Body.transformToByteArray())
}

export async function writeWebp(input: {
  body: Buffer
  key: string
}) {
  const config = getStorageConfig()

  await storageClient().send(new PutObjectCommand({
    Body: input.body,
    Bucket: config.bucket,
    CacheControl: 'private, max-age=31536000, immutable',
    ContentType: 'image/webp',
    Key: input.key,
  }))
}

export async function deleteObject(key: string) {
  const config = getStorageConfig()

  await storageClient().send(new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  }))
}

export async function createReadUrl(key: string) {
  const config = getStorageConfig()

  return await getSignedUrl(
    storageClient(),
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
    {
      expiresIn: 60 * 15,
    },
  )
}

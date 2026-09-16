import { Buffer } from 'node:buffer'

import {
  del,
  get,
  head,
  put,
} from '@vercel/blob'

function requiredBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN

  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN must be configured for image storage.')
  }

  return token
}

export async function readObject(key: string): Promise<Buffer> {
  const object = await get(key, {
    access: 'public',
    token: requiredBlobToken(),
  })

  if (!object?.stream) {
    throw new Error('Uploaded image could not be read from storage.')
  }

  return Buffer.from(await new Response(object.stream).arrayBuffer())
}

export function writeWebp(input: {
  body: Buffer
  key: string
}) {
  return put(input.key, input.body, {
    access: 'public',
    cacheControlMaxAge: 60 * 60 * 24 * 365,
    contentType: 'image/webp',
    token: requiredBlobToken(),
  })
}

export async function deleteObject(key: string) {
  await del(key, {
    token: requiredBlobToken(),
  })
}

export async function createReadUrl(key: string) {
  const object = await head(key, {
    token: requiredBlobToken(),
  })

  return object.url
}

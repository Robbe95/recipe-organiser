import { Buffer } from 'node:buffer'
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto'

const algorithm = 'aes-256-gcm'
const separator = '.'

function getEncryptionKey() {
  const secret = process.env.BETTER_AUTH_SECRET

  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET must be set before saving an OpenAI API key.')
  }

  return createHash('sha256').update(secret).digest()
}

export function encryptOpenAiApiKey(apiKey: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv(algorithm, getEncryptionKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(apiKey, 'utf8'),
    cipher.final(),
  ])

  return [
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(separator)
}

export function decryptOpenAiApiKey(encryptedValue: string) {
  const [
    ivText,
    authTagText,
    ciphertextText,
  ] = encryptedValue.split(separator)

  if (!ivText || !authTagText || !ciphertextText) {
    throw new Error('The saved OpenAI API key is invalid.')
  }

  const decipher = createDecipheriv(
    algorithm,
    getEncryptionKey(),
    Buffer.from(ivText, 'base64url'),
  )

  decipher.setAuthTag(Buffer.from(authTagText, 'base64url'))

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

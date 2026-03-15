/**
 * Stateless Session Management
 *
 * Uses HMAC-signed tokens that can be validated on any serverless instance
 * without requiring shared storage (Redis, database, etc.)
 *
 * Token format: timestamp.signature
 * - timestamp: Unix timestamp when token was created
 * - signature: HMAC-SHA256 of (adminKey + timestamp)
 */

import crypto from 'crypto'

const TOKEN_SEPARATOR = '.'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 // 24 hours

/**
 * Create a stateless session token
 * Can be validated on any instance without shared storage
 */
export function createSessionToken(adminKey: string): string {
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = crypto
    .createHmac('sha256', adminKey)
    .update(`session-${timestamp}`)
    .digest('hex')

  return `${timestamp}${TOKEN_SEPARATOR}${signature}`
}

/**
 * Validate a stateless session token
 * Returns true if token is valid and not expired
 */
export function validateSessionToken(token: string | undefined): boolean {
  if (!token) return false

  const adminKey = process.env.ADMIN_API_KEY
  if (!adminKey) return false

  const parts = token.split(TOKEN_SEPARATOR)
  if (parts.length !== 2) return false

  const [timestampStr, providedSignature] = parts
  const timestamp = parseInt(timestampStr, 10)

  if (isNaN(timestamp)) return false

  // Check if token has expired
  const now = Math.floor(Date.now() / 1000)
  if (now - timestamp > SESSION_MAX_AGE_SECONDS) {
    return false
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', adminKey)
    .update(`session-${timestamp}`)
    .digest('hex')

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch {
    return false
  }
}

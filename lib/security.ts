/**
 * Security utilities for PayRoute
 * - Paystack signature verification
 * - IP validation
 */

import crypto from 'crypto'

// Paystack webhook IP whitelist
// Source: https://paystack.com/docs/payments/webhooks/#ip-whitelisting
export const PAYSTACK_WEBHOOK_IPS = [
  '52.31.139.75',
  '52.49.173.169',
  '52.214.14.220',
]

/**
 * Verify Paystack webhook signature using HMAC-SHA512
 */
export function verifyPaystackSignature(
  body: string,
  signature: string | null,
  secretKey: string
): boolean {
  if (!signature) return false
  const hash = crypto.createHmac('sha512', secretKey).update(body).digest('hex')
  return hash === signature
}

/**
 * Extract client IP from request headers
 * Works with various proxy configurations
 */
export function getClientIP(
  headers: { get: (name: string) => string | null }
): string | null {
  // x-forwarded-for can contain multiple IPs, first is the client
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIP = forwardedFor.split(',')[0]
    return firstIP ? firstIP.trim() : null
  }

  const realIP = headers.get('x-real-ip')
  if (realIP) {
    return realIP.trim()
  }

  // Vercel-specific header
  const vercelForwardedFor = headers.get('x-vercel-forwarded-for')
  if (vercelForwardedFor) {
    const firstIP = vercelForwardedFor.split(',')[0]
    return firstIP ? firstIP.trim() : null
  }

  // Cloudflare-specific header
  const cfConnectingIP = headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP.trim()
  }

  return null
}

/**
 * Check if IP is from Paystack's known IPs
 */
export function isPaystackIP(ip: string | null): boolean {
  if (!ip) return false
  return PAYSTACK_WEBHOOK_IPS.includes(ip)
}

/**
 * Validate admin API key from header
 */
export function validateAdminKey(
  headers: { get: (name: string) => string | null }
): boolean {
  const adminKey = process.env.ADMIN_API_KEY
  if (!adminKey) {
    // If no admin key is set, deny all access
    return false
  }

  const providedKey = headers.get('x-admin-key') || headers.get('authorization')?.replace('Bearer ', '')
  return providedKey === adminKey
}

/**
 * Validate admin session from cookie
 */
export function validateSession(sessionToken: string | undefined): boolean {
  if (!sessionToken) return false
  return globalThis.payrouteSessions?.has(sessionToken) ?? false
}

/**
 * Check if request is authenticated via header or session cookie
 */
export function isAuthenticated(
  headers: { get: (name: string) => string | null },
  sessionToken?: string
): boolean {
  // First check x-admin-key header
  if (validateAdminKey(headers)) {
    return true
  }

  // Then check session cookie
  if (sessionToken && validateSession(sessionToken)) {
    return true
  }

  return false
}

// Declare global type for session storage
declare global {
  // eslint-disable-next-line no-var
  var payrouteSessions: Set<string> | undefined
}

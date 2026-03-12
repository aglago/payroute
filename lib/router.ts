/**
 * Webhook Routing Logic
 * Determines which app should receive a webhook based on metadata or reference prefix
 */

import crypto from 'crypto'
import type { AppConfig, PaystackWebhookPayload, RoutingResult } from './types'
import { getAppRegistry, getApp, getEnabledApps } from './config'

/**
 * Create HMAC signature for webhook forwarding
 * Uses the same algorithm as Paystack for consistency
 */
function createRouterSignature(body: string, secret: string): string {
  return crypto
    .createHmac('sha512', secret)
    .update(body)
    .digest('hex')
}

/**
 * Determine the destination app for a webhook payload
 *
 * Routing strategy:
 * 1. Check metadata.app - explicit routing
 * 2. Check reference prefix - fallback routing
 * 3. Return null if no match found
 */
export async function determineDestinationApp(payload: PaystackWebhookPayload): Promise<RoutingResult> {
  const reference = payload.data?.reference || null

  // Strategy 1: Check metadata.app for explicit routing
  const metadataApp = payload.data?.metadata?.app
  if (metadataApp && typeof metadataApp === 'string') {
    const app = await getApp(metadataApp)
    if (app) {
      console.log(`Routing via metadata.app: ${metadataApp}`)
      return {
        app,
        strategy: 'metadata',
        reference,
      }
    }
    console.warn(`metadata.app "${metadataApp}" not found in registry`)
  }

  // Strategy 2: Check reference prefix
  if (reference) {
    const enabledApps = await getEnabledApps()

    for (const app of enabledApps) {
      for (const prefix of app.prefixes) {
        if (reference.startsWith(prefix)) {
          console.log(`Routing via prefix "${prefix}" to ${app.id}`)
          return {
            app,
            strategy: 'prefix',
            reference,
          }
        }
      }
    }
  }

  // No match found
  console.warn(`No routing match found for reference: ${reference}`)
  return {
    app: null,
    strategy: 'none',
    reference,
  }
}

/**
 * Forward webhook to destination app
 */
export async function forwardWebhook(
  app: AppConfig,
  payload: PaystackWebhookPayload,
  originalSignature: string | null
): Promise<{
  success: boolean
  status?: number
  body?: unknown
  error?: string
  durationMs: number
}> {
  const startTime = Date.now()

  try {
    const bodyString = JSON.stringify(payload)
    const routerSignature = createRouterSignature(bodyString, app.routerSecret)

    const response = await fetch(app.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PayRoute-Signature': routerSignature,
        'X-Original-Signature': originalSignature || '',
        'X-Routed-By': 'payroute',
        'X-Routed-At': new Date().toISOString(),
      },
      body: bodyString,
    })

    const durationMs = Date.now() - startTime

    // Read body as text first, then try to parse as JSON
    const bodyText = await response.text()
    let body: unknown

    try {
      body = JSON.parse(bodyText)
    } catch {
      body = bodyText
    }

    return {
      success: response.ok,
      status: response.status,
      body,
      durationMs,
    }
  } catch (error) {
    const durationMs = Date.now() - startTime
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs,
    }
  }
}

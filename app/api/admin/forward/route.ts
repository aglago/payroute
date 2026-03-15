/**
 * Manual Forward Webhook API
 * Forward a webhook to a specific app (for unrouted or dead letter webhooks)
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isAuthenticated, forwardWebhook, WebhookLogger } from '@/lib'
import { getAppRegistry } from '@/lib/config'
import { createClient } from '@/lib/supabase'

async function checkAuth(request: NextRequest): Promise<boolean> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('payroute_session')?.value
  return isAuthenticated(request.headers, sessionToken)
}

/**
 * POST /api/admin/forward - Manually forward a webhook to a specific app
 *
 * Supports two modes:
 * 1. Forward from webhook_logs: { webhookId, appId }
 * 2. Forward from dead_letter: { payload, appId, deadLetterId }
 */
export async function POST(request: NextRequest) {
  // Validate admin key or session
  if (!await checkAuth(request)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { webhookId, appId, payload, deadLetterId } = body

    if (!appId) {
      return NextResponse.json(
        { success: false, message: 'Missing appId' },
        { status: 400 }
      )
    }

    // Get the CURRENT app configuration (fresh from database)
    // This ensures we use the updated webhook URL if it was changed
    const appRegistry = await getAppRegistry()
    const app = appRegistry[appId]

    if (!app) {
      return NextResponse.json(
        { success: false, message: `App "${appId}" not found in registry` },
        { status: 404 }
      )
    }

    if (!app.enabled) {
      return NextResponse.json(
        { success: false, message: `App "${appId}" is disabled` },
        { status: 400 }
      )
    }

    // Log which URL we're using
    console.log(`[Forward] Forwarding to ${appId} at ${app.webhookUrl}`)

    const supabase = createClient()

    // Mode 2: Forward from dead letter (direct payload)
    if (payload && deadLetterId) {
      // Forward the webhook using CURRENT app config (current webhookUrl)
      const forwardResult = await forwardWebhook(
        app,
        payload,
        null // No original signature for manual forward
      )

      // Update the dead letter entry
      await supabase
        .from('dead_letter_webhooks')
        .update({
          reviewed: true,
          reviewed_at: new Date().toISOString(),
          resolution: forwardResult.success ? 'forwarded' : 'forward_failed',
          forwarded_to: appId,
        })
        .eq('id', deadLetterId)

      if (forwardResult.success) {
        return NextResponse.json({
          success: true,
          message: `Webhook forwarded to ${app.name}`,
          status: forwardResult.status,
          durationMs: forwardResult.durationMs,
        })
      } else {
        return NextResponse.json({
          success: false,
          message: forwardResult.error || 'Forward failed',
          status: forwardResult.status,
        })
      }
    }

    // Mode 1: Forward from webhook_logs
    if (!webhookId) {
      return NextResponse.json(
        { success: false, message: 'Missing webhookId or payload+deadLetterId' },
        { status: 400 }
      )
    }

    // Get the original webhook log
    const { data: webhookLog, error: fetchError } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('id', webhookId)
      .single()

    if (fetchError || !webhookLog) {
      return NextResponse.json(
        { success: false, message: 'Webhook not found' },
        { status: 404 }
      )
    }

    // Get the current attempt count for this webhook
    const attemptCount = await WebhookLogger.getAttemptCount(webhookId)

    // Forward the webhook
    const forwardResult = await forwardWebhook(
      app,
      webhookLog.payload,
      null // No original signature for manual forward
    )

    // Log the manual forward attempt (linked to the original webhook)
    const attemptResult = await WebhookLogger.logAttempt({
      webhook_log_id: webhookId,
      attempt_number: attemptCount + 1,
      attempt_type: 'manual',
      destination_app: app.id,
      destination_url: app.webhookUrl,
      status: forwardResult.success ? 'success' : 'failed',
      response_status: forwardResult.status,
      response_body: forwardResult.body,
      duration_ms: forwardResult.durationMs,
      error_message: forwardResult.error,
    })

    if (!attemptResult.success) {
      console.error('Failed to log attempt:', attemptResult.error)
    }

    // Update the original webhook log's forward status and details
    const updateResult = await WebhookLogger.updateForwardStatus(webhookId, {
      status: forwardResult.success ? 'success' : 'failed',
      destination_app: app.id,
      destination_url: app.webhookUrl,
      response_status: forwardResult.status,
      response_body: forwardResult.body,
      duration_ms: forwardResult.durationMs,
      error_message: forwardResult.error,
    })

    if (!updateResult.success) {
      console.error('Failed to update webhook log:', updateResult.error)
    }

    // If this was a dead letter entry, mark it as resolved
    if (webhookLog.forward_status === 'dead_letter') {
      await supabase
        .from('dead_letter_webhooks')
        .update({
          reviewed: true,
          reviewed_at: new Date().toISOString(),
          resolution: forwardResult.success ? 'forwarded' : 'forward_failed',
          forwarded_to: appId,
        })
        .eq('reference', webhookLog.reference)
    }

    if (forwardResult.success) {
      return NextResponse.json({
        success: true,
        message: `Webhook forwarded to ${app.name}`,
        status: forwardResult.status,
        durationMs: forwardResult.durationMs,
        attemptNumber: attemptCount + 1,
      })
    } else {
      return NextResponse.json({
        success: false,
        message: forwardResult.error || 'Forward failed',
        status: forwardResult.status,
        attemptNumber: attemptCount + 1,
      })
    }
  } catch (error) {
    console.error('Manual forward error:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Forward failed' },
      { status: 500 }
    )
  }
}

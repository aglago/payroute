/**
 * Retry Webhook API
 * Re-forward a failed webhook to its destination
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
 * POST /api/admin/retry - Retry a failed webhook
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
    const { webhookId } = body

    if (!webhookId) {
      return NextResponse.json(
        { success: false, message: 'Missing webhookId' },
        { status: 400 }
      )
    }

    // Get the original webhook log
    const supabase = createClient()
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

    // Check if there's a destination app
    const destinationAppId = webhookLog.destination_app
    if (!destinationAppId) {
      return NextResponse.json(
        { success: false, message: 'No destination app configured for this webhook' },
        { status: 400 }
      )
    }

    // Get the app configuration
    const appRegistry = await getAppRegistry()
    const app = appRegistry[destinationAppId]

    if (!app) {
      return NextResponse.json(
        { success: false, message: `App "${destinationAppId}" not found in registry` },
        { status: 404 }
      )
    }

    if (!app.enabled) {
      return NextResponse.json(
        { success: false, message: `App "${destinationAppId}" is disabled` },
        { status: 400 }
      )
    }

    // Get the current attempt count for this webhook
    const attemptCount = await WebhookLogger.getAttemptCount(webhookId)

    // Re-forward the webhook
    const forwardResult = await forwardWebhook(
      app,
      webhookLog.payload,
      null // No original signature for retry
    )

    // Log the retry attempt (linked to the original webhook)
    const attemptResult = await WebhookLogger.logAttempt({
      webhook_log_id: webhookId,
      attempt_number: attemptCount + 1,
      attempt_type: 'retry',
      destination_app: app.id,
      destination_url: app.webhookUrl,
      status: forwardResult.success ? 'success' : 'failed',
      response_status: forwardResult.status,
      response_body: forwardResult.body,
      duration_ms: forwardResult.durationMs,
      error_message: forwardResult.error,
    })

    if (!attemptResult.success) {
      console.error('Failed to log retry attempt:', attemptResult.error)
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

    if (forwardResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Webhook retried successfully',
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
    console.error('Retry error:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Retry failed' },
      { status: 500 }
    )
  }
}

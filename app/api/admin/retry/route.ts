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

    // Re-forward the webhook
    const startTime = Date.now()
    const forwardResult = await forwardWebhook(
      app,
      webhookLog.payload,
      null // No original signature for retry
    )

    const processingTime = Date.now() - startTime

    // Log the retry attempt
    await WebhookLogger.log({
      source: 'paystack-retry',
      endpoint: '/api/admin/retry',
      payload: webhookLog.payload,
      destination_app: app.id,
      destination_url: app.webhookUrl,
      routing_strategy: webhookLog.routing_strategy,
      reference: webhookLog.reference,
      forward_status: forwardResult.success ? 'success' : 'failed',
      forward_response_status: forwardResult.status,
      forward_response_body: forwardResult.body,
      forward_duration_ms: forwardResult.durationMs,
      error_message: forwardResult.error,
      processing_time_ms: processingTime,
      trace_logs: [{ level: 'info', message: `Retry of webhook ${webhookId}`, timestamp: new Date().toISOString() }],
    })

    if (forwardResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Webhook retried successfully',
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
  } catch (error) {
    console.error('Retry error:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Retry failed' },
      { status: 500 }
    )
  }
}

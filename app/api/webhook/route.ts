/**
 * Main Webhook Endpoint
 *
 * Receives Paystack webhooks and routes them to the correct destination app
 * based on metadata.app or reference prefix.
 */

import { NextRequest, NextResponse } from 'next/server'
import type { PaystackWebhookPayload } from '@/lib/types'
import {
  verifyPaystackSignature,
  getClientIP,
  isPaystackIP,
  isIPValidationEnabled,
  getPaystackSecretKey,
  determineDestinationApp,
  forwardWebhook,
  logToDeadLetter,
  WebhookLogger,
  TraceLogger,
} from '@/lib'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const tracer = new TraceLogger()
  tracer.start()

  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    let payload: unknown

    try {
      payload = JSON.parse(rawBody)
    } catch {
      console.error('Invalid JSON payload')
      return NextResponse.json(
        { success: false, message: 'Invalid JSON' },
        { status: 400 }
      )
    }

    // Get client IP for security logging
    const clientIP = getClientIP(request.headers) || 'unknown'

    // Extract signature
    const signature = request.headers.get('x-paystack-signature')
    const secretKey = getPaystackSecretKey()

    // Verify Paystack signature
    if (!verifyPaystackSignature(rawBody, signature, secretKey)) {
      console.error('Invalid Paystack signature', { clientIP })

      tracer.stop()
      await WebhookLogger.log({
        source: 'paystack',
        endpoint: '/api/webhook',
        payload,
        ip_address: clientIP,
        error_message: 'Invalid signature',
        forward_status: 'failed',
        processing_time_ms: Date.now() - startTime,
        trace_logs: tracer.getLogs(),
      })

      // Return 200 to Paystack to prevent retries on invalid signatures
      return NextResponse.json({ success: false, message: 'Invalid signature' })
    }

    // Optional IP validation
    if (isIPValidationEnabled() && !isPaystackIP(clientIP)) {
      console.warn('Request from non-Paystack IP:', clientIP)
      // Log but don't reject - some proxies may mask the IP
    }

    // Type cast for routing
    const typedPayload = payload as PaystackWebhookPayload

    // Log incoming webhook
    const eventType = typedPayload.event || 'unknown'
    const reference = typedPayload.data?.reference || 'unknown'
    console.log(`📥 Webhook received:`, { event: eventType, reference, ip: clientIP })

    // Determine destination app
    const routingResult = await determineDestinationApp(typedPayload)

    // If no destination found, log to dead letter queue
    if (!routingResult.app) {
      console.warn(`⚠️ No destination found for webhook:`, { reference })

      const deadLetterResult = await logToDeadLetter({
        payload,
        reference: routingResult.reference || undefined,
        reason: 'no_matching_app',
        ip_address: clientIP,
      })

      if (!deadLetterResult.success) {
        console.error('❌ Failed to log to dead letter queue:', deadLetterResult.error)
      } else {
        console.log('📝 Logged to dead letter queue:', deadLetterResult.id)
      }

      tracer.stop()
      await WebhookLogger.log({
        source: 'paystack',
        endpoint: '/api/webhook',
        payload,
        reference: routingResult.reference || undefined,
        routing_strategy: routingResult.strategy,
        forward_status: 'dead_letter',
        ip_address: clientIP,
        processing_time_ms: Date.now() - startTime,
        trace_logs: tracer.getLogs(),
      })

      // Return 200 to Paystack to acknowledge receipt
      return NextResponse.json({ success: true, message: 'Webhook received, no routing match' })
    }

    tracer.stop()
    const processingTime = Date.now() - startTime

    // Log the incoming webhook first (before forwarding attempt)
    const logResult = await WebhookLogger.log({
      source: 'paystack',
      endpoint: '/api/webhook',
      payload,
      destination_app: routingResult.app.id,
      destination_url: routingResult.app.webhookUrl,
      routing_strategy: routingResult.strategy,
      reference: routingResult.reference || undefined,
      forward_status: 'pending' as 'success' | 'failed' | 'skipped' | 'dead_letter',
      ip_address: clientIP,
      processing_time_ms: processingTime,
      trace_logs: tracer.getLogs(),
    })

    // Forward to destination app
    console.log(`📤 Forwarding to ${routingResult.app.name}:`, routingResult.app.webhookUrl)

    const forwardResult = await forwardWebhook(
      routingResult.app,
      typedPayload,
      signature
    )

    // Log the forward attempt
    if (logResult.id) {
      await WebhookLogger.logAttempt({
        webhook_log_id: logResult.id,
        attempt_number: 1,
        attempt_type: 'auto',
        destination_app: routingResult.app.id,
        destination_url: routingResult.app.webhookUrl,
        status: forwardResult.success ? 'success' : 'failed',
        response_status: forwardResult.status,
        response_body: forwardResult.body,
        duration_ms: forwardResult.durationMs,
        error_message: forwardResult.error,
      })

      // Update the webhook log's forward status and details
      await WebhookLogger.updateForwardStatus(logResult.id, {
        status: forwardResult.success ? 'success' : 'failed',
        destination_app: routingResult.app.id,
        destination_url: routingResult.app.webhookUrl,
        response_status: forwardResult.status,
        response_body: forwardResult.body,
        duration_ms: forwardResult.durationMs,
        error_message: forwardResult.error,
      })
    }

    if (forwardResult.success) {
      console.log(`✅ Forwarded successfully:`, {
        app: routingResult.app.id,
        status: forwardResult.status,
        durationMs: forwardResult.durationMs,
      })
    } else {
      console.error(`❌ Forward failed:`, {
        app: routingResult.app.id,
        error: forwardResult.error,
        status: forwardResult.status,
      })
    }

    // Always return 200 to Paystack to prevent retries
    // The webhook was received and processed, even if forwarding failed
    return NextResponse.json({
      success: true,
      message: forwardResult.success ? 'Webhook forwarded' : 'Webhook received, forward failed',
      app: routingResult.app.id,
    })
  } catch (error) {
    tracer.stop()
    const processingTime = Date.now() - startTime

    console.error('Webhook processing error:', error)

    // Log error
    await WebhookLogger.log({
      source: 'paystack',
      endpoint: '/api/webhook',
      payload: {},
      forward_status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      processing_time_ms: processingTime,
      trace_logs: tracer.getLogs(),
    })

    // Return 200 to prevent Paystack retries
    return NextResponse.json({
      success: false,
      message: 'Webhook processing failed',
    })
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'payroute-webhook',
    timestamp: new Date().toISOString(),
  })
}

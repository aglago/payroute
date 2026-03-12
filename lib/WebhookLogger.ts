/**
 * WebhookLogger - Saves webhook logs with trace data to database
 */

import { createClient } from './supabase'
import type { WebhookLogEntry, TraceLogEntry, ForwardAttemptEntry, ForwardAttempt } from './types'

export class WebhookLogger {
  /**
   * Save a webhook log entry to the database
   */
  static async log(data: WebhookLogEntry): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const supabase = createClient()

      const logEntry = {
        source: data.source,
        endpoint: data.endpoint,
        method: data.method || 'POST',
        headers: data.headers || null,
        payload: data.payload,
        destination_app: data.destination_app || null,
        destination_url: data.destination_url || null,
        routing_strategy: data.routing_strategy || null,
        reference: data.reference || null,
        forward_status: data.forward_status || null,
        forward_response_status: data.forward_response_status || null,
        forward_response_body: data.forward_response_body || null,
        forward_duration_ms: data.forward_duration_ms || null,
        processing_time_ms: data.processing_time_ms || null,
        ip_address: data.ip_address || null,
        error_message: data.error_message || null,
        trace_logs: data.trace_logs || [],
      }

      const { data: result, error } = await supabase
        .from('webhook_logs')
        .insert(logEntry)
        .select('id')
        .single()

      if (error) {
        console.error('Failed to save webhook log:', error)
        return { success: false, error: error.message }
      }

      return { success: true, id: result?.id }
    } catch (error) {
      console.error('WebhookLogger error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Get webhook logs with optional filters
   */
  static async getLogs(options: {
    destination_app?: string
    forward_status?: string
    reference?: string
    source?: string
    limit?: number
    offset?: number
  } = {}): Promise<unknown[]> {
    try {
      const supabase = createClient()

      let query = supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })

      if (options.destination_app) {
        query = query.eq('destination_app', options.destination_app)
      }

      if (options.forward_status) {
        query = query.eq('forward_status', options.forward_status)
      }

      if (options.reference) {
        query = query.eq('reference', options.reference)
      }

      if (options.source) {
        query = query.eq('source', options.source)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) {
        console.error('Failed to get webhook logs:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('WebhookLogger getLogs error:', error)
      return []
    }
  }

  /**
   * Get routing statistics
   */
  static async getStats(days: number = 7): Promise<{
    total: number
    byApp: Record<string, number>
    byStrategy: Record<string, number>
    byStatus: Record<string, number>
    avgProcessingTime: number
  }> {
    try {
      const supabase = createClient()

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      const { data, error } = await supabase
        .from('webhook_logs')
        .select('destination_app, routing_strategy, forward_status, processing_time_ms')
        .gte('created_at', cutoffDate.toISOString())

      if (error || !data) {
        console.error('Failed to get stats:', error)
        return {
          total: 0,
          byApp: {},
          byStrategy: {},
          byStatus: {},
          avgProcessingTime: 0,
        }
      }

      const byApp: Record<string, number> = {}
      const byStrategy: Record<string, number> = {}
      const byStatus: Record<string, number> = {}
      let totalProcessingTime = 0
      let processedCount = 0

      for (const log of data) {
        // By App
        const app = log.destination_app || 'unknown'
        byApp[app] = (byApp[app] || 0) + 1

        // By Strategy
        const strategy = log.routing_strategy || 'none'
        byStrategy[strategy] = (byStrategy[strategy] || 0) + 1

        // By Status
        const status = log.forward_status || 'unknown'
        byStatus[status] = (byStatus[status] || 0) + 1

        // Processing time
        if (log.processing_time_ms) {
          totalProcessingTime += log.processing_time_ms
          processedCount++
        }
      }

      return {
        total: data.length,
        byApp,
        byStrategy,
        byStatus,
        avgProcessingTime: processedCount > 0 ? Math.round(totalProcessingTime / processedCount) : 0,
      }
    } catch (error) {
      console.error('WebhookLogger getStats error:', error)
      return {
        total: 0,
        byApp: {},
        byStrategy: {},
        byStatus: {},
        avgProcessingTime: 0,
      }
    }
  }

  /**
   * Delete old webhook logs (older than specified days)
   */
  static async deleteOldLogs(daysOld: number = 30): Promise<{
    success: boolean
    deletedCount?: number
    error?: string
  }> {
    try {
      const supabase = createClient()

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)
      const cutoffISOString = cutoffDate.toISOString()

      // First count how many will be deleted
      const { count, error: countError } = await supabase
        .from('webhook_logs')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoffISOString)

      if (countError) {
        console.error('Failed to count old webhook logs:', countError)
        return { success: false, error: countError.message }
      }

      // Delete old logs
      const { error: deleteError } = await supabase
        .from('webhook_logs')
        .delete()
        .lt('created_at', cutoffISOString)

      if (deleteError) {
        console.error('Failed to delete old webhook logs:', deleteError)
        return { success: false, error: deleteError.message }
      }

      return { success: true, deletedCount: count || 0 }
    } catch (error) {
      console.error('WebhookLogger deleteOldLogs error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Log a forward attempt for a webhook
   */
  static async logAttempt(data: ForwardAttemptEntry): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const supabase = createClient()

      const { data: result, error } = await supabase
        .from('webhook_forward_attempts')
        .insert({
          webhook_log_id: data.webhook_log_id,
          attempt_number: data.attempt_number,
          attempt_type: data.attempt_type,
          destination_app: data.destination_app,
          destination_url: data.destination_url,
          status: data.status,
          response_status: data.response_status ?? null,
          response_body: data.response_body ?? null,
          duration_ms: data.duration_ms ?? null,
          error_message: data.error_message ?? null,
        })
        .select('id')
        .single()

      if (error) {
        console.error('Failed to log forward attempt:', error)
        return { success: false, error: error.message }
      }

      return { success: true, id: result?.id }
    } catch (error) {
      console.error('WebhookLogger logAttempt error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Get all forward attempts for a webhook
   */
  static async getAttempts(webhookLogId: string): Promise<ForwardAttempt[]> {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('webhook_forward_attempts')
        .select('*')
        .eq('webhook_log_id', webhookLogId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Failed to get forward attempts:', error)
        return []
      }

      return (data || []) as ForwardAttempt[]
    } catch (error) {
      console.error('WebhookLogger getAttempts error:', error)
      return []
    }
  }

  /**
   * Get the count of attempts for a webhook
   */
  static async getAttemptCount(webhookLogId: string): Promise<number> {
    try {
      const supabase = createClient()

      const { count, error } = await supabase
        .from('webhook_forward_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('webhook_log_id', webhookLogId)

      if (error) {
        console.error('Failed to count forward attempts:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('WebhookLogger getAttemptCount error:', error)
      return 0
    }
  }

  /**
   * Update the webhook log's forward status and details based on the latest attempt
   */
  static async updateForwardStatus(
    webhookLogId: string,
    data: {
      status: 'success' | 'failed'
      destination_app: string
      destination_url: string
      response_status?: number
      response_body?: unknown
      duration_ms?: number
      error_message?: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('webhook_logs')
        .update({
          forward_status: data.status,
          destination_app: data.destination_app,
          destination_url: data.destination_url,
          forward_response_status: data.response_status ?? null,
          forward_response_body: data.response_body ?? null,
          forward_duration_ms: data.duration_ms ?? null,
          error_message: data.error_message ?? null,
          last_attempt_at: new Date().toISOString(),
        })
        .eq('id', webhookLogId)

      if (error) {
        console.error('Failed to update forward status:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('WebhookLogger updateForwardStatus error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

export default WebhookLogger

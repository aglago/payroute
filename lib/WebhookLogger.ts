/**
 * WebhookLogger - Saves webhook logs with trace data to database
 */

import { createClient } from './supabase'
import type { WebhookLogEntry, TraceLogEntry } from './types'

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
}

export default WebhookLogger

/**
 * Dead Letter Queue Management
 * Handles webhooks that couldn't be routed to any destination
 */

import { createClient } from './supabase'
import type { DeadLetterEntry } from './types'

/**
 * Log an unroutable webhook to the dead letter queue
 */
export async function logToDeadLetter(entry: DeadLetterEntry): Promise<{
  success: boolean
  id?: string
  error?: string
}> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('dead_letter_webhooks')
      .insert({
        payload: entry.payload,
        reference: entry.reference || null,
        reason: entry.reason,
        ip_address: entry.ip_address || null,
        headers: entry.headers || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to log to dead letter queue:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (error) {
    console.error('Dead letter logging error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get dead letter entries with optional filters
 */
export async function getDeadLetterEntries(options: {
  reviewed?: boolean
  limit?: number
  offset?: number
} = {}): Promise<unknown[]> {
  try {
    const supabase = createClient()

    let query = supabase
      .from('dead_letter_webhooks')
      .select('*')
      .order('created_at', { ascending: false })

    if (options.reviewed !== undefined) {
      query = query.eq('reviewed', options.reviewed)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to get dead letter entries:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Get dead letter error:', error)
    return []
  }
}

/**
 * Mark a dead letter entry as reviewed
 */
export async function markAsReviewed(
  id: string,
  reviewedBy: string,
  resolution: string,
  resolutionNotes?: string,
  forwardedTo?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('dead_letter_webhooks')
      .update({
        reviewed: true,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy,
        resolution,
        resolution_notes: resolutionNotes || null,
        forwarded_to: forwardedTo || null,
      })
      .eq('id', id)

    if (error) {
      console.error('Failed to mark as reviewed:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Mark as reviewed error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get a single dead letter entry by ID
 */
export async function getDeadLetterEntry(id: string): Promise<{
  success: boolean
  entry?: unknown
  error?: string
}> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('dead_letter_webhooks')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Failed to get dead letter entry:', error)
      return { success: false, error: error.message }
    }

    return { success: true, entry: data }
  } catch (error) {
    console.error('Get dead letter entry error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get count of unreviewed dead letter entries
 */
export async function getUnreviewedCount(): Promise<number> {
  try {
    const supabase = createClient()

    const { count, error } = await supabase
      .from('dead_letter_webhooks')
      .select('*', { count: 'exact', head: true })
      .eq('reviewed', false)

    if (error) {
      console.error('Failed to get unreviewed count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Get unreviewed count error:', error)
    return 0
  }
}

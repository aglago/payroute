/**
 * Supabase Client for PayRoute
 * Server-side client using service role key
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

// Re-export types for use in other modules
export type { Database } from './database.types'

let supabaseInstance: SupabaseClient | null = null

/**
 * Create or return cached Supabase client
 *
 * Note: We use untyped SupabaseClient here for flexibility.
 * Type safety is enforced at the application layer via database.types.ts
 */
export function createClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return supabaseInstance
}

export default createClient

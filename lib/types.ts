/**
 * PayRoute Type Definitions
 */

export interface AppConfig {
  id: string
  name: string
  webhookUrl: string
  routerSecret: string
  prefixes: string[]
  enabled: boolean
}

export interface PaystackWebhookPayload {
  event: string
  data: {
    reference: string
    amount: number
    currency: string
    status: string
    domain?: 'test' | 'live'
    metadata?: {
      app?: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
}

export interface RoutingResult {
  app: AppConfig | null
  strategy: 'metadata' | 'prefix' | 'none'
  reference: string | null
}

export interface ForwardResult {
  success: boolean
  status?: number
  body?: unknown
  error?: string
  durationMs: number
}

export interface WebhookLogEntry {
  source: string
  endpoint: string
  method?: string
  headers?: Record<string, string>
  payload: unknown
  destination_app?: string
  destination_url?: string
  routing_strategy?: 'metadata' | 'prefix' | 'none' | 'manual'
  reference?: string
  forward_status?: 'success' | 'failed' | 'skipped' | 'dead_letter' | 'pending'
  forward_response_status?: number
  forward_response_body?: unknown
  forward_duration_ms?: number
  processing_time_ms?: number
  ip_address?: string
  error_message?: string
  trace_logs?: TraceLogEntry[]
  is_test?: boolean
}

export interface TraceLogEntry {
  level: 'log' | 'info' | 'warn' | 'error' | 'debug'
  message: string
  data?: unknown
  timestamp: string
}

export interface DeadLetterEntry {
  payload: unknown
  reference?: string
  reason: string
  ip_address?: string
  headers?: Record<string, string>
}

export interface RoutingStats {
  total: number
  byApp: Record<string, number>
  byStrategy: Record<string, number>
  byStatus: Record<string, number>
  avgProcessingTime: number
  deadLetterCount: number
}

export interface ForwardAttemptEntry {
  webhook_log_id: string
  attempt_number: number
  attempt_type: 'auto' | 'manual' | 'retry'
  destination_app: string
  destination_url: string
  status: 'success' | 'failed'
  response_status?: number
  response_body?: unknown
  duration_ms?: number
  error_message?: string
}

export interface ForwardAttempt extends ForwardAttemptEntry {
  id: string
  created_at: string
}

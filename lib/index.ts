/**
 * PayRoute Library Exports
 */

// Types
export * from './types'

// Config
export {
  getAppRegistry,
  getApp,
  getEnabledApps,
  getEnvApps,
  getAppRegistrySync,
  getEnabledAppsSync,
  getPaystackSecretKey,
  getPaystackTestSecretKey,
  getPaystackSecretKeyForMode,
  isIPValidationEnabled,
} from './config'

// App Store
export {
  getAppsFromDatabase,
  getAppFromDatabase,
  createApp,
  updateApp,
  deleteApp,
  toggleApp,
  generateRouterSecret,
} from './app-store'

// Security
export {
  PAYSTACK_WEBHOOK_IPS,
  verifyPaystackSignature,
  getClientIP,
  isPaystackIP,
  validateAdminKey,
  validateSession,
  isAuthenticated,
} from './security'

// Router
export { determineDestinationApp, forwardWebhook } from './router'

// Supabase
export { createClient } from './supabase'

// Loggers
export { TraceLogger, withTraceLogging } from './TraceLogger'
export { WebhookLogger } from './WebhookLogger'

// Dead Letter
export {
  logToDeadLetter,
  getDeadLetterEntries,
  getDeadLetterEntry,
  markAsReviewed,
  getUnreviewedCount,
} from './dead-letter'

// Utils
export { cn } from './utils'

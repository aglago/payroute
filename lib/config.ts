/**
 * App Registry Configuration
 * Supports both environment variables (legacy) and database storage
 */

import type { AppConfig } from './types'
import { getAppsFromDatabase, getAppFromDatabase } from './app-store'

/**
 * Get apps from environment variables (legacy support)
 */
export function getEnvApps(): Record<string, AppConfig> {
  const apps: Record<string, AppConfig> = {}

  // iSellData
  if (process.env.ISELLDATA_WEBHOOK_URL) {
    apps.iselldata = {
      id: 'iselldata',
      name: 'iSellData',
      webhookUrl: process.env.ISELLDATA_WEBHOOK_URL,
      routerSecret: process.env.ISELLDATA_ROUTER_SECRET || '',
      prefixes: ['GD', 'AR', 'WT'],
      enabled: true,
    }
  }

  // BookPlug
  if (process.env.BOOKPLUG_WEBHOOK_URL) {
    apps.bookplug = {
      id: 'bookplug',
      name: 'BookPlug',
      webhookUrl: process.env.BOOKPLUG_WEBHOOK_URL,
      routerSecret: process.env.BOOKPLUG_ROUTER_SECRET || '',
      prefixes: ['RENT-', 'SALE-', 'BP-'],
      enabled: true,
    }
  }

  return apps
}

/**
 * Get all registered apps (merged from env and database)
 */
export async function getAppRegistry(): Promise<Record<string, AppConfig>> {
  // Start with env apps
  const apps = getEnvApps()

  // Add/override with database apps
  try {
    const dbApps = await getAppsFromDatabase()
    for (const app of dbApps) {
      apps[app.id] = app
    }
  } catch (error) {
    console.warn('Could not fetch apps from database, using env only:', error)
  }

  return apps
}

/**
 * Get a specific app by ID
 */
export async function getApp(appId: string): Promise<AppConfig | null> {
  // Check env apps first
  const envApps = getEnvApps()
  if (envApps[appId.toLowerCase()]) {
    const app = envApps[appId.toLowerCase()]
    return app.enabled ? app : null
  }

  // Check database
  const dbApp = await getAppFromDatabase(appId)
  return dbApp && dbApp.enabled ? dbApp : null
}

/**
 * Get all enabled apps
 */
export async function getEnabledApps(): Promise<AppConfig[]> {
  const registry = await getAppRegistry()
  return Object.values(registry).filter((app) => app.enabled)
}

/**
 * Synchronous version for cases where async isn't possible
 * Only returns env-based apps
 */
export function getAppRegistrySync(): Record<string, AppConfig> {
  return getEnvApps()
}

/**
 * Get enabled apps synchronously (env only)
 */
export function getEnabledAppsSync(): AppConfig[] {
  const registry = getAppRegistrySync()
  return Object.values(registry).filter((app) => app.enabled)
}

/**
 * Get the shared Paystack secret key (live mode)
 */
export function getPaystackSecretKey(): string {
  return process.env.PAYSTACK_SECRET_KEY || ''
}

/**
 * Get the Paystack test secret key
 */
export function getPaystackTestSecretKey(): string {
  return process.env.PAYSTACK_TEST_SECRET_KEY || ''
}

/**
 * Get the appropriate Paystack secret key based on mode
 */
export function getPaystackSecretKeyForMode(isTest: boolean): string {
  return isTest ? getPaystackTestSecretKey() : getPaystackSecretKey()
}

/**
 * Check if IP validation is enabled
 */
export function isIPValidationEnabled(): boolean {
  return process.env.VALIDATE_PAYSTACK_IP === 'true'
}

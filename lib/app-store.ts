/**
 * App Store - Database-backed app configuration management
 */

import { createClient } from './supabase'
import type { AppConfig } from './types'
import type { Database } from './database.types'

type AppConfigRow = Database['public']['Tables']['app_configs']['Row']

/**
 * Get all apps from the database
 */
export async function getAppsFromDatabase(): Promise<AppConfig[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('app_configs')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to fetch apps from database:', error)
      return []
    }

    return (data || []).map((app: AppConfigRow) => ({
      id: app.app_id,
      name: app.name,
      webhookUrl: app.webhook_url,
      routerSecret: app.router_secret,
      prefixes: app.prefixes || [],
      enabled: app.enabled,
      description: app.description,
      icon: app.icon,
      color: app.color,
    }))
  } catch (error) {
    console.error('Error fetching apps:', error)
    return []
  }
}

/**
 * Get a single app by ID
 */
export async function getAppFromDatabase(appId: string): Promise<AppConfig | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('app_configs')
      .select('*')
      .eq('app_id', appId)
      .single()

    if (error || !data) {
      return null
    }

    const app = data as AppConfigRow
    return {
      id: app.app_id,
      name: app.name,
      webhookUrl: app.webhook_url,
      routerSecret: app.router_secret,
      prefixes: app.prefixes || [],
      enabled: app.enabled,
    }
  } catch (error) {
    console.error('Error fetching app:', error)
    return null
  }
}

/**
 * Create a new app
 */
export async function createApp(config: {
  appId: string
  name: string
  webhookUrl: string
  routerSecret: string
  prefixes?: string[]
  description?: string
  icon?: string
  color?: string
}): Promise<{ success: boolean; error?: string; app?: AppConfig }> {
  try {
    const supabase = createClient()

    // Check if app_id already exists
    const { data: existing } = await supabase
      .from('app_configs')
      .select('id')
      .eq('app_id', config.appId)
      .single()

    if (existing) {
      return { success: false, error: 'App ID already exists' }
    }

    const { data, error } = await supabase
      .from('app_configs')
      .insert({
        app_id: config.appId.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        name: config.name,
        webhook_url: config.webhookUrl,
        router_secret: config.routerSecret,
        prefixes: config.prefixes || [],
        description: config.description || null,
        icon: config.icon || null,
        color: config.color || null,
        enabled: true,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('Failed to create app:', error)
      return { success: false, error: error?.message || 'Failed to create app' }
    }

    const createdApp = data as AppConfigRow
    return {
      success: true,
      app: {
        id: createdApp.app_id,
        name: createdApp.name,
        webhookUrl: createdApp.webhook_url,
        routerSecret: createdApp.router_secret,
        prefixes: createdApp.prefixes || [],
        enabled: createdApp.enabled,
      },
    }
  } catch (error) {
    console.error('Error creating app:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Update an existing app
 */
export async function updateApp(
  appId: string,
  updates: Partial<{
    name: string
    webhookUrl: string
    routerSecret: string
    prefixes: string[]
    enabled: boolean
    description: string
    icon: string
    color: string
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    const updateData: Record<string, unknown> = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.webhookUrl !== undefined) updateData.webhook_url = updates.webhookUrl
    if (updates.routerSecret !== undefined) updateData.router_secret = updates.routerSecret
    if (updates.prefixes !== undefined) updateData.prefixes = updates.prefixes
    if (updates.enabled !== undefined) updateData.enabled = updates.enabled
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.icon !== undefined) updateData.icon = updates.icon
    if (updates.color !== undefined) updateData.color = updates.color

    const { error } = await supabase
      .from('app_configs')
      .update(updateData)
      .eq('app_id', appId)

    if (error) {
      console.error('Failed to update app:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating app:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Delete an app
 */
export async function deleteApp(appId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('app_configs')
      .delete()
      .eq('app_id', appId)

    if (error) {
      console.error('Failed to delete app:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting app:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Toggle app enabled status
 */
export async function toggleApp(
  appId: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  return updateApp(appId, { enabled })
}

/**
 * Generate a secure router secret
 */
export function generateRouterSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Admin Apps API
 * Manage app configurations
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isAuthenticated } from '@/lib/security'
import { getAppRegistry, getEnvApps } from '@/lib/config'
import {
  createApp,
  updateApp,
  deleteApp,
  generateRouterSecret,
  getAppsFromDatabase,
} from '@/lib/app-store'

async function checkAuth(request: NextRequest): Promise<boolean> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('payroute_session')?.value
  return isAuthenticated(request.headers, sessionToken)
}

/**
 * GET /api/admin/apps - List all apps
 */
export async function GET(request: NextRequest) {
  // Validate admin key or session
  if (!await checkAuth(request)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const allApps = await getAppRegistry()
    const envApps = getEnvApps()
    const dbApps = await getAppsFromDatabase()

    // Mark which apps are from env vs database
    const apps = Object.values(allApps).map((app) => ({
      ...app,
      source: envApps[app.id] ? 'env' : 'database',
      // Don't expose secrets in list view
      routerSecret: '••••••••',
    }))

    return NextResponse.json({
      success: true,
      count: apps.length,
      apps,
    })
  } catch (error) {
    console.error('Error fetching apps:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch apps' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/apps - Create a new app
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
    const { appId, name, webhookUrl, routerSecret, prefixes, description, icon, color } = body

    // Validate required fields
    if (!appId || !name || !webhookUrl) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: appId, name, webhookUrl' },
        { status: 400 }
      )
    }

    // Validate appId format
    const sanitizedAppId = appId.toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (sanitizedAppId.length < 2) {
      return NextResponse.json(
        { success: false, message: 'App ID must be at least 2 characters (letters, numbers, hyphens only)' },
        { status: 400 }
      )
    }

    // Validate webhook URL
    try {
      new URL(webhookUrl)
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid webhook URL' },
        { status: 400 }
      )
    }

    // Check if app already exists in env
    const envApps = getEnvApps()
    if (envApps[sanitizedAppId]) {
      return NextResponse.json(
        { success: false, message: 'An app with this ID is already configured via environment variables' },
        { status: 409 }
      )
    }

    // Parse prefixes
    const parsedPrefixes = Array.isArray(prefixes)
      ? prefixes.filter((p: unknown) => typeof p === 'string' && p.length > 0)
      : typeof prefixes === 'string'
        ? prefixes.split(',').map((p: string) => p.trim()).filter(Boolean)
        : []

    // Create the app
    const result = await createApp({
      appId: sanitizedAppId,
      name,
      webhookUrl,
      routerSecret: routerSecret || generateRouterSecret(),
      prefixes: parsedPrefixes,
      description,
      icon,
      color,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'App created successfully',
      app: {
        ...result.app,
        routerSecret: result.app?.routerSecret, // Include secret on creation
      },
    })
  } catch (error) {
    console.error('Error creating app:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create app' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/apps - Update an app
 */
export async function PATCH(request: NextRequest) {
  // Validate admin key or session
  if (!await checkAuth(request)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { appId, ...updates } = body

    if (!appId) {
      return NextResponse.json(
        { success: false, message: 'Missing required field: appId' },
        { status: 400 }
      )
    }

    // Check if this is an env-based app
    const envApps = getEnvApps()
    if (envApps[appId]) {
      return NextResponse.json(
        { success: false, message: 'Cannot modify apps configured via environment variables' },
        { status: 403 }
      )
    }

    // Parse prefixes if provided
    if (updates.prefixes) {
      updates.prefixes = Array.isArray(updates.prefixes)
        ? updates.prefixes.filter((p: unknown) => typeof p === 'string' && p.length > 0)
        : typeof updates.prefixes === 'string'
          ? updates.prefixes.split(',').map((p: string) => p.trim()).filter(Boolean)
          : []
    }

    const result = await updateApp(appId, updates)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'App updated successfully',
    })
  } catch (error) {
    console.error('Error updating app:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update app' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/apps - Delete an app
 */
export async function DELETE(request: NextRequest) {
  // Validate admin key or session
  if (!await checkAuth(request)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const appId = searchParams.get('appId')

  if (!appId) {
    return NextResponse.json(
      { success: false, message: 'Missing required parameter: appId' },
      { status: 400 }
    )
  }

  // Check if this is an env-based app
  const envApps = getEnvApps()
  if (envApps[appId]) {
    return NextResponse.json(
      { success: false, message: 'Cannot delete apps configured via environment variables' },
      { status: 403 }
    )
  }

  const result = await deleteApp(appId)

  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.error },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'App deleted successfully',
  })
}

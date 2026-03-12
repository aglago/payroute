/**
 * App Secret API
 * Reveal app secret with re-authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

/**
 * POST /api/admin/apps/secret - Get app secret with re-authentication
 * Requires admin key in request body for re-authentication
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { appId, adminKey } = body

    if (!appId || !adminKey) {
      return NextResponse.json(
        { success: false, message: 'Missing appId or adminKey' },
        { status: 400 }
      )
    }

    // Verify admin key
    const expectedAdminKey = process.env.ADMIN_API_KEY
    if (!expectedAdminKey) {
      return NextResponse.json(
        { success: false, message: 'Admin key not configured' },
        { status: 500 }
      )
    }

    if (adminKey !== expectedAdminKey) {
      return NextResponse.json(
        { success: false, message: 'Invalid admin key' },
        { status: 401 }
      )
    }

    // Get the app secret from database
    const supabase = createClient()
    const { data: app, error } = await supabase
      .from('app_configs')
      .select('router_secret')
      .eq('app_id', appId)
      .single()

    if (error || !app) {
      return NextResponse.json(
        { success: false, message: 'App not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      secret: app.router_secret,
    })
  } catch (error) {
    console.error('Error revealing secret:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to reveal secret' },
      { status: 500 }
    )
  }
}

/**
 * Single Webhook Log API
 * Get details of a specific webhook log
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isAuthenticated } from '@/lib/security'
import { createClient } from '@/lib/supabase'

async function checkAuth(request: NextRequest): Promise<boolean> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('payroute_session')?.value
  return isAuthenticated(request.headers, sessionToken)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validate admin key or session
  if (!await checkAuth(request)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { id } = await params

  if (!id) {
    return NextResponse.json(
      { success: false, message: 'Missing log ID' },
      { status: 400 }
    )
  }

  try {
    const supabase = createClient()

    const { data: log, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !log) {
      return NextResponse.json(
        { success: false, message: 'Webhook log not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      log,
    })
  } catch (error) {
    console.error('Error fetching webhook log:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch webhook log' },
      { status: 500 }
    )
  }
}

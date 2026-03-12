/**
 * Admin Logs API
 * Query webhook logs with filters
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isAuthenticated, WebhookLogger } from '@/lib'

async function checkAuth(request: NextRequest): Promise<boolean> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('payroute_session')?.value
  return isAuthenticated(request.headers, sessionToken)
}

export async function GET(request: NextRequest) {
  // Validate admin key or session
  if (!await checkAuth(request)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const destination_app = searchParams.get('app') || undefined
  const forward_status = searchParams.get('status') || undefined
  const reference = searchParams.get('reference') || undefined
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const logs = await WebhookLogger.getLogs({
    destination_app,
    forward_status,
    reference,
    limit,
    offset,
  })

  return NextResponse.json({
    success: true,
    count: logs.length,
    logs,
  })
}

/**
 * Delete old logs
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
  const daysOld = parseInt(searchParams.get('days') || '30')

  const result = await WebhookLogger.deleteOldLogs(daysOld)

  return NextResponse.json({
    success: result.success,
    deletedCount: result.deletedCount,
    error: result.error,
  })
}

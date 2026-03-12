/**
 * Admin Stats API
 * Get routing statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isAuthenticated, WebhookLogger, getUnreviewedCount } from '@/lib'

export async function GET(request: NextRequest) {
  // Validate admin key or session
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('payroute_session')?.value
  if (!isAuthenticated(request.headers, sessionToken)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const days = parseInt(searchParams.get('days') || '7')

  const stats = await WebhookLogger.getStats(days)
  const deadLetterCount = await getUnreviewedCount()

  return NextResponse.json({
    success: true,
    period: `${days} days`,
    stats: {
      ...stats,
      deadLetterCount,
    },
  })
}

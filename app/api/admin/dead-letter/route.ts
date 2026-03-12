/**
 * Admin Dead Letter Queue API
 * Manage unroutable webhooks
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  isAuthenticated,
  getDeadLetterEntries,
  markAsReviewed,
  getUnreviewedCount,
} from '@/lib'

async function checkAuth(request: NextRequest): Promise<boolean> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('payroute_session')?.value
  return isAuthenticated(request.headers, sessionToken)
}

/**
 * Get dead letter entries
 */
export async function GET(request: NextRequest) {
  // Validate admin key or session
  if (!await checkAuth(request)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const reviewed = searchParams.get('reviewed')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const entries = await getDeadLetterEntries({
    reviewed: reviewed === 'true' ? true : reviewed === 'false' ? false : undefined,
    limit,
    offset,
  })

  const unreviewedCount = await getUnreviewedCount()

  return NextResponse.json({
    success: true,
    count: entries.length,
    unreviewedCount,
    entries,
  })
}

/**
 * Mark a dead letter entry as reviewed
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
    const { id, reviewedBy, resolution, resolutionNotes, forwardedTo } = body

    if (!id || !reviewedBy || !resolution) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: id, reviewedBy, resolution' },
        { status: 400 }
      )
    }

    const result = await markAsReviewed(
      id,
      reviewedBy,
      resolution,
      resolutionNotes,
      forwardedTo
    )

    return NextResponse.json({
      success: result.success,
      error: result.error,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Invalid request body' },
      { status: 400 }
    )
  }
}

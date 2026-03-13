/**
 * Single Dead Letter Entry API
 * Get details of a specific dead letter entry
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isAuthenticated, getDeadLetterEntry, markAsReviewed } from '@/lib'

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
      { success: false, message: 'Missing entry ID' },
      { status: 400 }
    )
  }

  const result = await getDeadLetterEntry(id)

  if (!result.success || !result.entry) {
    return NextResponse.json(
      { success: false, message: result.error || 'Dead letter entry not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    entry: result.entry,
  })
}

/**
 * Mark a dead letter entry as reviewed (by ID in path)
 */
export async function PATCH(
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
      { success: false, message: 'Missing entry ID' },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const { reviewedBy, resolution, resolutionNotes, forwardedTo } = body

    if (!reviewedBy || !resolution) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: reviewedBy, resolution' },
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
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid request body' },
      { status: 400 }
    )
  }
}

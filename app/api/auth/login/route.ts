/**
 * Auth Login API
 * Validates admin key and sets a session cookie
 *
 * Uses stateless session tokens (HMAC-signed) that can be validated
 * on any serverless instance without shared storage.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSessionToken } from '@/lib/session'

const SESSION_COOKIE_NAME = 'payroute_session'
const SESSION_MAX_AGE = 60 * 60 * 24 // 24 hours

export async function POST(request: NextRequest) {
  try {
    const { adminKey } = await request.json()
    const expectedKey = process.env.ADMIN_API_KEY

    if (!expectedKey) {
      return NextResponse.json(
        { success: false, message: 'ADMIN_API_KEY not configured' },
        { status: 500 }
      )
    }

    if (adminKey !== expectedKey) {
      return NextResponse.json(
        { success: false, message: 'Invalid admin key' },
        { status: 401 }
      )
    }

    // Create a stateless session token (HMAC-signed, can be validated anywhere)
    const sessionToken = createSessionToken(expectedKey)

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: 'Login failed' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  // Logout - clear session cookie
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)

  return NextResponse.json({ success: true })
}

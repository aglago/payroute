/**
 * Auth Login API
 * Validates admin key and sets a session cookie
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

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

    // Create a simple session token (hash of the key + timestamp)
    const crypto = await import('crypto')
    const sessionToken = crypto
      .createHash('sha256')
      .update(`${expectedKey}-${Date.now()}`)
      .digest('hex')

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })

    // Store session token in memory (for validation)
    // In production, you'd use Redis or a database
    globalThis.payrouteSessions = globalThis.payrouteSessions || new Set()
    globalThis.payrouteSessions.add(sessionToken)

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
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (sessionToken && globalThis.payrouteSessions) {
    globalThis.payrouteSessions.delete(sessionToken)
  }

  cookieStore.delete(SESSION_COOKIE_NAME)

  return NextResponse.json({ success: true })
}

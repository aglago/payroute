/**
 * Auth Session API
 * Check if user has a valid session
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateSessionToken } from '@/lib/session'

const SESSION_COOKIE_NAME = 'payroute_session'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false })
    }

    // Check if session is valid (stateless validation)
    const isValid = validateSessionToken(sessionToken)

    return NextResponse.json({ authenticated: isValid })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ authenticated: false })
  }
}

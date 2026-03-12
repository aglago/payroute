/**
 * Health Check Endpoint
 */

import { NextResponse } from 'next/server'
import { getEnabledApps } from '@/lib/config'

export async function GET() {
  try {
    const apps = await getEnabledApps()

    return NextResponse.json({
      status: 'healthy',
      service: 'payroute',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      apps: apps.map((app) => ({
        id: app.id,
        name: app.name,
        enabled: app.enabled,
        prefixes: app.prefixes,
      })),
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({
      status: 'unhealthy',
      service: 'payroute',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      error: 'Failed to fetch app configuration',
    }, { status: 500 })
  }
}

"use client"

import { useDashboard } from "@/components/providers/DashboardProvider"
import { DeadLetterQueue } from "@/components/dashboard"
import { Button } from "@/components/ui"
import { RefreshCw } from "lucide-react"

export default function DeadLetterPage() {
  const { deadLetters, stats, handleRefresh } = useDashboard()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dead Letter Queue</h1>
          <p className="text-muted-foreground">Webhooks that couldn&apos;t be routed to any app</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Dead Letter Queue */}
      <DeadLetterQueue
        entries={deadLetters}
        unreviewedCount={stats.deadLetter}
      />
    </div>
  )
}

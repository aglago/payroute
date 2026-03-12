"use client"

import { useDashboard } from "@/components/providers/DashboardProvider"
import { StatsCards, RecentWebhooks, DeadLetterQueue } from "@/components/dashboard"
import { Button } from "@/components/ui"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function DashboardPage() {
  const { stats, webhooks, deadLetters, isLoading, hasError, handleRefresh } = useDashboard()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your webhook routing</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Error Banner */}
      {hasError && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load some data. Will retry automatically.</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry Now
          </Button>
        </div>
      )}

      {/* Stats Overview */}
      <StatsCards
        stats={{
          total: stats.total,
          success: stats.success,
          failed: stats.failed,
          deadLetter: stats.deadLetter,
          avgProcessingTime: stats.avgProcessingTime,
        }}
      />

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentWebhooks
          webhooks={webhooks}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />
        <DeadLetterQueue
          entries={deadLetters}
          unreviewedCount={stats.deadLetter}
        />
      </div>
    </div>
  )
}

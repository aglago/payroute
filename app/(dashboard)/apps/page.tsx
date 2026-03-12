"use client"

import { useDashboard } from "@/components/providers/DashboardProvider"
import { AppRegistry } from "@/components/dashboard"
import { Button } from "@/components/ui"
import { RefreshCw } from "lucide-react"

export default function AppsPage() {
  const {
    apps,
    handleToggleApp,
    handleAddApp,
    handleUpdateApp,
    handleDeleteApp,
    handleRevealSecret,
    handleRefresh,
  } = useDashboard()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Apps</h1>
          <p className="text-muted-foreground">Manage your registered applications</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* App Registry */}
      <AppRegistry
        apps={apps}
        onToggleApp={handleToggleApp}
        onAddApp={handleAddApp}
        onUpdateApp={handleUpdateApp}
        onDeleteApp={handleDeleteApp}
        onRevealSecret={handleRevealSecret}
        onRefresh={handleRefresh}
      />
    </div>
  )
}

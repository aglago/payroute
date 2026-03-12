"use client"

import { Badge, Button } from "@/components/ui"
import { Activity, LogOut } from "lucide-react"

interface HeaderProps {
  status: "operational" | "degraded" | "down"
  onLogout?: () => void
}

export function Header({ status, onLogout }: HeaderProps) {
  const statusConfig = {
    operational: { label: "Operational", color: "success" as const },
    degraded: { label: "Degraded", color: "warning" as const },
    down: { label: "Down", color: "destructive" as const },
  }

  const config = statusConfig[status]

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">PayRoute</h1>
              <p className="text-xs text-muted-foreground">Webhook Router Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full status-pulse ${
                status === "operational" ? "bg-success" :
                status === "degraded" ? "bg-warning" : "bg-destructive"
              }`} />
              <Badge variant={config.color}>{config.label}</Badge>
            </div>
            {onLogout && (
              <Button variant="ghost" size="sm" onClick={onLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

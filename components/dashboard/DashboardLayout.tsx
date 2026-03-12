"use client"

import { ReactNode } from "react"
import { Sidebar } from "./Sidebar"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: ReactNode
  onLogout?: () => void
  deadLetterCount?: number
  status?: "operational" | "degraded" | "down"
}

export function DashboardLayout({
  children,
  onLogout,
  deadLetterCount = 0,
  status = "operational",
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        onLogout={onLogout}
        deadLetterCount={deadLetterCount}
        status={status}
      />
      <main className="pl-64 transition-all duration-300">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

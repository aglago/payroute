"use client"

import { Documentation } from "@/components/dashboard"

export default function DocsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Documentation</h1>
        <p className="text-muted-foreground">Learn how to use PayRoute</p>
      </div>

      {/* Documentation Content */}
      <Documentation />
    </div>
  )
}

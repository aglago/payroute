"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button } from "@/components/ui"
import { AlertTriangle, Eye, RotateCcw, Trash2 } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface DeadLetterEntry {
  id: string
  reference: string
  reason: string
  created_at: string
  reviewed: boolean
}

interface DeadLetterQueueProps {
  entries: DeadLetterEntry[]
  unreviewedCount: number
  onReview?: (id: string) => void
  onRetry?: (id: string) => void
  onDismiss?: (id: string) => void
}

export function DeadLetterQueue({
  entries,
  unreviewedCount,
  onReview,
  onRetry,
  onDismiss,
}: DeadLetterQueueProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                Dead Letter Queue
                {unreviewedCount > 0 && (
                  <Badge variant="warning">{unreviewedCount} unreviewed</Badge>
                )}
              </CardTitle>
              <CardDescription>Webhooks that couldn&apos;t be routed to any destination</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                entry.reviewed ? "border-border bg-muted/30" : "border-warning/50 bg-warning/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className={`h-5 w-5 ${entry.reviewed ? "text-muted-foreground" : "text-warning"}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono">{entry.reference || "No reference"}</code>
                    {entry.reviewed && (
                      <Badge variant="secondary" className="text-xs">Reviewed</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {entry.reason} • {formatDate(entry.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => onReview?.(entry.id)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onRetry?.(entry.id)}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDismiss?.(entry.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {entries.length === 0 && (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No dead letter entries</p>
              <p className="text-xs text-muted-foreground mt-1">
                All webhooks are being routed successfully
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

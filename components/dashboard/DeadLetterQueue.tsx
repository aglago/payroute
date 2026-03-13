"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@/components/ui"
import { AlertTriangle, Eye, CheckCircle2 } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface DeadLetterEntry {
  id: string
  reference: string
  reason: string
  created_at: string
  reviewed: boolean
  resolution?: string
  forwarded_to?: string
}

interface DeadLetterQueueProps {
  entries: DeadLetterEntry[]
  unreviewedCount: number
}

export function DeadLetterQueue({
  entries,
  unreviewedCount,
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
            <Link
              key={entry.id}
              href={`/dead-letter/${entry.id}`}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                entry.reviewed ? "border-border bg-muted/30" : "border-warning/50 bg-warning/5"
              }`}
            >
              <div className="flex items-center gap-3">
                {entry.reviewed ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-warning" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono">{entry.reference || "No reference"}</code>
                    {entry.reviewed && (
                      <Badge variant="success" className="text-xs">{entry.resolution || "Reviewed"}</Badge>
                    )}
                    {entry.forwarded_to && (
                      <Badge variant="outline" className="text-xs">→ {entry.forwarded_to}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {entry.reason} • {formatDate(entry.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pointer-events-none">
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
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

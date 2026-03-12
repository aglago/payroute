"use client"

import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@/components/ui"
import { RefreshCw, ExternalLink, ChevronRight } from "lucide-react"
import { formatTime } from "@/lib/utils"

interface WebhookLog {
  id: string
  reference: string
  destination_app: string
  destination_url?: string
  routing_strategy: "metadata" | "prefix" | "none"
  forward_status: "success" | "failed" | "dead_letter"
  forward_response_status?: number
  processing_time_ms: number
  created_at: string
}

interface RecentWebhooksProps {
  webhooks: WebhookLog[]
  onRefresh?: () => void
  isLoading?: boolean
  showViewAll?: boolean
}

export function RecentWebhooks({ webhooks, onRefresh, isLoading, showViewAll = true }: RecentWebhooksProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="success">Success</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      case "dead_letter":
        return <Badge variant="warning">Dead Letter</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getStrategyBadge = (strategy: string) => {
    switch (strategy) {
      case "metadata":
        return <Badge variant="outline" className="text-xs">metadata.app</Badge>
      case "prefix":
        return <Badge variant="outline" className="text-xs">prefix</Badge>
      default:
        return <Badge variant="outline" className="text-xs">none</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Webhooks</CardTitle>
            <CardDescription>Latest webhook processing activity</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <Link
              key={webhook.id}
              href={`/logs/${webhook.id}`}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer block"
            >
              <div className="flex items-center gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-medium">
                      {webhook.reference}
                    </code>
                    {getStatusBadge(webhook.forward_status)}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      → {webhook.destination_app || "No destination"}
                    </span>
                    {getStrategyBadge(webhook.routing_strategy)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium">{webhook.processing_time_ms}ms</p>
                  <p className="text-xs text-muted-foreground">{formatTime(webhook.created_at)}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}

          {webhooks.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No webhooks received yet</p>
            </div>
          )}
        </div>

        {showViewAll && webhooks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <Link href="/logs" className="w-full">
              <Button variant="ghost" className="w-full gap-2">
                View All Logs
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

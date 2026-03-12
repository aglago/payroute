"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Label,
} from "@/components/ui"
import { RefreshCw, ExternalLink, ChevronRight, Copy, Check, RotateCcw } from "lucide-react"
import { formatDate, formatTime } from "@/lib/utils"

interface WebhookLog {
  id: string
  reference: string
  destination_app: string
  destination_url?: string
  routing_strategy: "metadata" | "prefix" | "none"
  forward_status: "success" | "failed" | "dead_letter"
  forward_response_status?: number
  forward_response_body?: Record<string, unknown>
  processing_time_ms: number
  ip_address?: string
  payload?: Record<string, unknown>
  headers?: Record<string, string>
  error_message?: string
  trace_logs?: Array<{ level: string; message: string; timestamp: string }>
  created_at: string
}

interface RecentWebhooksProps {
  webhooks: WebhookLog[]
  onRefresh?: () => void
  onRetry?: (webhookId: string) => Promise<{ success: boolean; error?: string }>
  isLoading?: boolean
}

export function RecentWebhooks({ webhooks, onRefresh, onRetry, isLoading }: RecentWebhooksProps) {
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookLog | null>(null)
  const [copied, setCopied] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retryResult, setRetryResult] = useState<{ success: boolean; error?: string } | null>(null)

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRetry = async () => {
    if (!selectedWebhook || !onRetry) return
    setRetrying(true)
    setRetryResult(null)
    const result = await onRetry(selectedWebhook.id)
    setRetryResult(result)
    setRetrying(false)
    if (result.success) {
      onRefresh?.()
    }
  }

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
            <div
              key={webhook.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
              onClick={() => setSelectedWebhook(webhook)}
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
            </div>
          ))}

          {webhooks.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No webhooks received yet</p>
            </div>
          )}
        </div>

        {webhooks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button variant="ghost" className="w-full gap-2">
              View All Logs
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>

      {/* Webhook Detail Dialog */}
      <Dialog open={!!selectedWebhook} onOpenChange={(open) => !open && setSelectedWebhook(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Webhook Details
              {selectedWebhook && getStatusBadge(selectedWebhook.forward_status)}
            </DialogTitle>
            <DialogDescription>
              {selectedWebhook?.reference || "No reference"}
            </DialogDescription>
          </DialogHeader>

          {selectedWebhook && (
            <div className="space-y-4 pt-4">
              {/* Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Destination App</Label>
                  <p className="font-medium">{selectedWebhook.destination_app || "None"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Routing Strategy</Label>
                  <p className="font-medium">{selectedWebhook.routing_strategy || "none"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Processing Time</Label>
                  <p className="font-medium">{selectedWebhook.processing_time_ms}ms</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Received At</Label>
                  <p className="font-medium">{formatDate(selectedWebhook.created_at)}</p>
                </div>
                {selectedWebhook.ip_address && (
                  <div>
                    <Label className="text-xs text-muted-foreground">IP Address</Label>
                    <p className="font-medium font-mono">{selectedWebhook.ip_address}</p>
                  </div>
                )}
                {selectedWebhook.destination_url && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Destination URL</Label>
                    <p className="font-medium font-mono text-sm truncate">{selectedWebhook.destination_url}</p>
                  </div>
                )}
              </div>

              {/* Forward Response */}
              {selectedWebhook.forward_response_status && (
                <div>
                  <Label className="text-xs text-muted-foreground">Forward Response Status</Label>
                  <p className="font-medium">
                    <Badge variant={selectedWebhook.forward_response_status < 400 ? "success" : "destructive"}>
                      {selectedWebhook.forward_response_status}
                    </Badge>
                  </p>
                </div>
              )}

              {/* Response to Paystack */}
              <div>
                <Label className="text-xs text-muted-foreground">Response to Paystack</Label>
                <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(
                    selectedWebhook.forward_status === "success"
                      ? { success: true, message: "Webhook forwarded", app: selectedWebhook.destination_app }
                      : selectedWebhook.forward_status === "dead_letter"
                        ? { success: true, message: "Webhook received, no routing match" }
                        : { success: false, message: selectedWebhook.error_message || "Webhook processing failed" },
                    null,
                    2
                  )}
                </pre>
              </div>

              {/* Error Message */}
              {selectedWebhook.error_message && (
                <div>
                  <Label className="text-xs text-muted-foreground">Error Message</Label>
                  <div className="mt-1 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                    {selectedWebhook.error_message}
                  </div>
                </div>
              )}

              {/* Payload */}
              {selectedWebhook.payload && (
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Payload</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1"
                      onClick={() => handleCopy(JSON.stringify(selectedWebhook.payload, null, 2))}
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto max-h-48">
                    {JSON.stringify(selectedWebhook.payload, null, 2)}
                  </pre>
                </div>
              )}

              {/* Forward Response Body */}
              {selectedWebhook.forward_response_body && (
                <div>
                  <Label className="text-xs text-muted-foreground">Forward Response</Label>
                  <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto max-h-32">
                    {JSON.stringify(selectedWebhook.forward_response_body, null, 2)}
                  </pre>
                </div>
              )}

              {/* Trace Logs */}
              {selectedWebhook.trace_logs && selectedWebhook.trace_logs.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Trace Logs</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg text-xs space-y-1 max-h-32 overflow-y-auto font-mono">
                    {selectedWebhook.trace_logs.map((log, i) => (
                      <div key={i} className="flex gap-2">
                        <span className={log.level === "error" ? "text-destructive" : "text-muted-foreground"}>
                          [{log.level}]
                        </span>
                        <span>{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Retry Section for Failed Webhooks */}
              {(selectedWebhook.forward_status === "failed" || selectedWebhook.forward_status === "dead_letter") && onRetry && (
                <div className="pt-4 border-t border-border">
                  {retryResult && (
                    <div className={`mb-3 p-3 rounded-lg text-sm ${retryResult.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {retryResult.success ? "Webhook retried successfully!" : retryResult.error || "Retry failed"}
                    </div>
                  )}
                  <Button
                    onClick={handleRetry}
                    disabled={retrying}
                    className="w-full gap-2"
                  >
                    <RotateCcw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
                    {retrying ? "Retrying..." : "Retry Webhook"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    This will re-forward the webhook to the destination app
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

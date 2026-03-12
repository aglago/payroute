"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Label,
} from "@/components/ui"
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Check,
  RotateCcw,
  Send,
  Clock,
  Server,
  Globe,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react"
import { formatDate } from "@/lib/utils"

interface WebhookLog {
  id: string
  source: string
  endpoint: string
  method: string
  reference: string
  destination_app: string
  destination_url?: string
  routing_strategy: "metadata" | "prefix" | "none" | "manual"
  forward_status: "success" | "failed" | "dead_letter"
  forward_response_status?: number
  forward_response_body?: Record<string, unknown>
  forward_duration_ms?: number
  processing_time_ms: number
  ip_address?: string
  payload?: Record<string, unknown>
  headers?: Record<string, string>
  error_message?: string
  trace_logs?: Array<{ level: string; message: string; timestamp: string; data?: unknown }>
  created_at: string
}

interface AppOption {
  id: string
  name: string
  enabled: boolean
}

function ResponseBody({ body }: { body: Record<string, unknown> }) {
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body, null, 2)
  const isHtml = bodyStr.includes("<!doctype") || bodyStr.includes("<!DOCTYPE") || bodyStr.includes("<html") || bodyStr.trim().startsWith("<!")

  if (isHtml) {
    return (
      <div className="space-y-2">
        <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
          <p className="text-sm text-warning font-medium">HTML Response Received</p>
          <p className="text-xs text-muted-foreground mt-1">
            The destination returned an HTML page instead of JSON. This usually means the webhook URL is incorrect or the endpoint doesn&apos;t exist.
          </p>
        </div>
        <details className="group">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            View raw HTML response
          </summary>
          <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-48 font-mono">
            {bodyStr.length > 2000 ? bodyStr.substring(0, 2000) + "\n\n... (truncated)" : bodyStr}
          </pre>
        </details>
      </div>
    )
  }

  return (
    <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-64 font-mono">
      {bodyStr}
    </pre>
  )
}

export default function WebhookLogDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [log, setLog] = useState<WebhookLog | null>(null)
  const [apps, setApps] = useState<AppOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Action states
  const [retrying, setRetrying] = useState(false)
  const [retryResult, setRetryResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [forwarding, setForwarding] = useState(false)
  const [forwardResult, setForwardResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [selectedAppId, setSelectedAppId] = useState("")

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      setError(null)

      try {
        const [logRes, appsRes] = await Promise.all([
          fetch(`/api/admin/logs/${id}`),
          fetch("/api/admin/apps"),
        ])

        const logData = await logRes.json()
        const appsData = await appsRes.json()

        if (!logData.success) {
          setError(logData.message || "Failed to fetch webhook log")
          return
        }

        setLog(logData.log)
        setApps(appsData.apps || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id])

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleRetry = async () => {
    if (!log) return
    setRetrying(true)
    setRetryResult(null)

    try {
      const res = await fetch("/api/admin/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookId: log.id }),
      })
      const data = await res.json()
      setRetryResult({ success: data.success, error: data.message })
    } catch (err) {
      setRetryResult({ success: false, error: err instanceof Error ? err.message : "Retry failed" })
    } finally {
      setRetrying(false)
    }
  }

  const handleManualForward = async () => {
    if (!log || !selectedAppId) return
    setForwarding(true)
    setForwardResult(null)

    try {
      const res = await fetch("/api/admin/forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookId: log.id, appId: selectedAppId }),
      })
      const data = await res.json()
      setForwardResult({ success: data.success, error: data.message })
    } catch (err) {
      setForwardResult({ success: false, error: err instanceof Error ? err.message : "Forward failed" })
    } finally {
      setForwarding(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" />Success</Badge>
      case "failed":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Failed</Badge>
      case "dead_letter":
        return <Badge variant="warning" className="gap-1"><AlertCircle className="h-3 w-3" />Dead Letter</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getHttpStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return <Badge variant="success">{status}</Badge>
    } else if (status >= 400 && status < 500) {
      return <Badge variant="warning">{status}</Badge>
    } else if (status >= 500) {
      return <Badge variant="destructive">{status}</Badge>
    }
    return <Badge variant="secondary">{status}</Badge>
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !log) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2 mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-destructive font-medium">{error || "Webhook log not found"}</p>
                <Button variant="outline" onClick={() => router.back()} className="mt-4">
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <code className="text-lg bg-muted px-2 py-1 rounded">{log.reference}</code>
                {getStatusBadge(log.forward_status)}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(log.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Total Time</span>
              </div>
              <p className="text-2xl font-bold">{log.processing_time_ms}ms</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-xs">Forward Time</span>
              </div>
              <p className="text-2xl font-bold">{log.forward_duration_ms || "—"}ms</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Server className="h-4 w-4" />
                <span className="text-xs">Destination</span>
              </div>
              <p className="text-lg font-bold truncate">{log.destination_app || "None"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Globe className="h-4 w-4" />
                <span className="text-xs">Routing</span>
              </div>
              <p className="text-lg font-bold">{log.routing_strategy || "none"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="incoming" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="incoming" className="gap-2">
              <ArrowDownLeft className="h-4 w-4" />
              Incoming
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Outgoing
            </TabsTrigger>
            <TabsTrigger value="trace" className="gap-2">
              <Server className="h-4 w-4" />
              Trace
            </TabsTrigger>
          </TabsList>

          {/* INCOMING TAB */}
          <TabsContent value="incoming">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownLeft className="h-5 w-5 text-primary" />
                  Request from Paystack
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Request Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Method</Label>
                    <p className="font-mono font-medium">{log.method || "POST"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Endpoint</Label>
                    <p className="font-mono font-medium">{log.endpoint}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Source IP</Label>
                    <p className="font-mono font-medium">{log.ip_address || "Unknown"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Event Type</Label>
                    <p className="font-mono font-medium">
                      {(log.payload as Record<string, unknown>)?.event as string || "Unknown"}
                    </p>
                  </div>
                </div>

                {/* Headers */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Request Headers</Label>
                    {log.headers && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1"
                        onClick={() => handleCopy(JSON.stringify(log.headers, null, 2), "headers")}
                      >
                        {copied === "headers" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied === "headers" ? "Copied" : "Copy"}
                      </Button>
                    )}
                  </div>
                  {log.headers && Object.keys(log.headers).length > 0 ? (
                    <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-48 font-mono">
                      {JSON.stringify(log.headers, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No headers recorded</p>
                  )}
                </div>

                {/* Payload */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Request Body (Payload)</Label>
                    {log.payload && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1"
                        onClick={() => handleCopy(JSON.stringify(log.payload, null, 2), "payload")}
                      >
                        {copied === "payload" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied === "payload" ? "Copied" : "Copy"}
                      </Button>
                    )}
                  </div>
                  {log.payload ? (
                    <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-96 font-mono">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No payload recorded</p>
                  )}
                </div>

                {/* Response to Paystack */}
                <div>
                  <Label className="text-sm font-medium">Response Sent to Paystack</Label>
                  <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-x-auto font-mono">
                    {JSON.stringify(
                      {
                        status: 200,
                        body: log.forward_status === "success"
                          ? { success: true, message: "Webhook forwarded", app: log.destination_app }
                          : log.forward_status === "dead_letter"
                            ? { success: true, message: "Webhook received, no routing match" }
                            : { success: false, message: log.error_message || "Processing failed" }
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* OUTGOING TAB */}
          <TabsContent value="outgoing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-primary" />
                  Request to Destination App
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {log.destination_app ? (
                  <>
                    {/* Request Info */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Destination App</Label>
                        <p className="font-medium">{log.destination_app}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Method</Label>
                        <p className="font-mono font-medium">POST</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Duration</Label>
                        <p className="font-medium">{log.forward_duration_ms || "—"}ms</p>
                      </div>
                    </div>

                    {/* URL */}
                    <div>
                      <Label className="text-sm font-medium">Destination URL</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono break-all">
                          {log.destination_url || "Unknown"}
                        </code>
                        {log.destination_url && (
                          <a
                            href={log.destination_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-muted rounded"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Request Headers Sent */}
                    <div>
                      <Label className="text-sm font-medium">Request Headers Sent</Label>
                      <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-x-auto font-mono">
                        {JSON.stringify(
                          {
                            "Content-Type": "application/json",
                            "X-PayRoute-Signature": "••••••••",
                            "X-Original-Signature": "••••••••",
                            "X-Routed-By": "payroute",
                            "X-Routed-At": log.created_at,
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>

                    {/* Request Body Sent */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Request Body Sent</Label>
                        {log.payload && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1"
                            onClick={() => handleCopy(JSON.stringify(log.payload, null, 2), "outgoing-body")}
                          >
                            {copied === "outgoing-body" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            {copied === "outgoing-body" ? "Copied" : "Copy"}
                          </Button>
                        )}
                      </div>
                      <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-64 font-mono">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </div>

                    {/* Response */}
                    <div className="border-t border-border pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-sm font-medium">Response from Destination</Label>
                        {log.forward_response_status && getHttpStatusBadge(log.forward_response_status)}
                      </div>

                      {log.error_message && (
                        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <div className="flex items-center gap-2 text-destructive mb-1">
                            <XCircle className="h-4 w-4" />
                            <span className="font-medium">Error</span>
                          </div>
                          <p className="text-sm text-destructive">{log.error_message}</p>
                        </div>
                      )}

                      {log.forward_response_body ? (
                        <ResponseBody body={log.forward_response_body} />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No response body recorded</p>
                      )}
                    </div>

                    {/* Retry Button */}
                    {(log.forward_status === "failed") && (
                      <div className="border-t border-border pt-6">
                        {retryResult && (
                          <div className={`mb-4 p-3 rounded-lg text-sm ${retryResult.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                            {retryResult.success ? "Webhook retried successfully!" : retryResult.error}
                          </div>
                        )}
                        <Button onClick={handleRetry} disabled={retrying} className="gap-2">
                          <RotateCcw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
                          {retrying ? "Retrying..." : "Retry Forward"}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  /* No Destination - Manual Forward UI */
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
                    <h3 className="font-medium text-lg mb-2">No Destination App</h3>
                    <p className="text-muted-foreground mb-6">
                      This webhook could not be routed to any app. You can manually forward it below.
                    </p>

                    <div className="max-w-sm mx-auto space-y-4">
                      <div>
                        <Label className="text-sm">Select Destination App</Label>
                        <select
                          className="w-full mt-1 p-2 text-sm rounded-md border border-input bg-background"
                          value={selectedAppId}
                          onChange={(e) => setSelectedAppId(e.target.value)}
                        >
                          <option value="">Choose an app...</option>
                          {apps.filter(app => app.enabled).map((app) => (
                            <option key={app.id} value={app.id}>
                              {app.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {forwardResult && (
                        <div className={`p-3 rounded-lg text-sm ${forwardResult.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                          {forwardResult.success ? "Forwarded successfully!" : forwardResult.error}
                        </div>
                      )}

                      <Button
                        onClick={handleManualForward}
                        disabled={!selectedAppId || forwarding}
                        className="w-full gap-2"
                      >
                        <Send className="h-4 w-4" />
                        {forwarding ? "Forwarding..." : "Forward to App"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TRACE TAB */}
          <TabsContent value="trace">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  Processing Trace
                </CardTitle>
              </CardHeader>
              <CardContent>
                {log.trace_logs && log.trace_logs.length > 0 ? (
                  <div className="space-y-2">
                    {log.trace_logs.map((entry, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg font-mono text-sm ${
                          entry.level === "error" ? "bg-destructive/10 border border-destructive/20" :
                          entry.level === "warn" ? "bg-warning/10 border border-warning/20" :
                          "bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                          <Badge
                            variant={
                              entry.level === "error" ? "destructive" :
                              entry.level === "warn" ? "warning" :
                              "secondary"
                            }
                            className="text-xs"
                          >
                            {entry.level}
                          </Badge>
                        </div>
                        <p className={
                          entry.level === "error" ? "text-destructive" :
                          entry.level === "warn" ? "text-warning" :
                          "text-foreground"
                        }>
                          {entry.message}
                        </p>
                        {entry.data !== undefined && entry.data !== null && (
                          <pre className="mt-2 p-2 bg-background rounded text-xs overflow-x-auto">
                            {JSON.stringify(entry.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No trace logs recorded for this webhook</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

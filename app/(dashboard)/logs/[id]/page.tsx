"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { authFetch } from "@/lib/auth-fetch"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  ArrowRight,
  Copy,
  Check,
  RotateCcw,
  Send,
  Server,
  Globe,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Zap,
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

interface ForwardAttempt {
  id: string
  webhook_log_id: string
  attempt_number: number
  attempt_type: "auto" | "manual" | "retry"
  destination_app: string
  destination_url: string
  status: "success" | "failed"
  response_status?: number
  response_body?: Record<string, unknown>
  duration_ms?: number
  error_message?: string
  created_at: string
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
  const [attempts, setAttempts] = useState<ForwardAttempt[]>([])
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
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null)

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [logRes, appsRes] = await Promise.all([
        authFetch(`/api/admin/logs/${id}`),
        authFetch("/api/admin/apps"),
      ])

      const logData = await logRes.json()
      const appsData = await appsRes.json()

      if (!logData.success) {
        setError(logData.message || "Failed to fetch webhook log")
        return
      }

      setLog(logData.log)
      setAttempts(logData.attempts || [])
      setApps(appsData.apps || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchData()
    }
  }, [id])

  // Default to the last attempt when attempts are loaded or updated
  useEffect(() => {
    if (attempts.length > 0) {
      // Always update to the latest attempt when attempts change
      const latestAttempt = attempts[attempts.length - 1]
      if (!selectedAttemptId || !attempts.find(a => a.id === selectedAttemptId)) {
        setSelectedAttemptId(latestAttempt.id)
      }
    }
  }, [attempts, selectedAttemptId])

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
      const res = await authFetch("/api/admin/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookId: log.id }),
      })
      const data = await res.json()
      setRetryResult({ success: data.success, error: data.message })
      // Refresh data to show new attempt and select it
      if (data.success) {
        setSelectedAttemptId(null) // Reset so useEffect selects the new latest
        fetchData()
      }
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
      const res = await authFetch("/api/admin/forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookId: log.id, appId: selectedAppId }),
      })
      const data = await res.json()
      setForwardResult({ success: data.success, error: data.message })
      // Refresh data to show new attempt and select it
      if (data.success) {
        setSelectedAttemptId(null) // Reset so useEffect selects the new latest
        fetchData()
      }
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
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !log) {
    return (
      <div className="space-y-6">
        <Link href="/logs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Logs
        </Link>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-medium">{error || "Webhook log not found"}</p>
              <Button variant="outline" onClick={() => router.push("/logs")} className="mt-4">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const eventType = (log.payload as Record<string, unknown>)?.event as string || "Unknown"

  // Get the selected attempt for the Outgoing tab
  const selectedAttempt = attempts.find(a => a.id === selectedAttemptId)

  // Derive outgoing display data - prefer selected attempt over log data
  const outgoingData = selectedAttempt ? {
    destination_app: selectedAttempt.destination_app,
    destination_url: selectedAttempt.destination_url,
    forward_duration_ms: selectedAttempt.duration_ms,
    forward_status: selectedAttempt.status === "success" ? "success" : "failed" as const,
    forward_response_status: selectedAttempt.response_status,
    forward_response_body: selectedAttempt.response_body,
    error_message: selectedAttempt.error_message,
    attempt_number: selectedAttempt.attempt_number,
    attempt_type: selectedAttempt.attempt_type,
    created_at: selectedAttempt.created_at,
  } : {
    destination_app: log.destination_app,
    destination_url: log.destination_url,
    forward_duration_ms: log.forward_duration_ms,
    forward_status: log.forward_status,
    forward_response_status: log.forward_response_status,
    forward_response_body: log.forward_response_body,
    error_message: log.error_message,
    attempt_number: null,
    attempt_type: null,
    created_at: log.created_at,
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/logs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <code className="text-xl font-bold bg-muted px-2 py-1 rounded">{log.reference}</code>
              {getStatusBadge(log.forward_status)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDate(log.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Visual Flow Diagram */}
      <Card className="bg-muted/30">
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-4 text-center">
            {/* Paystack */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Paystack</p>
                <p className="text-xs text-muted-foreground">{eventType}</p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center gap-1">
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{log.processing_time_ms}ms</span>
            </div>

            {/* PayRoute */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center">
                <Server className="h-8 w-8 text-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">PayRoute</p>
                <p className="text-xs text-muted-foreground">{log.routing_strategy}</p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center gap-1">
              {log.destination_app ? (
                <>
                  <ArrowRight className={`h-6 w-6 ${
                    log.forward_status === "success" ? "text-success" :
                    log.forward_status === "failed" ? "text-destructive" :
                    "text-warning"
                  }`} />
                  <span className="text-xs text-muted-foreground">
                    {log.forward_duration_ms ? `${log.forward_duration_ms}ms` : "—"}
                  </span>
                </>
              ) : (
                <XCircle className="h-6 w-6 text-warning" />
              )}
            </div>

            {/* Destination */}
            <div className="flex flex-col items-center gap-2">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                log.forward_status === "success" ? "bg-success/10" :
                log.forward_status === "failed" ? "bg-destructive/10" :
                "bg-warning/10"
              }`}>
                {log.destination_app ? (
                  <Globe className={`h-8 w-8 ${
                    log.forward_status === "success" ? "text-success" :
                    log.forward_status === "failed" ? "text-destructive" :
                    "text-warning"
                  }`} />
                ) : (
                  <AlertCircle className="h-8 w-8 text-warning" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{log.destination_app || "No Destination"}</p>
                {log.forward_response_status && (
                  <p className="text-xs">{getHttpStatusBadge(log.forward_response_status)}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="incoming" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="incoming" className="gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            Incoming
          </TabsTrigger>
          <TabsTrigger value="attempts" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Attempts
            {attempts.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {attempts.length}
              </Badge>
            )}
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
            <CardHeader className="border-b border-border bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ArrowDownLeft className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Received from Paystack</CardTitle>
                  <CardDescription>What PayRoute received from Paystack&apos;s webhook</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Request Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
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
                  <p className="font-mono font-medium">{eventType}</p>
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
              <div className="border-t pt-6">
                <Label className="text-sm font-medium">Response Sent to Paystack</Label>
                <p className="text-xs text-muted-foreground mb-2">PayRoute always returns 200 to prevent retries</p>
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto font-mono">
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

        {/* ATTEMPTS TAB */}
        <TabsContent value="attempts">
          <Card>
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Forward Attempts</CardTitle>
                    <CardDescription>
                      {attempts.length === 0
                        ? "No forward attempts recorded"
                        : `${attempts.length} attempt${attempts.length === 1 ? "" : "s"} to forward this webhook`
                      }
                    </CardDescription>
                  </div>
                </div>
                {log.destination_app && (
                  <Button
                    onClick={handleRetry}
                    disabled={retrying}
                    variant="outline"
                    className="gap-2"
                  >
                    <RotateCcw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
                    {retrying ? "Retrying..." : "Retry"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {attempts.length > 0 ? (
                <div className="space-y-4">
                  {attempts.map((attempt, index) => (
                    <div
                      key={attempt.id}
                      className={`relative pl-8 pb-6 ${index < attempts.length - 1 ? "border-l-2 border-border ml-3" : "ml-3"}`}
                    >
                      {/* Timeline dot */}
                      <div className={`absolute -left-2.25 top-0 w-5 h-5 rounded-full flex items-center justify-center ${
                        attempt.status === "success" ? "bg-success" : "bg-destructive"
                      }`}>
                        {attempt.status === "success" ? (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        ) : (
                          <XCircle className="h-3 w-3 text-white" />
                        )}
                      </div>

                      {/* Attempt card */}
                      <div className={`ml-4 p-4 rounded-lg border ${
                        attempt.status === "success" ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge variant={attempt.status === "success" ? "success" : "destructive"}>
                              {attempt.status === "success" ? "Success" : "Failed"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              #{attempt.attempt_number} - {attempt.attempt_type}
                            </Badge>
                            {attempt.response_status && getHttpStatusBadge(attempt.response_status)}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(attempt.created_at)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <Label className="text-xs text-muted-foreground">Destination</Label>
                            <p className="font-medium">{attempt.destination_app}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Duration</Label>
                            <p className="font-medium">{attempt.duration_ms ? `${attempt.duration_ms}ms` : "—"}</p>
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs text-muted-foreground">URL</Label>
                            <p className="font-mono text-xs truncate">{attempt.destination_url}</p>
                          </div>
                        </div>

                        {attempt.error_message && (
                          <div className="mt-3 p-2 bg-destructive/10 rounded text-sm text-destructive">
                            {attempt.error_message}
                          </div>
                        )}

                        {attempt.response_body && (
                          <details className="mt-3 group">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              View response body
                            </summary>
                            <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto max-h-32 font-mono">
                              {JSON.stringify(attempt.response_body, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <RotateCcw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No forward attempts recorded yet</p>
                  {!log.destination_app && (
                    <p className="text-sm text-muted-foreground">
                      This webhook hasn&apos;t been forwarded to any app. Use the Outgoing tab to manually forward it.
                    </p>
                  )}
                </div>
              )}

              {retryResult && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${
                  retryResult.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                }`}>
                  {retryResult.success ? "Retry successful! The attempt has been added above." : retryResult.error}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* OUTGOING TAB */}
        <TabsContent value="outgoing">
          <Card>
            <CardHeader className={`border-b border-border ${
              outgoingData.forward_status === "success" ? "bg-success/5" :
              outgoingData.forward_status === "failed" ? "bg-destructive/5" :
              "bg-warning/5"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    outgoingData.forward_status === "success" ? "bg-success/10" :
                    outgoingData.forward_status === "failed" ? "bg-destructive/10" :
                    "bg-warning/10"
                  }`}>
                    <ArrowUpRight className={`h-5 w-5 ${
                      outgoingData.forward_status === "success" ? "text-success" :
                      outgoingData.forward_status === "failed" ? "text-destructive" :
                      "text-warning"
                    }`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Forwarded to Destination</CardTitle>
                    <CardDescription>
                      {selectedAttempt
                        ? `Attempt #${selectedAttempt.attempt_number} (${selectedAttempt.attempt_type}) - ${formatDate(selectedAttempt.created_at)}`
                        : "What PayRoute sent to your app"
                      }
                    </CardDescription>
                  </div>
                </div>
                {/* Attempt Selector */}
                {attempts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">View attempt:</Label>
                    <select
                      className="p-2 text-sm rounded-md border border-input bg-background min-w-[180px]"
                      value={selectedAttemptId || ""}
                      onChange={(e) => setSelectedAttemptId(e.target.value)}
                    >
                      {attempts.map((attempt) => (
                        <option key={attempt.id} value={attempt.id}>
                          #{attempt.attempt_number} - {attempt.attempt_type} ({attempt.status === "success" ? "✓" : "✗"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {outgoingData.destination_app ? (
                <>
                  {/* Request Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label className="text-xs text-muted-foreground">Destination App</Label>
                      <p className="font-medium">{outgoingData.destination_app}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Method</Label>
                      <p className="font-mono font-medium">POST</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Duration</Label>
                      <p className="font-medium">{outgoingData.forward_duration_ms || "—"}ms</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {selectedAttempt ? "Attempt Type" : "Routing"}
                      </Label>
                      <p className="font-medium">
                        {selectedAttempt ? outgoingData.attempt_type : log.routing_strategy}
                      </p>
                    </div>
                  </div>

                  {/* URL */}
                  <div>
                    <Label className="text-sm font-medium">Destination URL</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono break-all">
                        {outgoingData.destination_url || "Unknown"}
                      </code>
                      {outgoingData.destination_url && (
                        <a
                          href={outgoingData.destination_url}
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
                          "X-Routed-At": outgoingData.created_at,
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
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Label className="text-sm font-medium">Response from Destination</Label>
                        <p className="text-xs text-muted-foreground">What your app returned</p>
                      </div>
                      {outgoingData.forward_response_status && getHttpStatusBadge(outgoingData.forward_response_status)}
                    </div>

                    {outgoingData.error_message && (
                      <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-center gap-2 text-destructive mb-1">
                          <XCircle className="h-4 w-4" />
                          <span className="font-medium">Error</span>
                        </div>
                        <p className="text-sm text-destructive">{outgoingData.error_message}</p>
                      </div>
                    )}

                    {outgoingData.forward_response_body ? (
                      <ResponseBody body={outgoingData.forward_response_body} />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No response body recorded</p>
                    )}
                  </div>

                  {/* Retry Button */}
                  {(outgoingData.forward_status === "failed") && (
                    <div className="border-t pt-6">
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
            <CardHeader className="border-b border-border bg-secondary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Processing Trace</CardTitle>
                  <CardDescription>Detailed logs from PayRoute processing</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
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
  )
}

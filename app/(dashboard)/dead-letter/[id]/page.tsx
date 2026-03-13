"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
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
  Input,
  Textarea,
} from "@/components/ui"
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowRight,
  Copy,
  Check,
  Send,
  Server,
  Globe,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  FileQuestion,
} from "lucide-react"
import { formatDate } from "@/lib/utils"

interface DeadLetterEntry {
  id: string
  payload: Record<string, unknown>
  reference: string | null
  reason: string
  ip_address: string | null
  headers: Record<string, string> | null
  reviewed: boolean
  reviewed_at: string | null
  reviewed_by: string | null
  resolution: string | null
  resolution_notes: string | null
  forwarded_to: string | null
  created_at: string
  updated_at: string
}

interface AppOption {
  id: string
  name: string
  enabled: boolean
}

export default function DeadLetterDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [entry, setEntry] = useState<DeadLetterEntry | null>(null)
  const [apps, setApps] = useState<AppOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Forward action states
  const [forwarding, setForwarding] = useState(false)
  const [forwardResult, setForwardResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [selectedAppId, setSelectedAppId] = useState("")

  // Review action states
  const [reviewing, setReviewing] = useState(false)
  const [reviewResult, setReviewResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [reviewedBy, setReviewedBy] = useState("")
  const [resolution, setResolution] = useState("")
  const [resolutionNotes, setResolutionNotes] = useState("")

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [entryRes, appsRes] = await Promise.all([
        fetch(`/api/admin/dead-letter/${id}`),
        fetch("/api/admin/apps"),
      ])

      const entryData = await entryRes.json()
      const appsData = await appsRes.json()

      if (!entryData.success) {
        setError(entryData.message || "Failed to fetch dead letter entry")
        return
      }

      setEntry(entryData.entry)
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

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleManualForward = async () => {
    if (!entry || !selectedAppId) return
    setForwarding(true)
    setForwardResult(null)

    try {
      // First, we need to create a webhook log entry from this dead letter
      // Then forward it to the selected app
      const res = await fetch("/api/admin/forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: entry.payload,
          appId: selectedAppId,
          deadLetterId: entry.id,
        }),
      })
      const data = await res.json()
      setForwardResult({ success: data.success, error: data.message })

      if (data.success) {
        // Mark as reviewed with forwarded resolution
        await fetch(`/api/admin/dead-letter/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewedBy: reviewedBy || "admin",
            resolution: "forwarded",
            resolutionNotes: `Manually forwarded to ${selectedAppId}`,
            forwardedTo: selectedAppId,
          }),
        })
        fetchData()
      }
    } catch (err) {
      setForwardResult({ success: false, error: err instanceof Error ? err.message : "Forward failed" })
    } finally {
      setForwarding(false)
    }
  }

  const handleMarkReviewed = async () => {
    if (!entry || !reviewedBy || !resolution) return
    setReviewing(true)
    setReviewResult(null)

    try {
      const res = await fetch(`/api/admin/dead-letter/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewedBy,
          resolution,
          resolutionNotes,
        }),
      })
      const data = await res.json()
      setReviewResult({ success: data.success, error: data.error })

      if (data.success) {
        fetchData()
      }
    } catch (err) {
      setReviewResult({ success: false, error: err instanceof Error ? err.message : "Review failed" })
    } finally {
      setReviewing(false)
    }
  }

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case "no_matching_app":
        return <Badge variant="warning" className="gap-1"><FileQuestion className="h-3 w-3" />No Matching App</Badge>
      case "missing_metadata":
        return <Badge variant="warning" className="gap-1"><AlertCircle className="h-3 w-3" />Missing Metadata</Badge>
      case "invalid_signature":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Invalid Signature</Badge>
      default:
        return <Badge variant="secondary">{reason}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !entry) {
    return (
      <div className="space-y-6">
        <Link href="/dead-letter" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Dead Letter Queue
        </Link>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-medium">{error || "Dead letter entry not found"}</p>
              <Button variant="outline" onClick={() => router.push("/dead-letter")} className="mt-4">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const eventType = (entry.payload as Record<string, unknown>)?.event as string || "Unknown"
  const payloadData = entry.payload as { data?: Record<string, unknown> }
  const metadata = payloadData?.data?.metadata as Record<string, unknown> | undefined

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dead-letter" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <code className="text-xl font-bold bg-muted px-2 py-1 rounded">{entry.reference || "No Reference"}</code>
              {getReasonBadge(entry.reason)}
              {entry.reviewed ? (
                <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" />Reviewed</Badge>
              ) : (
                <Badge variant="warning" className="gap-1"><AlertTriangle className="h-3 w-3" />Unreviewed</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDate(entry.created_at)}
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
            </div>

            {/* PayRoute */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center">
                <Server className="h-8 w-8 text-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">PayRoute</p>
                <p className="text-xs text-muted-foreground">{entry.reason}</p>
              </div>
            </div>

            {/* Arrow (blocked) */}
            <div className="flex flex-col items-center gap-1">
              <XCircle className="h-6 w-6 text-warning" />
            </div>

            {/* Destination (unknown) */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-warning" />
              </div>
              <div>
                <p className="font-medium text-sm">Dead Letter</p>
                <p className="text-xs text-muted-foreground">
                  {entry.forwarded_to ? `→ ${entry.forwarded_to}` : "No destination"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="incoming" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="incoming" className="gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            Incoming
          </TabsTrigger>
          <TabsTrigger value="forward" className="gap-2">
            <Send className="h-4 w-4" />
            Forward
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Review
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
                  <CardDescription>The webhook that couldn&apos;t be routed</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Request Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Method</Label>
                  <p className="font-mono font-medium">POST</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Endpoint</Label>
                  <p className="font-mono font-medium">/api/webhook</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Source IP</Label>
                  <p className="font-mono font-medium">{entry.ip_address || "Unknown"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Event Type</Label>
                  <p className="font-mono font-medium">{eventType}</p>
                </div>
              </div>

              {/* Reason */}
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-2 text-warning mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Routing Failed</span>
                </div>
                <p className="text-sm">
                  <strong>Reason:</strong> {entry.reason}
                </p>
                {metadata?.app !== undefined && (
                  <p className="text-sm mt-1">
                    <strong>metadata.app:</strong> <code className="bg-muted px-1 rounded">{String(metadata.app)}</code>
                    {entry.reason === "no_matching_app" && (
                      <span className="text-warning ml-2">
                        (App not found in registry)
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Headers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Request Headers</Label>
                  {entry.headers && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1"
                      onClick={() => handleCopy(JSON.stringify(entry.headers, null, 2), "headers")}
                    >
                      {copied === "headers" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied === "headers" ? "Copied" : "Copy"}
                    </Button>
                  )}
                </div>
                {entry.headers && Object.keys(entry.headers).length > 0 ? (
                  <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-48 font-mono">
                    {JSON.stringify(entry.headers, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No headers recorded</p>
                )}
              </div>

              {/* Payload */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Request Body (Payload)</Label>
                  {entry.payload && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1"
                      onClick={() => handleCopy(JSON.stringify(entry.payload, null, 2), "payload")}
                    >
                      {copied === "payload" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied === "payload" ? "Copied" : "Copy"}
                    </Button>
                  )}
                </div>
                {entry.payload ? (
                  <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-96 font-mono">
                    {JSON.stringify(entry.payload, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No payload recorded</p>
                )}
              </div>

              {/* Response to Paystack */}
              <div className="border-t pt-6">
                <Label className="text-sm font-medium">Response Sent to Paystack</Label>
                <p className="text-xs text-muted-foreground mb-2">PayRoute returns 200 to prevent retries</p>
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto font-mono">
                  {JSON.stringify(
                    {
                      status: 200,
                      body: { success: true, message: "Webhook received, no routing match" }
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FORWARD TAB */}
        <TabsContent value="forward">
          <Card>
            <CardHeader className="border-b border-border bg-secondary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Manual Forward</CardTitle>
                  <CardDescription>Manually forward this webhook to an app</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {entry.forwarded_to ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-2">Already Forwarded</h3>
                  <p className="text-muted-foreground">
                    This webhook was manually forwarded to <strong>{entry.forwarded_to}</strong>
                  </p>
                  {entry.reviewed_at && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Forwarded on {formatDate(entry.reviewed_at)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="max-w-md mx-auto space-y-6">
                  <div className="text-center py-4">
                    <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium text-lg mb-2">Select Destination</h3>
                    <p className="text-muted-foreground">
                      Choose an app to forward this webhook to
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm">Destination App</Label>
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

                  <div>
                    <Label className="text-sm">Your Name (for audit)</Label>
                    <Input
                      placeholder="Enter your name"
                      value={reviewedBy}
                      onChange={(e) => setReviewedBy(e.target.value)}
                      className="mt-1"
                    />
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REVIEW TAB */}
        <TabsContent value="review">
          <Card>
            <CardHeader className={`border-b border-border ${entry.reviewed ? "bg-success/5" : "bg-warning/5"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${entry.reviewed ? "bg-success/10" : "bg-warning/10"}`}>
                  {entry.reviewed ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-lg">Review Status</CardTitle>
                  <CardDescription>
                    {entry.reviewed ? "This entry has been reviewed" : "Mark this entry as reviewed"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {entry.reviewed ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label className="text-xs text-muted-foreground">Reviewed By</Label>
                      <p className="font-medium">{entry.reviewed_by}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Reviewed At</Label>
                      <p className="font-medium">{entry.reviewed_at ? formatDate(entry.reviewed_at) : "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Resolution</Label>
                      <Badge variant={
                        entry.resolution === "forwarded" ? "success" :
                        entry.resolution === "ignored" ? "secondary" :
                        "outline"
                      }>
                        {entry.resolution}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Forwarded To</Label>
                      <p className="font-medium">{entry.forwarded_to || "—"}</p>
                    </div>
                  </div>

                  {entry.resolution_notes && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Resolution Notes</Label>
                      <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{entry.resolution_notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-md mx-auto space-y-6">
                  <div>
                    <Label className="text-sm">Your Name *</Label>
                    <Input
                      placeholder="Enter your name"
                      value={reviewedBy}
                      onChange={(e) => setReviewedBy(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Resolution *</Label>
                    <select
                      className="w-full mt-1 p-2 text-sm rounded-md border border-input bg-background"
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                    >
                      <option value="">Select resolution...</option>
                      <option value="forwarded">Forwarded Manually</option>
                      <option value="ignored">Ignored (not needed)</option>
                      <option value="manual_processed">Manually Processed</option>
                      <option value="duplicate">Duplicate Entry</option>
                      <option value="test_data">Test Data</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-sm">Notes (optional)</Label>
                    <Textarea
                      placeholder="Add any notes about this resolution..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  {reviewResult && (
                    <div className={`p-3 rounded-lg text-sm ${reviewResult.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {reviewResult.success ? "Marked as reviewed!" : reviewResult.error}
                    </div>
                  )}

                  <Button
                    onClick={handleMarkReviewed}
                    disabled={!reviewedBy || !resolution || reviewing}
                    className="w-full gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {reviewing ? "Saving..." : "Mark as Reviewed"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

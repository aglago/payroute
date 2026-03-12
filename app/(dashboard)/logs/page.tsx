"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui"
import {
  RefreshCw,
  ChevronRight,
  Search,
  Filter,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
} from "lucide-react"
import { formatDate } from "@/lib/utils"

interface WebhookLog {
  id: string
  reference: string
  source: string
  destination_app: string
  destination_url?: string
  routing_strategy: "metadata" | "prefix" | "none" | "manual"
  forward_status: "success" | "failed" | "dead_letter"
  forward_response_status?: number
  forward_duration_ms?: number
  processing_time_ms: number
  ip_address?: string
  event_type?: string
  created_at: string
  last_attempt_at?: string
}

export default function LogsPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming")

  // Filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [appFilter, setAppFilter] = useState("")
  const [apps, setApps] = useState<string[]>([])

  // Pagination
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const pageSize = 25

  const fetchLogs = async (reset = false) => {
    setIsLoading(true)
    setError(null)

    const currentPage = reset ? 0 : page
    if (reset) setPage(0)

    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(currentPage * pageSize),
      })
      if (statusFilter) params.set("status", statusFilter)
      if (appFilter) params.set("app", appFilter)
      if (search) params.set("reference", search)
      // Filter incoming tab to only show actual Paystack webhooks (not manual forwards)
      if (activeTab === "incoming") {
        params.set("source", "paystack")
      }

      const res = await fetch(`/api/admin/logs?${params}`)
      const data = await res.json()

      if (!data.success) {
        setError(data.message || "Failed to fetch logs")
        return
      }

      setLogs(data.logs || [])
      setHasMore(data.logs?.length === pageSize)

      // Extract unique apps for filter
      const uniqueApps = [...new Set(data.logs?.map((l: WebhookLog) => l.destination_app).filter(Boolean))] as string[]
      if (uniqueApps.length > apps.length) {
        setApps(uniqueApps)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(true)
  }, [statusFilter, appFilter, activeTab])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchLogs(true)
  }

  const getForwardStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-success" />
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />
      case "dead_letter":
        return <AlertCircle className="h-4 w-4 text-warning" />
      default:
        return null
    }
  }

  const getHttpStatusBadge = (status?: number) => {
    if (!status) return null
    if (status >= 200 && status < 300) {
      return <Badge variant="success" className="text-xs">{status}</Badge>
    } else if (status >= 400 && status < 500) {
      return <Badge variant="warning" className="text-xs">{status}</Badge>
    } else if (status >= 500) {
      return <Badge variant="destructive" className="text-xs">{status}</Badge>
    }
    return <Badge variant="secondary" className="text-xs">{status}</Badge>
  }

  const renderPagination = () => (
    <div className="flex items-center justify-between p-4 border-t border-border">
      <p className="text-sm text-muted-foreground">
        Showing {page * pageSize + 1} - {page * pageSize + logs.length}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setPage(0); fetchLogs(true) }}
          disabled={page === 0 || isLoading}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setPage(p => p - 1); fetchLogs() }}
          disabled={page === 0 || isLoading}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm px-2">Page {page + 1}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setPage(p => p + 1); fetchLogs() }}
          disabled={!hasMore || isLoading}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasMore || isLoading}
          onClick={() => { setPage(p => p + 1); fetchLogs() }}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  // Incoming view - what PayRoute received from Paystack
  const renderIncomingList = () => (
    <div className="divide-y divide-border">
      {logs.map((log) => (
        <Link
          key={log.id}
          href={`/logs/${log.id}`}
          className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <ArrowDownLeft className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono font-medium">
                  {log.reference}
                </code>
                <Badge variant="outline" className="text-xs">
                  {log.event_type || "charge.success"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>From: Paystack</span>
                {log.ip_address && (
                  <>
                    <span>•</span>
                    <span>IP: {log.ip_address}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{formatDate(log.created_at)}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                <Clock className="h-3 w-3" />
                Received
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
      ))}
    </div>
  )

  // Outgoing view - what PayRoute forwarded to destination apps
  const renderOutgoingList = () => (
    <div className="divide-y divide-border">
      {logs.map((log) => (
        <Link
          key={log.id}
          href={`/logs/${log.id}`}
          className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              log.forward_status === "success" ? "bg-success/10" :
              log.forward_status === "failed" ? "bg-destructive/10" :
              "bg-warning/10"
            }`}>
              {log.forward_status === "dead_letter" ? (
                <AlertCircle className="h-5 w-5 text-warning" />
              ) : (
                <ArrowUpRight className={`h-5 w-5 ${
                  log.forward_status === "success" ? "text-success" : "text-destructive"
                }`} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono font-medium">
                  {log.reference}
                </code>
                {getForwardStatusIcon(log.forward_status)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {log.destination_app ? (
                  <span className="text-xs text-muted-foreground">
                    → {log.destination_app}
                  </span>
                ) : (
                  <span className="text-xs text-warning">No destination</span>
                )}
                {getHttpStatusBadge(log.forward_response_status)}
                {log.source === "paystack-manual" ? (
                  <Badge variant="secondary" className="text-xs">
                    Manual
                  </Badge>
                ) : log.routing_strategy && log.routing_strategy !== "none" && (
                  <Badge variant="outline" className="text-xs">
                    {log.routing_strategy}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              {log.forward_duration_ms ? (
                <p className="text-sm font-medium">{log.forward_duration_ms}ms</p>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatDate(log.last_attempt_at || log.created_at)}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Webhook Logs</h1>
          <p className="text-muted-foreground">View incoming and outgoing webhooks</p>
        </div>
        <Button onClick={() => fetchLogs(true)} disabled={isLoading} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Reference</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by reference..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-40">
              <Label className="text-xs text-muted-foreground">Forward Status</Label>
              <select
                className="w-full mt-1 p-2 text-sm rounded-md border border-input bg-background"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="dead_letter">Dead Letter</option>
              </select>
            </div>
            <div className="w-40">
              <Label className="text-xs text-muted-foreground">Destination App</Label>
              <select
                className="w-full mt-1 p-2 text-sm rounded-md border border-input bg-background"
                value={appFilter}
                onChange={(e) => setAppFilter(e.target.value)}
              >
                <option value="">All apps</option>
                {apps.map((app) => (
                  <option key={app} value={app}>{app}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={isLoading}>
                Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabs for Incoming/Outgoing */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "incoming" | "outgoing")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="incoming" className="gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            Incoming
            <span className="text-xs text-muted-foreground">from Paystack</span>
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Outgoing
            <span className="text-xs text-muted-foreground">to Apps</span>
          </TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardContent className="p-0">
            {error ? (
              <div className="p-8 text-center text-destructive">{error}</div>
            ) : logs.length === 0 && !isLoading ? (
              <div className="p-8 text-center text-muted-foreground">No logs found</div>
            ) : (
              <>
                <TabsContent value="incoming" className="m-0">
                  {renderIncomingList()}
                </TabsContent>

                <TabsContent value="outgoing" className="m-0">
                  {renderOutgoingList()}
                </TabsContent>
              </>
            )}

            {/* Pagination */}
            {logs.length > 0 && renderPagination()}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  )
}

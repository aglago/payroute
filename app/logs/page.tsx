"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Label,
} from "@/components/ui"
import {
  ArrowLeft,
  RefreshCw,
  ChevronRight,
  Search,
  Filter,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { formatDate } from "@/lib/utils"

interface WebhookLog {
  id: string
  reference: string
  destination_app: string
  routing_strategy: "metadata" | "prefix" | "none"
  forward_status: "success" | "failed" | "dead_letter"
  processing_time_ms: number
  created_at: string
}

export default function LogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
  }, [statusFilter, appFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchLogs(true)
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
        return <Badge variant="outline" className="text-xs">metadata</Badge>
      case "prefix":
        return <Badge variant="outline" className="text-xs">prefix</Badge>
      default:
        return <Badge variant="outline" className="text-xs">none</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Webhook Logs</h1>
              <p className="text-sm text-muted-foreground">View all processed webhooks</p>
            </div>
          </div>
          <Button onClick={() => fetchLogs(true)} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
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
                <Label className="text-xs text-muted-foreground">Status</Label>
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
                <Label className="text-xs text-muted-foreground">App</Label>
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

        {/* Logs List */}
        <Card>
          <CardContent className="p-0">
            {error ? (
              <div className="p-8 text-center text-destructive">{error}</div>
            ) : logs.length === 0 && !isLoading ? (
              <div className="p-8 text-center text-muted-foreground">No logs found</div>
            ) : (
              <div className="divide-y divide-border">
                {logs.map((log) => (
                  <Link
                    key={log.id}
                    href={`/logs/${log.id}`}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono font-medium">
                            {log.reference}
                          </code>
                          {getStatusBadge(log.forward_status)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            → {log.destination_app || "No destination"}
                          </span>
                          {getStrategyBadge(log.routing_strategy)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{log.processing_time_ms}ms</p>
                        <p className="text-xs text-muted-foreground">{formatDate(log.created_at)}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {logs.length > 0 && (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

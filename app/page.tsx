"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent, Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, Label } from "@/components/ui"
import {
  Header,
  StatsCards,
  AppRegistry,
  RecentWebhooks,
  DeadLetterQueue,
  Documentation,
} from "@/components/dashboard"
import { KeyRound, AlertCircle, RefreshCw } from "lucide-react"
import {
  useSession,
  useLogin,
  useLogout,
  useStats,
  useApps,
  useWebhooks,
  useDeadLetters,
  useToggleApp,
  useAddApp,
  useDeleteApp,
} from "@/hooks/useDashboard"

// Types
interface AppConfig {
  id: string
  name: string
  webhookUrl: string
  prefixes: string[]
  enabled: boolean
  source?: "env" | "database"
  routerSecret?: string
  description?: string
}

function LoginScreen() {
  const [adminKeyInput, setAdminKeyInput] = useState("")
  const loginMutation = useLogin()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate(adminKeyInput, {
      onSuccess: () => setAdminKeyInput(""),
    })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>PayRoute Admin</CardTitle>
          <CardDescription>
            Enter your admin API key to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginMutation.error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {loginMutation.error.message}
              </div>
            )}
            <div>
              <Label htmlFor="adminKey">Admin Key</Label>
              <Input
                id="adminKey"
                type="password"
                value={adminKeyInput}
                onChange={(e) => setAdminKeyInput(e.target.value)}
                placeholder="Enter your ADMIN_API_KEY"
                className="mt-1"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loginMutation.isPending || !adminKeyInput}>
              {loginMutation.isPending ? "Verifying..." : "Sign In"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Set <code className="bg-muted px-1 rounded">ADMIN_API_KEY</code> in your environment.
              <br />
              Generate one with: <code className="bg-muted px-1 rounded">openssl rand -hex 32</code>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function DashboardContent() {
  const logoutMutation = useLogout()

  // Data queries
  const statsQuery = useStats(true)
  const appsQuery = useApps(true)
  const webhooksQuery = useWebhooks(true)
  const deadLettersQuery = useDeadLetters(true)

  // Mutations
  const toggleAppMutation = useToggleApp()
  const addAppMutation = useAddApp()
  const deleteAppMutation = useDeleteApp()

  // Derived state
  const stats = statsQuery.data ?? {
    total: 0,
    success: 0,
    failed: 0,
    deadLetter: 0,
    avgProcessingTime: 0,
    byApp: {},
  }

  const apps = (appsQuery.data ?? []).map((app) => ({
    ...app,
    stats: {
      total: stats.byApp[app.id] || 0,
      success: Math.round((stats.byApp[app.id] || 0) * 0.95),
    },
  }))

  const webhooks = webhooksQuery.data ?? []
  const deadLetters = deadLettersQuery.data ?? []

  const isLoading = statsQuery.isLoading || appsQuery.isLoading
  const hasError = statsQuery.isError || appsQuery.isError || webhooksQuery.isError || deadLettersQuery.isError

  // Handlers
  const handleToggleApp = (appId: string, enabled: boolean) => {
    toggleAppMutation.mutate({ appId, enabled })
  }

  const handleAddApp = async (app: Omit<AppConfig, "id" | "enabled" | "source">) => {
    return new Promise<{ success: boolean; error?: string; routerSecret?: string }>((resolve) => {
      addAppMutation.mutate(app, {
        onSuccess: (data) => resolve({ success: true, routerSecret: data.app?.routerSecret }),
        onError: (error) => resolve({ success: false, error: error.message }),
      })
    })
  }

  const handleDeleteApp = async (appId: string) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      deleteAppMutation.mutate(appId, {
        onSuccess: () => resolve({ success: true }),
        onError: (error) => resolve({ success: false, error: error.message }),
      })
    })
  }

  const handleRefresh = () => {
    statsQuery.refetch()
    appsQuery.refetch()
    webhooksQuery.refetch()
    deadLettersQuery.refetch()
  }

  return (
    <div className="min-h-screen bg-background">
      <Header status="operational" onLogout={() => logoutMutation.mutate()} />

      <main className="container mx-auto px-4 py-6">
        {/* Error Banner */}
        {hasError && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>Failed to load some data. Will retry automatically.</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry Now
            </Button>
          </div>
        )}

        {/* Stats Overview */}
        <div className="mb-6">
          <StatsCards
            stats={{
              total: stats.total,
              success: stats.success,
              failed: stats.failed,
              deadLetter: stats.deadLetter,
              avgProcessingTime: stats.avgProcessingTime,
            }}
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="apps">Apps</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="dead-letter">
              Dead Letter
              {stats.deadLetter > 0 && (
                <span className="ml-2 bg-warning text-warning-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {stats.deadLetter}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="docs">Docs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 lg:grid-cols-2">
              <RecentWebhooks
                webhooks={webhooks}
                onRefresh={handleRefresh}
                isLoading={isLoading}
              />
              <DeadLetterQueue
                entries={deadLetters}
                unreviewedCount={stats.deadLetter}
              />
            </div>
          </TabsContent>

          <TabsContent value="apps">
            <AppRegistry
              apps={apps}
              onToggleApp={handleToggleApp}
              onAddApp={handleAddApp}
              onDeleteApp={handleDeleteApp}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="logs">
            <RecentWebhooks
              webhooks={webhooks}
              onRefresh={handleRefresh}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="dead-letter">
            <DeadLetterQueue
              entries={deadLetters}
              unreviewedCount={stats.deadLetter}
            />
          </TabsContent>

          <TabsContent value="docs">
            <Documentation />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>PayRoute v1.0.0</span>
              <span>•</span>
              <a href="/api/health" className="hover:text-foreground transition-colors">
                API Health
              </a>
            </div>
            <p>Webhook Router for Paystack</p>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default function Dashboard() {
  const sessionQuery = useSession()

  // Loading state
  if (sessionQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Not authenticated
  if (!sessionQuery.data) {
    return <LoginScreen />
  }

  // Authenticated
  return <DashboardContent />
}

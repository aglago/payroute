"use client"

import { ReactNode, useState } from "react"
import { useSession, useLogin } from "@/hooks/useDashboard"
import { DashboardProvider, useDashboard } from "@/components/providers/DashboardProvider"
import { SidebarProvider, useSidebar } from "@/components/providers/SidebarProvider"
import { Sidebar } from "@/components/dashboard"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, Label } from "@/components/ui"
import { KeyRound, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

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

function DashboardShell({ children }: { children: ReactNode }) {
  const { stats, handleLogout } = useDashboard()
  const { collapsed } = useSidebar()

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        onLogout={handleLogout}
        deadLetterCount={stats.deadLetter}
        status="operational"
      />
      <main className={cn(
        "transition-all duration-300 min-h-screen",
        collapsed ? "pl-16" : "pl-64"
      )}>
        <div className="p-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}

function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardProvider>
        <DashboardShell>{children}</DashboardShell>
      </DashboardProvider>
    </SidebarProvider>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
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
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>
}

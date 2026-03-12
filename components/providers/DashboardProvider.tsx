"use client"

import { createContext, useContext, ReactNode } from "react"
import {
  useStats,
  useApps,
  useWebhooks,
  useDeadLetters,
  useToggleApp,
  useAddApp,
  useUpdateApp,
  useDeleteApp,
  useRevealSecret,
  useLogout,
} from "@/hooks/useDashboard"

interface AppConfig {
  id: string
  name: string
  webhookUrl: string
  prefixes: string[]
  enabled: boolean
  source?: "env" | "database"
  routerSecret?: string
  description?: string
  stats?: {
    total: number
    success: number
  }
}

interface Stats {
  total: number
  success: number
  failed: number
  deadLetter: number
  avgProcessingTime: number
  byApp: Record<string, number>
}

interface DashboardContextType {
  // Data
  stats: Stats
  apps: AppConfig[]
  webhooks: any[]
  deadLetters: any[]

  // Loading states
  isLoading: boolean
  hasError: boolean

  // Actions
  handleToggleApp: (appId: string, enabled: boolean) => void
  handleAddApp: (app: Omit<AppConfig, "id" | "enabled" | "source"> & { appId: string }) => Promise<{ success: boolean; error?: string; routerSecret?: string }>
  handleUpdateApp: (appId: string, updates: { name?: string; webhookUrl?: string; prefixes?: string[]; description?: string }) => Promise<{ success: boolean; error?: string }>
  handleDeleteApp: (appId: string) => Promise<{ success: boolean; error?: string }>
  handleRevealSecret: (appId: string, adminKey: string) => Promise<string>
  handleRefresh: () => void
  handleLogout: () => void
}

const DashboardContext = createContext<DashboardContextType | null>(null)

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider")
  }
  return context
}

interface DashboardProviderProps {
  children: ReactNode
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const logoutMutation = useLogout()

  // Data queries
  const statsQuery = useStats(true)
  const appsQuery = useApps(true)
  const webhooksQuery = useWebhooks(true)
  const deadLettersQuery = useDeadLetters(true)

  // Mutations
  const toggleAppMutation = useToggleApp()
  const addAppMutation = useAddApp()
  const updateAppMutation = useUpdateApp()
  const deleteAppMutation = useDeleteApp()
  const revealSecretMutation = useRevealSecret()

  // Derived state
  const stats: Stats = statsQuery.data ?? {
    total: 0,
    success: 0,
    failed: 0,
    deadLetter: 0,
    avgProcessingTime: 0,
    byApp: {},
  }

  const apps: AppConfig[] = (appsQuery.data ?? []).map((app) => ({
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

  const handleAddApp = async (app: Omit<AppConfig, "id" | "enabled" | "source"> & { appId: string }) => {
    return new Promise<{ success: boolean; error?: string; routerSecret?: string }>((resolve) => {
      addAppMutation.mutate(app, {
        onSuccess: (data) => resolve({ success: true, routerSecret: data.app?.routerSecret }),
        onError: (error) => resolve({ success: false, error: error.message }),
      })
    })
  }

  const handleUpdateApp = async (appId: string, updates: { name?: string; webhookUrl?: string; prefixes?: string[]; description?: string }) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      updateAppMutation.mutate({ appId, ...updates }, {
        onSuccess: () => resolve({ success: true }),
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

  const handleRevealSecret = async (appId: string, adminKey: string) => {
    return revealSecretMutation.mutateAsync({ appId, adminKey })
  }

  const handleRefresh = () => {
    statsQuery.refetch()
    appsQuery.refetch()
    webhooksQuery.refetch()
    deadLettersQuery.refetch()
  }

  const handleLogout = () => {
    logoutMutation.mutate()
  }

  return (
    <DashboardContext.Provider
      value={{
        stats,
        apps,
        webhooks,
        deadLetters,
        isLoading,
        hasError,
        handleToggleApp,
        handleAddApp,
        handleUpdateApp,
        handleDeleteApp,
        handleRevealSecret,
        handleRefresh,
        handleLogout,
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

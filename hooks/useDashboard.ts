"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// Types
interface Stats {
  total: number
  success: number
  failed: number
  deadLetter: number
  avgProcessingTime: number
  byApp: Record<string, number>
}

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

interface DeadLetterEntry {
  id: string
  reference: string
  reason: string
  created_at: string
  reviewed: boolean
}

// Fetch functions
async function fetchStats(): Promise<Stats> {
  const res = await fetch("/api/admin/stats")
  if (!res.ok) throw new Error("Failed to fetch stats")
  const data = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to fetch stats")
  return {
    total: data.stats.total || 0,
    success: data.stats.byStatus?.success || 0,
    failed: data.stats.byStatus?.failed || 0,
    deadLetter: data.stats.deadLetterCount || 0,
    avgProcessingTime: data.stats.avgProcessingTime || 0,
    byApp: data.stats.byApp || {},
  }
}

async function fetchApps(): Promise<AppConfig[]> {
  const res = await fetch("/api/admin/apps")
  if (!res.ok) throw new Error("Failed to fetch apps")
  const data = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to fetch apps")
  return data.apps || []
}

async function fetchWebhooks(): Promise<WebhookLog[]> {
  const res = await fetch("/api/admin/logs?limit=10")
  if (!res.ok) throw new Error("Failed to fetch logs")
  const data = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to fetch logs")
  return data.logs || []
}

async function fetchDeadLetters(): Promise<DeadLetterEntry[]> {
  const res = await fetch("/api/admin/dead-letter?limit=10")
  if (!res.ok) throw new Error("Failed to fetch dead letters")
  const data = await res.json()
  if (!data.success) throw new Error(data.message || "Failed to fetch dead letters")
  return data.entries || []
}

// Hooks
export function useStats(enabled: boolean) {
  return useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    enabled,
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

export function useApps(enabled: boolean) {
  return useQuery({
    queryKey: ["apps"],
    queryFn: fetchApps,
    enabled,
    refetchInterval: 30000,
  })
}

export function useWebhooks(enabled: boolean) {
  return useQuery({
    queryKey: ["webhooks"],
    queryFn: fetchWebhooks,
    enabled,
    refetchInterval: 30000,
  })
}

export function useDeadLetters(enabled: boolean) {
  return useQuery({
    queryKey: ["deadLetters"],
    queryFn: fetchDeadLetters,
    enabled,
    refetchInterval: 30000,
  })
}

// Mutations
export function useToggleApp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ appId, enabled }: { appId: string; enabled: boolean }) => {
      const res = await fetch("/api/admin/apps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, enabled }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || "Failed to toggle app")
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apps"] })
    },
  })
}

export function useAddApp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (app: Omit<AppConfig, "id" | "enabled" | "source"> & { appId: string }) => {
      const res = await fetch("/api/admin/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(app),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || "Failed to add app")
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apps"] })
    },
  })
}

export function useDeleteApp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (appId: string) => {
      const res = await fetch(`/api/admin/apps?appId=${encodeURIComponent(appId)}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || "Failed to delete app")
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apps"] })
    },
  })
}

export function useRetryWebhook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (webhookId: string) => {
      const res = await fetch("/api/admin/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || "Failed to retry webhook")
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] })
    },
  })
}

// Auth
export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session")
      const data = await res.json()
      return data.authenticated as boolean
    },
    retry: false,
    staleTime: Infinity, // Don't refetch session automatically
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (adminKey: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminKey }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || "Invalid admin key")
      return data
    },
    onSuccess: () => {
      queryClient.setQueryData(["session"], true)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/login", { method: "DELETE" })
    },
    onSuccess: () => {
      queryClient.setQueryData(["session"], false)
      queryClient.clear() // Clear all cached data
    },
  })
}

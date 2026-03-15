"use client"

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query"
import { useState, useCallback } from "react"
import { UnauthorizedError } from "@/lib/auth-fetch"

// Global handler for 401 errors - forces logout
function handleUnauthorizedError(error: unknown, queryClient: QueryClient) {
  if (error instanceof UnauthorizedError) {
    // Clear session and all cached data
    queryClient.setQueryData(["session"], false)
    queryClient.clear()
    // Call logout endpoint to clear server-side session
    fetch("/api/auth/login", { method: "DELETE" }).catch(() => {
      // Ignore errors - we're already logging out
    })
  }
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            handleUnauthorizedError(error, queryClient)
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            handleUnauthorizedError(error, queryClient)
          },
        }),
        defaultOptions: {
          queries: {
            // Don't refetch on window focus for dashboard
            refetchOnWindowFocus: false,
            // Retry on errors, but not on 401 (UnauthorizedError)
            retry: (failureCount, error) => {
              if (error instanceof UnauthorizedError) return false
              return failureCount < 3
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Consider data stale after 30 seconds
            staleTime: 30 * 1000,
          },
          mutations: {
            // Don't retry on 401
            retry: (failureCount, error) => {
              if (error instanceof UnauthorizedError) return false
              return failureCount < 3
            },
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

"use client"

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Store for theme state that works with SSR
let themeState: Theme = "light"
const listeners = new Set<() => void>()

function getThemeSnapshot(): Theme {
  return themeState
}

function getServerSnapshot(): Theme {
  return "light"
}

function subscribeToTheme(callback: () => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function setThemeState(newTheme: Theme) {
  themeState = newTheme
  listeners.forEach((listener) => listener())
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerSnapshot)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Initialize theme from localStorage on mount
    const savedTheme = localStorage.getItem("payroute-theme") as Theme | null
    if (savedTheme) {
      setThemeState(savedTheme)
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setThemeState("dark")
    }
    // This is intentional for hydration - mount state must be set after client-side initialization
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    localStorage.setItem("payroute-theme", theme)
  }, [theme, mounted])

  const toggleTheme = () => {
    setThemeState(theme === "light" ? "dark" : "light")
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

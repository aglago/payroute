"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface SidebarContextType {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextType | null>(null)

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

interface SidebarProviderProps {
  children: ReactNode
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [collapsed, setCollapsed] = useState(false)

  const toggle = () => setCollapsed((prev) => !prev)

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  )
}

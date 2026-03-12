"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button, Badge } from "@/components/ui"
import { useTheme } from "@/components/providers/ThemeProvider"
import { useSidebar } from "@/components/providers/SidebarProvider"
import {
  Activity,
  LayoutDashboard,
  Boxes,
  ScrollText,
  AlertTriangle,
  BookOpen,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react"

interface SidebarProps {
  onLogout?: () => void
  deadLetterCount?: number
  status?: "operational" | "degraded" | "down"
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: number
}

export function Sidebar({ onLogout, deadLetterCount = 0, status = "operational" }: SidebarProps) {
  const { collapsed, toggle } = useSidebar()
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: "Apps",
      href: "/apps",
      icon: <Boxes className="h-5 w-5" />,
    },
    {
      label: "Logs",
      href: "/logs",
      icon: <ScrollText className="h-5 w-5" />,
    },
    {
      label: "Dead Letter",
      href: "/dead-letter",
      icon: <AlertTriangle className="h-5 w-5" />,
      badge: deadLetterCount,
    },
    {
      label: "Documentation",
      href: "/docs",
      icon: <BookOpen className="h-5 w-5" />,
    },
  ]

  const statusColors = {
    operational: "bg-success",
    degraded: "bg-warning",
    down: "bg-destructive",
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">PayRoute</span>
                <span className="text-xs text-muted-foreground">Webhook Router</span>
              </div>
            )}
          </Link>
        </div>

        {/* Status indicator */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2 text-sm">
              <div className={cn("h-2 w-2 rounded-full", statusColors[status])} />
              <span className="text-muted-foreground">
                {status === "operational" ? "All systems operational" :
                 status === "degraded" ? "Some issues detected" : "System down"}
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <Badge variant="warning" className="h-5 min-w-5 px-1.5 text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
                {collapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-warning" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border p-3 space-y-1">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? `Switch to ${theme === "light" ? "dark" : "light"} mode` : undefined}
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            {!collapsed && <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={toggle}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            {!collapsed && <span>Collapse</span>}
          </button>

          {/* Logout */}
          {onLogout && (
            <button
              onClick={onLogout}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? "Sign out" : undefined}
            >
              <LogOut className="h-5 w-5" />
              {!collapsed && <span>Sign out</span>}
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

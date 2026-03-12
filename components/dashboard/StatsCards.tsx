"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { ArrowUpRight, ArrowDownRight, Activity, AlertTriangle, CheckCircle, Clock } from "lucide-react"

interface Stats {
  total: number
  success: number
  failed: number
  deadLetter: number
  avgProcessingTime: number
  trend?: number
}

interface StatsCardsProps {
  stats: Stats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : "0"

  const cards = [
    {
      title: "Total Webhooks",
      value: stats.total.toLocaleString(),
      icon: Activity,
      description: "Last 7 days",
      trend: stats.trend,
    },
    {
      title: "Success Rate",
      value: `${successRate}%`,
      icon: CheckCircle,
      description: `${stats.success.toLocaleString()} successful`,
      color: "text-success",
    },
    {
      title: "Failed",
      value: stats.failed.toLocaleString(),
      icon: AlertTriangle,
      description: "Forward failures",
      color: stats.failed > 0 ? "text-warning" : "text-muted-foreground",
    },
    {
      title: "Avg Processing",
      value: `${stats.avgProcessingTime}ms`,
      icon: Clock,
      description: "Average response time",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color || "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {card.trend !== undefined && (
                <>
                  {card.trend >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-success" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-destructive" />
                  )}
                  <span className={card.trend >= 0 ? "text-success" : "text-destructive"}>
                    {Math.abs(card.trend)}%
                  </span>
                </>
              )}
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

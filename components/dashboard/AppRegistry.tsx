"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Switch,
  Input,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
} from "@/components/ui"
import { ExternalLink, Settings, Plus, Trash2, Copy, Check, AlertCircle, Eye, EyeOff, Key, Pencil } from "lucide-react"

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
    lastWebhook?: string
  }
}

interface AppRegistryProps {
  apps: AppConfig[]
  onToggleApp?: (appId: string, enabled: boolean) => void
  onAddApp?: (app: Omit<AppConfig, "id" | "enabled" | "source"> & { appId: string }) => Promise<{ success: boolean; error?: string; routerSecret?: string }>
  onUpdateApp?: (appId: string, updates: { name?: string; webhookUrl?: string; prefixes?: string[]; description?: string }) => Promise<{ success: boolean; error?: string }>
  onDeleteApp?: (appId: string) => Promise<{ success: boolean; error?: string }>
  onRevealSecret?: (appId: string, adminKey: string) => Promise<string>
  onRefresh?: () => void
}

export function AppRegistry({ apps, onToggleApp, onAddApp, onUpdateApp, onDeleteApp, onRevealSecret, onRefresh }: AppRegistryProps) {
  const [expandedApp, setExpandedApp] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null)
  const [newAppSecret, setNewAppSecret] = useState<string | null>(null)

  // Secret reveal state
  const [revealingAppId, setRevealingAppId] = useState<string | null>(null)
  const [revealAdminKey, setRevealAdminKey] = useState("")
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({})
  const [revealError, setRevealError] = useState<string | null>(null)
  const [isRevealing, setIsRevealing] = useState(false)

  // Edit state
  const [editingApp, setEditingApp] = useState<AppConfig | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: "",
    webhookUrl: "",
    prefixes: "",
    description: "",
  })
  const [editError, setEditError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    appId: "",
    name: "",
    webhookUrl: "",
    prefixes: "",
    description: "",
  })

  const resetForm = () => {
    setFormData({
      appId: "",
      name: "",
      webhookUrl: "",
      prefixes: "",
      description: "",
    })
    setError(null)
    setNewAppSecret(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (!onAddApp) {
        throw new Error("Add app handler not configured")
      }

      const appId = formData.appId || formData.name.toLowerCase().replace(/[^a-z0-9]/g, "-")
      const result = await onAddApp({
        name: formData.name,
        webhookUrl: formData.webhookUrl,
        prefixes: formData.prefixes.split(",").map((p) => p.trim()).filter(Boolean),
        description: formData.description,
        appId,
      })

      if (result.success) {
        if (result.routerSecret) {
          setNewAppSecret(result.routerSecret)
        } else {
          setIsAddDialogOpen(false)
          resetForm()
          onRefresh?.()
        }
      } else {
        setError(result.error || "Failed to add app")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add app")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopySecret = async (secret: string) => {
    await navigator.clipboard.writeText(secret)
    setCopiedSecret(secret)
    setTimeout(() => setCopiedSecret(null), 2000)
  }

  const handleDelete = async (appId: string) => {
    if (!onDeleteApp) return
    if (!confirm(`Are you sure you want to delete the app "${appId}"? This cannot be undone.`)) return

    setIsLoading(true)
    const result = await onDeleteApp(appId)
    setIsLoading(false)

    if (result.success) {
      onRefresh?.()
    } else {
      alert(result.error || "Failed to delete app")
    }
  }

  const handleRevealSecret = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!revealingAppId || !onRevealSecret) return

    setIsRevealing(true)
    setRevealError(null)

    try {
      const secret = await onRevealSecret(revealingAppId, revealAdminKey)
      setRevealedSecrets((prev) => ({ ...prev, [revealingAppId]: secret }))
      setRevealingAppId(null)
      setRevealAdminKey("")
    } catch (err) {
      setRevealError(err instanceof Error ? err.message : "Failed to reveal secret")
    } finally {
      setIsRevealing(false)
    }
  }

  const hideSecret = (appId: string) => {
    setRevealedSecrets((prev) => {
      const next = { ...prev }
      delete next[appId]
      return next
    })
  }

  const openEditDialog = (app: AppConfig) => {
    setEditingApp(app)
    setEditFormData({
      name: app.name,
      webhookUrl: app.webhookUrl,
      prefixes: app.prefixes.join(", "),
      description: app.description || "",
    })
    setEditError(null)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingApp || !onUpdateApp) return

    setIsUpdating(true)
    setEditError(null)

    try {
      const result = await onUpdateApp(editingApp.id, {
        name: editFormData.name,
        webhookUrl: editFormData.webhookUrl,
        prefixes: editFormData.prefixes.split(",").map((p) => p.trim()).filter(Boolean),
        description: editFormData.description,
      })

      if (result.success) {
        setEditingApp(null)
        onRefresh?.()
      } else {
        setEditError(result.error || "Failed to update app")
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update app")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>App Registry</CardTitle>
              <CardDescription>Registered destination apps for webhook routing</CardDescription>
            </div>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => {
                resetForm()
                setIsAddDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Add App
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {apps.map((app) => (
            <div
              key={app.id}
              className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      app.enabled ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    <span className="text-lg font-bold text-primary">
                      {app.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{app.name}</h3>
                      <Badge variant={app.enabled ? "success" : "secondary"}>
                        {app.enabled ? "Active" : "Disabled"}
                      </Badge>
                      {app.source === "env" && (
                        <Badge variant="outline" className="text-xs">ENV</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate max-w-md">
                      {app.webhookUrl}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {app.source !== "env" && (
                    <Switch
                      checked={app.enabled}
                      onCheckedChange={(checked) => onToggleApp?.(app.id, checked)}
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  {app.source !== "env" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(app.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Prefix tags */}
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-muted-foreground">Prefixes:</span>
                {app.prefixes.length > 0 ? (
                  app.prefixes.map((prefix) => (
                    <Badge key={prefix} variant="outline" className="text-xs">
                      {prefix}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">None configured</span>
                )}
              </div>

              {/* Stats row */}
              {app.stats && (
                <div className="flex items-center gap-6 mt-3 pt-3 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-sm font-medium">{app.stats.total.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Success</p>
                    <p className="text-sm font-medium text-success">
                      {app.stats.success.toLocaleString()}
                    </p>
                  </div>
                  {app.stats.lastWebhook && (
                    <div>
                      <p className="text-xs text-muted-foreground">Last Webhook</p>
                      <p className="text-sm font-medium">{app.stats.lastWebhook}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Expanded settings */}
              {expandedApp === app.id && (
                <div className="mt-4 pt-4 border-t border-border space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Webhook URL</Label>
                    <div className="flex gap-2 mt-1">
                      <Input value={app.webhookUrl} readOnly className="font-mono text-sm" />
                      <a
                        href={app.webhookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Reference Prefixes</Label>
                    <Input
                      value={app.prefixes.join(", ")}
                      readOnly
                      placeholder="No prefixes configured"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Comma-separated prefixes for reference-based routing
                    </p>
                  </div>
                  {app.source !== "env" && onRevealSecret && (
                    <div>
                      <Label className="text-sm font-medium">Router Secret</Label>
                      {revealedSecrets[app.id] ? (
                        <div className="flex gap-2 mt-1">
                          <Input
                            value={revealedSecrets[app.id]}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleCopySecret(revealedSecrets[app.id])}
                            title="Copy secret"
                          >
                            {copiedSecret === revealedSecrets[app.id] ? (
                              <Check className="h-4 w-4 text-success" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => hideSecret(app.id)}
                            title="Hide secret"
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 mt-1">
                          <Input
                            value="••••••••••••••••••••••••••••••••"
                            readOnly
                            className="font-mono text-sm text-muted-foreground"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setRevealingAppId(app.id)
                              setRevealError(null)
                              setRevealAdminKey("")
                            }}
                            title="View secret"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Your app should verify this in the X-Router-Secret header.
                      </p>
                    </div>
                  )}
                  {app.source === "env" ? (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        This app is configured via environment variables and cannot be modified here.
                      </p>
                    </div>
                  ) : onUpdateApp && (
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => openEditDialog(app)}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit App
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {apps.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No apps registered yet</p>
              <Button
                variant="outline"
                className="mt-2 gap-2"
                onClick={() => {
                  resetForm()
                  setIsAddDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4" />
                Add Your First App
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add App Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          {newAppSecret ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-success">
                  <Check className="h-5 w-5" />
                  App Created Successfully
                </DialogTitle>
                <DialogDescription>
                  Save this router secret - it won&apos;t be shown again.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Router Secret</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={newAppSecret}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopySecret(newAppSecret)}
                    >
                      {copiedSecret === newAppSecret ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your app should verify this secret in the X-Router-Secret header.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setIsAddDialogOpen(false)
                    resetForm()
                    onRefresh?.()
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add New App</DialogTitle>
                <DialogDescription>
                  Register a new destination app for webhook routing.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}
                <div>
                  <Label htmlFor="name">App Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My App"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="appId">App ID</Label>
                  <Input
                    id="appId"
                    value={formData.appId || formData.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}
                    onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                    placeholder="my-app"
                    className="mt-1 font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Used in metadata.app for routing. Auto-generated from name.
                  </p>
                </div>
                <div>
                  <Label htmlFor="webhookUrl">Webhook URL *</Label>
                  <Input
                    id="webhookUrl"
                    type="url"
                    value={formData.webhookUrl}
                    onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    placeholder="https://myapp.com/api/webhooks/paystack"
                    required
                    className="mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="prefixes">Reference Prefixes</Label>
                  <Input
                    id="prefixes"
                    value={formData.prefixes}
                    onChange={(e) => setFormData({ ...formData, prefixes: e.target.value })}
                    placeholder="MYAPP-, MA-"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Comma-separated prefixes for fallback routing.
                  </p>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this app"
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create App"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Reveal Secret Dialog */}
      <Dialog open={!!revealingAppId} onOpenChange={(open) => !open && setRevealingAppId(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleRevealSecret}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                View Router Secret
              </DialogTitle>
              <DialogDescription>
                Enter your admin API key to view the router secret for this app.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {revealError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{revealError}</p>
                </div>
              )}
              <div>
                <Label htmlFor="revealAdminKey">Admin API Key</Label>
                <Input
                  id="revealAdminKey"
                  type="password"
                  value={revealAdminKey}
                  onChange={(e) => setRevealAdminKey(e.target.value)}
                  placeholder="Enter your ADMIN_API_KEY"
                  required
                  className="mt-1"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRevealingAppId(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isRevealing || !revealAdminKey}>
                {isRevealing ? "Verifying..." : "View Secret"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit App Dialog */}
      <Dialog open={!!editingApp} onOpenChange={(open) => !open && setEditingApp(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Edit App
              </DialogTitle>
              <DialogDescription>
                Update the configuration for {editingApp?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {editError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{editError}</p>
                </div>
              )}
              <div>
                <Label htmlFor="editName">App Name *</Label>
                <Input
                  id="editName"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="My App"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="editWebhookUrl">Webhook URL *</Label>
                <Input
                  id="editWebhookUrl"
                  type="url"
                  value={editFormData.webhookUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, webhookUrl: e.target.value })}
                  placeholder="https://myapp.com/api/webhooks/paystack"
                  required
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label htmlFor="editPrefixes">Reference Prefixes</Label>
                <Input
                  id="editPrefixes"
                  value={editFormData.prefixes}
                  onChange={(e) => setEditFormData({ ...editFormData, prefixes: e.target.value })}
                  placeholder="MYAPP-, MA-"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated prefixes for fallback routing.
                </p>
              </div>
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Input
                  id="editDescription"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Brief description of this app"
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingApp(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

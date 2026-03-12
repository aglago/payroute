"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@/components/ui"
import { ExternalLink, Copy, Check, ChevronDown, ChevronRight } from "lucide-react"

interface SectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-border rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <h3 className="font-semibold">{title}</h3>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4 pt-0">{children}</div>}
    </div>
  )
}

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm font-mono">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-4 w-4 text-success" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}

export function Documentation() {
  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>PayRoute Documentation</CardTitle>
          <CardDescription>
            A lightweight webhook router for Paystack. Route webhooks to multiple apps with one URL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm">
            <pre className="text-center text-muted-foreground">
{`┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Paystack  │────▶│   PayRoute   │────▶│  Your Apps  │
│  (webhooks) │     │  (router)    │     │             │
└─────────────┘     └──────────────┘     └─────────────┘`}
            </pre>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>One webhook URL</Badge>
            <Badge>Automatic routing</Badge>
            <Badge>Dead letter queue</Badge>
            <Badge>Full logging</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Quick Start */}
      <Section title="Quick Start" defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">1. Clone and Install</h4>
            <CodeBlock code={`git clone <your-repo-url>
cd payroute
npm install
cp .env.example .env.local`} />
          </div>

          <div>
            <h4 className="font-medium mb-2">2. Configure Environment Variables</h4>
            <CodeBlock code={`# Supabase (for logging)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Paystack secret for signature verification
PAYSTACK_SECRET_KEY=sk_live_xxxxx

# Admin API key (for dashboard access)
ADMIN_API_KEY=your-admin-key`} />
          </div>

          <div>
            <h4 className="font-medium mb-2">2b. Generate Admin API Key</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Generate a secure random key to protect your dashboard:
            </p>
            <CodeBlock code={`# Using openssl
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`} />
            <p className="text-sm text-muted-foreground mt-2">
              Use this key as your <code className="bg-muted px-1 rounded">ADMIN_API_KEY</code> and to log into the dashboard.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">3. Run the Database Migrations</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Run the SQL files in your Supabase project:
            </p>
            <CodeBlock code={`supabase/migrations/001_create_webhook_logs.sql
supabase/migrations/002_create_dead_letter_queue.sql
supabase/migrations/003_create_app_configs.sql`} />
          </div>

          <div>
            <h4 className="font-medium mb-2">4. Start Development Server</h4>
            <CodeBlock code="npm run dev" />
          </div>

          <div>
            <h4 className="font-medium mb-2">5. Update Paystack Webhook URL</h4>
            <p className="text-sm text-muted-foreground">
              In your Paystack dashboard, set your webhook URL to:
            </p>
            <CodeBlock code="https://your-payroute-domain.vercel.app/api/webhook" />
          </div>
        </div>
      </Section>

      {/* Routing Strategies */}
      <Section title="How Routing Works">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              Strategy 1: Metadata Routing
              <Badge variant="success">Recommended</Badge>
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Include the app name in the payment metadata:
            </p>
            <CodeBlock language="javascript" code={`const response = await paystack.transaction.initialize({
  email: "customer@example.com",
  amount: 5000,
  metadata: {
    app: "myapp",  // ← PayRoute uses this to route
    orderId: "12345"
  }
});`} />
          </div>

          <div>
            <h4 className="font-medium mb-2">Strategy 2: Prefix Routing (Fallback)</h4>
            <p className="text-sm text-muted-foreground mb-2">
              If no <code className="bg-muted px-1 rounded">metadata.app</code> is provided,
              PayRoute checks the payment reference for known prefixes.
            </p>
            <CodeBlock language="javascript" code={`// Your app generates references with a prefix
const reference = \`MYAPP-\${Date.now()}\`;  // Routes to myapp`} />
          </div>

          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <h4 className="font-medium text-warning mb-1">What if neither matches?</h4>
            <p className="text-sm text-muted-foreground">
              The webhook goes to the <strong>dead letter queue</strong> where you can review it manually,
              forward it to the correct app, or mark it as resolved.
            </p>
          </div>
        </div>
      </Section>

      {/* API Reference */}
      <Section title="API Reference">
        <div className="space-y-6">
          {/* POST /api/webhook */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">POST</Badge>
              <code className="font-mono text-sm">/api/webhook</code>
            </div>
            <p className="text-sm text-muted-foreground">
              Main webhook endpoint. Receives webhooks from Paystack and routes them to the correct app.
              Always returns 200 to prevent Paystack retries.
            </p>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Request Headers:</p>
              <CodeBlock code={`x-paystack-signature: <HMAC-SHA512 signature>
Content-Type: application/json`} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Request Body (from Paystack):</p>
              <CodeBlock code={`{
  "event": "charge.success",
  "data": {
    "reference": "MYAPP-1234567890",
    "amount": 50000,
    "currency": "NGN",
    "metadata": {
      "app": "myapp",
      "orderId": "ORD-123"
    }
  }
}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Response:</p>
              <CodeBlock code={`{
  "success": true,
  "message": "Webhook forwarded",
  "app": "myapp",
  "strategy": "metadata"
}`} />
            </div>
          </div>

          {/* GET /api/health */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">GET</Badge>
              <code className="font-mono text-sm">/api/health</code>
            </div>
            <p className="text-sm text-muted-foreground">
              Health check endpoint. Returns service status and list of registered apps.
            </p>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Response:</p>
              <CodeBlock code={`{
  "status": "healthy",
  "service": "payroute",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "apps": [
    {
      "id": "myapp",
      "name": "My App",
      "enabled": true,
      "prefixes": ["MYAPP-", "MA-"]
    }
  ]
}`} />
            </div>
          </div>

          {/* GET /api/admin/stats */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">GET</Badge>
              <code className="font-mono text-sm">/api/admin/stats</code>
            </div>
            <p className="text-sm text-muted-foreground">
              Get routing statistics. Requires authentication.
            </p>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Request:</p>
              <CodeBlock code={`GET /api/admin/stats?days=7
x-admin-key: your-admin-key`} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Response:</p>
              <CodeBlock code={`{
  "success": true,
  "period": "7 days",
  "stats": {
    "total": 1250,
    "byApp": {
      "myapp": 800,
      "otherapp": 450
    },
    "byStrategy": {
      "metadata": 1000,
      "prefix": 250
    },
    "byStatus": {
      "success": 1200,
      "failed": 50
    },
    "avgProcessingTime": 45,
    "deadLetterCount": 3
  }
}`} />
            </div>
          </div>

          {/* GET /api/admin/logs */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">GET</Badge>
              <code className="font-mono text-sm">/api/admin/logs</code>
            </div>
            <p className="text-sm text-muted-foreground">
              Query webhook logs with filters.
            </p>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Request:</p>
              <CodeBlock code={`GET /api/admin/logs?app=myapp&status=success&limit=10
x-admin-key: your-admin-key`} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Response:</p>
              <CodeBlock code={`{
  "success": true,
  "count": 10,
  "logs": [
    {
      "id": "uuid-here",
      "reference": "MYAPP-1234567890",
      "destination_app": "myapp",
      "routing_strategy": "prefix",
      "forward_status": "success",
      "forward_response_status": 200,
      "processing_time_ms": 42,
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}`} />
            </div>
          </div>

          {/* /api/admin/apps */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">GET</Badge>
              <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">POST</Badge>
              <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">PATCH</Badge>
              <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">DELETE</Badge>
              <code className="font-mono text-sm">/api/admin/apps</code>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage registered apps. Create, update, delete, or list apps.
            </p>

            <div className="pt-2 border-t border-border">
              <p className="text-xs font-medium mb-1">POST - Create App:</p>
              <CodeBlock code={`POST /api/admin/apps
x-admin-key: your-admin-key
Content-Type: application/json

{
  "name": "My App",
  "webhookUrl": "https://myapp.com/api/webhooks",
  "prefixes": ["MYAPP-", "MA-"],
  "description": "My application"
}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Response (save the routerSecret!):</p>
              <CodeBlock code={`{
  "success": true,
  "app": {
    "id": "my-app",
    "name": "My App",
    "webhookUrl": "https://myapp.com/api/webhooks",
    "prefixes": ["MYAPP-", "MA-"],
    "enabled": true,
    "source": "database"
  },
  "routerSecret": "a1b2c3d4e5f6..."
}`} />
              <p className="text-xs text-warning mt-1">
                The routerSecret is only shown once. Save it immediately!
              </p>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs font-medium mb-1">PATCH - Toggle App:</p>
              <CodeBlock code={`PATCH /api/admin/apps
x-admin-key: your-admin-key
Content-Type: application/json

{
  "appId": "my-app",
  "enabled": false
}`} />
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs font-medium mb-1">DELETE - Remove App:</p>
              <CodeBlock code={`DELETE /api/admin/apps?appId=my-app
x-admin-key: your-admin-key`} />
            </div>
          </div>

          {/* /api/admin/dead-letter */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">GET</Badge>
              <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">PATCH</Badge>
              <code className="font-mono text-sm">/api/admin/dead-letter</code>
            </div>
            <p className="text-sm text-muted-foreground">
              List and manage dead letter entries (unroutable webhooks).
            </p>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">GET Response:</p>
              <CodeBlock code={`{
  "success": true,
  "count": 2,
  "entries": [
    {
      "id": "uuid-here",
      "reference": "UNKNOWN-123",
      "reason": "No matching app found",
      "reviewed": false,
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">PATCH - Mark as reviewed:</p>
              <CodeBlock code={`PATCH /api/admin/dead-letter
x-admin-key: your-admin-key
Content-Type: application/json

{
  "id": "uuid-here",
  "reviewedBy": "admin@example.com",
  "resolution": "forwarded",
  "resolutionNotes": "Manually forwarded to myapp"
}`} />
            </div>
          </div>
        </div>
      </Section>

      {/* Receiving Webhooks */}
      <Section title="Receiving Webhooks in Your App">
        <div className="space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h4 className="font-medium text-primary mb-2">How X-PayRoute-Signature Works</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>When you add an app in PayRoute, a <strong>unique secret is auto-generated</strong></li>
              <li>This secret is shown to you <strong>only once</strong> - save it immediately</li>
              <li>Configure your app with this secret (e.g., <code className="bg-muted px-1 rounded">PAYROUTE_SECRET</code>)</li>
              <li>PayRoute signs each request body using HMAC-SHA512 with your secret</li>
              <li>Your app verifies the <code className="bg-muted px-1 rounded">X-PayRoute-Signature</code> header</li>
            </ol>
          </div>

          <p className="text-sm text-muted-foreground">
            When PayRoute forwards a webhook to your app, it includes these headers:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium">Header</th>
                  <th className="text-left py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-2 font-mono text-xs">X-PayRoute-Signature</td>
                  <td className="py-2 text-muted-foreground">HMAC-SHA512 signature of the body using your secret (verify this!)</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 font-mono text-xs">X-Original-Signature</td>
                  <td className="py-2 text-muted-foreground">Original Paystack signature</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 font-mono text-xs">X-Routed-By</td>
                  <td className="py-2 text-muted-foreground">Always &quot;payroute&quot;</td>
                </tr>
                <tr>
                  <td className="py-2 font-mono text-xs">X-Routed-At</td>
                  <td className="py-2 text-muted-foreground">ISO timestamp of routing</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-medium mb-2">Example Handler (Next.js)</h4>
            <CodeBlock language="typescript" code={`// app/api/webhooks/paystack/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function verifyPayRouteSignature(body: string, signature: string): boolean {
  const secret = process.env.PAYROUTE_SECRET;
  if (!secret) return false;
  const hash = crypto.createHmac("sha512", secret).update(body).digest("hex");
  return hash === signature;
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  // Step 1: Verify the request is from PayRoute (HMAC signature)
  const signature = request.headers.get("x-payroute-signature");
  if (!signature || !verifyPayRouteSignature(body, signature)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Step 2: Parse the webhook payload
  const payload = JSON.parse(body);
  const { event, data } = payload;

  // Step 3: Handle different event types
  switch (event) {
    case "charge.success":
      await handleSuccessfulPayment(data);
      break;
    case "charge.failed":
      await handleFailedPayment(data);
      break;
  }

  return NextResponse.json({ success: true });
}`} />
          </div>

          <div>
            <h4 className="font-medium mb-2">Example Handler (Express.js)</h4>
            <CodeBlock language="javascript" code={`// routes/webhooks.js
const crypto = require("crypto");

function verifyPayRouteSignature(body, signature) {
  const secret = process.env.PAYROUTE_SECRET;
  if (!secret) return false;
  const hash = crypto.createHmac("sha512", secret).update(body).digest("hex");
  return hash === signature;
}

// Use express.raw() middleware for this route
app.post("/api/webhooks/paystack", express.raw({ type: "*/*" }), (req, res) => {
  const body = req.body.toString();
  const signature = req.headers["x-payroute-signature"];

  if (!signature || !verifyPayRouteSignature(body, signature)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { event, data } = JSON.parse(body);

  if (event === "charge.success") {
    // Process successful payment
  }

  res.json({ success: true });
});`} />
          </div>
        </div>
      </Section>

      {/* Security */}
      <Section title="Security">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Signature Verification</h4>
            <p className="text-sm text-muted-foreground">
              PayRoute uses HMAC-SHA512 signatures at every step:
            </p>
            <ol className="text-sm text-muted-foreground mt-2 list-decimal list-inside space-y-1">
              <li>Paystack signs the request with your secret key</li>
              <li>PayRoute verifies using <code className="bg-muted px-1 rounded">PAYSTACK_SECRET_KEY</code></li>
              <li>PayRoute re-signs the body with your app&apos;s <code className="bg-muted px-1 rounded">routerSecret</code></li>
              <li>Your app verifies <code className="bg-muted px-1 rounded">X-PayRoute-Signature</code> using the same HMAC algorithm</li>
            </ol>
            <p className="text-sm text-muted-foreground mt-2">
              This ensures the secret is never transmitted - only the signature is sent.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">IP Validation (Optional)</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Enable IP validation to only accept webhooks from Paystack IPs:
            </p>
            <CodeBlock code="VALIDATE_PAYSTACK_IP=true" />
            <p className="text-sm text-muted-foreground mt-2">
              Known Paystack IPs: <code className="bg-muted px-1 rounded">52.31.139.75</code>,{" "}
              <code className="bg-muted px-1 rounded">52.49.173.169</code>,{" "}
              <code className="bg-muted px-1 rounded">52.214.14.220</code>
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Admin API Protection</h4>
            <p className="text-sm text-muted-foreground mb-2">
              All <code className="bg-muted px-1 rounded">/api/admin/*</code> endpoints require authentication:
            </p>
            <CodeBlock code={`curl -H "x-admin-key: your-admin-key" \\
  https://your-payroute.vercel.app/api/admin/stats`} />
          </div>
        </div>
      </Section>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border">
        <p>PayRoute v1.0.0 - A lightweight webhook router for Paystack</p>
        <div className="mt-2 flex items-center justify-center gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            GitHub
          </a>
          <a
            href="/api/health"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            API Health
          </a>
        </div>
      </div>
    </div>
  )
}

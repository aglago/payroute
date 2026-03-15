# PayRoute Documentation

## What is PayRoute?

PayRoute is a **webhook router** for Paystack. It receives payment webhooks from Paystack and forwards them to the correct destination app based on routing rules.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Paystack  │────▶│   PayRoute   │────▶│  Your Apps  │
│  (webhooks) │     │  (router)    │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
```

### Why Use PayRoute?

- **One webhook URL** for multiple apps sharing a Paystack account
- **Automatic routing** based on payment metadata or reference prefix
- **Dead letter queue** for webhooks that can't be routed
- **Full logging** of all webhook activity
- **Dashboard** to monitor and manage routing

---

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd payroute
npm install
cp .env.example .env.local
```

### 2. Configure Environment Variables

Edit `.env.local`:

```env
# Supabase (for logging)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Paystack secret for signature verification
PAYSTACK_SECRET_KEY=sk_live_xxxxx

# Admin API key (for dashboard access)
ADMIN_API_KEY=your-admin-key
```

### 3. Generate Admin API Key

The admin key protects your dashboard and admin APIs. Generate a secure random key:

```bash
# Using openssl
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and set it as your `ADMIN_API_KEY`. You'll use this same key to log into the dashboard.

### 4. Run the Database Migrations

Run the SQL files in your Supabase project:

```
supabase/migrations/001_create_webhook_logs.sql
supabase/migrations/002_create_dead_letter_queue.sql
supabase/migrations/003_create_app_configs.sql
```

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the dashboard.

### 6. Deploy to Vercel

```bash
vercel deploy
```

### 7. Update Paystack Webhook URL

In your Paystack dashboard, set your webhook URL to:

```
https://your-payroute-domain.vercel.app/api/webhook
```

---

## How Routing Works

PayRoute uses two strategies to determine where to send a webhook:

### Strategy 1: Metadata Routing (Recommended)

When creating a payment, include the app name in metadata:

```javascript
const response = await paystack.transaction.initialize({
  email: "customer@example.com",
  amount: 5000,
  metadata: {
    app: "myapp",  // ← PayRoute uses this to route
    orderId: "12345"
  }
});
```

### Strategy 2: Prefix Routing (Fallback)

If no `metadata.app` is provided, PayRoute checks the payment reference for known prefixes:

```javascript
// Your app generates references with a prefix
const reference = `MYAPP-${Date.now()}`;  // Routes to myapp
```

### What If Neither Matches?

The webhook goes to the **dead letter queue** where you can:
- Review it manually
- Forward it to the correct app
- Mark it as resolved

---

## API Reference

### POST /api/webhook

The main webhook endpoint. Receives webhooks from Paystack and routes them to the correct app. Always returns 200 to prevent Paystack retries.

**Request Headers:**
```
x-paystack-signature: <HMAC-SHA512 signature>
Content-Type: application/json
```

**Request Body (from Paystack):**
```json
{
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
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook forwarded",
  "app": "myapp",
  "strategy": "metadata"
}
```

---

### GET /api/health

Health check endpoint. Returns service status and list of registered apps.

**Response:**
```json
{
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
}
```

---

### GET /api/admin/stats

Get routing statistics.

**Request:**
```
GET /api/admin/stats?days=7
x-admin-key: your-admin-key
```

**Response:**
```json
{
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
}
```

---

### GET /api/admin/logs

Query webhook logs with filters.

**Request:**
```
GET /api/admin/logs?app=myapp&status=success&limit=10
x-admin-key: your-admin-key
```

**Query Parameters:**
- `app` - Filter by destination app
- `status` - Filter by forward status (success, failed, dead_letter)
- `reference` - Filter by payment reference
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset

**Response:**
```json
{
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
}
```

---

### GET /api/admin/logs/[id]

Get a specific webhook log by ID.

**Request:**
```
GET /api/admin/logs/uuid-here
x-admin-key: your-admin-key
```

---

### DELETE /api/admin/logs

Delete old logs.

**Request:**
```
DELETE /api/admin/logs?days=30
x-admin-key: your-admin-key
```

---

### /api/admin/apps

Manage registered apps. Supports GET, POST, PATCH, DELETE.

**GET - List Apps:**
```
GET /api/admin/apps
x-admin-key: your-admin-key
```

**POST - Create App:**
```
POST /api/admin/apps
x-admin-key: your-admin-key
Content-Type: application/json

{
  "name": "My App",
  "webhookUrl": "https://myapp.com/api/webhooks",
  "prefixes": ["MYAPP-", "MA-"],
  "description": "My application"
}
```

**Response (save the routerSecret!):**
```json
{
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
}
```

> **Important:** The `routerSecret` is only shown once. Save it immediately!

**PATCH - Toggle App:**
```
PATCH /api/admin/apps
x-admin-key: your-admin-key
Content-Type: application/json

{
  "appId": "my-app",
  "enabled": false
}
```

**DELETE - Remove App:**
```
DELETE /api/admin/apps?appId=my-app
x-admin-key: your-admin-key
```

---

### POST /api/admin/apps/secret

Regenerate the router secret for an app.

**Request:**
```
POST /api/admin/apps/secret
x-admin-key: your-admin-key
Content-Type: application/json

{
  "appId": "my-app"
}
```

**Response:**
```json
{
  "success": true,
  "routerSecret": "new-secret-here..."
}
```

---

### /api/admin/dead-letter

List and manage dead letter entries (unroutable webhooks).

**GET - List Entries:**
```
GET /api/admin/dead-letter?reviewed=false&limit=50
x-admin-key: your-admin-key
```

**Response:**
```json
{
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
}
```

**PATCH - Mark as Reviewed:**
```
PATCH /api/admin/dead-letter
x-admin-key: your-admin-key
Content-Type: application/json

{
  "id": "uuid-here",
  "reviewedBy": "admin@example.com",
  "resolution": "forwarded",
  "resolutionNotes": "Manually forwarded to myapp"
}
```

---

### POST /api/admin/forward

Manually forward a dead letter webhook to an app.

**Request:**
```
POST /api/admin/forward
x-admin-key: your-admin-key
Content-Type: application/json

{
  "deadLetterId": "uuid-here",
  "targetAppId": "myapp"
}
```

---

### POST /api/admin/retry

Retry a failed webhook.

**Request:**
```
POST /api/admin/retry
x-admin-key: your-admin-key
Content-Type: application/json

{
  "logId": "uuid-here"
}
```

---

## Receiving Webhooks in Your App

### How X-PayRoute-Signature Works

1. When you add an app in PayRoute, a **unique secret is auto-generated**
2. This secret is shown to you **only once** - save it immediately
3. Configure your app with this secret (e.g., `PAYROUTE_SECRET`)
4. PayRoute signs each request body using HMAC-SHA512 with your secret
5. Your app verifies the `X-PayRoute-Signature` header

### Headers Included in Forwarded Webhooks

| Header | Description |
|--------|-------------|
| `X-PayRoute-Signature` | HMAC-SHA512 signature of the body using your secret (verify this!) |
| `X-Original-Signature` | Original Paystack signature |
| `X-Routed-By` | Always "payroute" |
| `X-Routed-At` | ISO timestamp of routing |

### Example Handler (Next.js)

```typescript
// app/api/webhooks/paystack/route.ts
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
}
```

### Example Handler (Express.js)

```javascript
// routes/webhooks.js
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
});
```

---

## Adding a New App

### Via Dashboard (Recommended)

1. Go to the **Apps** tab in the dashboard
2. Click **Add App**
3. Fill in the details:
   - **App Name**: Display name for your app
   - **Webhook URL**: Your app's webhook endpoint
   - **Prefixes**: Comma-separated reference prefixes (optional)
4. Click **Create App**
5. **Important**: Copy the generated `routerSecret` - it's shown only once!
6. Configure your app with this secret as `PAYROUTE_SECRET`

### Via API

```bash
curl -X POST https://your-payroute.vercel.app/api/admin/apps \
  -H "x-admin-key: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App",
    "webhookUrl": "https://myapp.com/api/webhooks/paystack",
    "prefixes": ["MYAPP-", "MA-"]
  }'
```

Response includes the auto-generated `routerSecret`:

```json
{
  "success": true,
  "app": { "id": "my-app", "name": "My App", ... },
  "routerSecret": "a1b2c3d4e5f6..."
}
```

---

## Security

### Signature Verification

PayRoute uses HMAC-SHA512 signatures at every step:

1. Paystack signs the request with your secret key
2. PayRoute verifies using `PAYSTACK_SECRET_KEY`
3. PayRoute re-signs the body with your app's `routerSecret`
4. Your app verifies `X-PayRoute-Signature` using the same HMAC algorithm

This ensures the secret is never transmitted - only the signature is sent.

### IP Validation (Optional)

Enable IP validation to only accept webhooks from Paystack IPs:

```env
VALIDATE_PAYSTACK_IP=true
```

Known Paystack IPs:
- `52.31.139.75`
- `52.49.173.169`
- `52.214.14.220`

### Admin API Protection

All `/api/admin/*` endpoints require authentication:

```bash
curl -H "x-admin-key: your-admin-key" \
  https://your-payroute.vercel.app/api/admin/stats
```

---

## Database Schema

### webhook_logs

Stores all processed webhooks.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `source` | VARCHAR | Always "paystack" |
| `endpoint` | VARCHAR | "/api/webhook" |
| `payload` | JSONB | Full webhook payload |
| `destination_app` | VARCHAR | Target app ID |
| `routing_strategy` | VARCHAR | "metadata", "prefix", or "none" |
| `reference` | VARCHAR | Payment reference |
| `forward_status` | VARCHAR | "success", "failed", "dead_letter" |
| `forward_response_status` | INT | HTTP status from destination |
| `processing_time_ms` | INT | Total processing time |
| `trace_logs` | JSONB | Console output during processing |
| `created_at` | TIMESTAMPTZ | When received |

### dead_letter_webhooks

Stores unroutable webhooks.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `payload` | JSONB | Full webhook payload |
| `reference` | VARCHAR | Payment reference |
| `reason` | VARCHAR | Why routing failed |
| `reviewed` | BOOLEAN | Has been reviewed? |
| `resolution` | VARCHAR | How it was resolved |
| `created_at` | TIMESTAMPTZ | When received |

### app_configs

Stores registered apps (database-managed).

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR | App ID (slug) |
| `name` | VARCHAR | Display name |
| `webhook_url` | VARCHAR | Destination URL |
| `router_secret` | VARCHAR | HMAC signing secret |
| `prefixes` | TEXT[] | Reference prefixes |
| `enabled` | BOOLEAN | Is app active? |
| `description` | VARCHAR | Optional description |
| `created_at` | TIMESTAMPTZ | When created |
| `updated_at` | TIMESTAMPTZ | Last updated |

---

## Project Structure

```
payroute/
├── app/
│   ├── (dashboard)/          # Dashboard pages
│   │   ├── page.tsx          # Main dashboard
│   │   ├── apps/             # App management
│   │   ├── logs/             # Webhook logs
│   │   ├── dead-letter/      # Dead letter queue
│   │   └── docs/             # Documentation
│   └── api/
│       ├── webhook/          # Main webhook endpoint
│       ├── health/           # Health check
│       ├── auth/             # Authentication
│       └── admin/            # Admin APIs
│           ├── apps/         # App management
│           ├── logs/         # Log queries
│           ├── stats/        # Statistics
│           ├── dead-letter/  # Dead letter management
│           ├── forward/      # Manual forwarding
│           └── retry/        # Retry failed webhooks
├── components/
│   ├── ui/                   # Reusable UI components
│   ├── dashboard/            # Dashboard components
│   └── providers/            # Context providers
├── lib/
│   ├── config.ts             # App registry configuration
│   ├── router.ts             # Routing logic
│   ├── security.ts           # Signature verification
│   ├── WebhookLogger.ts      # Database logging
│   ├── TraceLogger.ts        # Request tracing
│   ├── dead-letter.ts        # Dead letter queue
│   ├── app-store.ts          # App CRUD operations
│   ├── supabase.ts           # Database client
│   ├── types.ts              # TypeScript types
│   └── utils.ts              # Utility functions
└── supabase/
    └── migrations/           # Database schema
```

---

## Troubleshooting

### Webhook Not Being Routed

1. Check if `metadata.app` matches an app ID in the registry
2. Check if the reference prefix matches any configured prefixes
3. Look in the dead letter queue for the webhook

### Forward Failing

1. Check the destination app's URL is correct
2. Verify the destination app is running
3. Check the logs for the error message

### Signature Verification Failing

1. Ensure you saved the `routerSecret` when creating the app
2. Verify you're using HMAC-SHA512 (not SHA256)
3. Make sure you're hashing the raw body string, not parsed JSON

### Dashboard Shows No Data

1. Ensure `ADMIN_API_KEY` is set
2. Check Supabase connection
3. Verify the database tables exist

---

## Support

For issues or questions:
1. Check this documentation
2. Review the logs in the dashboard
3. Check the dead letter queue
4. Open an issue on GitHub

---

*PayRoute v1.0.0 - A lightweight webhook router for Paystack*

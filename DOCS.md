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

### 1. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd payroute

# Install dependencies
npm install

# Copy environment variables
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
# Generate using: openssl rand -hex 32
ADMIN_API_KEY=your-admin-key
```

### Generating an Admin API Key

The admin key protects your dashboard and admin APIs. Generate a secure random key:

```bash
# Using openssl
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and set it as your `ADMIN_API_KEY`. You'll use this same key to log into the dashboard.

### 3. Set Up Database

Run the migrations on your Supabase project:

```sql
-- Copy contents from:
-- supabase/migrations/001_create_webhook_logs.sql
-- supabase/migrations/002_create_dead_letter_queue.sql
```

### 4. Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000` to see the dashboard.

### 5. Deploy to Vercel

```bash
vercel deploy
```

### 6. Update Paystack Webhook URL

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
// In your app's payment initialization
const response = await paystack.transaction.initialize({
  email: "customer@example.com",
  amount: 5000,
  metadata: {
    app: "iselldata",  // ← PayRoute uses this to route
    orderId: "12345"
  }
});
```

### Strategy 2: Prefix Routing (Fallback)

If no `metadata.app` is provided, PayRoute checks the payment reference for known prefixes:

| Prefix | Routes To |
|--------|-----------|
| `GD`, `AR`, `WT` | iSellData |
| `RENT-`, `SALE-`, `BP-` | BookPlug |

```javascript
// Your app generates references with a prefix
const reference = `GD${Date.now()}`; // Routes to iSellData
```

### What If Neither Matches?

The webhook goes to the **dead letter queue** where you can:
- Review it manually
- Forward it to the correct app
- Mark it as resolved

---

## API Reference

### POST /api/webhook

The main webhook endpoint. Receives webhooks from Paystack.

**Headers:**
- `x-paystack-signature` - HMAC signature from Paystack
- `Content-Type: application/json`

**Response:**
```json
{
  "success": true,
  "message": "Webhook forwarded",
  "app": "iselldata"
}
```

> PayRoute always returns 200 to Paystack to prevent retries.

---

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "payroute",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "apps": [
    {
      "id": "iselldata",
      "name": "iSellData",
      "enabled": true,
      "prefixes": ["GD", "AR", "WT"]
    }
  ]
}
```

---

### GET /api/admin/stats

Get routing statistics.

**Headers:**
- `x-admin-key: your-admin-key`

**Query Parameters:**
- `days` - Number of days (default: 7)

**Response:**
```json
{
  "success": true,
  "period": "7 days",
  "stats": {
    "total": 1250,
    "byApp": {
      "iselldata": 800,
      "bookplug": 450
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

Query webhook logs.

**Headers:**
- `x-admin-key: your-admin-key`

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
      "id": "uuid",
      "reference": "GD1234567890",
      "destination_app": "iselldata",
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

### DELETE /api/admin/logs

Delete old logs.

**Headers:**
- `x-admin-key: your-admin-key`

**Query Parameters:**
- `days` - Delete logs older than X days (default: 30)

---

### GET /api/admin/dead-letter

List dead letter entries.

**Headers:**
- `x-admin-key: your-admin-key`

**Query Parameters:**
- `reviewed` - Filter by reviewed status (true/false)
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset

---

### PATCH /api/admin/dead-letter

Mark a dead letter entry as reviewed.

**Headers:**
- `x-admin-key: your-admin-key`
- `Content-Type: application/json`

**Body:**
```json
{
  "id": "uuid",
  "reviewedBy": "admin@example.com",
  "resolution": "forwarded",
  "resolutionNotes": "Manually forwarded to iSellData",
  "forwardedTo": "iselldata"
}
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
6. Configure your app with this secret

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

### Via Environment Variables (for static configs)

1. Add environment variables:

```env
MYAPP_WEBHOOK_URL=https://myapp.com/api/webhooks/paystack
MYAPP_ROUTER_SECRET=your-secure-secret
```

2. Update `lib/config.ts`:

```typescript
export function getAppRegistry(): Record<string, AppConfig> {
  return {
    myapp: {
      id: 'myapp',
      name: 'My App',
      webhookUrl: process.env.MYAPP_WEBHOOK_URL || '',
      routerSecret: process.env.MYAPP_ROUTER_SECRET || '',
      prefixes: ['MYAPP-', 'MA-'],
      enabled: !!process.env.MYAPP_WEBHOOK_URL,
    },
  }
}
```

3. Deploy the changes.

---

## Receiving Webhooks in Your App

### How X-Router-Secret Works

1. **Auto-generated**: When you add an app in PayRoute (via dashboard or API), a unique secret is automatically generated
2. **Shown once**: This secret is displayed only once when the app is created - save it immediately!
3. **Configure your app**: Store this secret in your app's environment (e.g., `PAYROUTE_SECRET`)
4. **Verify on receive**: When webhooks arrive, verify the `X-Router-Secret` header matches your stored secret

### Headers Included in Forwarded Webhooks

| Header | Description |
|--------|-------------|
| `X-Router-Secret` | Auto-generated secret for your app (verify this!) |
| `X-Original-Signature` | Original Paystack signature |
| `X-Routed-By` | Always `payroute` |
| `X-Routed-At` | ISO timestamp of routing |

### Example Handler (Next.js)

```typescript
// app/api/webhooks/paystack/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Step 1: Verify the request is from PayRoute
  const routerSecret = request.headers.get("x-router-secret");
  if (routerSecret !== process.env.PAYROUTE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Step 2: Parse the webhook payload
  const payload = await request.json();
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
app.post("/api/webhooks/paystack", (req, res) => {
  // Verify PayRoute secret
  const routerSecret = req.headers["x-router-secret"];
  if (routerSecret !== process.env.PAYROUTE_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { event, data } = req.body;

  if (event === "charge.success") {
    // Process successful payment
  }

  res.json({ success: true });
});
```

---

## Security

### Signature Verification

PayRoute verifies the Paystack signature before routing:

1. Paystack signs the request with your secret key
2. PayRoute verifies using `PAYSTACK_SECRET_KEY`
3. If valid, the webhook is routed
4. Your app receives `X-Router-Secret` to verify the forward

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

### Dashboard Shows No Data

1. Ensure `ADMIN_API_KEY` is set
2. Check Supabase connection
3. Verify the database tables exist

---

## Project Structure

```
payroute/
├── app/
│   ├── page.tsx              # Dashboard
│   └── api/
│       ├── webhook/          # Main webhook endpoint
│       ├── health/           # Health check
│       └── admin/            # Admin APIs
├── components/
│   ├── ui/                   # Reusable UI components
│   └── dashboard/            # Dashboard components
├── lib/
│   ├── config.ts             # App registry
│   ├── router.ts             # Routing logic
│   ├── security.ts           # Signature verification
│   ├── WebhookLogger.ts      # Database logging
│   └── dead-letter.ts        # Dead letter queue
└── supabase/
    └── migrations/           # Database schema
```

---

## Support

For issues or questions:
1. Check this documentation
2. Review the logs in the dashboard
3. Check the dead letter queue
4. Open an issue on GitHub

---

*PayRoute v1.0.0 - A lightweight webhook router for Paystack*

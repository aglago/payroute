# PayRoute

A lightweight webhook router for Paystack. Receive webhooks from a single Paystack account and route them to multiple destination apps.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Paystack  │────▶│   PayRoute   │────▶│  Your Apps  │
│  (webhooks) │     │  (router)    │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
```

## Features

- **One webhook URL** for multiple apps sharing a Paystack account
- **Automatic routing** based on payment metadata or reference prefix
- **Dead letter queue** for webhooks that can't be routed
- **Full logging** of all webhook activity
- **Dashboard** to monitor and manage routing
- **Dynamic app configuration** via UI or environment variables

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase project (for logging)
- Paystack account

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/payroute.git
cd payroute

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### Configuration

Edit `.env.local`:

```env
# Supabase (for logging)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Paystack secret for signature verification
PAYSTACK_SECRET_KEY=sk_live_xxxxx

# Admin API key (for dashboard access)
# Generate a secure random key using: openssl rand -hex 32
ADMIN_API_KEY=your-secure-admin-key

# Optional: IP validation
VALIDATE_PAYSTACK_IP=false
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

### Database Setup

Run the migrations on your Supabase project:

```sql
-- Run each migration file in order:
-- supabase/migrations/001_create_webhook_logs.sql
-- supabase/migrations/002_create_dead_letter_queue.sql
-- supabase/migrations/003_create_app_configs.sql
```

### Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000` to see the dashboard.

### Deploy to Vercel

```bash
vercel deploy
```

Then update your Paystack webhook URL to:
```
https://your-payroute-domain.vercel.app/api/webhook
```

## How Routing Works

PayRoute uses two strategies to determine where to send a webhook:

### 1. Metadata Routing (Recommended)

Include the app name in the payment metadata when initializing:

```javascript
const response = await paystack.transaction.initialize({
  email: "customer@example.com",
  amount: 5000,
  metadata: {
    app: "myapp",  // PayRoute uses this to route
    orderId: "12345"
  }
});
```

### 2. Prefix Routing (Fallback)

Configure prefixes for each app. PayRoute will match the payment reference:

```javascript
// If myapp is configured with prefix "MA-"
const reference = `MA-${Date.now()}`;  // Routes to myapp
```

### Dead Letter Queue

Webhooks that can't be routed go to the dead letter queue where you can:
- Review them manually
- Forward to the correct app
- Mark as resolved

## Adding Apps

### Via Dashboard

1. Go to the "Apps" tab
2. Click "Add App"
3. Fill in the details:
   - **App Name**: Display name
   - **Webhook URL**: Your app's webhook endpoint
   - **Prefixes**: Comma-separated reference prefixes
4. Save the generated router secret

### Via Environment Variables

Add to `.env.local`:

```env
MYAPP_WEBHOOK_URL=https://myapp.com/api/webhooks/paystack
MYAPP_ROUTER_SECRET=your-secure-secret
```

Update `lib/config.ts` to include the new app.

## Receiving Webhooks

### Understanding X-Router-Secret

When you add an app in PayRoute, a **unique secret is auto-generated** and shown to you **only once**. Save this secret and configure your app to verify it.

When PayRoute forwards a webhook, it includes these headers:

| Header | Description |
|--------|-------------|
| `X-Router-Secret` | Auto-generated secret (verify this!) |
| `X-Original-Signature` | Original Paystack signature |
| `X-Routed-By` | Always "payroute" |
| `X-Routed-At` | ISO timestamp of routing |

### Example Handler

```typescript
export async function POST(request: NextRequest) {
  // Verify the router secret (generated when you added the app)
  const routerSecret = request.headers.get("x-router-secret");
  if (routerSecret !== process.env.PAYROUTE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Process the webhook
  const payload = await request.json();
  // ... your logic here

  return NextResponse.json({ success: true });
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhook` | POST | Main webhook endpoint (receives from Paystack) |
| `/api/health` | GET | Health check |
| `/api/admin/stats` | GET | Routing statistics |
| `/api/admin/logs` | GET | Query webhook logs |
| `/api/admin/apps` | GET/POST/PATCH/DELETE | Manage apps |
| `/api/admin/dead-letter` | GET/PATCH | Dead letter queue |

Admin endpoints require `x-admin-key` header.

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
│   ├── app-store.ts          # Database CRUD for apps
│   └── dead-letter.ts        # Dead letter queue
└── supabase/
    └── migrations/           # Database schema
```

## Security

- **Signature Verification**: All webhooks are verified using Paystack's HMAC-SHA512 signature
- **IP Validation**: Optionally validate webhooks come from Paystack IPs
- **Router Secret**: Each app has a unique secret for verifying forwards
- **Admin Authentication**: Admin API protected by API key

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- Check the in-app documentation (Docs tab in dashboard)
- Review the [DOCS.md](DOCS.md) file
- Open an issue on GitHub

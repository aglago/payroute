import { ImageResponse } from "next/og"

export const runtime = "edge"

export const alt = "PayRoute - Paystack Webhook Router"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "40px",
          }}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 100 100"
            style={{ marginRight: "20px" }}
          >
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "#3b82f6" }} />
                <stop offset="100%" style={{ stopColor: "#8b5cf6" }} />
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="20" fill="url(#grad)" />
            <path
              d="M25 50 L40 50 L50 35 L60 65 L70 50 L85 50"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="25" cy="50" r="4" fill="white" />
            <circle cx="85" cy="50" r="4" fill="white" />
          </svg>
          <span
            style={{
              fontSize: "64px",
              fontWeight: "bold",
              color: "white",
              letterSpacing: "-2px",
            }}
          >
            PayRoute
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "32px",
            color: "#a1a1aa",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.4,
          }}
        >
          Lightweight webhook router for Paystack
        </div>

        {/* Features */}
        <div
          style={{
            display: "flex",
            gap: "40px",
            marginTop: "50px",
          }}
        >
          {["Metadata Routing", "Prefix Matching", "Dead Letter Queue"].map(
            (feature) => (
              <div
                key={feature}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  color: "#71717a",
                  fontSize: "20px",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#3b82f6",
                  }}
                />
                {feature}
              </div>
            )
          )}
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}

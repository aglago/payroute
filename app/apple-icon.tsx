import { ImageResponse } from "next/og"

export const runtime = "edge"

export const size = {
  width: 180,
  height: 180,
}
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
          borderRadius: "40px",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 100 100">
          <path
            d="M15 50 L30 50 L45 30 L55 70 L70 50 L85 50"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="15" cy="50" r="5" fill="white" />
          <circle cx="85" cy="50" r="5" fill="white" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}

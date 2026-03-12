import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PayRoute - Paystack Webhook Router",
    template: "%s | PayRoute",
  },
  description:
    "Lightweight webhook router for Paystack. Routes incoming webhooks to multiple destination apps based on metadata or reference prefix.",
  keywords: [
    "paystack",
    "webhook",
    "router",
    "payment",
    "fintech",
    "api",
    "nextjs",
    "typescript",
  ],
  authors: [{ name: "PayRoute" }],
  creator: "PayRoute",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://payroute.vercel.app"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "PayRoute",
    title: "PayRoute - Paystack Webhook Router",
    description:
      "Lightweight webhook router for Paystack. Routes incoming webhooks to multiple destination apps based on metadata or reference prefix.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PayRoute - Paystack Webhook Router",
    description:
      "Lightweight webhook router for Paystack. Routes incoming webhooks to multiple destination apps based on metadata or reference prefix.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
